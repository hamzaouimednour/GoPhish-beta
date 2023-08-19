package models

// User represents the user model for gophish.
type Language struct {
	Id   int64  `json:"id"`
	Code string `json:"code" sql:"not null;unique"`
	Name string `json:"name"`
	Flag string `json:"flag"`
}

func GetLanguage(id int64) (Language, error) {
	l := Language{}
	err := db.Where("id=?", id).First(&l).Error

	return l, err
}

func GetLanguages() ([]Language, error) {
	ls := []Language{}
	err := db.Find(&ls).Error

	return ls, err
}

func GetLanguageByCode(code string) (Language, error) {
	l := Language{}
	err := db.Where("code = ?", code).First(&l).Error

	return l, err
}
