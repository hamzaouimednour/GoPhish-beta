package api

import (
	"C"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/gophish/gophish/models"
)
import (
	"os/exec"
)

// Domainss contains functions to retrieve a list of existing Domains or create a
// new user. Domainss with the ModifySystem permissions can view and create users.
func (as *Server) Domains(w http.ResponseWriter, r *http.Request) {
	//var configPath = kingpin.Flag("config", "Location of config.json.").Default("./config.json").String()

	switch {
	case r.Method == "GET":
		g := models.Domain{}
		fmt.Println(g)
		JSONResponse(w, models.Response{Success: true, Message: "Successful login."}, http.StatusCreated)
	//POST: Create a new page and return it as JSON
	case r.Method == "POST":
		g := models.Domain{}

		// Put the request into a group
		err := json.NewDecoder(r.Body).Decode(&g)
		if err != nil {
			JSONResponse(w, models.Response{Success: false, Message: "Invalid JSON structure"}, http.StatusBadRequest)
			return
		}
		fmt.Println(g.Modal)

		//	client, _ := ovh.NewClient(
		//		"ovh-eu",
		//		"a7a71aef0e7b53ca",
		//		"54b11c8aef0918e22c2fea40db9133b1",
		//		"b9902ea271ea0038cb61cac14b9c5da2",
		//	)
		// Params
		//type AccessPutParams struct {
		//	OvhSubsidiary string `json:"ovhSubsidiary"`
		//}

		//params := &AccessPutParams{OvhSubsidiary: "FR"}
		// python path and the domains.py path
		//conf, err := config.LoadConfig(*configPath)
		cmd := exec.Command("python", "controllers/api/python/domains.py", "--domain", string(g.Name), "--cartId", string(g.CartId), "--modal", g.Modal)
		out, err := cmd.CombinedOutput()
		if err != nil {
			fmt.Println(err.Error())
		} else {
			fmt.Println(string(out))
		}
		//
		//fmt.Println(string(jsonMap))
		//res := client.Post("/order/cart", params, nil)
		//fmt.Println(res)
		//result := client.Get("/domain/zone/com/check?domain="+g.Name, g.Name)
		//fmt.Println(result)
		JSONResponse(w, models.Response{Success: true, Message: "Successful.", Data: string(out)}, http.StatusCreated)
		// JSONResponse(w, teamDep, http.StatusOK)
		return

	}
}
