package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	ctx "github.com/gophish/gophish/context"
	log "github.com/gophish/gophish/logger"
	"github.com/gophish/gophish/models"
	"github.com/gorilla/mux"
	"github.com/jinzhu/gorm"
)

// Pages handles requests for the /api/pages/ endpoint
func (as *Server) LibrarySettings(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	typeName := vars["type"]

	switch {
	case r.Method == "GET":
		ps, err := models.GetLibrarySettingsByType(typeName)
		if err != nil {
			log.Error(err)
		}
		JSONResponse(w, ps, http.StatusOK)
	//POST: Create a new page and return it as JSON
	case r.Method == "POST":
		p := models.LibrarySetting{}
		// Put the request into a page
		err := json.NewDecoder(r.Body).Decode(&p)
		if err != nil {
			JSONResponse(w, models.Response{Success: false, Message: "Invalid request"}, http.StatusBadRequest)
			return
		}
		// Check to make sure the name is unique
		_, err = models.GetLibrarySettingByName(p.Name, p.Type, ctx.Get(r, "user_id").(int64))
		if err != gorm.ErrRecordNotFound {
			JSONResponse(w, models.Response{Success: false, Message: "Item name already in use"}, http.StatusConflict)
			log.Error(err)
			return
		}
		p.UserId = ctx.Get(r, "user_id").(int64)
		err = models.PostLibrarySetting(&p)
		if err != nil {
			JSONResponse(w, models.Response{Success: false, Message: err.Error()}, http.StatusInternalServerError)
			return
		}
		JSONResponse(w, p, http.StatusCreated)
	}
}

// Page contains functions to handle the GET'ing, DELETE'ing, and PUT'ing
// of a Page object
func (as *Server) LibrarySetting(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, _ := strconv.ParseInt(vars["id"], 0, 64)
	p, err := models.GetLibrarySetting(id)
	if err != nil {
		JSONResponse(w, models.Response{Success: false, Message: "Item not found"}, http.StatusNotFound)
		return
	}
	switch {
	case r.Method == "GET":
		JSONResponse(w, p, http.StatusOK)
	case r.Method == "DELETE":
		err = models.DeletLibrarySetting(id, ctx.Get(r, "user_id").(int64))
		if err != nil {
			JSONResponse(w, models.Response{Success: false, Message: "Error deleting Item"}, http.StatusInternalServerError)
			return
		}
		JSONResponse(w, models.Response{Success: true, Message: "Item Deleted Successfully"}, http.StatusOK)
	case r.Method == "PUT":
		p = models.LibrarySetting{}
		err = json.NewDecoder(r.Body).Decode(&p)
		if err != nil {
			log.Error(err)
		}
		if p.Id != id {
			JSONResponse(w, models.Response{Success: false, Message: "/:id and /:item_id mismatch"}, http.StatusBadRequest)
			return
		}
		err = models.PutLibrarySetting(&p, ctx.Get(r, "user_id").(int64))
		if err != nil {
			JSONResponse(w, models.Response{Success: false, Message: "Error updating Item: " + err.Error()}, http.StatusInternalServerError)
			return
		}
		JSONResponse(w, p, http.StatusOK)
	}
}
