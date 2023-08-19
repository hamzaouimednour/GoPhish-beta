package models

import (
	"errors"
	"time"

	log "github.com/gophish/gophish/logger"
	"github.com/sirupsen/logrus"
)

// CampaignParent is a struct representing a campaign parent of sub-campaigns
type CampaignParent struct {
	Id          int64     `json:"id"`
	UserId      int64     `json:"-"`
	Name        string    `json:"name" sql:"not null"`
	CreatedDate time.Time `json:"created_date"`
	Status      string    `json:"status"`
}
type CampaignParentDetails struct {
	Id          int64  `json:"id"`
	Owner       string `json:"owner"`
	Operations  int64  `json:"operations"`
	Template_id int64  `json:"template_id"`
}

type CampaignAdvancement struct {
	Id          int64 `json:"id"`
	Advancement int64 `json:"advancement"`
	Emails      int64 `json:"emails"`
	EmailsSent  int64 `json:"emails_sent"`
}

// CampaignParents is a struct representing a campaigns collection
type CampaignParents struct {
	Id        int64      `json:"id"`
	Campaigns []Campaign `json:"campaigns"`
}

type OperationsResults struct {
	CampaignParentId      int64                   `json:"campaign_parent_id"`
	CampaignGroupsSummary []CampaignGroupsSummary `json:"campaign_groups_summary,omitempty"`
	Results               []Result                `json:"results,omitempty"`
	Events                []Event                 `json:"timeline,omitempty"`
}

// type CampaignGroupsSummary struct {
// 	CampaignId      int64  `json:"campaign_id"`
// 	GroupId         int64  `json:"group_id"`
// 	Name            string `json:"name"`
// 	TotalRecipients int64  `json:"total_recipients"`
// }
// ErrPageNameNotSpecified is thrown if the name of the landing page is blank.
var ErrCampaignParentNameNotSpecified = errors.New("Campaign Name not specified")

// Validate ensures that a page contains the appropriate details
func (cp *CampaignParent) Validate() error {
	if cp.Name == "" {
		return ErrCampaignParentNameNotSpecified
	}
	return nil
}

// GetCampaignParents returns camapigns collection owned by the given user.
func GetCampaignParents(uid int64) ([]CampaignParent, []CampaignParentDetails, []CampaignAdvancement, error) {
	cps := []CampaignParent{}
	cpd := []CampaignParentDetails{}
	ca := []CampaignAdvancement{}
	cIDs := []int64{}
	var err error

	// Role Reporter / TeamAdmin check
	// Get data based on team users specifically with `Engineer` role.
	userEntity, _ := GetUserEntity(uid)

	switch userEntity.Role.Slug {

	case "reporter":
		err = db.Table("campaign_parents").
			Joins("JOIN users ON users.id = campaign_parents.user_id").
			Joins("JOIN roles ON users.role_id = roles.id").
			Where("users.teamid = ? AND roles.slug IN (?) ", userEntity.Teamuser.TeamId, []string{"engineer", "teamAdmin"}).
			Select("campaign_parents.id, campaign_parents.name, campaign_parents.created_date, campaign_parents.status, users.username as owner").
			Scan(&cps).Error

		err = db.Table("campaign_parents").
			Joins("JOIN users ON users.id = campaign_parents.user_id").
			Joins("JOIN roles ON users.role_id = roles.id").
			Joins("LEFT JOIN campaigns ON campaigns.campaign_parent_id = campaign_parents.id").
			Where("users.teamid = ? AND roles.slug IN (?) ", userEntity.Teamuser.TeamId, []string{"engineer", "teamAdmin"}).
			Select("campaign_parents.id, users.username as owner, COUNT(campaigns.id) as operations, campaigns.template_id as template_id").
			Group("campaign_parents.id").
			Scan(&cpd).Error

	case "engineer":
		err = db.Table("campaign_parents").
			Joins("JOIN users ON users.id = campaign_parents.user_id").
			Joins("JOIN roles ON users.role_id = roles.id").
			Where("users.teamid = ? AND (roles.slug = ? OR campaign_parents.user_id = ?) ", userEntity.Teamuser.TeamId, "teamAdmin", uid).
			Select("campaign_parents.id, campaign_parents.name, campaign_parents.created_date, campaign_parents.status, users.username as owner").
			Scan(&cps).Error

		err = db.Table("campaign_parents").
			Joins("JOIN users ON users.id = campaign_parents.user_id").
			Joins("JOIN roles ON users.role_id = roles.id").
			Joins("LEFT JOIN campaigns ON campaigns.campaign_parent_id = campaign_parents.id").
			Where("users.teamid = ? AND (roles.slug = ? OR campaign_parents.user_id = ?) ", userEntity.Teamuser.TeamId, "teamAdmin", uid).
			Select("campaign_parents.id, users.username as owner, COUNT(campaigns.id) as operations, campaigns.template_id as template_id").
			Group("campaign_parents.id").
			Scan(&cpd).Error

	case "teamAdmin":
		err = db.Table("campaign_parents").
			Joins("JOIN users ON users.id = campaign_parents.user_id").
			Where("users.teamid = ? ", userEntity.Teamuser.TeamId).
			Select("campaign_parents.id, campaign_parents.name, campaign_parents.created_date, campaign_parents.status, users.username as owner").
			Scan(&cps).Error

		err = db.Table("campaign_parents").
			Joins("JOIN users ON users.id = campaign_parents.user_id").
			Joins("LEFT JOIN campaigns ON campaigns.campaign_parent_id = campaign_parents.id").
			Where("users.teamid = ? ", userEntity.Teamuser.TeamId).
			Select("campaign_parents.id, users.username as owner, COUNT(campaigns.id) as operations, campaigns.template_id as template_id").
			Group("campaign_parents.id").
			Scan(&cpd).Error

	case "admin":
		err = db.Table("campaign_parents").
			Joins("JOIN users ON users.id = campaign_parents.user_id").
			Select("campaign_parents.id, campaign_parents.name, campaign_parents.created_date, campaign_parents.status, users.username as owner").
			Scan(&cps).Error

		err = db.Table("campaign_parents").
			Joins("JOIN users ON users.id = campaign_parents.user_id").
			Joins("LEFT JOIN campaigns ON campaigns.campaign_parent_id = campaign_parents.id").
			Select("campaign_parents.id, users.username as owner, COUNT(campaigns.id) as operations, campaigns.template_id as template_id").
			Group("campaign_parents.id").
			Scan(&cpd).Error

	default:
		err = db.Table("campaign_parents").
			Joins("JOIN users ON users.id = campaign_parents.user_id").
			Where("campaign_parents.user_id = ?", uid).
			Select("campaign_parents.id, campaign_parents.name, campaign_parents.created_date, campaign_parents.status").
			Scan(&cps).Error

		err = db.Table("campaign_parents").
			Joins("JOIN users ON users.id = campaign_parents.user_id").
			Joins("LEFT JOIN campaigns ON campaigns.campaign_parent_id=campaign_parents.id ").
			Where("campaign_parents.user_id = ?", uid).
			Select("campaign_parents.id, users.username as owner, COUNT(campaigns.id) as operations, campaigns.template_id as template_id").
			Group("campaign_parents.id").
			Scan(&cpd).Error
	}

	if err != nil {
		log.Error(err)
		return cps, cpd, ca, err
	}

	for _, c := range cpd {
		cIDs = append(cIDs, c.Id)
	}

	ca, err = GetCampaignAdvancement(cIDs)
	if err != nil {
		log.Error(err)
		return cps, cpd, ca, err
	}

	return cps, cpd, ca, err
}

// GetCampaignParents returns camapigns collection owned by the given user.
func GetCampaignsByParent(id int64, uid int64) (CampaignSummaries, error) {
	overview := CampaignSummaries{}
	cs := []CampaignSummary{}
	owner := User{}
	selectFields := "campaigns.id, campaigns.name, campaigns.created_date, campaigns.launch_date, campaigns.send_by_date, campaigns.completed_date, campaigns.status"
	var err error

	// CHECK: TeamAdmin & Reporter Roles
	// Reporter: Get data based on team users specifically with `Engineer` role.
	userEntity, _ := GetUserEntity(uid)
	dbq := db.Table("campaigns")

	switch userEntity.Role.Slug {

	case "reporter":
		err = dbq.Joins("JOIN users ON users.id = campaigns.user_id").
			Joins("JOIN roles ON users.role_id = roles.id").
			Where("campaigns.campaign_parent_id = ? AND users.teamid = ? AND roles.slug IN (?) ", id, userEntity.Teamuser.TeamId, []string{"engineer", "teamAdmin"}).
			Select(selectFields).
			Scan(&cs).Error

	case "engineer":
		err = dbq.Joins("JOIN users ON users.id = campaigns.user_id").
			Joins("JOIN roles ON users.role_id = roles.id").
			Where("campaigns.campaign_parent_id = ? AND users.teamid = ? AND (roles.slug = ? OR campaigns.user_id = ?) ", id, userEntity.Teamuser.TeamId, "teamAdmin", uid).
			Select(selectFields).
			Scan(&cs).Error

	case "teamAdmin":
		err = dbq.Joins("JOIN users ON users.id = campaigns.user_id").
			Where("campaigns.campaign_parent_id = ? AND users.teamid = ? ", id, userEntity.Teamuser.TeamId).
			Select(selectFields).
			Scan(&cs).Error

	case "admin":
		err = dbq.Where("campaign_parent_id = ?", id).
			Select(selectFields).
			Scan(&cs).Error

	default:
		err = dbq.Where("user_id = ? AND campaign_parent_id = ?", uid, id).
			Select(selectFields).
			Scan(&cs).Error
	}

	if err != nil {
		log.Error(err)
		return overview, err
	}
	for i := range cs {
		s, err := getCampaignStats(cs[i].Id)
		if err != nil {
			log.Error(err)
			return overview, err
		}
		cs[i].Stats = s
	}
	overview.Total = int64(len(cs))
	// campaigns collection (operations)
	overview.Campaigns = cs
	// campaigns parent
	overview.CampaignsParent, _ = GetCampaignParent(id, uid)
	// campaigns parent owner
	_ = db.Table("users").Where("id = ?", overview.CampaignsParent.UserId).Select("username").Scan(&owner)
	overview.Owner = owner.Username
	// campaigns advancement
	// cpa, _ := GetCampaignParentAdvancement(id)
	// overview.Advancement = cpa.Advancement
	// emails/sent number
	overview.Emails, overview.EmailsSent, overview.Advancement, _ = GetCampaignParentAdvancementInt(id)

	return overview, nil
}

// GetCampaignParents returns camapigns collection owned by the given user.
func GetOperations(id int64, uid int64) ([]Campaign, error) {
	cs := []Campaign{}
	var err error

	// CHECK: TeamAdmin & Reporter Roles
	// Reporter: Get data based on team users specifically with `Engineer` role.
	userEntity, _ := GetUserEntity(uid)
	dbq := db.Table("campaigns")

	switch userEntity.Role.Slug {

	case "reporter":
		err = dbq.Joins("JOIN users ON users.id = campaigns.user_id").
			Joins("JOIN roles ON users.role_id = roles.id").
			Where("campaigns.campaign_parent_id = ? AND users.teamid = ? AND roles.slug IN (?) ", id, userEntity.Teamuser.TeamId, []string{"engineer", "teamAdmin"}).
			Scan(&cs).Error

	case "engineer":
		err = dbq.Joins("JOIN users ON users.id = campaigns.user_id").
			Joins("JOIN roles ON users.role_id = roles.id").
			Where("campaigns.campaign_parent_id = ? AND users.teamid = ? AND (roles.slug = ? OR campaigns.user_id = ?) ", id, userEntity.Teamuser.TeamId, "teamAdmin", uid).
			Scan(&cs).Error

	case "teamAdmin":
		err = dbq.Joins("JOIN users ON users.id = campaigns.user_id").
			Where("campaigns.campaign_parent_id = ? AND users.teamid = ? ", id, userEntity.Teamuser.TeamId).
			Scan(&cs).Error

	case "admin":
		err = dbq.Where("campaign_parent_id = ?", id).
			Scan(&cs).Error

	default:
		err = dbq.Where("user_id = ? AND campaign_parent_id = ?", uid, id).
			Scan(&cs).Error
	}

	if err != nil {
		log.Error(err)
	}
	return cs, err
}

// GetCampaignParent returns the campaigns collection, if it exists, specified by the given id and user_id.
func GetCampaignParent(id int64, uid int64) (CampaignParent, error) {
	p := CampaignParent{}
	var err error

	err = db.Where("id=?", id).Find(&p).Error

	if err != nil {
		log.Error(err)
	}
	return p, err
}

// PostCampaignParent creates a new campaigns parent in the database.
func PostCampaignParent(cp *CampaignParent) error {
	err := cp.Validate()
	if err != nil {
		log.Error(err)
		return err
	}
	// Insert into the DB
	err = db.Save(cp).Error
	if err != nil {
		log.Error(err)
	}
	return err
}

// PutCampaignParent edits an existing Campigns collection in the database.
// Per the PUT Method RFC, it presumes all data for a page is provided.
func PutCampaignParent(cp *CampaignParent) error {
	err := cp.Validate()
	if err != nil {
		return err
	}
	err = db.Model(CampaignParent{}).Where("id = ?", cp.Id).Updates(JsonMap(cp)).Error
	if err != nil {
		log.Error(err)
	}
	return err
}

// DeleteCampaignParent deletes an existing page in the database.
// An error is returned if a page with the given user id and page id is not found.
func DeleteCampaignParent(id int64, uid int64) error {

	// Delete any maillogs still set to be sent out, preventing future emails
	err := db.Table("mail_logs").Where("campaign_id IN (SELECT id FROM campaigns WHERE campaign_parent_id=?)", id).Delete(&MailLog{}).Error
	if err != nil {
		log.Error(err)
		return err
	}
	// end campaign
	err = db.Table("results").Where("campaign_id IN (SELECT id FROM campaigns WHERE campaign_parent_id=?)", id).Delete(&Result{}).Error
	if err != nil {
		log.Error(err)
	}
	// remove campaign and its operations
	err = db.Table("campaigns").Where("campaign_parent_id=?", id).Delete(&Campaign{}).Error
	if err != nil {
		log.Error(err)
	}
	err = db.Delete(CampaignParent{Id: id}).Error
	if err != nil {
		log.Error(err)
	}
	return err
}

// UpdateStatus changes the campaign status appropriately
func (c *CampaignParent) UpdateCampaignStatus(s string) error {
	// This could be made simpler, but I think there's a bug in gorm
	return db.Table("campaign_parents").Where("id = ?", c.Id).Update("status", s).Error
}

// CompleteCampaign effectively "ends" a campaign.
// Any future emails clicked will return a simple "404" page.
func CompleteCampaignParent(id int64, uid int64) error {
	log.WithFields(logrus.Fields{
		"campaign_parent_id": id,
	}).Info("Stop campaign")
	c, err := GetCampaignParent(id, uid)
	if err != nil {
		return err
	}
	// Delete any maillogs still set to be sent out, preventing future emails
	err = db.Table("mail_logs").Where("campaign_id IN (SELECT id FROM campaigns WHERE campaign_parent_id=?)", c.Id).Delete(&MailLog{}).Error
	if err != nil {
		log.Error(err)
		return err
	}
	// Don't overwrite original completed time
	if c.Status == "END" {
		return nil
	}
	// Mark the campaign as complete
	// c.CompletedDate = time.Now().UTC()
	c.Status = "END"
	err = db.Where("id=?", id).Save(&c).Error
	if err != nil {
		log.Error(err)
	}
	return err
}

func GetCampaignAdvancement(ids []int64) ([]CampaignAdvancement, error) {
	ps := []CampaignAdvancement{}

	err := db.Raw("SELECT CP.id, CAST(COALESCE(B_COUNT*100/COUNT(results.id), 0) AS UNSIGNED) AS advancement FROM campaign_parents CP LEFT JOIN campaigns ON campaigns.campaign_parent_id = CP.id LEFT JOIN results ON results.id = campaigns.id LEFT JOIN (SELECT campaign_parents.id, COUNT(results.id) AS B_COUNT FROM campaign_parents LEFT JOIN campaigns ON campaigns.campaign_parent_id = campaign_parents.id LEFT JOIN results ON results.id = campaigns.id WHERE results.status = ? GROUP BY campaign_parents.id) B ON CP.id = B.id WHERE CP.id IN (?) GROUP BY CP.id", EventSent, ids).
		Scan(&ps).Error

	if err != nil {
		log.Error(err)
		return ps, err
	}

	return ps, err
}

func GetCampaignParentAdvancement(id int64) (CampaignAdvancement, error) {
	ps := CampaignAdvancement{}

	err := db.Raw("SELECT CP.id, CAST(COALESCE(B_COUNT*100/COUNT(results.id), 0) AS UNSIGNED) AS advancement FROM campaign_parents CP LEFT JOIN campaigns ON campaigns.campaign_parent_id = CP.id LEFT JOIN results ON results.id = campaigns.id LEFT JOIN (SELECT campaign_parents.id, COUNT(results.id) AS B_COUNT FROM campaign_parents LEFT JOIN campaigns ON campaigns.campaign_parent_id = campaign_parents.id LEFT JOIN results ON results.id = campaigns.id WHERE results.status = ? GROUP BY campaign_parents.id) B ON CP.id = B.id WHERE CP.id = ? GROUP BY CP.id", EventSent, id).
		Scan(&ps).Error

	if err != nil {
		log.Error(err)
		return ps, err
	}

	return ps, err
}

func GetCampaignParentAdvancementInt(id int64) (int64, int64, int64, error) {
	var ce = CampaignEmails{}

	err := db.Table("campaign_parents").
		Joins("LEFT JOIN campaigns ON campaigns.campaign_parent_id = campaign_parents.id").
		Joins("LEFT JOIN results ON results.campaign_id = campaigns.id").
		Where("campaign_parents.id = ?", id).
		Select("COUNT(results.id) AS emails").
		Group("campaign_parents.id").
		Find(&ce).Error

	if err != nil {
		log.Error(err)
		return ce.Emails, ce.EmailsSent, 0, err
	}

	err = db.Table("campaign_parents").
		Joins("LEFT JOIN campaigns ON campaigns.campaign_parent_id = campaign_parents.id ").
		Joins("LEFT JOIN results ON results.campaign_id = campaigns.id ").
		Where("campaign_parents.id = ? AND results.status = ?", id, EventSent).
		Select("COUNT(results.id) AS emails_sent").
		Group("campaign_parents.id").
		Find(&ce).Error

	if err != nil {
		log.Error(err)
		return ce.Emails, ce.EmailsSent, 0, err
	}

	return ce.Emails, ce.EmailsSent, (ce.EmailsSent * 100 / ce.Emails), err
}

func GetOperationsIDsByCampaign(cid int64, uid int64) ([]int64, error) {
	c := []Campaign{}
	cIds := []int64{}
	var err error

	err = db.Where("campaign_parent_id = ?", cid).Select("campaigns.id").Find(&c).Error

	if err != nil {
		log.Errorf("%s: operations not found", err)
		return cIds, err
	}

	for _, i := range c {
		cIds = append(cIds, i.Id)
	}
	return cIds, err
}

func GetCampaignGroups(id int64) ([]CampaignGroupsSummary, error) {
	cr := []CampaignGroupsSummary{}
	var err error
	err = db.Table("campaign_groups").Where("campaigns_id IN (?)", id).Find(&cr).Error
	return cr, err
}

// GetCampaignResults returns just the campaign results for the given campaign
func GetOperationsResults(cid int64, uid int64) (OperationsResults, error) {
	cr := OperationsResults{}
	var err error
	id, _ := GetOperationsIDsByCampaign(cid, uid)

	// cr.CampaignGroupsSummary , _ = GetCampaignGroups(id)
	cgr, cgre := GetCampaignGroups(cid)
	if cgre != nil {
		cr.CampaignGroupsSummary = cgr
	}

	err = db.Table("campaigns").Where("id IN (?)", id).Find(&cr).Error

	if err != nil {
		log.WithFields(logrus.Fields{
			"campaign_id": id,
			"error":       err,
		}).Error(err)
		return cr, err
	}

	err = db.Table("results").Where("campaign_id IN (?)", id).Find(&cr.Results).Error

	if err != nil {
		log.Errorf("%s: results not found for campaign", err)
		return cr, err
	}

	err = db.Table("events").Where("campaign_id IN (?)", id).Find(&cr.Events).Error
	if err != nil {
		log.Errorf("%s: events not found for campaign", err)
		return cr, err
	}

	return cr, err
}

func CampaignParentAuthorization(id int64, uid int64, u User) bool {
	o := struct {
		UserId int64
		RoleId int64
		Slug   string
		Teamid int64
	}{}

	if u.Teamid != 0 {
		err := db.Table("campaign_parents").
			Where("campaign_parents.id=?", id).
			Joins("INNER JOIN users on users.id = campaign_parents.user_id").
			Joins("INNER JOIN roles on roles.id = users.role_id").
			Select("campaign_parents.user_id, users.teamid, users.role_id, roles.slug").
			Scan(&o).Error
		if err != nil {
			log.Error(err)
		}
		if u.Id != o.UserId && u.Teamid != o.Teamid {
			return false
		}
	}
	return true
}
