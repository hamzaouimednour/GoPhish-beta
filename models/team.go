package models

import (
	"errors"

	log "github.com/gophish/gophish/logger"
)

// ErrModifyingOnlyAdmin occurs when there is an attempt to modify the only
// user account with the Admin role in such a way that there will be no user
// accounts left in Gophish with that role.
// var ErrModifyingOnlyAdmin = errors.New("Cannot remove the only administrator")

// Team represents the team model for gophish.
type Team struct {
	Id       int64  `json:"id"`
	Teamname string `json:"teamname" sql:"not null;unique"`
}
type Teamusers struct {
	team     Team
	teamuser []Teamuser
}

// ErrCampaignNameNotSpecified indicates there was no template given by the user
var ErrTeamNameNotSpecified = errors.New("Entity name not specified")

// Validate checks to make sure there are no invalid fields in a submitted campaign
func (t *Team) Validate() error {
	switch {
	case t.Teamname == "":
		return ErrTeamNameNotSpecified
	}
	return nil
}

// GetUser returns the user that the given id corresponds to. If no user is found, an
// error is thrown.
func GetTeams() ([]Team, error) {
	t := []Team{}
	// Get the basic teams information
	query := db.Table("teams")
	query = query.Select("id, teamname")
	err := query.Scan(&t).Error
	// err := db.Preload("Role").Where("id=?", id).First(&t).Error
	return t, err
}

// GetTemplate returns the template, if it exists, specified by the given id and user_id.
func GetTeam(id int64) (Team, error) {
	t := Team{}
	err := db.Where("id=?", id).Find(&t).Error
	if err != nil {
		log.Error(err)
		return t, err
	}

	return t, err
}

func PostTeam(t *Team) error {
	err := t.Validate()
	if err != nil {
		return err
	}
	err = db.Save(t).Error
	if err != nil {
		log.Error(err)
		return err
	}
	return nil
}

// PutTemplate edits an existing template in the database.
// Per the PUT Method RFC, it presumes all data for a template is provided.
func PutTeam(t *Team) error {
	err := db.Where("id=?", t.Id).Delete(&Team{}).Error
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

func DeleteTeam(id int64) error {

	err := db.Where("id=?", id).Delete(&Team{}).Error
	if err != nil {
		log.Error(err)
		return err
	}
	return err
}
