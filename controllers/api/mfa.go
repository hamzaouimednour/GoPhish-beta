package api

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"

	ctx "github.com/gophish/gophish/context"
	"github.com/gophish/gophish/models"
	"github.com/pquerna/otp/totp"
)

// Reset (/api/reset) resets the currently authenticated user's API key
func (as *Server) Mfa(w http.ResponseWriter, r *http.Request) {
	switch {
	case r.Method == "POST":
		type RequestBody struct {
			PassCode        string `json:"passCode"`
			TwoFA_Secret    string `json:"secret"`
			IsTwoFA_Enabled int    `json:"checked"`
		}
		body, err := ioutil.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Error reading request body", http.StatusBadRequest)
			return
		}
		var requestBody RequestBody
		err = json.Unmarshal(body, &requestBody)
		fmt.Println("Username:", requestBody.PassCode)
		fmt.Println("checked:", requestBody.IsTwoFA_Enabled)
		fmt.Println("secret:", requestBody.TwoFA_Secret)
		if err != nil {
			http.Error(w, "Error parsing request body", http.StatusBadRequest)
			return
		}
		u := ctx.Get(r, "user").(models.User)
		if requestBody.IsTwoFA_Enabled != 0 {

			valid := totp.Validate(requestBody.PassCode, requestBody.TwoFA_Secret)
			if valid {
				println("Valid passcode!")
				u.TwoFA_Secret = requestBody.TwoFA_Secret
				u.IsTwoFA_Enabled = int64(requestBody.IsTwoFA_Enabled)
				err = models.PutUser(&u)
				if err != nil {
					http.Error(w, "Error setting API Key", http.StatusInternalServerError)
				} else {
					JSONResponse(w, models.Response{Success: true, Message: "mfa updated successfully! passcode valid !", Data: u.IsTwoFA_Enabled}, http.StatusOK)
				}
			} else {
				if err != nil {
					http.Error(w, "Error setting API Key", http.StatusInternalServerError)
				} else {
					JSONResponse(w, models.Response{Success: false, Message: "mfa passcode not valid!", Data: u.IsTwoFA_Enabled}, http.StatusOK)
				}
			}

		} else {
			u.IsTwoFA_Enabled = int64(requestBody.IsTwoFA_Enabled)
			err = models.PutUser(&u)
			if err != nil {
				http.Error(w, "Error setting API Key", http.StatusInternalServerError)
			} else {
				JSONResponse(w, models.Response{Success: true, Message: "mfa updated successfully!", Data: u.IsTwoFA_Enabled}, http.StatusOK)
			}
		}

	}
}
