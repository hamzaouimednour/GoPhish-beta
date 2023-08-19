package models

import (
	"errors"
	"fmt"
	"net/mail"
	"time"

	log "github.com/gophish/gophish/logger"
	"github.com/jinzhu/gorm"
	"github.com/sirupsen/logrus"
)

// Group contains the fields needed for a user -> group mapping
// Groups contain 1..* Targets
type Group struct {
	Id           int64     `json:"id"`
	UserId       int64     `json:"-"`
	Name         string    `json:"name"`
	ModifiedDate time.Time `json:"modified_date"`
	Targets      []Target  `json:"targets" sql:"-"`
}

// GroupSummaries is a struct representing the overview of Groups.
type GroupSummaries struct {
	Total  int64          `json:"total"`
	Groups []GroupSummary `json:"groups"`
}

// GroupSummary represents a summary of the Group model. The only
// difference is that, instead of listing the Targets (which could be expensive
// for large groups), it lists the target count.
type GroupSummary struct {
	Id           int64     `json:"id"`
	Name         string    `json:"name"`
	ModifiedDate time.Time `json:"modified_date"`
	NumTargets   int64     `json:"num_targets"`
}

// GroupTarget is used for a many-to-many relationship between 1..* Groups and 1..* Targets
type GroupTarget struct {
	GroupId  int64 `json:"-"`
	TargetId int64 `json:"-"`
}

// Target contains the fields needed for individual targets specified by the user
// Groups contain 1..* Targets, but 1 Target may belong to 1..* Groups
type Target struct {
	Id int64 `json:"-"`
	BaseRecipient
}

// BaseRecipient contains the fields for a single recipient. This is the base
// struct used in members of groups and campaign results.
type BaseRecipient struct {
	Email      string `json:"email"`
	FirstName  string `json:"first_name"`
	LastName   string `json:"last_name"`
	Position   string `json:"position"`
	Department string `json:"department"`
	Entity string `json:"entity"`
	Location   string `json:"location"`
}

// FormatAddress returns the email address to use in the "To" header of the email
func (r *BaseRecipient) FormatAddress() string {
	addr := r.Email
	if r.FirstName != "" && r.LastName != "" {
		a := &mail.Address{
			Name:    fmt.Sprintf("%s %s", r.FirstName, r.LastName),
			Address: r.Email,
		}
		addr = a.String()
	}
	return addr
}

// FormatAddress returns the email address to use in the "To" header of the email
func (t *Target) FormatAddress() string {
	addr := t.Email
	if t.FirstName != "" && t.LastName != "" {
		a := &mail.Address{
			Name:    fmt.Sprintf("%s %s", t.FirstName, t.LastName),
			Address: t.Email,
		}
		addr = a.String()
	}
	return addr
}

// ErrEmailNotSpecified is thrown when no email is specified for the Target
var ErrEmailNotSpecified = errors.New("No email address specified")

// ErrGroupNameNotSpecified is thrown when a group name is not specified
var ErrGroupNameNotSpecified = errors.New("Group name not specified")

// ErrNoTargetsSpecified is thrown when no targets are specified by the user
var ErrNoTargetsSpecified = errors.New("No targets specified")

// Validate performs validation on a group given by the user
func (g *Group) Validate() error {
	switch {
	case g.Name == "":
		return ErrGroupNameNotSpecified
	case len(g.Targets) == 0:
		return ErrNoTargetsSpecified
	}
	return nil
}

// GetGroups returns the groups owned by the given user.
func GetGroups(uid int64) ([]Group, error) {
	items := []Group{}
	var err error

	// Get user entity
	userEntity, _ := GetUserEntity(uid)

	switch userEntity.Role.Slug {
	case "reporter":
		err = db.Joins("JOIN users ON users.id = groups.user_id").
			Joins("JOIN roles ON roles.id = users.role_id").
			Where("users.teamid = ? AND roles.slug IN (?) ", userEntity.Teamuser.TeamId, []string{"engineer", "teamAdmin"}).
			Find(&items).Error
	case "engineer":
		err = db.Joins("JOIN users ON users.id = groups.user_id").
			Joins("JOIN roles ON roles.id = users.role_id").
			Where("users.teamid = ? AND (roles.slug = ? OR user_id = ?)", userEntity.Teamuser.TeamId, "teamAdmin", uid).
			Find(&items).Error
	case "teamAdmin":
		err = db.Joins("JOIN users ON users.id = groups.user_id").
			Where("users.teamid = ?", userEntity.Teamuser.TeamId).
			Find(&items).Error
	case "admin":
		err = db.Find(&items).Error
	default:
		err = db.Where("user_id=?", uid).Find(&items).Error
	}

	if err != nil {
		log.Error(err)
		return items, err
	}
	for i := range items {
		items[i].Targets, err = GetTargets(items[i].Id)
		if err != nil {
			log.Error(err)
		}
	}
	return items, nil
}

// GetGroupSummaries returns the summaries for the groups
// created by the given uid.
func GetGroupSummaries(uid int64) (GroupSummaries, error) {
	items := GroupSummaries{}
	var err error

	// Get user entity
	userEntity, _ := GetUserEntity(uid)

	// init DB query with table name
	dbq := db.Table("groups")

	switch userEntity.Role.Slug {
	case "reporter":
		err = dbq.Joins("JOIN users ON users.id = groups.user_id").
			Joins("JOIN roles ON roles.id = users.role_id").
			Where("users.teamid = ? AND roles.slug IN (?) ", userEntity.Teamuser.TeamId, []string{"engineer", "teamAdmin"}).
			Select("groups.id, groups.name, groups.modified_date").
			Scan(&items.Groups).Error
	case "engineer":
		err = dbq.Joins("JOIN users ON users.id = groups.user_id").
			Joins("JOIN roles ON roles.id = users.role_id").
			Where("users.teamid = ? AND (roles.slug = ? OR user_id = ?)", userEntity.Teamuser.TeamId, "teamAdmin", uid).
			Select("groups.id, groups.name, groups.modified_date").
			Scan(&items.Groups).Error
	case "teamAdmin":
		err = dbq.Joins("JOIN users ON users.id = groups.user_id").
			Where("users.teamid = ?", userEntity.Teamuser.TeamId).
			Select("groups.id, groups.name, groups.modified_date").
			Scan(&items.Groups).Error
	case "admin":
		err = dbq.Select("id, name, modified_date").Scan(&items.Groups).Error
	default:
		err = dbq.Where("user_id=?", uid).Select("id, name, modified_date").Scan(&items.Groups).Error
	}

	if err != nil {
		log.Error(err)
		return items, err
	}
	for i := range items.Groups {
		query2 := db.Table("group_targets").Where("group_id=?", items.Groups[i].Id)
		err = query2.Count(&items.Groups[i].NumTargets).Error
		if err != nil {
			return items, err
		}
	}
	items.Total = int64(len(items.Groups))
	return items, nil
}

// GetGroup returns the group, if it exists, specified by the given id and user_id.
func GetGroup(id int64, uid int64) (Group, error) {
	g := Group{}
	var err error

	err = db.Where("id=?", id).Find(&g).Error

	if err != nil {
		log.Error(err)
		return g, err
	}
	g.Targets, err = GetTargets(g.Id)
	if err != nil {
		log.Error(err)
	}
	return g, nil
}

// GetGroupSummary returns the summary for the requested group
func GetGroupSummary(id int64, uid int64) (GroupSummary, error) {
	g := GroupSummary{}
	var err error

	err = db.Where("id=?", id).
		Select("id, name, modified_date").
		Scan(&g).Error

	if err != nil {
		log.Error(err)
		return g, err
	}
	query2 := db.Table("group_targets").Where("group_id=?", id)
	err = query2.Count(&g.NumTargets).Error
	if err != nil {
		return g, err
	}
	return g, nil
}

// GetGroupByName returns the group, if it exists, specified by the given name and user_id.
func GetGroupByName(n string, uid int64) (Group, error) {
	g := Group{}
	var err error

	err = db.Where("name=?", n).Find(&g).Error

	if err != nil {
		log.Error(err)
		return g, err
	}
	g.Targets, err = GetTargets(g.Id)
	if err != nil {
		log.Error(err)
	}
	return g, err
}

// PostGroup creates a new group in the database.
func PostGroup(g *Group) error {
	if err := g.Validate(); err != nil {
		return err
	}
	// Insert the group into the DB
	tx := db.Begin()
	err := tx.Save(g).Error
	if err != nil {
		tx.Rollback()
		log.Error(err)
		return err
	}
	for _, t := range g.Targets {
		err = insertTargetIntoGroup(tx, t, g.Id)
		if err != nil {
			tx.Rollback()
			log.Error(err)
			return err
		}
	}
	err = tx.Commit().Error
	if err != nil {
		log.Error(err)
		tx.Rollback()
		return err
	}
	return nil
}

// PutGroup updates the given group if found in the database.
func PutGroup(g *Group) error {
	if err := g.Validate(); err != nil {
		return err
	}
	// Fetch group's existing targets from database.
	ts, err := GetTargets(g.Id)
	if err != nil {
		log.WithFields(logrus.Fields{
			"group_id": g.Id,
		}).Error("Error getting targets from group")
		return err
	}
	// Preload the caches
	cacheNew := make(map[string]int64, len(g.Targets))
	for _, t := range g.Targets {
		cacheNew[t.Email] = t.Id
	}

	cacheExisting := make(map[string]int64, len(ts))
	for _, t := range ts {
		cacheExisting[t.Email] = t.Id
	}

	tx := db.Begin()
	// Check existing targets, removing any that are no longer in the group.
	for _, t := range ts {
		if _, ok := cacheNew[t.Email]; ok {
			continue
		}

		// If the target does not exist in the group any longer, we delete it
		err := tx.Where("group_id=? and target_id=?", g.Id, t.Id).Delete(&GroupTarget{}).Error
		if err != nil {
			tx.Rollback()
			log.WithFields(logrus.Fields{
				"email": t.Email,
			}).Error("Error deleting email")
		}
	}
	// Add any targets that are not in the database yet.
	for _, nt := range g.Targets {
		// If the target already exists in the database, we should just update
		// the record with the latest information.
		if id, ok := cacheExisting[nt.Email]; ok {
			nt.Id = id
			err = UpdateTarget(tx, nt)
			if err != nil {
				log.Error(err)
				tx.Rollback()
				return err
			}
			continue
		}
		// Otherwise, add target if not in database
		err = insertTargetIntoGroup(tx, nt, g.Id)
		if err != nil {
			log.Error(err)
			tx.Rollback()
			return err
		}
	}
	err = tx.Save(g).Error
	if err != nil {
		log.Error(err)
		return err
	}
	err = tx.Commit().Error
	if err != nil {
		tx.Rollback()
		return err
	}
	return nil
}

// DeleteGroup deletes a given group by group ID and user ID
func DeleteGroup(g *Group) error {
	// Delete all the group_targets entries for this group
	err := db.Where("group_id=?", g.Id).Delete(&GroupTarget{}).Error
	if err != nil {
		log.Error(err)
		return err
	}
	// Delete the group itself
	err = db.Delete(g).Error
	if err != nil {
		log.Error(err)
		return err
	}
	return err
}

func insertTargetIntoGroup(tx *gorm.DB, t Target, gid int64) error {
	if _, err := mail.ParseAddress(t.Email); err != nil {
		log.WithFields(logrus.Fields{
			"email": t.Email,
		}).Error("Invalid email")
		return err
	}
	err := tx.Where(t).FirstOrCreate(&t).Error
	if err != nil {
		log.WithFields(logrus.Fields{
			"email": t.Email,
		}).Error(err)
		return err
	}
	err = tx.Save(&GroupTarget{GroupId: gid, TargetId: t.Id}).Error
	if err != nil {
		log.Error(err)
		return err
	}
	if err != nil {
		log.WithFields(logrus.Fields{
			"email": t.Email,
		}).Error("Error adding many-many mapping")
		return err
	}
	return nil
}

// UpdateTarget updates the given target information in the database.
func UpdateTarget(tx *gorm.DB, target Target) error {
	targetInfo := map[string]interface{}{
		"first_name": target.FirstName,
		"last_name":  target.LastName,
		"position":   target.Position,
		"department": target.Department,
		"entity": target.Entity,
		"location":   target.Location,
	}
	err := tx.Model(&target).Where("id = ?", target.Id).Updates(JsonMap(targetInfo)).Error
	if err != nil {
		log.WithFields(logrus.Fields{
			"email": target.Email,
		}).Error("Error updating target information")
	}
	return err
}

// GetTargets performs a many-to-many select to get all the Targets for a Group
func GetTargets(gid int64) ([]Target, error) {
	ts := []Target{}
	err := db.Table("targets").
		Select("targets.id, targets.email, targets.first_name, targets.last_name, targets.position, targets.department, targets.entity, targets.location").
		Joins("left join group_targets gt ON targets.id = gt.target_id").
		Where("gt.group_id=?", gid).
		Scan(&ts).Error

	return ts, err
}
