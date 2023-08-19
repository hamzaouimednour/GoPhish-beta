package controllers

import (
	"bufio"
	"bytes"
	"compress/gzip"
	"context"
	"crypto/tls"
	"encoding/base32"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"html/template"
	"image/png"
	"io/ioutil"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/NYTimes/gziphandler"
	"github.com/gophish/gophish/auth"
	"github.com/gophish/gophish/config"
	ctx "github.com/gophish/gophish/context"
	"github.com/gophish/gophish/controllers/api"
	log "github.com/gophish/gophish/logger"
	mid "github.com/gophish/gophish/middleware"
	"github.com/gophish/gophish/middleware/ratelimit"
	"github.com/gophish/gophish/models"
	"github.com/gophish/gophish/util"
	"github.com/gophish/gophish/worker"
	"github.com/gorilla/csrf"
	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/gorilla/sessions"
	"github.com/jordan-wright/unindexed"
	"github.com/pquerna/otp"
	"github.com/pquerna/otp/totp"
)

var currentUserEntity models.User

// AdminServerOption is a functional option that is used to configure the
// admin server
type AdminServerOption func(*AdminServer)

// AdminServer is an HTTP server that implements the administrative Gophish
// handlers, including the dashboard and REST API.
type AdminServer struct {
	server  *http.Server
	worker  worker.Worker
	config  config.AdminServer
	limiter *ratelimit.PostLimiter
}

var defaultTLSConfig = &tls.Config{
	PreferServerCipherSuites: true,
	CurvePreferences: []tls.CurveID{
		tls.X25519,
		tls.CurveP256,
	},
	MinVersion: tls.VersionTLS12,
	CipherSuites: []uint16{
		tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
		tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
		tls.TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305,
		tls.TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305,
		tls.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
		tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,

		// Kept for backwards compatibility with some clients
		tls.TLS_RSA_WITH_AES_256_GCM_SHA384,
		tls.TLS_RSA_WITH_AES_128_GCM_SHA256,
	},
}

// WithWorker is an option that sets the background worker.
func WithWorker(w worker.Worker) AdminServerOption {
	return func(as *AdminServer) {
		as.worker = w
	}
}

// NewAdminServer returns a new instance of the AdminServer with the
// provided config and options applied.
func NewAdminServer(config config.AdminServer, options ...AdminServerOption) *AdminServer {
	defaultWorker, _ := worker.New()
	defaultServer := &http.Server{
		ReadTimeout: 10 * time.Second,
		Addr:        config.ListenURL,
	}
	defaultLimiter := ratelimit.NewPostLimiter()
	as := &AdminServer{
		worker:  defaultWorker,
		server:  defaultServer,
		limiter: defaultLimiter,
		config:  config,
	}
	for _, opt := range options {
		opt(as)
	}
	as.registerRoutes()
	return as
}

// Start launches the admin server, listening on the configured address.
func (as *AdminServer) Start() {
	if as.worker != nil {
		go as.worker.Start()
	}
	if as.config.UseTLS {
		// Only support TLS 1.2 and above - ref #1691, #1689
		as.server.TLSConfig = defaultTLSConfig
		err := util.CheckAndCreateSSL(as.config.CertPath, as.config.KeyPath)
		if err != nil {
			log.Fatal(err)
		}
		log.Infof("Starting admin server at https://%s", as.config.ListenURL)
		log.Fatal(as.server.ListenAndServeTLS(as.config.CertPath, as.config.KeyPath))
	}
	// If TLS isn't configured, just listen on HTTP
	log.Infof("Starting admin server at http://%s", as.config.ListenURL)
	log.Fatal(as.server.ListenAndServe())
}

// Shutdown attempts to gracefully shutdown the server.
func (as *AdminServer) Shutdown() error {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*10)
	defer cancel()
	return as.server.Shutdown(ctx)
}

// SetupAdminRoutes creates the routes for handling requests to the web interface.
// This function returns an http.Handler to be used in http.ListenAndServe().
func (as *AdminServer) registerRoutes() {
	router := mux.NewRouter()
	// Base Front-end routes
	router.HandleFunc("/", mid.Use(as.Base, mid.RequireLogin))
	router.HandleFunc("/login", mid.Use(as.Login, as.limiter.Limit))
	router.HandleFunc("/auth/callback", mid.Use(as.authCallback, as.limiter.Limit))
	router.HandleFunc("/loginmfa", mid.Use(as.LoginMfa, as.limiter.Limit))
	router.HandleFunc("/logout", mid.Use(as.Logout, mid.RequireLogin))
	router.HandleFunc("/reset_password", mid.Use(as.ResetPassword, mid.RequireLogin))
	// router.HandleFunc("/campaigns", mid.Use(as.Campaigns, mid.RequirePermissions([]string{"campaigns.access"}), mid.RequireLogin))
	router.HandleFunc("/campaigns/{id:[0-9]+}", mid.Use(as.CampaignID, mid.RequirePermissions([]string{"campaigns.access"}), mid.RequireLogin))
	router.HandleFunc("/campaign_parents", mid.Use(as.CampaignParents, mid.RequirePermissions([]string{"campaign_parents.access"}), mid.RequireLogin))
	router.HandleFunc("/campaign_parents/{id:[0-9]+}", mid.Use(as.Campaigns, mid.RequirePermissions([]string{"campaign_parents.access", "campaigns.access"}), mid.RequireLogin))
	router.HandleFunc("/templates", mid.Use(as.Templates, mid.RequirePermissions([]string{"templates.access"}), mid.RequireLogin))
	router.HandleFunc("/groups", mid.Use(as.Groups, mid.RequirePermissions([]string{"groups.access"}), mid.RequireLogin))
	router.HandleFunc("/landing_pages", mid.Use(as.LandingPages, mid.RequirePermissions([]string{"landing_pages.access"}), mid.RequireLogin))
	router.HandleFunc("/redirection_pages", mid.Use(as.RedirectionPages, mid.RequirePermissions([]string{"redirection_pages.access"}), mid.RequireLogin))
	router.HandleFunc("/domains", mid.Use(as.Domains, mid.RequirePermissions([]string{"groups.access"}), mid.RequireLogin))
	router.HandleFunc("/sending_profiles", mid.Use(as.SendingProfiles, mid.RequirePermissions([]string{"sending_profiles.access"}), mid.RequireLogin))
	router.HandleFunc("/settings", mid.Use(as.Settings, mid.RequirePermissions([]string{"settings.access"}), mid.RequireLogin))
	router.HandleFunc("/users", mid.Use(as.UserManagement, mid.RequirePermissions([]string{"users.access"}), mid.RequireLogin))
	router.HandleFunc("/teams", mid.Use(as.TeamManagement, mid.RequirePermissions([]string{"teams.access"}), mid.RequireLogin))
	router.HandleFunc("/departments", mid.Use(as.DepartmentManagement, mid.RequirePermissions([]string{"departments.access"}), mid.RequireLogin))
	router.HandleFunc("/departments/{id:[0-9]+}", mid.Use(as.DepartmentManagement, mid.RequirePermissions([]string{"departments.access"}), mid.RequireLogin))
	router.HandleFunc("/webhooks", mid.Use(as.Webhooks, mid.RequirePermissions([]string{"webhooks.access"}), mid.RequireLogin))
	router.HandleFunc("/impersonate", mid.Use(as.Impersonate, mid.RequirePermissions([]string{"impersonate.access"}), mid.RequireLogin))
	router.HandleFunc("/library_settings/{type:(?:topic|category)}", mid.Use(as.LibrarySettings, mid.RequirePermissions([]string{"library_settings.access"}), mid.RequireLogin))
	router.HandleFunc("/library_templates", mid.Use(as.LibraryTemplates, mid.RequirePermissions([]string{"library_templates.access"}), mid.RequireLogin))
	router.HandleFunc("/library_templates/new", mid.Use(as.LibraryTemplatesManage, mid.RequirePermissions([]string{"library_templates.access"}), mid.RequireLogin))
	router.HandleFunc("/library_templates/{action:(?:edit|copy)}/{id:[0-9]+}", mid.Use(as.LibraryTemplatesManage, mid.RequirePermissions([]string{"library_templates.access"}), mid.RequireLogin))

	// Create the API routes
	api := api.NewServer(
		api.WithWorker(as.worker),
		api.WithLimiter(as.limiter),
	)
	router.PathPrefix("/api/").Handler(api)

	// Setup static file serving
	router.PathPrefix("/").Handler(http.FileServer(unindexed.Dir("./static/")))

	// Setup CSRF Protection
	csrfKey := []byte(as.config.CSRFKey)
	if len(csrfKey) == 0 {
		csrfKey = []byte(auth.GenerateSecureKey(auth.APIKeyLength))
	}
	csrfHandler := csrf.Protect(csrfKey,
		csrf.FieldName("csrf_token"),
		csrf.Secure(as.config.UseTLS))
	adminHandler := csrfHandler(router)
	adminHandler = mid.Use(adminHandler.ServeHTTP, mid.CSRFExceptions, mid.GetContext, mid.ApplySecurityHeaders)

	// Setup GZIP compression
	gzipWrapper, _ := gziphandler.NewGzipLevelHandler(gzip.BestCompression)
	adminHandler = gzipWrapper(adminHandler)

	// Respect X-Forwarded-For and X-Real-IP headers in case we're behind a
	// reverse proxy.
	adminHandler = handlers.ProxyHeaders(adminHandler)

	// Setup logging
	adminHandler = handlers.CombinedLoggingHandler(log.Writer(), adminHandler)
	as.server.Handler = adminHandler
}

type templateParams struct {
	Title       string
	Flashes     []interface{}
	User        models.User
	Token       string
	Version     string
	Permissions []string
}

// newTemplateParams returns the default template parameters for a user and
// the CSRF token.
func newTemplateParams(r *http.Request) templateParams {
	user := ctx.Get(r, "user").(models.User)
	currentUserEntity = user
	session := ctx.Get(r, "session").(*sessions.Session)
	permissions, _ := user.GetPermissions()
	return templateParams{
		Token:       csrf.Token(r),
		User:        user,
		Version:     config.Version,
		Flashes:     session.Flashes(),
		Permissions: permissions,
	}
}

// Base handles the default path and template execution
func (as *AdminServer) Base(w http.ResponseWriter, r *http.Request) {
	params := newTemplateParams(r)
	params.Title = "Dashboard"
	getTemplate(w, "dashboard").ExecuteTemplate(w, "base", params)
}

// Campaigns handles the default path and template execution
func (as *AdminServer) Campaigns(w http.ResponseWriter, r *http.Request) {
	params := newTemplateParams(r)
	params.Title = "Campaigns"
	getTemplate(w, "campaigns").ExecuteTemplate(w, "base", params)
}

// CampaignID handles the default path and template execution
func (as *AdminServer) CampaignID(w http.ResponseWriter, r *http.Request) {
	params := newTemplateParams(r)
	params.Title = "Campaign Results"
	getTemplate(w, "campaign_results").ExecuteTemplate(w, "base", params)
}

// DepartmentID handles the default path and template execution
func (as *AdminServer) DepartmentIDManagement(w http.ResponseWriter, r *http.Request) {
	params := newTemplateParams(r)
	params.Title = "Department Results"
	getTemplate(w, "departments").ExecuteTemplate(w, "base", params)
}

// CampaignParents handles the default path and template execution
func (as *AdminServer) CampaignParents(w http.ResponseWriter, r *http.Request) {
	params := newTemplateParams(r)
	params.Title = "Campaigns"
	getTemplate(w, "campaign_parents").ExecuteTemplate(w, "base", params)
}

// CampaignParentID handles the default path and template execution
func (as *AdminServer) CampaignParentID(w http.ResponseWriter, r *http.Request) {
	params := newTemplateParams(r)
	params.Title = "Campaign Operations"
	getTemplate(w, "campaigns").ExecuteTemplate(w, "base", params)
}

// Templates handles the default path and template execution
func (as *AdminServer) Templates(w http.ResponseWriter, r *http.Request) {
	params := newTemplateParams(r)
	params.Title = "Email Templates"
	getTemplate(w, "templates").ExecuteTemplate(w, "base", params)
}

// Groups handles the default path and template execution
func (as *AdminServer) Groups(w http.ResponseWriter, r *http.Request) {
	params := newTemplateParams(r)
	params.Title = "Users & Groups"
	getTemplate(w, "groups").ExecuteTemplate(w, "base", params)
}
func (as *AdminServer) Domains(w http.ResponseWriter, r *http.Request) {
	params := newTemplateParams(r)
	params.Title = "Domains"
	getTemplate(w, "domains").ExecuteTemplate(w, "base", params)
}

// LandingPages handles the default path and template execution
func (as *AdminServer) LandingPages(w http.ResponseWriter, r *http.Request) {
	params := newTemplateParams(r)
	params.Title = "Landing Pages"
	getTemplate(w, "landing_pages").ExecuteTemplate(w, "base", params)
}

// LandingPages handles the default path and template execution
func (as *AdminServer) RedirectionPages(w http.ResponseWriter, r *http.Request) {
	params := newTemplateParams(r)
	params.Title = "Redirection Pages"
	getTemplate(w, "redirection_pages").ExecuteTemplate(w, "base", params)
}

// SendingProfiles handles the default path and template execution
func (as *AdminServer) SendingProfiles(w http.ResponseWriter, r *http.Request) {
	params := newTemplateParams(r)
	params.Title = "Sending Profiles"
	getTemplate(w, "sending_profiles").ExecuteTemplate(w, "base", params)
}

func display(key *otp.Key, data []byte) {
	fmt.Printf("Issuer:       %s\n", key.Issuer())
	fmt.Printf("Account Name: %s\n", key.AccountName())
	fmt.Printf("Secret:       %s\n", key.Secret())
	fmt.Println("Writing PNG to qr-code.png....")
	ioutil.WriteFile("qr-code.png", data, 0644)
	fmt.Println("")
	fmt.Println("Please add your TOTP to your OTP Application now!")
	fmt.Println("")
}

func promptForPasscode() string {
	reader := bufio.NewReader(os.Stdin)
	fmt.Print("Enter Passcode: ")
	text, _ := reader.ReadString('\n')
	return text
}

// Demo function, not used in main
// Generates Passcode using a UTF-8 (not base32) secret and custom parameters
func GeneratePassCode(utf8string string) string {
	secret := base32.StdEncoding.EncodeToString([]byte(utf8string))
	passcode, err := totp.GenerateCodeCustom(secret, time.Now(), totp.ValidateOpts{
		Period:    30,
		Skew:      1,
		Digits:    otp.DigitsSix,
		Algorithm: otp.AlgorithmSHA512,
	})
	if err != nil {
		panic(err)
	}
	return passcode
}

// Settings handles the changing of settings
func (as *AdminServer) Settings(w http.ResponseWriter, r *http.Request) {
	switch {
	case r.Method == "GET":
		params := newTemplateParams(r)
		params.Title = "Settings"
		session := ctx.Get(r, "session").(*sessions.Session)
		session.Save(r, w)
		key, err := totp.Generate(totp.GenerateOpts{
			Issuer:      "Trawler By Trustable",
			AccountName: params.User.Username,
		})
		if err != nil {
			panic(err)
		}
		// Convert TOTP key into a PNG
		var buf bytes.Buffer
		img, err := key.Image(200, 200)
		if err != nil {
			panic(err)
		}

		png.Encode(&buf, img)

		// Convert image to base64 encoded string
		encodedImage := base64.StdEncoding.EncodeToString(buf.Bytes())

		// Pass the encoded image to the template
		// tmpl := template.Must(template.New("imageTemplate").Parse(`<img src="data:image/png;base64,{{.EncodedImage}}" alt="Image">`))
		// tmpl.Execute(response, map[string]interface{}{
		// 	"EncodedImage": encodedImage,
		// })

		// // display the QR code to the user.
		// display(key, buf.Bytes())

		// // Now Validate that the user's successfully added the passcode.
		// fmt.Println("Validating TOTP...")
		// passcode := promptForPasscode()
		// valid := totp.Validate(passcode, key.Secret())
		// if valid {
		// 	println("Valid passcode!")
		// 	os.Exit(0)
		// } else {
		// 	println("Invalid passcode!")
		// 	os.Exit(1)
		// }

		getTemplate(w, "settings").ExecuteTemplate(w, "base", map[string]interface{}{
			"EncodedImage": encodedImage,
			"secret":       key.Secret(),
			"User":         params.User,
			"Title":        params.Title,
			"Flashes":      params.Flashes,
			"Token":        params.Token,
			"Version":      params.Version,
			"Permissions":  params.Permissions,
		})
	case r.Method == "POST":
		u := ctx.Get(r, "user").(models.User)
		currentPw := r.FormValue("current_password")
		newPassword := r.FormValue("new_password")
		confirmPassword := r.FormValue("confirm_new_password")
		// Check the current password
		err := auth.ValidatePassword(currentPw, u.Hash)
		msg := models.Response{Success: true, Message: "Settings Updated Successfully"}
		if err != nil {
			msg.Message = err.Error()
			msg.Success = false
			api.JSONResponse(w, msg, http.StatusBadRequest)
			return
		}
		newHash, err := auth.ValidatePasswordChange(u.Hash, newPassword, confirmPassword)
		if err != nil {
			msg.Message = err.Error()
			msg.Success = false
			api.JSONResponse(w, msg, http.StatusBadRequest)
			return
		}
		u.Hash = string(newHash)
		if err = models.PutUser(&u); err != nil {
			msg.Message = err.Error()
			msg.Success = false
			api.JSONResponse(w, msg, http.StatusInternalServerError)
			return
		}
		api.JSONResponse(w, msg, http.StatusOK)
	}
}

// UserManagement is an admin-only handler that allows for the registration
// and management of user accounts within Gophish.
func (as *AdminServer) UserManagement(w http.ResponseWriter, r *http.Request) {
	params := newTemplateParams(r)
	params.Title = "User Management"
	getTemplate(w, "users").ExecuteTemplate(w, "base", params)
}

// TeamManagement is an admin-only handler that allows for the registration
// and management of teams accounts within Gophish.
func (as *AdminServer) TeamManagement(w http.ResponseWriter, r *http.Request) {
	params := newTemplateParams(r)
	params.Title = "Entity Management"
	getTemplate(w, "teams").ExecuteTemplate(w, "base", params)
}

// DepartmentManagement is an admin-only handler that allows for the registration
// and management of teams accounts within Gophish.
func (as *AdminServer) DepartmentManagement(w http.ResponseWriter, r *http.Request) {
	params := newTemplateParams(r)
	params.Title = "Department Management"
	getTemplate(w, "departments").ExecuteTemplate(w, "base", params)
}

func (as *AdminServer) nextOrIndex(w http.ResponseWriter, r *http.Request) {
	next := "/"
	url, err := url.Parse(r.FormValue("next"))
	if err == nil {
		path := url.EscapedPath()
		if path != "" {
			next = "/" + strings.TrimLeft(path, "/")
		}
	}
	http.Redirect(w, r, next, http.StatusFound)
}

func (as *AdminServer) handleInvalidLogin(w http.ResponseWriter, r *http.Request, message string) {
	session := ctx.Get(r, "session").(*sessions.Session)
	Flash(w, r, "danger", message)
	params := struct {
		User    models.User
		Title   string
		Flashes []interface{}
		Token   string
	}{Title: "Login", Token: csrf.Token(r)}
	params.Flashes = session.Flashes()
	session.Save(r, w)
	templates := template.New("template")
	_, err := templates.ParseFiles("templates/login.html", "templates/flashes.html")
	if err != nil {
		log.Error(err)
	}
	// w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusUnauthorized)
	template.Must(templates, err).ExecuteTemplate(w, "base", params)
}

// Webhooks is an admin-only handler that handles webhooks
func (as *AdminServer) Webhooks(w http.ResponseWriter, r *http.Request) {
	params := newTemplateParams(r)
	params.Title = "Webhooks"
	getTemplate(w, "webhooks").ExecuteTemplate(w, "base", params)
}

// Webhooks is an Teams handler that handles webhooks
func (as *AdminServer) Teams(w http.ResponseWriter, r *http.Request) {
	params := newTemplateParams(r)
	params.Title = "Teams"
	getTemplate(w, "teams").ExecuteTemplate(w, "base", params)
}

// Webhooks is an Departmentshandler that handles webhooks
func (as *AdminServer) Departments(w http.ResponseWriter, r *http.Request) {
	params := newTemplateParams(r)
	params.Title = "Departments"
	getTemplate(w, "departments").ExecuteTemplate(w, "base", params)
}

func (as *AdminServer) LibrarySettings(w http.ResponseWriter, r *http.Request) {
	params := newTemplateParams(r)
	url := strings.Split(r.RequestURI, "/")
	params.Title = strings.Title(url[2])
	getTemplate(w, "library_settings").ExecuteTemplate(w, "base", params)
}

func (as *AdminServer) LibraryTemplates(w http.ResponseWriter, r *http.Request) {
	params := newTemplateParams(r)
	params.Title = "Scenario Library"
	getTemplate(w, "library_templates").ExecuteTemplate(w, "base", params)
}

func (as *AdminServer) LibraryTemplatesManage(w http.ResponseWriter, r *http.Request) {
	params := newTemplateParams(r)
	url := strings.Split(r.RequestURI, "/")
	params.Title = strings.Title(url[2]) + " Scenario"
	getTemplate(w, "library_templates_manage").ExecuteTemplate(w, "base", params)
}

// Impersonate allows an admin to login to a user account without needing the password
func (as *AdminServer) Impersonate(w http.ResponseWriter, r *http.Request) {

	if r.Method == "POST" {
		username := r.FormValue("username")
		u, err := models.GetUserByUsername(username)
		if err != nil {
			log.Error(err)
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		session := ctx.Get(r, "session").(*sessions.Session)
		session.Values["id"] = u.Id
		session.Save(r, w)
	}
	http.Redirect(w, r, "/", http.StatusFound)
}

// Login handles the authentication flow for a user. If credentials are valid,
// a session is created
func (as *AdminServer) Login(w http.ResponseWriter, r *http.Request) {
	params := struct {
		User    models.User
		Title   string
		Flashes []interface{}
		Token   string
	}{Title: "Login", Token: csrf.Token(r)}
	session := ctx.Get(r, "session").(*sessions.Session)
	switch {
	case r.Method == "GET":
		params.Flashes = session.Flashes()
		session.Save(r, w)
		templates := template.New("template")
		_, err := templates.ParseFiles("templates/login.html", "templates/flashes.html")
		if err != nil {
			log.Error(err)
		}
		template.Must(templates, err).ExecuteTemplate(w, "base", params)
	case r.Method == "POST":
		// Find the user with the provided username
		username, password := r.FormValue("username"), r.FormValue("password")
		u, err := models.GetUserByUsername(username)
		if err != nil {
			log.Error(err)
			as.handleInvalidLogin(w, r, "Invalid Username/Password")
			return
		}
		// Validate the user's password
		err = auth.ValidatePassword(password, u.Hash)
		if err != nil {
			log.Error(err)
			as.handleInvalidLogin(w, r, "Invalid Username/Password")
			return
		}
		if u.AccountLocked {
			as.handleInvalidLogin(w, r, "Account Locked")
			return
		}
		fmt.Println("Validating TOTP...")
		fmt.Println(u.IsTwoFA_Enabled)
		fmt.Println("Validating TOTP...")
		if u.IsTwoFA_Enabled != 0 {
			fmt.Println("Validating TOTP...")
			session.Values["idx"] = u.Id
			session.Save(r, w)
			http.Redirect(w, r, "/loginmfa", http.StatusFound)
		} else {
			u.LastLogin = time.Now().UTC()
			err = models.PutUser(&u)
			if err != nil {
				log.Error(err)
			}
			// If we've logged in, save the session and redirect to the dashboard
			session.Values["id"] = u.Id
			session.Save(r, w)
			as.nextOrIndex(w, r)
		}

	}
}

func (as *AdminServer) authCallback(w http.ResponseWriter, r *http.Request) {
	client_secret := "-ep8Q~9TrXz4fAjykgR.RKtdO~sMyLIxLfZDOaIb"
	client_id := "89a0e419-c5c8-40e4-93e3-5cb413add77a"
	redirect_uri := "https://adm.pp.trawler.cc/auth/callback"
	// handle the redirect and obtain the authorization code or access token
	code := r.URL.Query().Get("code")
	// create a new http client
	client := &http.Client{}
	// create a new request
	req, err := http.NewRequest("POST", "https://login.microsoftonline.com/e9f6b4e9-a09e-4099-a428-a64ab61b7d3c/oauth2/token", bytes.NewBuffer([]byte("grant_type=authorization_code&code="+code+"&redirect_uri="+redirect_uri+"&client_id="+client_id+"&client_secret="+client_secret)))
	req.Header.Add("Content-Type", "application/x-www-form-urlencoded")
	// execute the request
	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()
	// read the response body
	body, err := ioutil.ReadAll(resp.Body)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	// parse the response body as a JSON object
	var tokenResponse map[string]interface{}
	json.Unmarshal(body, &tokenResponse)
	// extract the ID token and access token from the response
	log.Info(tokenResponse)
	idToken := tokenResponse["id_token"]
	// accessToken := tokenResponse["access_token"]
	idTokenString, ok := idToken.(string)
	// log.Info(idTokenString)
	// log.Info(idToken)
	// log.Info("idToken")
	if !ok {
		http.Error(w, "invalid id token", http.StatusInternalServerError)
		return
	}
	//decode the ID token
	// token, err := jwt.Parse(idTokenString, func(token *jwt.Token) (interface{}, error) {
	// 	return []byte(client_secret), nil
	// 	// return jwt.ParseRSAPublicKeyFromPEM([]byte(client_secret))
	// })

	// if err != nil {
	// 	http.Error(w, "token error : "+err.Error(), http.StatusInternalServerError)
	// 	return
	// }
	parts := strings.Split(idTokenString, ".")
	header, _ := base64.RawURLEncoding.DecodeString(parts[0])
	payload, _ := base64.RawURLEncoding.DecodeString(parts[1])
	fmt.Println(string(header))
	fmt.Println(string(payload))

	var p map[string]interface{}
	json.Unmarshal(payload, &p)
	fmt.Println(p["unique_name"])

	// http.Error(w, "payload : "+p["unique_name"].(string), http.StatusInternalServerError)

	session := ctx.Get(r, "session").(*sessions.Session)

	// Find the user with the provided username

	u, err := models.GetUserByUsername(p["unique_name"].(string))
	if err != nil {
		log.Error(err)
		as.handleInvalidLogin(w, r, "Invalid Username/Password")
		return
	}
	// Validate the user's password

	if u.AccountLocked {
		as.handleInvalidLogin(w, r, "Account Locked")
		return
	}
	u.LastLogin = time.Now().UTC()
	err = models.PutUser(&u)
	if err != nil {
		log.Error(err)
	}
	// If we've logged in, save the session and redirect to the dashboard
	session.Values["id"] = u.Id
	session.Save(r, w)
	as.nextOrIndex(w, r)
	// return
	// extract the user information from the claims
	// claims := token.Claims.(jwt.MapClaims)
	// userID := claims["oid"].(string)
	// userName := claims["name"].(string)
	// userEmail := claims["unique_name"].(string)

	// log.Info(userEmail + userName + userID)
	// log.Info(idToken)

	// http.Redirect(w, r, "/dashboard", http.StatusFound)

}

// Login handles the authentication flow for a user. If credentials are valid,
// a session is created
func (as *AdminServer) LoginMfa(w http.ResponseWriter, r *http.Request) {
	switch {
	case r.Method == "GET":
		fmt.Println("Validating TOTPXX...")

		session := ctx.Get(r, "session").(*sessions.Session)
		idx, ok := session.Values["idx"].(int64)
		if !ok {
			http.Redirect(w, r, "/login", http.StatusFound)
		}
		us, err := models.GetUser(idx)
		user := us
		currentUserEntity = user
		permissions, _ := user.GetPermissions()
		params := templateParams{
			Token:       csrf.Token(r),
			User:        user,
			Version:     config.Version,
			Flashes:     session.Flashes(),
			Permissions: permissions,
		}
		fmt.Println(err)

		params.Title = "Settings"
		fmt.Println("Validating TOTP...")
		// session := ctx.Get(r, "session").(*sessions.Session)
		session.Save(r, w)

		getTemplate(w, "loginmfa").ExecuteTemplate(w, "base", map[string]interface{}{
			"User":        params.User,
			"Title":       params.Title,
			"Flashes":     params.Flashes,
			"Token":       params.Token,
			"Version":     params.Version,
			"Permissions": params.Permissions,
		})
	case r.Method == "POST":
		session := ctx.Get(r, "session").(*sessions.Session)
		// Find the user with the provided username
		username, passcode := r.FormValue("username"), r.FormValue("passcode")
		u, err := models.GetUserByUsername(username)
		if err != nil {
			log.Error(err)
			as.handleInvalidLogin(w, r, "Invalid Username/Password")
			return
		}
		// Validate the user's password

		if u.AccountLocked {
			as.handleInvalidLogin(w, r, "Account Locked")
			return
		}

		if u.IsTwoFA_Enabled != 0 {

			valid := totp.Validate(passcode, u.TwoFA_Secret)
			if valid {
				u.LastLogin = time.Now().UTC()
				err = models.PutUser(&u)
				if err != nil {
					log.Error(err)
				}
				// If we've logged in, save the session and redirect to the dashboard
				session.Values["id"] = u.Id
				session.Save(r, w)
				as.nextOrIndex(w, r)
			} else {
				session := ctx.Get(r, "session").(*sessions.Session)
				delete(session.Values, "id")
				Flash(w, r, "danger", "wrong passcode !!!")
				session.Save(r, w)
				http.Redirect(w, r, "/login", http.StatusFound)
			}

		} else {
			u.LastLogin = time.Now().UTC()
			err = models.PutUser(&u)
			if err != nil {
				log.Error(err)
			}
			// If we've logged in, save the session and redirect to the dashboard
			session.Values["id"] = u.Id
			session.Save(r, w)
			as.nextOrIndex(w, r)
		}

	}
}

// Logout destroys the current user session
func (as *AdminServer) Logout(w http.ResponseWriter, r *http.Request) {
	session := ctx.Get(r, "session").(*sessions.Session)
	delete(session.Values, "id")
	Flash(w, r, "success", "You have successfully logged out")
	session.Save(r, w)
	http.Redirect(w, r, "/login", http.StatusFound)
}

// ResetPassword handles the password reset flow when a password change is
// required either by the Gophish system or an administrator.
//
// This handler is meant to be used when a user is required to reset their
// password, not just when they want to.
//
// This is an important distinction since in this handler we don't require
// the user to re-enter their current password, as opposed to the flow
// through the settings handler.
//
// To that end, if the user doesn't require a password change, we will
// redirect them to the settings page.
func (as *AdminServer) ResetPassword(w http.ResponseWriter, r *http.Request) {
	u := ctx.Get(r, "user").(models.User)
	session := ctx.Get(r, "session").(*sessions.Session)
	if !u.PasswordChangeRequired {
		Flash(w, r, "info", "Please reset your password through the settings page")
		session.Save(r, w)
		http.Redirect(w, r, "/settings", http.StatusTemporaryRedirect)
		return
	}
	params := newTemplateParams(r)
	params.Title = "Reset Password"
	switch {
	case r.Method == http.MethodGet:
		params.Flashes = session.Flashes()
		session.Save(r, w)
		getTemplate(w, "reset_password").ExecuteTemplate(w, "base", params)
		return
	case r.Method == http.MethodPost:
		newPassword := r.FormValue("password")
		confirmPassword := r.FormValue("confirm_password")
		newHash, err := auth.ValidatePasswordChange(u.Hash, newPassword, confirmPassword)
		if err != nil {
			Flash(w, r, "danger", err.Error())
			params.Flashes = session.Flashes()
			session.Save(r, w)
			w.WriteHeader(http.StatusBadRequest)
			getTemplate(w, "reset_password").ExecuteTemplate(w, "base", params)
			return
		}
		u.PasswordChangeRequired = false
		u.Hash = newHash
		if err = models.PutUser(&u); err != nil {
			Flash(w, r, "danger", err.Error())
			params.Flashes = session.Flashes()
			session.Save(r, w)
			w.WriteHeader(http.StatusInternalServerError)
			getTemplate(w, "reset_password").ExecuteTemplate(w, "base", params)
			return
		}
		// TODO: We probably want to flash a message here that the password was
		// changed successfully. The problem is that when the user resets their
		// password on first use, they will see two flashes on the dashboard-
		// one for their password reset, and one for the "no campaigns created".
		//
		// The solution to this is to revamp the empty page to be more useful,
		// like a wizard or something.
		as.nextOrIndex(w, r)
	}
}

// TODO: Make this execute the template, too
func getTemplate(w http.ResponseWriter, tmpl string) *template.Template {
	templates := template.New("template")
	_, err := templates.ParseFiles("templates/base.html", "templates/nav.html", "templates/"+tmpl+".html", "templates/flashes.html")
	if err != nil {
		log.Error(err)
	}
	return template.Must(templates, err)
}

// Flash handles the rendering flash messages
func Flash(w http.ResponseWriter, r *http.Request, t string, m string) {
	session := ctx.Get(r, "session").(*sessions.Session)
	session.AddFlash(models.Flash{
		Type:    t,
		Message: m,
	})
}
