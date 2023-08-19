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
type Department struct {
	Id   int64  `json:"id"`
	Name string `json:"name" sql:"not null;"`
}

// DepartmentSummaries is a struct representing the overview of Department
type DepartmentSummaries struct {
	Departments []Department `json:"departments"`
}

// DepartmentSummary is a struct representing the overview of a single Department
type DepartmentSummary struct {
	Id   int64  `json:"id"`
	Name string `json:"name"`
}

// type DepartmentTeam struct {
// 	department     Department
// 	teamuser []Teamuser
// }

// ErrCampaignNameNotSpecified indicates there was no template given by the user
var ErrDepartmentNameNotSpecified = errors.New("Department name not specified")

// Validate checks to make sure there are no invalid fields in a submitted campaign
func (d *Department) Validate() error {
	switch {
	case d.Name == "":
		return ErrDepartmentNameNotSpecified
	}
	return nil
}

// GetUser returns the user that the given id corresponds to. If no user is found, an
// error is thrown.
func GetDepartments() ([]Department, error) {
	d := []Department{}
	// Get the basic teams information
	query := db.Table("departments")
	query = query.Select("id, name")
	err := query.Scan(&d).Error
	// err := db.Preload("Role").Where("id=?", id).First(&t).Error
	return d, err
}

// GetTemplate returns the template, if it exists, specified by the given id and user_id.
func GetDepartment(id int64) Department {
	d := Department{}
	// err := db.Where("id=?", id).Find(&t).Error
	query := db.Table("departments").Where("id=?", id)
	query = query.Select("id, name")
	err := query.Scan(&d).Error
	if err != nil {
		log.Error(err)
		return d
	}

	return d
}

func PostDepartment(d *Department) error {
	err := d.Validate()
	if err != nil {
		return err
	}
	err = db.Save(d).Error
	if err != nil {
		log.Error(err)
		return err
	}
	return nil
}

// PutTemplate edits an existing template in the database.
// Per the PUT Method RFC, it presumes all data for a template is provided.
func PutDepartment(t *Department) error {
	err := db.Where("id=?", t.Id).Delete(&Department{}).Error
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

func DeleteDepartment(id int64) error {

	err := db.Where("id=?", id).Delete(&Department{}).Error
	if err != nil {
		log.Error(err)
		return err
	}
	return err
}

// GetCampaignSummaries gets the summary objects for all the campaigns
// owned by the current user
func GetDepartmentSummaries(id int64) (DepartmentSummaries, error) {
	overview := DepartmentSummaries{}
	d := []DepartmentTeam{}
	// Get the basic teams information
	query := db.Table("department_teams").Where("team_id = ? ", id)
	query = query.Select("team_id, department_id")
	err := query.Scan(&d).Error

	if err != nil {
		log.Error(err)
		return overview, err
	}

	for i := range d {
		s := GetDepartment(d[i].DepartmentId)
		overview.Departments = append(overview.Departments, s)
	}

	return overview, nil
}

// GetCampaignSummary gets the summary object for a campaign specified by the campaign ID
func GetDepartmentSummary(id int64) (DepartmentSummary, error) {
	cs := DepartmentSummary{}
	var err error

	// Get the basic department_teams information
	query := db.Table("departments").Joins("JOIN department_teams ON department_teams.team_id=departments.id AND department_teams.team_id=?", id).Where("department_teams.team_id = ?", id)
	// query := db.Table("department_teams").Where("team_id = ? ", id)
	query = query.Select("id, name")
	err = query.Scan(&cs).Error

	if err != nil {
		log.Error(err)
		return cs, err
	}

	return cs, nil
}
