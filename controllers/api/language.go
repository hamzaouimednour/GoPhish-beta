package api

import (
	"net/http"
	"strconv"

	"github.com/gophish/gophish/models"
	"github.com/gorilla/mux"
)

func (as *Server) Languages(w http.ResponseWriter, r *http.Request) {
	switch {
	case r.Method == "GET":
		langs, err := models.GetLanguages()
		if err != nil {
			JSONResponse(w, models.Response{Success: false, Message: "No languages found"}, http.StatusNotFound)
			return
		}
		JSONResponse(w, langs, http.StatusOK)
	}
}

func (as *Server) Language(w http.ResponseWriter, r *http.Request) {
	switch {
	case r.Method == "GET":
		vars := mux.Vars(r)
		id, _ := strconv.ParseInt(vars["id"], 0, 64)
		lang, err := models.GetLanguage(id)
		if err != nil {
			JSONResponse(w, models.Response{Success: false, Message: "Language not found"}, http.StatusNotFound)
			return
		}
		JSONResponse(w, lang, http.StatusOK)
	}
}
