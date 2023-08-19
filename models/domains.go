package models

// User represents the user model for gophish.
type Domain struct {
	Id     int64  `json:"id"`
	CartId string `json:"cartId" sql:"not null;unique"`
	Modal  string `json:"modal" sql:"not null;unique"`
	Name   string `json:"name" sql:"not null;unique"`
}
