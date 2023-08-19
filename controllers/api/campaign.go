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
	"github.com/jinzhu/gorm"
)

// Campaigns returns a list of campaigns if requested via GET.
// If requested via POST, APICampaigns creates a new campaign and returns a reference to it.
func (as *Server) Campaigns(w http.ResponseWriter, r *http.Request) {
	switch {
	case r.Method == "GET":
		cs, err := models.GetCampaigns(ctx.Get(r, "user_id").(int64))
		if err != nil {
			log.Error(err)
		}
		JSONResponse(w, cs, http.StatusOK)
	//POST: Create a new campaign and return it as JSON
	case r.Method == "POST":
		c := models.Campaign{}
		// Put the request into a campaign
		err := json.NewDecoder(r.Body).Decode(&c)

		if err != nil {
			JSONResponse(w, models.Response{Success: false, Message: "Invalid JSON structure"}, http.StatusBadRequest)
			return
		}
		// check if campaign parent already ended
		cp, _ := models.GetCampaignParent(c.CampaignParentId, ctx.Get(r, "user_id").(int64))
		if cp.Status == "END" {

			JSONResponse(w, models.Response{Success: false, Message: "Campaign already ended"}, http.StatusBadRequest)
			return
		}
		c.CreatedDate = time.Now().UTC()
		err = models.PostCampaign(&c, ctx.Get(r, "user_id").(int64))
		if err != nil {
			JSONResponse(w, models.Response{Success: false, Message: err.Error()}, http.StatusBadRequest)
			return
		}
		// If the campaign is scheduled to launch immediately, send it to the worker.
		// Otherwise, the worker will pick it up at the scheduled time
		if c.Status == models.CampaignInProgress {
			log.Infof(">>> [+] Campaign UP, Operation started instantly: %+v", c.Id)
			go as.worker.LaunchCampaign(c)
		}

		JSONResponse(w, c, http.StatusCreated)
	}
}

// CampaignsSummary returns the summary for the current user's campaigns
func (as *Server) CampaignsSummary(w http.ResponseWriter, r *http.Request) {
	switch {
	case r.Method == "GET":
		cs, err := models.GetCampaignSummaries(ctx.Get(r, "user_id").(int64))
		if err != nil {
			log.Error(err)
			JSONResponse(w, models.Response{Success: false, Message: err.Error()}, http.StatusInternalServerError)
			return
		}
		JSONResponse(w, cs, http.StatusOK)
	}
}

// Campaign returns details about the requested campaign. If the campaign is not
// valid, APICampaign returns null.
func (as *Server) Campaign(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, _ := strconv.ParseInt(vars["id"], 0, 64)
	c, err := models.GetCampaign(id, ctx.Get(r, "user_id").(int64))
	if err != nil {
		log.Error(err)
		JSONResponse(w, models.Response{Success: false, Message: "Operation not found"}, http.StatusNotFound)
		return
	}
	switch {
	case r.Method == "GET":
		JSONResponse(w, c, http.StatusOK)
	case r.Method == "DELETE":
		err = models.DeleteCampaign(id)
		if err != nil {
			JSONResponse(w, models.Response{Success: false, Message: "Error deleting Operation"}, http.StatusInternalServerError)
			return
		}
		JSONResponse(w, models.Response{Success: true, Message: "Operation deleted successfully!"}, http.StatusOK)
	}
}

// CampaignResults returns just the results for a given campaign to
// significantly reduce the information returned.
func (as *Server) CampaignResults(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, _ := strconv.ParseInt(vars["id"], 0, 64)

	cAuth := models.CampaignAuthorization(id, ctx.Get(r, "user_id").(int64), ctx.Get(r, "user").(models.User))
	if cAuth == false {
		JSONResponse(w, models.Response{Success: false, Message: "Your are not authorized to perform this operation!"}, http.StatusForbidden)
		return
	}

	cr, err := models.GetCampaignResults(id, ctx.Get(r, "user_id").(int64))
	if err != nil {
		log.Error(err)
		JSONResponse(w, models.Response{Success: false, Message: "Operation not found"}, http.StatusNotFound)
		return
	}
	if r.Method == "GET" {
		JSONResponse(w, cr, http.StatusOK)
		return
	}
}

// CampaignSummary returns the summary for a given campaign.
func (as *Server) CampaignSummary(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, _ := strconv.ParseInt(vars["id"], 0, 64)
	switch {
	case r.Method == "GET":
		cs, err := models.GetCampaignSummary(id, ctx.Get(r, "user_id").(int64))
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				JSONResponse(w, models.Response{Success: false, Message: "Operation not found"}, http.StatusNotFound)
			} else {
				JSONResponse(w, models.Response{Success: false, Message: err.Error()}, http.StatusInternalServerError)
			}
			log.Error(err)
			return
		}
		JSONResponse(w, cs, http.StatusOK)
	}
}

// CampaignComplete effectively "ends" a campaign.
// Future phishing emails clicked will return a simple "404" page.
func (as *Server) CampaignComplete(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, _ := strconv.ParseInt(vars["id"], 0, 64)
	switch {
	case r.Method == "GET":
		err := models.CompleteCampaign(id, ctx.Get(r, "user_id").(int64))
		if err != nil {
			JSONResponse(w, models.Response{Success: false, Message: "Error completing Operation"}, http.StatusInternalServerError)
			return
		}
		JSONResponse(w, models.Response{Success: true, Message: "Operation completed successfully!"}, http.StatusOK)
	}
}

// CampaignComplete effectively "ends" a campaign.
// Future phishing emails clicked will return a simple "404" page.
func (as *Server) CampaignLaunch(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, _ := strconv.ParseInt(vars["id"], 0, 64)

	campaign, e := models.GetCampaignParent(id, ctx.Get(r, "user_id").(int64))
	if e != nil {
		JSONResponse(w, models.Response{Success: false, Message: "Error launching campaign"}, http.StatusInternalServerError)
		return
	}

	// check if the campaign already ended
	// no relaunch of campigns
	if campaign.Status != "DOWN" {
		log.Infof(">>> [!] Campaign already stopped/launched: %+v", campaign.Id)
		JSONResponse(w, models.Response{Success: false, Message: "Error launching campaign"}, http.StatusInternalServerError)
		return
	}

	// get campaign operations.
	operations, err := models.GetOperations(id, ctx.Get(r, "user_id").(int64))

	if len(operations) == 0 {
		JSONResponse(w, models.Response{Success: false, Message: "Can't launch a campaign without operations!"}, http.StatusNotAcceptable)
		return
	}

	// up campaign parent status
	campaign.UpdateCampaignStatus("UP")
	log.Infof(">>> [+] Campaign started: %+v", campaign.Id)

	if err != nil {
		JSONResponse(w, models.Response{Success: false, Message: "Error launching campaign"}, http.StatusInternalServerError)
		return
	}

	// Launch & Update each operation
	for _, c := range operations {
		if c.LaunchDate.IsZero() || c.LaunchDate.Before(time.Now().UTC()) {
			c.LaunchDate = time.Now().UTC()
			// InProgress
			err = c.UpdateForLaunch(models.CampaignInProgress, time.Now().UTC())
			c.Status = models.CampaignInProgress
		} else {
			// Queued
			err = c.UpdateStatus(models.StatusQueued)
			c.Status = models.StatusQueued
		}

		// update specific campaign fields (avoid regression issues) before launching it.
		if err != nil {
			log.Error(err)
			JSONResponse(w, models.Response{Success: false, Message: "Error launching campaign"}, http.StatusInternalServerError)
		}

		// Instant Launch Campaign

		if c.Status == models.CampaignInProgress {
			log.Infof(">>> [+] Campaign Launched, starting operation instantly: %+v", c.Id)
			go as.worker.LaunchCampaign(c)
		}
	}
	JSONResponse(w, models.Response{Success: true, Message: "Campaign launched successfully!"}, http.StatusOK)

}

func (as *Server) CampaignStop(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, _ := strconv.ParseInt(vars["id"], 0, 64)

	campaign, e := models.GetCampaignParent(id, ctx.Get(r, "user_id").(int64))
	if e != nil {
		JSONResponse(w, models.Response{Success: false, Message: "Error stoping Campaign"}, http.StatusInternalServerError)
		return
	}

	// end campaign parent status
	err := models.CompleteCampaignParent(campaign.Id, ctx.Get(r, "user_id").(int64))
	if err != nil {
		JSONResponse(w, models.Response{Success: false, Message: "Error stoping Campaign"}, http.StatusInternalServerError)
		return
	}

	JSONResponse(w, models.Response{Success: true, Message: "Campaign stoped successfully!"}, http.StatusOK)

}
