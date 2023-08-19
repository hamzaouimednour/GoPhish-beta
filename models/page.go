package models

import (
	"errors"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	log "github.com/gophish/gophish/logger"
)

// Page contains the fields used for a Page model
type Page struct {
	Id                 int64     `json:"id" gorm:"column:id; primary_key:yes"`
	UserId             int64     `json:"owner" gorm:"<-:create;column:user_id"`
	Name               string    `json:"name"`
	HTML               string    `json:"html" gorm:"column:html"`
	CaptureCredentials bool      `json:"capture_credentials" gorm:"column:capture_credentials"`
	CapturePasswords   bool      `json:"capture_passwords" gorm:"column:capture_passwords"`
	Language           int64     `json:"language"`
	Topic              int64     `json:"topic"`
	Category           int64     `json:"category"`
	Visibility         int64     `json:"visibility"`
	ModifiedDate       time.Time `json:"modified_date"`
	// RedirectURL        string    `json:"redirect_url" gorm:"column:redirect_url"`
	// RedirectionPage    int64     `json:"redirection_page" gorm:"column:redirection_page"`
}

// ErrPageNameNotSpecified is thrown if the name of the landing page is blank.
var ErrPageNameNotSpecified = errors.New("Page Name not specified")

// parseHTML parses the page HTML on save to handle the
// capturing (or lack thereof!) of credentials and passwords
func (p *Page) parseHTML() error {
	d, err := goquery.NewDocumentFromReader(strings.NewReader(p.HTML))
	if err != nil {
		return err
	}
	forms := d.Find("form")
	forms.Each(func(i int, f *goquery.Selection) {
		// We always want the submitted events to be
		// sent to our server
		f.SetAttr("action", "")
		if p.CaptureCredentials {
			// If we don't want to capture passwords,
			// find all the password fields and remove the "name" attribute.
			if !p.CapturePasswords {
				inputs := f.Find("input")
				inputs.Each(func(j int, input *goquery.Selection) {
					if t, _ := input.Attr("type"); strings.EqualFold(t, "password") {
						input.RemoveAttr("name")
					}
				})
			} else {
				// If the user chooses to re-enable the capture passwords setting,
				// we need to re-add the name attribute
				inputs := f.Find("input")
				inputs.Each(func(j int, input *goquery.Selection) {
					if t, _ := input.Attr("type"); strings.EqualFold(t, "password") {
						input.SetAttr("name", "password")
					}
				})
			}
		} else {
			// Otherwise, remove the name from all
			// inputs.
			inputFields := f.Find("input")
			inputFields.Each(func(j int, input *goquery.Selection) {
				input.RemoveAttr("name")
			})
		}
	})
	p.HTML, err = d.Html()
	return err
}

// Validate ensures that a page contains the appropriate details
func (p *Page) Validate() error {
	if p.Name == "" {
		return ErrPageNameNotSpecified
	}
	// If the user specifies to capture passwords,
	// we automatically capture credentials
	if p.CapturePasswords && !p.CaptureCredentials {
		p.CaptureCredentials = true
	}
	if err := ValidateTemplate(p.HTML); err != nil {
		return err
	}
	return p.parseHTML()
}

// GetPages returns the pages owned by the given user.
func GetPages(uid int64) ([]Page, error) {
	items := []Page{}
	var err error

	// Get data based on team users roles.
	userEntity, _ := GetUserEntity(uid)

	switch userEntity.Role.Slug {
	case "reporter":
		err = db.Joins("JOIN users ON users.id = pages.user_id").
			Joins("JOIN roles ON roles.id = users.role_id").
			Where("users.teamid = ? AND roles.slug IN (?) ", userEntity.Teamuser.TeamId, []string{"engineer", "teamAdmin"}).
			Find(&items).Error
	case "engineer":
		err = db.Joins("JOIN users ON users.id = pages.user_id").
			Joins("JOIN roles ON roles.id = users.role_id").
			Where("users.teamid = ? AND (roles.slug = ? OR user_id = ?)", userEntity.Teamuser.TeamId, "teamAdmin", uid).
			Find(&items).Error
	case "teamAdmin":
		err = db.Joins("JOIN users ON users.id = pages.user_id").
			Where("users.teamid = ?", userEntity.Teamuser.TeamId).
			Find(&items).Error
	case "admin":
		err = db.Find(&items).Error
	default:
		err = db.Where("user_id=?", uid).Find(&items).Error
	}

	// visibility : get public items
	items, _ = GetPublicPages(userEntity.Teamuser.TeamId, items)

	if err != nil {
		log.Error(err)
		return items, err
	}
	return items, err
}

// GetPage returns the page, if it exists, specified by the given id and user_id.
func GetPage(id int64, uid int64) (Page, error) {
	p := Page{}
	var err error

	err = db.Where("id=?", id).Find(&p).Error

	if err != nil {
		log.Error(err)
	}
	return p, err
}

// GetPageByName returns the page, if it exists, specified by the given name and user_id.
func GetPageByName(n string, uid int64) (Page, error) {
	p := Page{}
	var err error

	err = db.Where("name=?", n).Find(&p).Error

	if err != nil {
		log.Error(err)
	}
	return p, err
}

// PostPage creates a new page in the database.
func PostPage(p *Page) error {
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

// PutPage edits an existing Page in the database.
// Per the PUT Method RFC, it presumes all data for a page is provided.
func PutPage(p *Page, uid int64) error {
	pTmp := Page{}
	err := p.Validate()
	if err != nil {
		return err
	}
	// Public Condition
	_ = db.Where("id=?", p.Id).First(&pTmp).Error
	if !IsUserAuthorized(pTmp.Visibility, pTmp.UserId, uid) {
		return errors.New(ErrUnauthorizedUser)
	}

	err = db.Model(Page{}).Where("id=?", p.Id).Updates(JsonMap(p)).Error
	if err != nil {
		log.Error(err)
	}
	return err
}

// DeletePage deletes an existing page in the database.
// An error is returned if a page with the given user id and page id is not found.
func DeletePage(id int64, uid int64) error {
	err := db.Delete(Page{Id: id}).Error
	if err != nil {
		log.Error(err)
	}
	return err
}

// visibility : get public (1) items
func GetPublicPages(entityID int64, userItems []Page) ([]Page, error) {
	pp := []Page{}
	userItemsIDs := []int64{0}
	for _, item := range userItems {
		userItemsIDs = append(userItemsIDs, item.Id)
	}
	err := db.Joins("JOIN users ON users.id = pages.user_id").
		Joins("JOIN roles ON roles.id = users.role_id").
		Where("pages.visibility = 1 and pages.id not in (?) AND (users.teamid=? OR roles.slug=?)", userItemsIDs, entityID, "admin").
		Find(&pp).Error
	pp = append(pp, userItems...)
	if err != nil {
		log.Error(err)
	}
	return pp, err
}
