package models

import (
	"errors"
	"time"

	log "github.com/gophish/gophish/logger"
)

// ErrModifyingOnlyAdmin occurs when there is an attempt to modify the only
// user account with the Admin role in such a way that there will be no user
// accounts left in Gophish with that role.
var ErrModifyingOnlyAdmin = errors.New("Cannot remove the only administrator")
var ErrUnauthorizedUser = "You are not allowed to edit `public` item."

// User represents the user model for gophish.
type User struct {
	Id                     int64     `json:"id"`
	IsTwoFA_Enabled        int64     `json:"istwofaenabled"`
	TwoFA_Secret           string    `json:"twofasecret"`
	Username               string    `json:"username" sql:"not null;unique"`
	Hash                   string    `json:"-"`
	ApiKey                 string    `json:"api_key" sql:"not null;unique"`
	Teamuser               Teamuser  `json:"teamuser" gorm:"association_autoupdate:false;association_autocreate:false"`
	Role                   Role      `json:"role" gorm:"association_autoupdate:false;association_autocreate:false"`
	RoleID                 int64     `json:"-"`
	PasswordChangeRequired bool      `json:"password_change_required"`
	AccountLocked          bool      `json:"account_locked"`
	LastLogin              time.Time `json:"last_login"`
	Teamname               string    `json:"teamname"`
	Teamid                 int64     `json:"teamid"`
}
type Owner struct {
	Owners []int64
}
type Option struct {
	Id           int64     `json:"-"`
	UserId       int64     `json:"-"`
	Key          string    `json:"key"`
	Name         string    `json:"name"`
	Description  string    `json:"description"`
	Value        string    `json:"value"`
	ModifiedDate time.Time `json:"modified_date"`
}

// GetUser returns the user that the given id corresponds to. If no user is found, an
// error is thrown.
func GetUser(id int64) (User, error) {
	u := User{}
	err := db.Preload("Role").Where("id=?", id).First(&u).Error
	return u, err
}

// GetUsers returns the users registered in Gophish
func GetUsers(u User) ([]User, error) {
	var err error
	us := []User{}

	// TeamAdmin: Get data based on `Team` users.
	if u.Role.Slug == "teamAdmin" {
		err = db.Preload("Role").Joins("JOIN teamusers ON teamusers.user_id=users.id AND teamusers.team_id=?", u.Teamid).Find(&us).Error
	} else {
		// Default: Get all users.
		err = db.Preload("Role").Find(&us).Error
	}

	return us, err
}

// GetUserByAPIKey returns the user that the given API Key corresponds to. If no user is found, an
// error is thrown.
func GetUserByAPIKey(key string) (User, error) {
	u := User{}
	err := db.Preload("Role").Where("api_key = ?", key).First(&u).Error
	return u, err
}

// GetUserByUsername returns the user that the given username corresponds to. If no user is found, an
// error is thrown.
func GetUserByUsername(username string) (User, error) {
	u := User{}
	err := db.Preload("Role").Where("username = ?", username).First(&u).Error
	return u, err
}

// PutUser updates the given user
func PutUser(u *User) error {
	err := db.Save(u).Error
	return err
}

// EnsureEnoughAdmins ensures that there is more than one user account in
// Gophish with the Admin role. This function is meant to be called before
// modifying a user account with the Admin role in a non-revokable way.
func EnsureEnoughAdmins() error {
	role, err := GetRoleBySlug(RoleAdmin)
	if err != nil {
		return err
	}
	var adminCount int
	err = db.Model(&User{}).Where("role_id=?", role.ID).Count(&adminCount).Error
	if err != nil {
		return err
	}
	if adminCount == 1 {
		return ErrModifyingOnlyAdmin
	}
	return nil
}

// DeleteUser deletes the given user. To ensure that there is always at least
// one user account with the Admin role, this function will refuse to delete
// the last Admin.
func DeleteUser(id int64) error {
	existing, err := GetUser(id)
	if err != nil {
		return err
	}
	// If the user is an admin, we need to verify that it's not the last one.
	if existing.Role.Slug == RoleAdmin {
		err = EnsureEnoughAdmins()
		if err != nil {
			return err
		}
	}
	/**
	campaigns, err := GetCampaigns(id)
	if err != nil {
		return err
	}
	// Delete the campaigns
	log.Infof("Deleting campaigns for user ID %d", id)
	for _, campaign := range campaigns {
		err = DeleteCampaign(campaign.Id)
		if err != nil {
			return err
		}
	}
	log.Infof("Deleting pages for user ID %d", id)
	// Delete the landing pages
	pages, err := GetPages(id)
	if err != nil {
		return err
	}
	for _, page := range pages {
		err = DeletePage(page.Id, id)
		if err != nil {
			return err
		}
	}
	// Delete the templates
	log.Infof("Deleting templates for user ID %d", id)
	templates, err := GetTemplates(id)
	if err != nil {
		return err
	}
	for _, template := range templates {
		err = DeleteTemplate(template.Id, id)
		if err != nil {
			return err
		}
	}
	// Delete the groups
	log.Infof("Deleting groups for user ID %d", id)
	groups, err := GetGroups(id)
	if err != nil {
		return err
	}
	for _, group := range groups {
		err = DeleteGroup(&group)
		if err != nil {
			return err
		}
	}
	// Delete the sending profiles
	log.Infof("Deleting sending profiles for user ID %d", id)
	profiles, err := GetSMTPs(id)
	if err != nil {
		return err
	}
	for _, profile := range profiles {
		err = DeleteSMTP(profile.Id, id)
		if err != nil {
			return err
		}
	}
	// Finally, delete the user
	*/
	err = db.Where("id=?", id).Delete(&User{}).Error
	return err
}

// GetUserEntity gets the user entity from database with preloading other models.
// like user Role, Team, ... etc.
func GetUserEntity(id int64) (User, error) {
	t := User{}
	err := db.Preload("Teamuser").Preload("Role").Where("id=?", id).First(&t).Error
	return t, err
}

func IsUserAuthorized(itemVisibility int64, ownerUserID int64, currentUserID int64) bool {
	if itemVisibility == 1 {
		return ownerUserID == currentUserID
	}
	// TODO: authorization by role
	return true
}

func GetOwners(ownersIDs []int64) ([]User, error) {
	owners := []User{}
	err := db.Where("id IN (?)", ownersIDs).Select("id, username, teamname").Find(&owners).Error
	return owners, err
}

// Contains used to returns either user have the given permission or not.
func (u User) Contains(s []string, item string) bool {
	for _, v := range s {
		if v == item {
			return true
		}
	}
	return false
}

func GetOption(key string, uid int64) (Option, error) {
	o := Option{}
	err := db.Where("key = ?", key).Where("user_id = ?", uid).First(&o).Error
	if err != nil {
		log.Error(err)
	}

	return o, err
}

// creates or update a user's options.
func PostOption(o *Option, uid int64) error {
	op := Option{}
	var err error
	if db.Model(&op).Where("user_id = ? AND key = ?", uid, o.Key).First(&op).Error != nil {
		err = db.Create(&o).Error
	} else {
		err = db.Model(&o).Where("user_id = ? AND key = ?", uid, o.Key).Updates(o).Error
	}
	if err != nil {
		log.Error(err)
		return err
	}

	return nil
}
