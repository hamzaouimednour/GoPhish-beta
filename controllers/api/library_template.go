package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	ctx "github.com/gophish/gophish/context"
	log "github.com/gophish/gophish/logger"
	"github.com/gophish/gophish/models"
	"github.com/gorilla/mux"
)

// Pages handles requests for the /api/pages/ endpoint
func (as *Server) LibraryTemplates(w http.ResponseWriter, r *http.Request) {

	switch {
	case r.Method == "GET":
		mTpl, tTpl, pTpl, err := models.GetLibraryTemplates(ctx.Get(r, "user_id").(int64))
		if err != nil {
			log.Error(err)
		}
		tpl := map[string][]models.LibraryTemplate{
			"master":  mTpl,
			"team":    tTpl,
			"private": pTpl,
		}
		JSONResponse(w, tpl, http.StatusOK)
	//POST: Create a new page and return it as JSON
	case r.Method == "POST":

		if strings.Contains(r.RequestURI, "search") {
			s := models.LibraryTemplateSearch{}
			err := json.NewDecoder(r.Body).Decode(&s)
			if err != nil {
				JSONResponse(w, models.Response{Success: false, Message: "Invalid request"}, http.StatusBadRequest)
				return
			}

			mTpl, tTpl, pTpl, err := models.SearchLibraryTemplates(ctx.Get(r, "user_id").(int64), s)
			if err != nil {
				log.Error(err)
			}
			tpl := map[string][]models.LibraryTemplate{
				"master":  mTpl,
				"team":    tTpl,
				"private": pTpl,
			}
			JSONResponse(w, tpl, http.StatusOK)
			return
		}

		p := models.LibraryTemplate{}
		// Put the request into a page
		err := json.NewDecoder(r.Body).Decode(&p)
		if err != nil {
			JSONResponse(w, models.Response{Success: false, Message: "Invalid request"}, http.StatusBadRequest)
			return
		}
		p.UserId = ctx.Get(r, "user_id").(int64)
		p.ModifiedDate = time.Now().UTC()
		err = models.PostLibraryTemplate(&p)
		if err != nil {
			JSONResponse(w, models.Response{Success: false, Message: err.Error()}, http.StatusInternalServerError)
			return
		}
		JSONResponse(w, p, http.StatusCreated)
	}
}

// Page contains functions to handle the GET'ing, DELETE'ing, and PUT'ing
// of a Page object
func (as *Server) LibraryTemplate(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, _ := strconv.ParseInt(vars["id"], 0, 64)
	p, err := models.GetLibraryTemplate(id, ctx.Get(r, "user_id").(int64))
	if err != nil {
		JSONResponse(w, models.Response{Success: false, Message: "Item not found"}, http.StatusNotFound)
		return
	}
	switch {
	case r.Method == "GET":
		JSONResponse(w, p, http.StatusOK)
	case r.Method == "DELETE":
		err = models.DeleteLibraryTemplate(id, ctx.Get(r, "user_id").(int64))
		if err != nil {
			JSONResponse(w, models.Response{Success: false, Message: err.Error()}, http.StatusInternalServerError)
			return
		}
		JSONResponse(w, models.Response{Success: true, Message: "Item Deleted Successfully"}, http.StatusOK)
	case r.Method == "PUT":
		p = models.LibraryTemplate{}
		err = json.NewDecoder(r.Body).Decode(&p)
		if err != nil {
			log.Error(err)
		}
		if p.Id != id {
			JSONResponse(w, models.Response{Success: false, Message: "/:id and /:item_id mismatch"}, http.StatusBadRequest)
			return
		}
		p.ModifiedDate = time.Now().UTC()
		err = models.PutLibraryTemplate(&p, ctx.Get(r, "user_id").(int64))
		if err != nil {
			JSONResponse(w, models.Response{Success: false, Message: "Error updating Item: " + err.Error()}, http.StatusInternalServerError)
			return
		}
		JSONResponse(w, p, http.StatusOK)
	}
}
