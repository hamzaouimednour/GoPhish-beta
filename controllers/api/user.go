package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gophish/gophish/auth"
	ctx "github.com/gophish/gophish/context"
	log "github.com/gophish/gophish/logger"
	"github.com/gophish/gophish/models"
	"github.com/gorilla/mux"
	"github.com/jinzhu/gorm"
)

// ErrUsernameTaken is thrown when a user attempts to register a username that is taken.
var ErrUsernameTaken = errors.New("Username already taken")

// ErrEmptyUsername is thrown when a user attempts to register a username that is taken.
var ErrEmptyUsername = errors.New("No username provided")

// ErrEmptyRole is throws when no role is provided when creating or modifying a user.
var ErrEmptyRole = errors.New("No role specified")

// ErrInsufficientPermission is thrown when a user attempts to change an
// attribute (such as the role) for which they don't have permission.
var ErrInsufficientPermission = errors.New("Permission denied")

// userRequest is the payload which represents the creation of a new user.
type userRequest struct {
	Username               string `json:"username"`
	Password               string `json:"password"`
	Role                   string `json:"role"`
	PasswordChangeRequired bool   `json:"password_change_required"`
	AccountLocked          bool   `json:"account_locked"`
	Teamname               string `json:"teamname"`
	Teamid                 int64  `json:"teamid"`
}

func (ur *userRequest) Validate(existingUser *models.User) error {
	switch {
	case ur.Username == "":
		return ErrEmptyUsername
	case ur.Role == "":
		return ErrEmptyRole
	}
	// Verify that the username isn't already taken. We consider two cases:
	// * We're creating a new user, in which case any match is a conflict
	// * We're modifying a user, in which case any match with a different ID is
	//   a conflict.
	possibleConflict, err := models.GetUserByUsername(ur.Username)
	if err == nil {
		if existingUser == nil {
			return ErrUsernameTaken
		}
		if possibleConflict.Id != existingUser.Id {
			return ErrUsernameTaken
		}
	}
	// If we have an error which is not simply indicating that no user was found, report it
	if err != nil && err != gorm.ErrRecordNotFound {
		return err
	}
	return nil
}

// Users contains functions to retrieve a list of existing users or create a
// new user. Users with the ModifySystem permissions can view and create users.
func (as *Server) Users(w http.ResponseWriter, r *http.Request) {
	switch {
	case r.Method == "GET":

		// Get current user.
		currentUser := ctx.Get(r, "user").(models.User)

		// get permissions list of current user.
		if strings.Contains(r.RequestURI, "/users/permissions") {
			var permsJSON = []string{}
			permsJSON, err := currentUser.GetPermissions()

			if err != nil {
				JSONResponse(w, models.Response{Success: false, Message: err.Error()}, http.StatusInternalServerError)
				return
			}
			JSONResponse(w, permsJSON, http.StatusOK)
			return
		}

		us, err := models.GetUsers(currentUser)
		if err != nil {
			JSONResponse(w, models.Response{Success: false, Message: err.Error()}, http.StatusInternalServerError)
			return
		}
		JSONResponse(w, us, http.StatusOK)
		return
	case r.Method == "POST":

		// Get owners list
		if strings.Contains(r.RequestURI, "/users/owners") {
			ur := &models.Owner{}
			err := json.NewDecoder(r.Body).Decode(ur)
			owners, err := models.GetOwners(ur.Owners)
			if err != nil {
				JSONResponse(w, models.Response{Success: false, Message: err.Error()}, http.StatusInternalServerError)
				return
			}
			JSONResponse(w, owners, http.StatusOK)
			return
		}

		ur := &userRequest{}
		err := json.NewDecoder(r.Body).Decode(ur)
		if err != nil {
			JSONResponse(w, models.Response{Success: false, Message: err.Error()}, http.StatusBadRequest)
			return
		}
		err = ur.Validate(nil)
		if err != nil {
			JSONResponse(w, models.Response{Success: false, Message: err.Error()}, http.StatusBadRequest)
			return
		}
		err = auth.CheckPasswordPolicy(ur.Password)
		if err != nil {
			JSONResponse(w, models.Response{Success: false, Message: err.Error()}, http.StatusBadRequest)
			return
		}
		hash, err := auth.GeneratePasswordHash(ur.Password)
		if err != nil {
			JSONResponse(w, models.Response{Success: false, Message: err.Error()}, http.StatusInternalServerError)
			return
		}
		role, err := models.GetRoleBySlug(ur.Role)
		if err != nil {
			JSONResponse(w, models.Response{Success: false, Message: err.Error()}, http.StatusInternalServerError)
			return
		}
		user := models.User{
			Username:               ur.Username,
			Hash:                   hash,
			ApiKey:                 auth.GenerateSecureKey(auth.APIKeyLength),
			Role:                   role,
			RoleID:                 role.ID,
			PasswordChangeRequired: ur.PasswordChangeRequired,
			Teamname:               ur.Teamname,
			Teamid:                 ur.Teamid,
			LastLogin:              time.Now().UTC(),
		}
		err = models.PutUser(&user)
		if err != nil {
			JSONResponse(w, models.Response{Success: false, Message: err.Error()}, http.StatusInternalServerError)
			return
		}
		teamUser := models.Teamuser{
			TeamId: ur.Teamid,
			UserId: user.Id,
		}
		err = models.PostTeamuser(&teamUser)
		if err != nil {
			JSONResponse(w, models.Response{Success: false, Message: err.Error()}, http.StatusInternalServerError)
			return
		}
		JSONResponse(w, user, http.StatusOK)
		return
	}
}

// User contains functions to retrieve or delete a single user. Users with
// the ModifySystem permission can view and modify any user. Otherwise, users
// may only view or delete their own account.
func (as *Server) User(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, _ := strconv.ParseInt(vars["id"], 0, 64)
	// If the user doesn't have ModifySystem permissions, we need to verify
	// that they're only taking action on their account.
	currentUser := ctx.Get(r, "user").(models.User)
	hasSystem, err := currentUser.HasPermissions([]string{"users.access", "users.update"})
	if err != nil {
		JSONResponse(w, models.Response{Success: false, Message: err.Error()}, http.StatusInternalServerError)
		return
	}
	if !hasSystem && currentUser.Id != id {
		JSONResponse(w, models.Response{Success: false, Message: http.StatusText(http.StatusForbidden)}, http.StatusForbidden)
		return
	}
	existingUser, err := models.GetUser(id)
	if err != nil {
		JSONResponse(w, models.Response{Success: false, Message: "User not found"}, http.StatusNotFound)
		return
	}
	switch {
	case r.Method == "GET":
		JSONResponse(w, existingUser, http.StatusOK)
	case r.Method == "DELETE":
		err = models.DeleteUser(id)
		if err != nil {
			JSONResponse(w, models.Response{Success: false, Message: err.Error()}, http.StatusInternalServerError)
			return
		}
		log.Infof("Deleted user account for %s", existingUser.Username)
		JSONResponse(w, models.Response{Success: true, Message: "User deleted Successfully!"}, http.StatusOK)
	case r.Method == "PUT":
		ur := &userRequest{}
		err = json.NewDecoder(r.Body).Decode(ur)
		if err != nil {
			log.Errorf("error decoding user request: %v", err)
			JSONResponse(w, models.Response{Success: false, Message: err.Error()}, http.StatusBadRequest)
			return
		}
		err = ur.Validate(&existingUser)
		if err != nil {
			log.Errorf("invalid user request received: %v", err)
			JSONResponse(w, models.Response{Success: false, Message: err.Error()}, http.StatusBadRequest)
			return
		}
		existingUser.Username = ur.Username

		role, err := models.GetRoleBySlug(ur.Role)
		if err != nil {
			JSONResponse(w, models.Response{Success: false, Message: err.Error()}, http.StatusInternalServerError)
			return
		}
		// If our user is trying to change the role of an admin, we need to
		// ensure that it isn't the last user account with the Admin role.
		if existingUser.Role.Slug == models.RoleAdmin && existingUser.Role.ID != role.ID {
			err = models.EnsureEnoughAdmins()
			if err != nil {
				JSONResponse(w, models.Response{Success: false, Message: err.Error()}, http.StatusInternalServerError)
				return
			}
		}
		existingUser.Role = role
		existingUser.RoleID = role.ID
		// We don't force the password to be provided, since it may be an admin
		// managing the user's account, and making a simple change like
		// updating the username or role. However, if it _is_ provided, we'll
		// update the stored hash after validating the new password meets our
		// password policy.
		//
		// Note that we don't force the current password to be provided. The
		// assumption here is that the API key is a proper bearer token proving
		// authenticated access to the account.
		existingUser.PasswordChangeRequired = ur.PasswordChangeRequired
		if ur.Password != "" {
			err = auth.CheckPasswordPolicy(ur.Password)
			if err != nil {
				JSONResponse(w, models.Response{Success: false, Message: err.Error()}, http.StatusBadRequest)
				return
			}
			hash, err := auth.GeneratePasswordHash(ur.Password)
			if err != nil {
				JSONResponse(w, models.Response{Success: false, Message: err.Error()}, http.StatusInternalServerError)
				return
			}
			existingUser.Hash = hash
		}

		// update user entity
		if existingUser.Teamid != ur.Teamid {
			entity, _ := models.GetTeam(ur.Teamid)
			existingUser.Teamid = entity.Id
			existingUser.Teamname = entity.Teamname
			_ = models.PutTeamuser(&models.Teamuser{TeamId: entity.Id, UserId: existingUser.Id})
		}

		err = models.PutUser(&existingUser)
		if err != nil {
			JSONResponse(w, models.Response{Success: false, Message: err.Error()}, http.StatusInternalServerError)
			return
		}
		JSONResponse(w, existingUser, http.StatusOK)
	}
}

func (as *Server) Encryption(w http.ResponseWriter, r *http.Request) {

	user := ctx.Get(r, "user").(models.User)
	if user.Role.Slug != "admin" && user.Role.Slug != "teamAdmin" {
		JSONResponse(w, models.Response{Success: false, Message: "Not Authorized !"}, http.StatusForbidden)
		return
	}
	switch {
	case r.Method == "GET":
		o, _ := models.GetOption("PUBLIC_KEY", user.Id)
		JSONResponse(w, o, http.StatusOK)
	case r.Method == "POST":
		o := models.Option{}
		err := json.NewDecoder(r.Body).Decode(&o)
		if err != nil {
			log.Error(err)
		}

		o.UserId = user.Id
		o.Key = "PUBLIC_KEY"
		o.Description = "Admin / TeamAdmin encryption public key"
		o.ModifiedDate = time.Now().UTC()
		err = models.PostOption(&o, user.Id)
		if err != nil {
			JSONResponse(w, models.Response{Success: false, Message: "Error updating encryption details: " + err.Error()}, http.StatusInternalServerError)
			return
		}
		JSONResponse(w, o, http.StatusOK)
	}
}
