package api

import (
	"net/http"

	mid "github.com/gophish/gophish/middleware"
	"github.com/gophish/gophish/middleware/ratelimit"
	"github.com/gophish/gophish/worker"
	"github.com/gorilla/mux"
)

// ServerOption is an option to apply to the API server.
type ServerOption func(*Server)

// Server represents the routes and functionality of the Gophish API.
// It's not a server in the traditional sense, in that it isn't started and
// stopped. Rather, it's meant to be used as an http.Handler in the
// AdminServer.
type Server struct {
	handler http.Handler
	worker  worker.Worker
	limiter *ratelimit.PostLimiter
}

// NewServer returns a new instance of the API handler with the provided
// options applied.
func NewServer(options ...ServerOption) *Server {
	defaultWorker, _ := worker.New()
	defaultLimiter := ratelimit.NewPostLimiter()
	as := &Server{
		worker:  defaultWorker,
		limiter: defaultLimiter,
	}
	for _, opt := range options {
		opt(as)
	}
	as.registerRoutes()
	return as
}

// WithWorker is an option that sets the background worker.
func WithWorker(w worker.Worker) ServerOption {
	return func(as *Server) {
		as.worker = w
	}
}

func WithLimiter(limiter *ratelimit.PostLimiter) ServerOption {
	return func(as *Server) {
		as.limiter = limiter
	}
}

func (as *Server) registerRoutes() {
	root := mux.NewRouter()
	root = root.StrictSlash(true)
	router := root.PathPrefix("/api/").Subrouter()
	router.Use(mid.RequireAPIKey)
	router.Use(mid.EnforceViewOnly)
	router.HandleFunc("/imap/", mid.Use(as.IMAPServer, mid.RequirePermissions([]string{"imap.access"})))
	router.HandleFunc("/imap/validate", mid.Use(as.IMAPServerValidate, mid.RequirePermissions([]string{"imap.access"})))
	router.HandleFunc("/reset", as.Reset)
	router.HandleFunc("/mfa", as.Mfa)
	router.HandleFunc("/teams/", mid.Use(as.Teams, mid.RequirePermissions([]string{"teams.access"})))
	router.HandleFunc("/teams/summary", mid.Use(as.Teams, mid.RequirePermissions([]string{"teams.access"})))
	router.HandleFunc("/teams/{id:[0-9]+}", mid.Use(as.Teams, mid.RequirePermissions([]string{"teams.access"})))
	router.HandleFunc("/departments/", mid.Use(as.Departments, mid.RequirePermissions([]string{"departments.access"})))
	// router.HandleFunc("/departments/summary", mid.Use(as.Departments, mid.RequirePermissions([]string{"departments.access"})))
	router.HandleFunc("/departments/{id:[0-9]+}", mid.Use(as.DepartmentsSummary, mid.RequirePermissions([]string{"departments.access"})))
	router.HandleFunc("/campaigns/", mid.Use(as.Campaigns, mid.RequirePermissions([]string{"campaigns.access"})))
	router.HandleFunc("/campaigns/summary", mid.Use(as.CampaignsSummary, mid.RequirePermissions([]string{"campaigns.access"})))
	router.HandleFunc("/campaigns/{id:[0-9]+}", mid.Use(as.Campaign, mid.RequirePermissions([]string{"campaigns.access"})))
	router.HandleFunc("/campaigns/{id:[0-9]+}/results", mid.Use(as.CampaignResults, mid.RequirePermissions([]string{"campaigns.access"})))
	router.HandleFunc("/campaigns/{id:[0-9]+}/summary", mid.Use(as.CampaignSummary, mid.RequirePermissions([]string{"campaigns.access"})))
	router.HandleFunc("/campaigns/{id:[0-9]+}/complete", mid.Use(as.CampaignComplete, mid.RequirePermissions([]string{"campaigns.access"})))
	router.HandleFunc("/campaign_parents/", mid.Use(as.CampaignParents, mid.RequirePermissions([]string{"campaign_parents.access"})))
	router.HandleFunc("/campaign_parents/{id:[0-9]+}", mid.Use(as.CampaignParent, mid.RequirePermissions([]string{"campaign_parents.access", "campaigns.access"})))
	router.HandleFunc("/campaign_parents/{id:[0-9]+}/results", mid.Use(as.CampaignParentResults, mid.RequirePermissions([]string{"campaign_parents.access", "campaigns.access"})))
	router.HandleFunc("/campaign_parents/{id:[0-9]+}/launch", mid.Use(as.CampaignLaunch, mid.RequirePermissions([]string{"campaign_parents.access", "campaigns.access"})))
	router.HandleFunc("/campaign_parents/{id:[0-9]+}/stop", mid.Use(as.CampaignStop, mid.RequirePermissions([]string{"campaign_parents.access", "campaigns.access"})))
	router.HandleFunc("/groups/", mid.Use(as.Groups, mid.RequirePermissions([]string{"groups.access"})))
	router.HandleFunc("/groups/summary", mid.Use(as.GroupsSummary, mid.RequirePermissions([]string{"groups.access"})))
	router.HandleFunc("/groups/{id:[0-9]+}", mid.Use(as.Group, mid.RequirePermissions([]string{"groups.access"})))
	router.HandleFunc("/groups/{id:[0-9]+}/summary", mid.Use(as.GroupSummary, mid.RequirePermissions([]string{"groups.access"})))
	router.HandleFunc("/templates/", mid.Use(as.Templates, mid.RequirePermissions([]string{"templates.access"})))
	router.HandleFunc("/templates/{id:[0-9]+}", mid.Use(as.Template, mid.RequirePermissions([]string{"templates.access"})))
	router.HandleFunc("/domains/", mid.Use(as.Domains, mid.RequirePermissions([]string{"groups.access"})))
	router.HandleFunc("/pages/", mid.Use(as.Pages, mid.RequirePermissions([]string{"pages.access"})))
	router.HandleFunc("/pages/{id:[0-9]+}", mid.Use(as.Page, mid.RequirePermissions([]string{"pages.access"})))
	router.HandleFunc("/redirection_pages/", mid.Use(as.RedirectionPages, mid.RequirePermissions([]string{"redirection_pages.access"})))
	router.HandleFunc("/redirection_pages/list", mid.Use(as.RedirectionPagesList, mid.RequirePermissions([]string{"redirection_pages.access"})))
	router.HandleFunc("/redirection_pages/{id:[0-9]+}", mid.Use(as.RedirectionPage, mid.RequirePermissions([]string{"redirection_pages.access"})))
	router.HandleFunc("/smtp/", mid.Use(as.SendingProfiles, mid.RequirePermissions([]string{"smtp.access"})))
	router.HandleFunc("/smtp/{id:[0-9]+}", mid.Use(as.SendingProfile, mid.RequirePermissions([]string{"smtp.access"})))
	router.HandleFunc("/library_templates", mid.Use(as.LibraryTemplates, mid.RequirePermissions([]string{"library_templates.access"})))
	router.HandleFunc("/library_templates/search", mid.Use(as.LibraryTemplates, mid.RequirePermissions([]string{"library_templates.access"})))
	router.HandleFunc("/library_templates/{id:[0-9]+}", mid.Use(as.LibraryTemplate, mid.RequirePermissions([]string{"library_templates.access"})))
	router.HandleFunc("/library_settings/{type:(?:topic|category)}", mid.Use(as.LibrarySettings, mid.RequirePermissions([]string{"library_settings.access"})))
	router.HandleFunc("/library_settings/{type:(?:topic|category)}/{id:[0-9]+}", mid.Use(as.LibrarySetting, mid.RequirePermissions([]string{"library_settings.access"})))
	router.HandleFunc("/users/", mid.Use(as.Users, mid.RequirePermissions([]string{"users.access"})))
	router.HandleFunc("/users/permissions", mid.Use(as.Users, mid.RequireLogin))
	router.HandleFunc("/users/encryption", mid.Use(as.Encryption, mid.RequireLogin))
	router.HandleFunc("/users/owners", mid.Use(as.Users, mid.RequireLogin))
	router.HandleFunc("/users/{id:[0-9]+}", mid.Use(as.User, mid.RequirePermissions([]string{"users.access"})))
	router.HandleFunc("/util/send_test_email", mid.Use(as.SendTestEmail, mid.RequirePermissions([]string{"util.access"})))
	router.HandleFunc("/import/group", mid.Use(as.ImportGroup, mid.RequirePermissions([]string{"import.access"})))
	router.HandleFunc("/import/email", mid.Use(as.ImportEmail, mid.RequirePermissions([]string{"import.access"})))
	router.HandleFunc("/import/site", mid.Use(as.ImportSite, mid.RequirePermissions([]string{"import.access"})))
	router.HandleFunc("/webhooks/", mid.Use(as.Webhooks, mid.RequirePermissions([]string{"webhooks.access"})))
	router.HandleFunc("/webhooks/{id:[0-9]+}/validate", mid.Use(as.ValidateWebhook, mid.RequirePermissions([]string{"webhooks.access"})))
	router.HandleFunc("/webhooks/{id:[0-9]+}", mid.Use(as.Webhook, mid.RequirePermissions([]string{"webhooks.access"})))
	router.HandleFunc("/langs/", mid.Use(as.Languages, mid.RequireLogin))
	router.HandleFunc("/langs/{id:[0-9]+}", mid.Use(as.Language, mid.RequireLogin))
	router.HandleFunc("/results", mid.Use(as.Results, mid.RequireLogin))
	as.handler = router
}

func (as *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	as.handler.ServeHTTP(w, r)
}
