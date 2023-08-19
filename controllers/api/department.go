package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	log "github.com/gophish/gophish/logger"
	"github.com/gophish/gophish/models"
	"github.com/gorilla/mux"
)

type departmentRequest struct {
	Id     int64  `json:"id"`
	Name   string `json:"name"`
	TeamId int64  `json:"team_id"`
}

// Departments contains functions to retrieve a list of existing Department or create a
// new user. Departments with the ModifySystem permissions can view and create users.
func (as *Server) Departments(w http.ResponseWriter, r *http.Request) {
	switch {
	case r.Method == "GET":
		us, err := models.GetDepartments()
		if err != nil {
			JSONResponse(w, models.Response{Success: false, Message: err.Error()}, http.StatusInternalServerError)
			return
		}
		JSONResponse(w, us, http.StatusOK)
		return
	case r.Method == "POST":
		tu := departmentRequest{}

		// err3 := json.NewDecoder(r.Body).Decode(&t)
		err3 := json.NewDecoder(r.Body).Decode(&tu)
		if err3 != nil {
			JSONResponse(w, models.Response{Success: false, Message: "Invalid JSON structure Entity"}, http.StatusBadRequest)
			return
		}
		t := models.Department{
			Name: tu.Name,
		}
		err3 = models.PostDepartment(&t)
		if err3 != nil {
			JSONResponse(w, models.Response{Success: false, Message: err3.Error()}, http.StatusBadRequest)
			return
		}
		JSONResponse(w, t, http.StatusCreated)
		teamDep := models.DepartmentTeam{
			TeamId:       tu.TeamId,
			DepartmentId: t.Id,
		}
		err3 = models.PostDepartmentTeam(&teamDep)
		if err3 != nil {
			JSONResponse(w, models.Response{Success: false, Message: err3.Error()}, http.StatusInternalServerError)
			return
		}
		// JSONResponse(w, teamDep, http.StatusOK)
		return

	}

	vars := mux.Vars(r)
	id, _ := strconv.ParseInt(vars["id"], 0, 64)
	switch {

	case r.Method == "DELETE":
		err := models.DeleteDepartment(id)
		if err != nil {
			JSONResponse(w, models.Response{Success: false, Message: "Error deleting template"}, http.StatusInternalServerError)
			return
		}
		JSONResponse(w, models.Response{Success: true, Message: "entity deleted successfully!"}, http.StatusOK)

	}
	switch {

	case r.Method == "PUT":
		d := models.Department{}
		err := json.NewDecoder(r.Body).Decode(&d)

		d.Id = id
		err = models.PutDepartment(&d)
		if err != nil {
			JSONResponse(w, models.Response{Success: false, Message: err.Error()}, http.StatusBadRequest)
			return
		}
		JSONResponse(w, d, http.StatusOK)

	}

}

// DepartmentSummary returns the summary for the current user's Department
func (as *Server) DepartmentsSummary(w http.ResponseWriter, r *http.Request) {
	// fmt.Printf("Run overviewdSDFDFSDd", r)
	switch {
	case r.Method == "GET":
		// fmt.Printf("Run overviewdd", r)
		vars := mux.Vars(r)
		id, _ := strconv.ParseInt(vars["id"], 0, 64)
		// err := json.NewDecoder(r.Body).Decode(&id)

		cs, err := models.GetDepartmentSummaries(id)
		if err != nil {
			log.Error(err)
			JSONResponse(w, models.Response{Success: false, Message: err.Error()}, http.StatusInternalServerError)
			return
		}
		JSONResponse(w, cs, http.StatusOK)
	}

	vars := mux.Vars(r)
	id, _ := strconv.ParseInt(vars["id"], 0, 64)
	switch {

	case r.Method == "DELETE":
		err := models.DeleteDepartment(id)
		err = models.DeleteTeamDepartment(id)
		if err != nil {
			JSONResponse(w, models.Response{Success: false, Message: "Error deleting template"}, http.StatusInternalServerError)
			return
		}
		JSONResponse(w, models.Response{Success: true, Message: "department deleted successfully!"}, http.StatusOK)

	}
	switch {

	case r.Method == "PUT":
		d := models.Department{}
		err := json.NewDecoder(r.Body).Decode(&d)

		d.Id = id
		err = models.PutDepartment(&d)
		if err != nil {
			JSONResponse(w, models.Response{Success: false, Message: err.Error()}, http.StatusBadRequest)
			return
		}
		JSONResponse(w, d, http.StatusOK)

	}

}
