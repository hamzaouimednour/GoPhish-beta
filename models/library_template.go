package models

import (
	"errors"
	"time"

	log "github.com/gophish/gophish/logger"
	"github.com/jinzhu/gorm"
	"github.com/sirupsen/logrus"
)

type LibraryTemplate struct {
	Id                int64     `json:"id"`
	UserId            int64     `json:"owner" gorm:"<-:create;column:user_id"`
	Name              string    `json:"name" sql:"not null"`
	Description       string    `json:"description"`
	TemplateId        int64     `json:"template_id"`
	LandingPageId     int64     `json:"landing_page_id"`
	SendingProfileId  int64     `json:"sending_profile_id"`
	RedirectionPageId int64     `json:"redirection_page_id"`
	RedirectionUrl    string    `json:"redirection_url"`
	URL               string    `json:"url"`
	Tags              string    `json:"tags"`
	LanguageId        int64     `json:"language_id"`
	CategoryId        int64     `json:"category_id"`
	TopicId           int64     `json:"topic_id"`
	Visibility        int64     `json:"visibility"`
	ModifiedDate      time.Time `json:"modified_date"`
}

type LibraryTemplateSearch struct {
	Language int64 `json:"language"`
	Category int64 `json:"category"`
	Topic    int64 `json:"topic"`
	Entity   int64 `json:"entity"`
}

type CampaignLibraryTemplate struct {
	CampaignId        int64 `json:"campaign_id"`
	LibraryTemplateId int64 `json:"library_template_id"`
}

type CampaignLibraryTemplates struct {
	Campaign        Campaign        `json:"campaign"`
	LibraryScenario LibraryTemplate `json:"library_template"`
}

func (c *LibraryTemplate) Validate() error {
	if c.RedirectionUrl != "" {
		if err := ValidateTemplate(c.RedirectionUrl); err != nil {
			return err
		}
	}
	return nil
}

func GetLibraryTemplates(uid int64) ([]LibraryTemplate, []LibraryTemplate, []LibraryTemplate, error) {
	MasterTemplates := []LibraryTemplate{}
	TeamTemplates := []LibraryTemplate{}
	PrivateTemplates := []LibraryTemplate{}
	searchNil := LibraryTemplateSearch{}
	var err error

	// Get data based on team users roles.
	userEntity, _ := GetUserEntity(uid)

	// master: public items created by admin.
	mErr := db.Joins("JOIN users ON users.id = library_templates.user_id").
		Joins("JOIN roles ON roles.id = users.role_id").
		Where("library_templates.visibility = ? AND roles.slug IN (?) ", 1, []string{"admin"}).
		Find(&MasterTemplates).Error
	if mErr != nil {
		log.Error(mErr)
	}

	// team: public items within same entity.
	if userEntity.Role.Slug != "admin" {
		TeamTemplates, _ = GetLibraryTemplatesByTeam(userEntity.Teamid, "get", searchNil)
	} else {
		TeamTemplates, _ = GetEntityLibraryTemplates(0, "get", searchNil)
	}

	// private: templates accessible only by its owner.
	pErr := db.Where("user_id=?", uid).Where("visibility = ?", 0).Find(&PrivateTemplates).Error
	if pErr != nil {
		log.Error(pErr)
	}

	return MasterTemplates, TeamTemplates, PrivateTemplates, err
}

func SearchLibraryTemplates(uid int64, search LibraryTemplateSearch) ([]LibraryTemplate, []LibraryTemplate, []LibraryTemplate, error) {
	MasterTemplates := []LibraryTemplate{}
	TeamTemplates := []LibraryTemplate{}
	PrivateTemplates := []LibraryTemplate{}
	var err error

	// Get data based on team users roles.
	userEntity, _ := GetUserEntity(uid)

	// master: public items created by admin.
	query := db.Joins("JOIN users ON users.id = library_templates.user_id").
		Joins("JOIN roles ON roles.id = users.role_id").
		Where("library_templates.visibility = ? AND roles.slug IN (?) ", 1, []string{"admin"})

	// update query with search parameters
	query = QuerySearch(query, search)

	mErr := query.Find(&MasterTemplates).Error
	if mErr != nil {
		log.Error(mErr)
	}

	// team: public items within same entity.
	if userEntity.Role.Slug != "admin" {
		TeamTemplates, _ = GetLibraryTemplatesByTeam(userEntity.Teamid, "search", search)
	} else {
		TeamTemplates, _ = GetEntityLibraryTemplates(-1, "search", search)
	}

	// private: templates accessible only by its owner.
	query = db.Where("visibility = ? AND user_id=?", 0, uid)

	// update query with search parameters
	query = QuerySearch(query, search)

	pErr := query.Find(&PrivateTemplates).Error
	if pErr != nil {
		log.Error(pErr)
	}

	return MasterTemplates, TeamTemplates, PrivateTemplates, err
}

func GetLibraryTemplatesByTeam(teamID int64, action string, search LibraryTemplateSearch) ([]LibraryTemplate, error) {
	tpl := []LibraryTemplate{}

	query := db.Joins("JOIN users ON users.id = library_templates.user_id").
		Joins("JOIN roles ON roles.id = users.role_id").
		Where("users.teamid = ? AND library_templates.visibility = ?", teamID, 1)

	if action == "search" {
		query = QuerySearch(query, search)
	}

	err := query.Find(&tpl).Error
	if err != nil {
		log.Error(err)
	}
	return tpl, err
}

func GetEntityLibraryTemplates(teamID int64, action string, search LibraryTemplateSearch) ([]LibraryTemplate, error) {
	tpl := []LibraryTemplate{}

	query := db.Joins("JOIN users ON users.id = library_templates.user_id").
		Joins("JOIN roles ON roles.id = users.role_id")

	if teamID > 0 {
		query = query.Where("users.teamid = ? AND library_templates.visibility = ?", teamID, 1)
	} else if teamID == -1 && search.Entity != 0 {
		query = query.Where("users.teamid = ?", search.Entity)
	} else {
		query = query.Where("users.teamid <> ?", 0)
	}

	if action == "search" {
		query = QuerySearch(query, search)
	}

	err := query.Find(&tpl).Error
	if err != nil {
		log.Error(err)
	}
	return tpl, err
}

func GetLibraryTemplate(id int64, uid int64) (LibraryTemplate, error) {
	tpl := LibraryTemplate{}

	err := db.Where("id=?", id).Find(&tpl).Error

	if err != nil {
		log.Error(err)
	}
	return tpl, err
}

func PostLibraryTemplate(p *LibraryTemplate) error {
	err := p.Validate()
	if err != nil {
		log.Error(err)
		return err
	}
	// Insert into the DB
	err = db.Save(p).Error
	if err != nil {
		log.Error(err)
	}
	return err
}

func PutLibraryTemplate(p *LibraryTemplate, uid int64) error {
	err := db.Model(LibraryTemplate{}).Where("id=?", p.Id).Updates(JsonMap(p)).Error
	if err != nil {
		log.Error(err)
	}
	return err
}

func DeleteLibraryTemplate(id int64, uid int64) error {
	ctpl := CampaignLibraryTemplate{}
	// check if the template is already attached to campaign
	err := db.Table("campaigns").Where("library_template_id = ?", id).Find(&ctpl).Error
	if err != nil {
		log.Error(err)
	}
	if ctpl.LibraryTemplateId == id {
		return errors.New("Scenario already attached to operation")
	}
	dErr := db.Delete(LibraryTemplate{Id: id}).Error
	if dErr != nil {
		log.Error(dErr)
	}
	return dErr
}

func QuerySearch(query *gorm.DB, search LibraryTemplateSearch) *gorm.DB {

	if search.Topic != 0 {
		query = query.Where("library_templates.topic_id = ?", search.Topic)
	}
	if search.Category != 0 {
		query = query.Where("library_templates.category_id = ?", search.Category)
	}
	if search.Language != 0 {
		query = query.Where("library_templates.language_id = ?", search.Language)
	}
	return query
}

func FillLibraryCampaignData(c *Campaign, uid int64) error {
	tpl := Template{}
	page := Page{}
	smtp := SMTP{}
	var err error

	libraryTemplate, tErr := GetLibraryTemplate(c.LibraryTemplateId, uid)
	if tErr != nil {
		return tErr
	}

	c.URL = libraryTemplate.URL
	c.LibraryTemplateId = libraryTemplate.Id
	c.PageId = libraryTemplate.LandingPageId
	c.TemplateId = libraryTemplate.TemplateId
	c.SMTPId = libraryTemplate.SendingProfileId

	// TEMPALTE
	tpl, err = GetTemplate(c.TemplateId, uid)
	if err == gorm.ErrRecordNotFound {
		log.WithFields(logrus.Fields{
			"template": tpl.Name,
		}).Error("Template does not exist")
		return ErrTemplateNotFound
	} else if err != nil {
		log.Error(err)
		return err
	}
	c.Template = tpl

	// LANDING PAGE
	page, err = GetPage(c.PageId, uid)
	if err == gorm.ErrRecordNotFound {
		log.WithFields(logrus.Fields{
			"page": page.Name,
		}).Error("Page does not exist")
		return ErrPageNotFound
	} else if err != nil {
		log.Error(err)
		return err
	}
	c.Page = page

	// SMTP
	smtp, err = GetSMTP(c.SMTPId, uid)
	if err == gorm.ErrRecordNotFound {
		log.WithFields(logrus.Fields{
			"smtp": smtp.Name,
		}).Error("Sending profile does not exist")
		return ErrSMTPNotFound
	} else if err != nil {
		log.Error(err)
		return err
	}
	c.SMTP = smtp

	return nil
}
