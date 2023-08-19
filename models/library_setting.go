package models

import (
	log "github.com/gophish/gophish/logger"
)

// User represents the user model for gophish.
type LibrarySetting struct {
	Id     int64  `json:"id"`
	UserId int64  `json:"-"`
	Name   string `json:"name" sql:"not null;unique"`
	Type   string `json:"type" sql:"not null"`
}

var LibrarySettingsTypes = []string{"category", "topic"}

func GetLibrarySetting(id int64) (LibrarySetting, error) {
	item := LibrarySetting{}
	err := db.Where("id=?", id).First(&item).Error

	return item, err
}

func GetLibrarySettings() ([]LibrarySetting, error) {
	items := []LibrarySetting{}
	err := db.Find(&items).Error

	return items, err
}

func GetLibrarySettingByName(n string, t string, uid int64) (LibrarySetting, error) {
	p := LibrarySetting{}
	var err error

	err = db.Where("name=?", n).Where("type", t).Find(&p).Error

	if err != nil {
		log.Error(err)
	}
	return p, err
}

func GetLibrarySettingsByType(typeName string) ([]LibrarySetting, error) {
	items := []LibrarySetting{}
	err := db.Where("type = ?", typeName).Find(&items).Error

	return items, err
}

// creates a new item in the database.
func PostLibrarySetting(item *LibrarySetting) error {
	err := db.Save(item).Error
	if err != nil {
		log.Error(err)
	}
	return err
}

// edits an existing item in the database.
func PutLibrarySetting(item *LibrarySetting, uid int64) error {
	err := db.Model(LibrarySetting{}).Where("id=?", item.Id).Save(item).Error
	if err != nil {
		log.Error(err)
	}
	return err
}

// DeletePage deletes an existing page in the database.
// An error is returned if a page with the given user id and page id is not found.
func DeletLibrarySetting(id int64, uid int64) error {
	err := db.Delete(LibrarySetting{Id: id}).Error
	if err != nil {
		log.Error(err)
	}
	return err
}
