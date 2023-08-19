package models

import (
	"errors"
	"net/mail"
	"time"

	log "github.com/gophish/gophish/logger"
	"github.com/jinzhu/gorm"
)

// Template models hold the attributes for an email template to be sent to targets
type Template struct {
	Id             int64        `json:"id" gorm:"column:id; primary_key:yes"`
	UserId         int64        `json:"owner" gorm:"<-:create;column:user_id"`
	Name           string       `json:"name"`
	EnvelopeSender string       `json:"envelope_sender"`
	Subject        string       `json:"subject"`
	Text           string       `json:"text"`
	HTML           string       `json:"html" gorm:"column:html"`
	Language       int64        `json:"language"`
	Topic          int64        `json:"topic"`
	Category       int64        `json:"category"`
	Visibility     int64        `json:"visibility"`
	ModifiedDate   time.Time    `json:"modified_date"`
	Attachments    []Attachment `json:"attachments"`
}

// ErrTemplateNameNotSpecified is thrown when a template name is not specified
var ErrTemplateNameNotSpecified = errors.New("Template name not specified")

// ErrTemplateMissingParameter is thrown when a needed parameter is not provided
var ErrTemplateMissingParameter = errors.New("Need to specify at least plaintext or HTML content")

// Validate checks the given template to make sure values are appropriate and complete
func (t *Template) Validate() error {
	switch {
	case t.Name == "":
		return ErrTemplateNameNotSpecified
	case t.Text == "" && t.HTML == "":
		return ErrTemplateMissingParameter
	case t.EnvelopeSender != "":
		_, err := mail.ParseAddress(t.EnvelopeSender)
		if err != nil {
			return err
		}
	}
	if err := ValidateTemplate(t.HTML); err != nil {
		return err
	}
	if err := ValidateTemplate(t.Text); err != nil {
		return err
	}
	for _, a := range t.Attachments {
		if err := a.Validate(); err != nil {
			return err
		}
	}

	return nil
}

// GetTemplates returns the templates owned by the given user.
func GetTemplates(uid int64) ([]Template, error) {
	items := []Template{}
	var err error

	// Get user entity
	userEntity, _ := GetUserEntity(uid)

	switch userEntity.Role.Slug {
	case "reporter":
		err = db.Joins("JOIN users ON users.id = templates.user_id").
			Joins("JOIN roles ON roles.id = users.role_id").
			Where("users.teamid = ? AND roles.slug IN (?) ", userEntity.Teamuser.TeamId, []string{"engineer", "teamAdmin"}).
			Find(&items).Error
	case "engineer":
		err = db.Joins("JOIN users ON users.id = templates.user_id").
			Joins("JOIN roles ON roles.id = users.role_id").
			Where("users.teamid = ? AND (roles.slug = ? OR user_id = ?)", userEntity.Teamuser.TeamId, "teamAdmin", uid).
			Find(&items).Error
	case "teamAdmin":
		err = db.Joins("JOIN users ON users.id = templates.user_id").
			Where("users.teamid = ?", userEntity.Teamuser.TeamId).
			Find(&items).Error
	case "admin":
		err = db.Find(&items).Error
	default:
		err = db.Where("user_id=?", uid).Find(&items).Error
	}

	// visibility : get public items
	items, _ = GetPublicEmailTempaltes(userEntity.Teamuser.TeamId, items)

	if err != nil {
		log.Error(err)
		return items, err
	}

	for i := range items {
		// Get Attachments
		err = db.Where("template_id=?", items[i].Id).Find(&items[i].Attachments).Error
		if err == nil && len(items[i].Attachments) == 0 {
			items[i].Attachments = make([]Attachment, 0)
		}
		if err != nil && err != gorm.ErrRecordNotFound {
			log.Error(err)
			return items, err
		}
	}
	return items, err
}

// GetTemplate returns the template, if it exists, specified by the given id and user_id.
func GetTemplate(id int64, uid int64) (Template, error) {
	t := Template{}
	var err error

	// Get user entity
	err = db.Where("id=?", id).Find(&t).Error

	if err != nil {
		log.Error(err)
		return t, err
	}

	// Get Attachments
	err = db.Where("template_id=?", t.Id).Find(&t.Attachments).Error
	if err != nil && err != gorm.ErrRecordNotFound {
		log.Error(err)
		return t, err
	}
	if err == nil && len(t.Attachments) == 0 {
		t.Attachments = make([]Attachment, 0)
	}
	return t, err
}

// GetTemplateByName returns the template, if it exists, specified by the given name and user_id.
func GetTemplateByName(n string, uid int64) (Template, error) {
	t := Template{}
	var err error

	err = db.Where("name=?", n).Find(&t).Error

	if err != nil {
		log.Error(err)
		return t, err
	}

	// Get Attachments
	err = db.Where("template_id=?", t.Id).Find(&t.Attachments).Error
	if err != nil && err != gorm.ErrRecordNotFound {
		log.Error(err)
		return t, err
	}
	if err == nil && len(t.Attachments) == 0 {
		t.Attachments = make([]Attachment, 0)
	}
	return t, err
}

// PostTemplate creates a new template in the database.
func PostTemplate(t *Template) error {
	// Insert into the DB
	if err := t.Validate(); err != nil {
		return err
	}
	err := db.Save(t).Error
	if err != nil {
		log.Error(err)
		return err
	}

	// Save every attachment
	for i := range t.Attachments {
		t.Attachments[i].TemplateId = t.Id
		err := db.Save(&t.Attachments[i]).Error
		if err != nil {
			log.Error(err)
			return err
		}
	}
	return nil
}

// PutTemplate edits an existing template in the database.
// Per the PUT Method RFC, it presumes all data for a template is provided.
func PutTemplate(t *Template, uid int64) error {
	tTmp := Template{}
	if err := t.Validate(); err != nil {
		return err
	}

	// Public Condition
	_ = db.Where("id=?", t.Id).First(&tTmp).Error
	if !IsUserAuthorized(tTmp.Visibility, tTmp.UserId, uid) {
		return errors.New(ErrUnauthorizedUser)
	}

	// Delete all attachments, and replace with new ones
	err := db.Where("template_id=?", t.Id).Delete(&Attachment{}).Error
	if err != nil && err != gorm.ErrRecordNotFound {
		log.Error(err)
		return err
	}
	if err == gorm.ErrRecordNotFound {
		err = nil
	}
	for i := range t.Attachments {
		t.Attachments[i].TemplateId = t.Id
		err := db.Save(&t.Attachments[i]).Error
		if err != nil {
			log.Error(err)
			return err
		}
	}

	// Save final template
	err = db.Debug().Model(Template{}).Where("id=?", t.Id).Updates(JsonMap(t)).Error
	if err != nil {
		log.Error(err)
		return err
	}
	return nil
}

// DeleteTemplate deletes an existing template in the database.
// An error is returned if a template with the given user id and template id is not found.
func DeleteTemplate(id int64, uid int64) error {
	// Delete attachments
	err := db.Where("template_id=?", id).Delete(&Attachment{}).Error
	if err != nil {
		log.Error(err)
		return err
	}

	// Finally, delete the template itself
	err = db.Delete(Template{Id: id}).Error
	if err != nil {
		log.Error(err)
		return err
	}
	return nil
}

// visibility : get public (1) items
func GetPublicEmailTempaltes(entityID int64, userItems []Template) ([]Template, error) {
	pp := []Template{}
	userItemsIDs := []int64{0}
	for _, item := range userItems {
		userItemsIDs = append(userItemsIDs, item.Id)
	}

	err := db.Joins("JOIN users ON users.id = templates.user_id").
		Joins("JOIN roles ON roles.id = users.role_id").
		Where("templates.visibility = 1 and templates.id not in (?) AND (users.teamid=? OR roles.slug=?)", userItemsIDs, entityID, "admin").
		Find(&pp).Error
	pp = append(pp, userItems...)
	if err != nil {
		log.Error(err)
	}
	return pp, err
}

func TemplateAuthorization(id int64, uid int64, u User) bool {
	o := struct {
		UserId int64
		RoleId int64
		Slug   string
		Teamid int64
	}{}

	if u.Teamid != 0 {
		err := db.Table("templates").
			Where("templates.id=?", id).
			Joins("INNER JOIN users on users.id = templates.user_id").
			Joins("INNER JOIN roles on roles.id = users.role_id").
			Select("templates.user_id, users.teamid, users.role_id, roles.slug").
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
