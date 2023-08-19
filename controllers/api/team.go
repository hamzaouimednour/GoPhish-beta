package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gophish/gophish/models"
	"github.com/gorilla/mux"
)

type teamRequest struct {
	Id       int64  `json:"id"`
	Teamname string `json:"teamname"`
}

// Teams contains functions to retrieve a list of existing team or create a
// new user. Teams with the ModifySystem permissions can view and create users.
func (as *Server) Teams(w http.ResponseWriter, r *http.Request) {
	switch {
	case r.Method == "GET":
		us, err := models.GetTeams()
		if err != nil {
			JSONResponse(w, models.Response{Success: false, Message: err.Error()}, http.StatusInternalServerError)
			return
		}
		JSONResponse(w, us, http.StatusOK)
		return
	case r.Method == "POST":
		t := models.Team{}
		err3 := json.NewDecoder(r.Body).Decode(&t)
		if err3 != nil {
			JSONResponse(w, models.Response{Success: false, Message: "Invalid JSON structure Entity"}, http.StatusBadRequest)
			return
		}
		err3 = models.PostTeam(&t)
		if err3 != nil {
			JSONResponse(w, models.Response{Success: false, Message: err3.Error()}, http.StatusBadRequest)
			return
		}
		JSONResponse(w, t, http.StatusCreated)

	}

	vars := mux.Vars(r)
	id, _ := strconv.ParseInt(vars["id"], 0, 64)
	switch {

	case r.Method == "DELETE":
		err := models.DeleteTeam(id)
		if err != nil {
			JSONResponse(w, models.Response{Success: false, Message: "Error deleting template"}, http.StatusInternalServerError)
			return
		}
		JSONResponse(w, models.Response{Success: true, Message: "entity deleted successfully!"}, http.StatusOK)

	}
	switch {

	case r.Method == "PUT":
		t := models.Team{}
		err := json.NewDecoder(r.Body).Decode(&t)

		t.Id = id
		err = models.PutTeam(&t)
		if err != nil {
			JSONResponse(w, models.Response{Success: false, Message: err.Error()}, http.StatusBadRequest)
			return
		}
		JSONResponse(w, t, http.StatusOK)

	}

}
