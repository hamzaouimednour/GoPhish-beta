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
type DepartmentTeam struct {
	TeamId       int64 `json:"-" gorm:"column:team_id"`
	DepartmentId int64 `json:"-" gorm:"column:department_id"`
}

// ErrCampaignNameNotSpecified indicates there was no template given by the user
var ErrDepartmentTeamNameNotSpecified = errors.New("DepartmentTeam id not specified")

// Validate checks to make sure there are no invalid fields in a submitted campaign
func (t *DepartmentTeam) Validate() error {
	switch {
	case t == nil:
		return ErrTeamNameNotSpecified
	}
	return nil
}

// GetUser returns the user that the given id corresponds to. If no user is found, an
// error is thrown.
func GetDepartmentTeams() ([]DepartmentTeam, error) {
	t := []DepartmentTeam{}
	// Get the basic teams information
	query := db.Table("department_teams")
	query = query.Select("team_id, department_id")
	err := query.Scan(&t).Error
	return t, err
}

// GetTemplate returns the template, if it exists, specified by the given id and user_id.
func GetDepartmentTeam(id int64) ([]DepartmentTeam, error) {
	t := []DepartmentTeam{}
	err := db.Where("team_id=?", id).Find(&t).Error
	if err != nil {
		log.Error(err)
		return t, err
	}

	return t, err
}

func PostDepartmentTeam(t *DepartmentTeam) error {

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
func PutDepartmentTeam(t *DepartmentTeam) error {
	err := db.Where("team_id=?", t.TeamId).Delete(&DepartmentTeam{}).Error
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

func DeleteDepartmentTeam(id int64) error {
	err := db.Where("team_id=?", id).Delete(&DepartmentTeam{}).Error
	if err != nil {
		log.Error(err)
		return err
	}
	return err
}
func DeleteTeamDepartment(id int64) error {
	err := db.Where("department_id=?", id).Delete(&DepartmentTeam{}).Error
	if err != nil {
		log.Error(err)
		return err
	}
	return err
}
