package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	ctx "github.com/gophish/gophish/context"
	log "github.com/gophish/gophish/logger"
	"github.com/gophish/gophish/models"
	"github.com/gorilla/mux"
)

// CampaignParents handles requests for the /api/campaign_parents/ endpoint
func (as *Server) CampaignParents(w http.ResponseWriter, r *http.Request) {
	switch {
	case r.Method == "GET":
		ps, cpd, ca, err := models.GetCampaignParents(ctx.Get(r, "user_id").(int64))
		if err != nil {
			log.Error(err)
		}
		data := map[string]interface{}{
			"campaigns":              ps,
			"campaigns_details":      cpd,
			"campaigns_advancements": ca,
		}
		JSONResponse(w, data, http.StatusOK)
	//POST: Create a new campaigns parent and return it as JSON
	case r.Method == "POST":
		cp := models.CampaignParent{}
		// status 1
		cp.Status = "DOWN"

		// Put the request into a campaigns parent
		err := json.NewDecoder(r.Body).Decode(&cp)
		if err != nil {
			JSONResponse(w, models.Response{Success: false, Message: "Invalid request"}, http.StatusBadRequest)
			return
		}
		cp.UserId = ctx.Get(r, "user_id").(int64)
		cp.CreatedDate = time.Now().UTC()
		err = models.PostCampaignParent(&cp)
		if err != nil {
			JSONResponse(w, models.Response{Success: false, Message: err.Error()}, http.StatusInternalServerError)
			return
		}
		JSONResponse(w, cp, http.StatusCreated)
	}
}

// CampaignParent contains functions to handle the GET'ing, DELETE'ing, and PUT'ing
// of a CampaignParent object
func (as *Server) CampaignParent(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, _ := strconv.ParseInt(vars["id"], 0, 64)

	cAuth := models.CampaignParentAuthorization(id, ctx.Get(r, "user_id").(int64), ctx.Get(r, "user").(models.User))
	if cAuth == false {
		JSONResponse(w, models.Response{Success: false, Message: "Your are not authorized to perform this operation!"}, http.StatusForbidden)
		return
	}

	cp, err := models.GetCampaignsByParent(id, ctx.Get(r, "user_id").(int64))
	if err != nil {
		JSONResponse(w, models.Response{Success: false, Message: "Campaign not found"}, http.StatusNotFound)
		return
	}
	switch {
	case r.Method == "GET":
		JSONResponse(w, cp, http.StatusOK)
	case r.Method == "DELETE":
		err = models.DeleteCampaignParent(id, ctx.Get(r, "user_id").(int64))
		if err != nil {
			JSONResponse(w, models.Response{Success: false, Message: "Error deleting campaign"}, http.StatusInternalServerError)
			return
		}
		JSONResponse(w, models.Response{Success: true, Message: "Campaign Deleted Successfully"}, http.StatusOK)
	case r.Method == "PUT":
		cpEdit := models.CampaignParent{}
		err = json.NewDecoder(r.Body).Decode(&cpEdit)
		if err != nil {
			log.Error(err)
		}
		if cpEdit.Id != id {
			JSONResponse(w, models.Response{Success: false, Message: "/:id and /:campaign_parent_id mismatch"}, http.StatusBadRequest)
			return
		}
		err = models.PutCampaignParent(&cpEdit)
		if err != nil {
			JSONResponse(w, models.Response{Success: false, Message: "Error updating campaign: " + err.Error()}, http.StatusInternalServerError)
			return
		}
		JSONResponse(w, cpEdit, http.StatusOK)
	}
}

func (as *Server) CampaignParentResults(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, _ := strconv.ParseInt(vars["id"], 0, 64)

	cAuth := models.CampaignParentAuthorization(id, ctx.Get(r, "user_id").(int64), ctx.Get(r, "user").(models.User))
	if cAuth == false {
		JSONResponse(w, models.Response{Success: false, Message: "Your are not authorized to perform this operation!"}, http.StatusForbidden)
		return
	}

	cprs, err := models.GetOperationsResults(id, ctx.Get(r, "user_id").(int64))

	if err != nil {
		JSONResponse(w, models.Response{Success: false, Message: "Operations stats not found"}, http.StatusNotFound)
		return
	}
	if r.Method == "GET" {
		JSONResponse(w, cprs, http.StatusOK)
		return
	}
}

func (as *Server) Results(w http.ResponseWriter, r *http.Request) {

	if r.Method == "GET" {
		// Load all victims that submitted data
		rs := models.GetResultsByStatus([]string{models.EventClicked})
		JSONResponse(w, rs, http.StatusOK)
		return
	}
}
