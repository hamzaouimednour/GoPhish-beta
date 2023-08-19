package models

import (
	"errors"

	log "github.com/gophish/gophish/logger"
)

// ErrModifyingOnlyAdmin occurs when there is an attempt to modify the only
// user account with the Admin role in such a way that there will be no user
// accounts left in Gophish with that role.
// var ErrModifyingOnlyAdmin = errors.New("Cannot remove the only administrator")

// Teamuser represents the team of users model for gophish.
type Teamuser struct {
	TeamId int64 `json:"-" gorm:"column:team_id"`
	UserId int64 `json:"-" gorm:"column:user_id"`
}

type TeamuserArray struct {
	Teamuser []Teamuser
}

// ErrCampaignNameNotSpecified indicates there was no template given by the user
var ErrTeamUserNameNotSpecified = errors.New("Team id not specified")

// Validate checks to make sure there are no invalid fields in a submitted campaign
func (t *Teamuser) Validate() error {
	switch {
	case t == nil:
		return ErrTeamNameNotSpecified
	}
	return nil
}

// GetUser returns the user that the given id corresponds to. If no user is found, an
// error is thrown.
func GetTeamusers() ([]Teamuser, error) {
	t := []Teamuser{}
	// Get the basic teams information
	query := db.Table("teamuser")
	query = query.Select("team_id, user_id")
	err := query.Scan(&t).Error
	return t, err
}

// GetTemplate returns the template, if it exists, specified by the given id and user_id.
func GetTeamuser(id int64) ([]Teamuser, error) {
	t := []Teamuser{}
	err := db.Where("team_id=?", id).Find(&t).Error
	if err != nil {
		log.Error(err)
		return t, err
	}

	return t, err
}

func PostTeamuser(t *Teamuser) error {

	err := t.Validate()
	if err != nil {
		return err
	}
	// Insert into the DB
	err = db.Save(t).Error
	if err != nil {
		log.Error(err)
		return err
	}

	return nil
}

// PutTemplate edits an existing template in the database.
// Per the PUT Method RFC, it presumes all data for a template is provided.
func PutTeamuser(t *Teamuser) error {
	err := db.Where("user_id=?", t.UserId).Delete(&Teamuser{}).Error
	if err != nil {
		log.Error(err)
		return err
	}
	err2 := db.Save(t).Error
	if err2 != nil {
		log.Error(err2)
		return err2
	}
	return nil
}

func DeleteTeamuser(id int64) error {
	err := db.Where("user_id=?", id).Delete(&Teamuser{}).Error
	if err != nil {
		log.Error(err)
		return err
	}
	return err
}
