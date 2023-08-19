package models

import (
	"errors"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	log "github.com/gophish/gophish/logger"
)

// Page contains the fields used for a Page model
type RedirectionPage struct {
	Id           int64     `json:"id" gorm:"column:id; primary_key:yes"`
	UserId       int64     `json:"owner" gorm:"<-:create;column:user_id"`
	Name         string    `json:"name"`
	HTML         string    `json:"html" gorm:"column:html"`
	PId          string    `json:"pid" gorm:"column:pid"`
	Language     int64     `json:"language"`
	Visibility   int64     `json:"visibility"`
	ModifiedDate time.Time `json:"modified_date"`
}

// parseHTML parses the page HTML on save to handle the
// capturing (or lack thereof!) of credentials and passwords
func (p *RedirectionPage) parseHTML() error {
	d, err := goquery.NewDocumentFromReader(strings.NewReader(p.HTML))
	if err != nil {
		return err
	}
	p.HTML, err = d.Html()
	return err
}

// Validate ensures that a page contains the appropriate details
func (p *RedirectionPage) Validate() error {
	if p.Name == "" {
		return ErrPageNameNotSpecified
	}
	if err := ValidateTemplate(p.HTML); err != nil {
		return err
	}
	return p.parseHTML()
}

// GetPages returns the pages owned by the given user.
func GetRedirectionPages(uid int64) ([]RedirectionPage, error) {
	items := []RedirectionPage{}
	var err error
	var i []interface{}

	// Get data based on user role.
	userEntity, _ := GetUserEntity(uid)

	switch userEntity.Role.Slug {
	case "reporter":
		err = db.Joins("JOIN users ON users.id = redirection_pages.user_id").
			Joins("JOIN roles ON roles.id = users.role_id").
			Where("users.teamid = ? AND roles.slug IN (?) ", userEntity.Teamuser.TeamId, []string{"engineer", "teamAdmin"}).
			Find(&items).Error
	case "engineer":
		err = db.Joins("JOIN users ON users.id = redirection_pages.user_id").
			Joins("JOIN roles ON roles.id = users.role_id").
			Where("users.teamid = ? AND (roles.slug = ? OR user_id = ?)", userEntity.Teamuser.TeamId, "teamAdmin", uid).
			Find(&items).Error
	case "teamAdmin":
		err = db.Joins("JOIN users ON users.id = redirection_pages.user_id").
			Where("users.teamid = ?", userEntity.Teamuser.TeamId).
			Find(&items).Error
	case "admin":
		err = db.Find(&items).Error
	default:
		err = db.Where("user_id=?", uid).Find(&items).Error
	}

	// visibility : get public items
	items, _ = GetPublicRedirectionPages(userEntity.Teamuser.TeamId, items, "", i)

	if err != nil {
		log.Error(err)
		return items, err
	}
	return items, err
}

// GetPages returns the pages owned by the given user.
func GetRedirectionPagesList(uid int64) ([]RedirectionPage, error) {
	items := []RedirectionPage{}
	var err error
	var i []interface{}

	// Get data based on user role.
	userEntity, _ := GetUserEntity(uid)

	switch userEntity.Role.Slug {
	case "reporter":
		err = db.Joins("JOIN users ON users.id = redirection_pages.user_id").
			Joins("JOIN roles ON roles.id = users.role_id").
			Where("users.teamid = ? AND roles.slug IN (?)", "engineer", userEntity.Teamuser.TeamId, []string{"engineer", "teamAdmin"}).
			Select("redirection_pages.id, redirection_pages.name").
			Find(&items).Error
	case "engineer":
		err = db.Joins("JOIN users ON users.id = redirection_pages.user_id").
			Joins("JOIN roles ON roles.id = users.role_id").
			Where("users.teamid = ? AND (roles.slug = ? OR user_id = ?)", userEntity.Teamuser.TeamId, "teamAdmin", uid).
			Select("redirection_pages.id, redirection_pages.name").
			Find(&items).Error
	case "teamAdmin":
		err = db.Joins("JOIN users ON users.id = redirection_pages.user_id").
			Where("users.teamid = ?", userEntity.Teamuser.TeamId).
			Select("redirection_pages.id, redirection_pages.name").
			Find(&items).Error
	case "admin":
		err = db.Select("id, name").Find(&items).Error
	default:
		err = db.Where("user_id=?", uid).Select("id, name").Find(&items).Error
	}

	// visibility : get public items
	items, _ = GetPublicRedirectionPages(userEntity.Teamuser.TeamId, items, "list", i)

	if err != nil {
		log.Error(err)
		return items, err
	}
	return items, err
}

// GetPage returns the page, if it exists, specified by the given id and user_id.
func GetRedirectionPage(id int64, uid int64) (RedirectionPage, error) {
	p := RedirectionPage{}
	var err error

	err = db.Where("id=?", id).Find(&p).Error

	if err != nil {
		log.Error(err)
	}
	return p, err
}

// GetPage returns the page, if it exists, specified by the given id and user_id.
func GetRedirectionPageByPId(pid string) (RedirectionPage, error) {
	p := RedirectionPage{}

	err := db.Where("pid=?", pid).Find(&p).Error
	if err != nil {
		log.Error(err)
	}
	return p, err
}

func GetRedirectionPageURLByScenario(id int64, baseURL string) (string, error) {
	p := RedirectionPage{}
	url := ""
	err := db.Joins("JOIN library_templates ON redirection_pages.id = library_templates.redirection_page_id").
		Where("library_templates.redirection_page_id=?", id).
		Find(&p).Error
	if err != nil {
		log.Error(err)
	}
	url = baseURL + "/r/" + p.PId
	return url, err
}

// GetPage returns the page, if it exists, specified by the given id and user_id.
func GetRedirectionPageURL(id int64, baseURL string) (string, error) {
	p := RedirectionPage{}
	url := ""
	err := db.Where("id=?", id).Find(&p).Error
	if err != nil {
		log.Error(err)
	}
	url = baseURL + "/r/" + p.PId
	return url, err
}

// GetPageByName returns the page, if it exists, specified by the given name and user_id.
func GetRedirectionPageByName(n string, uid int64) (RedirectionPage, error) {
	p := RedirectionPage{}
	var err error

	err = db.Where("name=?", n).Find(&p).Error

	if err != nil {
		log.Error(err)
	}
	return p, err
}

// PostPage creates a new page in the database.
func PostRedirectionPage(p *RedirectionPage) error {
	err := p.Validate()
	if err != nil {
		log.Error(err)
		return err
	}
	p.PId, _ = generateResultId()
	// Insert into the DB
	err = db.Save(p).Error
	if err != nil {
		log.Error(err)
	}
	return err
}

// PutPage edits an existing Page in the database.
// Per the PUT Method RFC, it presumes all data for a page is provided.
func PutRedirectionPage(p *RedirectionPage, uid int64) error {
	err := p.Validate()
	pTmp := RedirectionPage{}
	if err != nil {
		return err
	}

	_ = db.Where("id=?", p.Id).First(&pTmp).Error

	// Public Condition
	if !IsUserAuthorized(pTmp.Visibility, pTmp.UserId, uid) {
		return errors.New(ErrUnauthorizedUser)
	}

	if pTmp.PId == "" {
		p.PId, _ = generateResultId()
	} else {
		p.PId = pTmp.PId
	}
	err = db.Model(RedirectionPage{}).Where("id=?", p.Id).Updates(JsonMap(p)).Error
	if err != nil {
		log.Error(err)
	}
	return err
}

// DeletePage deletes an existing page in the database.
// An error is returned if a page with the given user id and page id is not found.
func DeleteRedirectionPage(id int64, uid int64) error {
	err := db.Where("user_id=?", uid).Delete(RedirectionPage{Id: id}).Error
	if err != nil {
		log.Error(err)
	}
	return err
}

// visibility : get public (1) items
func GetPublicRedirectionPages(entityID int64, userItems []RedirectionPage, query string, params []interface{}) ([]RedirectionPage, error) {
	pp := []RedirectionPage{}
	userItemsIDs := []int64{0}
	var err error

	// Get list of user items that already loaded
	for _, item := range userItems {
		userItemsIDs = append(userItemsIDs, item.Id)
	}

	// Get public items
	obj := db.Joins("JOIN users ON users.id = redirection_pages.user_id").
		Joins("JOIN roles ON roles.id = users.role_id").
		Where("redirection_pages.visibility = 1 AND redirection_pages.id not in (?) AND (users.teamid=? OR roles.slug=?)", userItemsIDs, entityID, "admin")

	// Query options
	if query == "list" {
		obj = obj.Select("redirection_pages.id, redirection_pages.name")
	}
	if query == "name" {
		obj = obj.Where("redirection_pages.name=?", params[0].(string))
	}
	err = obj.Find(&pp).Error

	// combine both results
	pp = append(pp, userItems...)

	if err != nil {
		log.Error(err)
	}

	return pp, err
}
