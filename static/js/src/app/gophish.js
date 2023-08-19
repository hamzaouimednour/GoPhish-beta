function alertFlash(message) {
    $("#flashes").empty()
    $("#flashes").append("<div style=\"text-align:center\" class=\"alert alert-warning\">\
        <i class=\"fa fa-exclamation-triangle\"></i> " + message + "</div>")
}

function errorFlash(message) {
    $("#flashes").empty()
    $("#flashes").append("<div style=\"text-align:center\" class=\"alert alert-danger\">\
        <i class=\"fa fa-exclamation-circle\"></i> " + message + "</div>")
}

function successFlash(message) {
    $("#flashes").empty()
    $("#flashes").append("<div style=\"text-align:center\" class=\"alert alert-success\">\
        <i class=\"fa fa-check-circle\"></i> " + message + "</div>")
}

// Fade message after n seconds
function errorFlashFade(message, fade) {
    $("#flashes").empty()
    $("#flashes").append("<div style=\"text-align:center\" class=\"alert alert-danger\">\
        <i class=\"fa fa-exclamation-circle\"></i> " + message + "</div>")
    setTimeout(function() {
        $("#flashes").empty()
    }, fade * 1000);
}
// Fade message after n seconds
function successFlashFade(message, fade) {
    $("#flashes").empty()
    $("#flashes").append("<div style=\"text-align:center\" class=\"alert alert-success\">\
        <i class=\"fa fa-check-circle\"></i> " + message + "</div>")
    setTimeout(function() {
        $("#flashes").empty()
    }, fade * 1000);

}

function modalError(message) {
    $("#modal\\.flashes").empty().append("<div style=\"text-align:center\" class=\"alert alert-danger\">\
        <i class=\"fa fa-exclamation-circle\"></i> " + message + "</div>")
}
function modalSuccess(message) {
    $("#modal\\.flashes").empty().append("<div style=\"text-align:center\" class=\"alert alert-success\">\
        <i class=\"fa fa-exclamation-circle\"></i> " + message + "</div>")
}

function query(endpoint, method, data, async) {
    return $.ajax({
        url: "/api" + endpoint,
        async: async,
        method: method,
        data: JSON.stringify(data),
        dataType: "json",
        contentType: "application/json",
        beforeSend: function(xhr) {
            xhr.setRequestHeader('Authorization', 'Bearer ' + user.api_key);
        }
    })
}

function generateOptions(object, options = {}, table, owner = '') {
    let btnList = []
    let optionHTML = '<div class="pull-right">'

    let btnEdit = '\
    <span data-toggle="modal" data-backdrop="static" data-target="#modal">\
        <button class="btn btn-primary '+ options.class + '" data-toggle="tooltip" data-placement="left" title="Edit ' + options.name + '" onclick="' + options.onclick.edit + '">\
            <i class="fa fa-pencil"></i>\
        </button>\
    </span>';

    let btnCopy = '\
    <span data-toggle="modal" data-backdrop="static" data-target="#modal">\
        <button class="btn btn-primary '+ options.class + '" data-toggle="tooltip" data-placement="left" title="Copy ' + options.name + '" onclick="' + options.onclick.copy + '">\
            <i class="fa fa-copy"></i>\
        </button>\
    </span>';
    
    let btnDelete = '\
    <button class="btn btn-danger '+ options.class + '" onclick="' + options.onclick.delete + '" data-toggle="tooltip" data-placement="left" title="Delete ' + options.name + '">\
        <i class="fa fa-trash-o"></i>\
    </button>';

    // {Library Templates}
    if(object === 'library_templates') {
        btnList = ['edit', 'copy']
        if (user.role === 'admin') {
            if (table === 'teams') btnList = ['copy']
            if (table === 'masters') btnList.push('delete')
        } else {
            if (table === 'masters') btnList = ['copy']
            if (user.role === 'teamAdmin' && user.username === owner && table === 'teams') btnList.push('delete')
        }
        if (table === 'privates') btnList = ['copy', 'edit', 'delete']
    }

    if (btnList.includes('edit')) optionHTML += btnEdit;
    if (btnList.includes('copy')) optionHTML += btnCopy;
    if (btnList.includes('delete')) optionHTML += btnDelete;
    optionHTML += '</div>';

    return optionHTML;
}

function escapeHtml(text) {
    return $("<div/>").text(text).html()
}
window.escapeHtml = escapeHtml

function unescapeHtml(html) {
    return $("<div/>").html(html).text()
}

function getKeyByValue(object, value, key) {
    return Object.keys(object).find(oKey => object[key] == value);
}

function getArrayKeyByValue(arrayObjects, value, key) {
    if (!arrayObjects) arrayObjects = [];
    return arrayObjects.find(obj => obj[key] == value);
}


function getArrayKeyByValues(arrayObjects, values, key) {
    if (!arrayObjects) arrayObjects = [];
    if (!values) arrayObjects = [];
    let results = [];
    values.forEach(element => {
        results.push(arrayObjects.find(obj => obj[key] == element))
    });
    return results;
}

function flagLanguage(objLang) {
    return '<i class="' + ((objLang.hasOwnProperty('flag') && objLang.flag) ? objLang.flag : objLang.code) + ' flag"></i> (' + objLang.name + ')';
}

function percentage(partial, total) {
    p = 0
    if(total > 0) p = ((100 * partial) / total)
   return p.toFixed(2);
}

/**
 * 
 * @param {string} string - The input string to capitalize
 * 
 */
var capitalize = function (string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

/*
Define our API Endpoints
*/
var api = {
    // campaigns contains the endpoints for /campaigns
    campaigns: {
        // get() - Queries the API for GET /campaigns
        get: function() {
            return query("/campaigns/", "GET", {}, false)
        },
        // post() - Posts a campaign to POST /campaigns
        post: function(data) {
            return query("/campaigns/", "POST", data, false)
        },
        // summary() - Queries the API for GET /campaigns/summary
        summary: function() {
            return query("/campaigns/summary", "GET", {}, false)
        }
    },

    // campaignId contains the endpoints for /campaigns/:id
    campaignId: {
        // get() - Queries the API for GET /campaigns/:id
        get: function(id) {
            return query("/campaigns/" + id, "GET", {}, true)
        },
        // delete() - Deletes a campaign at DELETE /campaigns/:id
        delete: function(id) {
            return query("/campaigns/" + id, "DELETE", {}, false)
        },
        // results() - Queries the API for GET /campaigns/:id/results
        results: function(id) {
            return query("/campaigns/" + id + "/results", "GET", {}, false)
        },
        // complete() - Completes a campaign at POST /campaigns/:id/complete
        complete: function(id) {
            return query("/campaigns/" + id + "/complete", "GET", {}, true)
        },
        // summary() - Queries the API for GET /campaigns/summary
        summary: function(id) {
            return query("/campaigns/" + id + "/summary", "GET", {}, true)
        }
    },

    // campaign collections contains the endpoints for /campaign_parents
    campaignParents: {
        // get() - Queries the API for GET /campaign_parents
        get: function() {
            return query("/campaign_parents/", "GET", {}, false)
        },
        // post() - Posts a campaign to POST /campaign_parents
        post: function(data) {
            return query("/campaign_parents/", "POST", data, false)
        }
    },

    // campaignParentId contains the endpoints for /campaign_parents/:id
    campaignParentId: {
        // get() - Queries the API for GET /campaign_parents/:id
        get: function(id) {
            return query("/campaign_parents/" + id, "GET", {}, true)
        },
        // launch() - Queries the API for GET /campaign_parents/:id
        launch: function(id) {
            return query("/campaign_parents/" + id + "/launch", "GET", {}, true)
        },
        // stop() - Queries the API for GET /campaign_parents/:id
        stop: function(id) {
            return query("/campaign_parents/" + id + "/stop", "GET", {}, true)
        },
        // summary() - Queries the API for GET /campaign_parents/:id
        summary: function(id) {
            return query("/campaign_parents/" + id, "GET", {}, true)
        },
        // results() - Queries the API for GET /campaign_parents/:id/results
        results: function(id) {
            return query("/campaign_parents/" + id + "/results", "GET", {}, true)
        },
        // put() - Puts a campaign parent to PUT /campaign_parents/:id
        put: function(cp) {
            return query("/campaign_parents/" + cp.id, "PUT", cp, true)
        },
        // delete() - Deletes a campaign collection at DELETE /campaign_parents/:id
        delete: function(id) {
            return query("/campaign_parents/" + id, "DELETE", {}, false)
        }
    },
    librarySettings: {
        get: function(type) {
            return query("/library_settings/" + type, "GET", {}, false)
        },
        post: function(type, data) {
            return query("/library_settings/" + type, "POST", data, false)
        },
        getSetting: function(type, id) {
            return query("/library_settings/" + type + "/" + id, "GET", {}, false)
        },
        put: function(type, item) {
            return query("/library_settings/" + type + "/" + item.id, "PUT", item, false)
        },
        delete: function(type, id) {
            return query("/library_settings/" + type + "/" + id, "DELETE", {}, false)
        }
    },
    libraryTemplates: {
        get: function() {
            return query("/library_templates", "GET", {}, false)
        },
        post: function(data) {
            return query("/library_templates", "POST", data, false)
        },
        search: function(keywords) {
            return query("/library_templates/search", "POST", keywords, false)
        },
        getTemplate: function(id) {
            return query("/library_templates/" + id, "GET", {}, false)
        },
        put: function(item) {
            return query("/library_templates/" + item.id, "PUT", item, false)
        },
        delete: function(id) {
            return query("/library_templates/" + id, "DELETE", {}, false)
        }
    },
    // groups contains the endpoints for /groups
    groups: {
        // get() - Queries the API for GET /groups
        get: function() {
            return query("/groups/", "GET", {}, false)
        },
        // post() - Posts a group to POST /groups
        post: function(group) {
            return query("/groups/", "POST", group, false)
        },
        // summary() - Queries the API for GET /groups/summary
        summary: function() {
            return query("/groups/summary", "GET", {}, false)
        }
    },
    // groupId contains the endpoints for /groups/:id
    groupId: {
        // get() - Queries the API for GET /groups/:id
        get: function(id) {
            return query("/groups/" + id, "GET", {}, false)
        },
        // put() - Puts a group to PUT /groups/:id
        put: function(group) {
            return query("/groups/" + group.id, "PUT", group, false)
        },
        // delete() - Deletes a group at DELETE /groups/:id
        delete: function(id) {
            return query("/groups/" + id, "DELETE", {}, false)
        }
    },
    // DOMAIN apis
    domains: {
        // post() - Queries the API for GET /domains/:id
        post: function (domain) {
            return query("/domains/", "POST", domain, false)
        },
        // post() - Queries the API for GET /domains/:id

        get: function (id) {
            return query("/domains/" , "GET", {}, false)
        },
        // put() - Puts a group to PUT /domains/:id
        put: function (domains) {
            return query("/domains/" + group.id, "PUT", group, false)
        },
        // delete() - Deletes a group at DELETE /domains/:id
        delete: function (id) {
            return query("/domains/" + id, "DELETE", {}, false)
        }
    },
    // templates contains the endpoints for /templates
    templates: {
        // get() - Queries the API for GET /templates
        get: function() {
            return query("/templates/", "GET", {}, false)
        },
        // post() - Posts a template to POST /templates
        post: function(template) {
            return query("/templates/", "POST", template, false)
        }
    },
    // templateId contains the endpoints for /templates/:id
    templateId: {
        // get() - Queries the API for GET /templates/:id
        get: function(id) {
            return query("/templates/" + id, "GET", {}, false)
        },
        // put() - Puts a template to PUT /templates/:id
        put: function(template) {
            return query("/templates/" + template.id, "PUT", template, false)
        },
        // delete() - Deletes a template at DELETE /templates/:id
        delete: function(id) {
            return query("/templates/" + id, "DELETE", {}, false)
        }
    },
    // pages contains the endpoints for /pages
    pages: {
        // get() - Queries the API for GET /pages
        get: function() {
            return query("/pages/", "GET", {}, false)
        },
        // post() - Posts a page to POST /pages
        post: function(page) {
            return query("/pages/", "POST", page, false)
        }
    },
    // pageId contains the endpoints for /pages/:id
    pageId: {
        // get() - Queries the API for GET /pages/:id
        get: function(id) {
            return query("/pages/" + id, "GET", {}, false)
        },
        // put() - Puts a page to PUT /pages/:id
        put: function(page) {
            return query("/pages/" + page.id, "PUT", page, false)
        },
        // delete() - Deletes a page at DELETE /pages/:id
        delete: function(id) {
            return query("/pages/" + id, "DELETE", {}, false)
        }
    },
    // pages contains the endpoints for /redirection_pages
    redirectionPages: {
        // get() - Queries the API for GET /redirection_pages
        get: function() {
            return query("/redirection_pages/", "GET", {}, false)
        },
        // post() - Posts a page to POST /redirection_pages
        post: function(page) {
            return query("/redirection_pages/", "POST", page, false)
        },
        // list() - Queries the API for GET /redirection_pages
        list: function() {
            return query("/redirection_pages/list", "GET", {}, false)
        },
    },
    // pageId contains the endpoints for /pages/:id
    redirectionPageId: {
        // get() - Queries the API for GET /pages/:id
        get: function(id) {
            return query("/redirection_pages/" + id, "GET", {}, false)
        },
        // put() - Puts a page to PUT /pages/:id
        put: function(page) {
            return query("/redirection_pages/" + page.id, "PUT", page, false)
        },
        // delete() - Deletes a page at DELETE /pages/:id
        delete: function(id) {
            return query("/redirection_pages/" + id, "DELETE", {}, false)
        }
    },
    
    // pageId contains the endpoints for /pages/:id
    lang: {
        // get() - Queries the API for GET /pages/:id
        get: function(id) {
            return query("/langs/" + id, "GET", {}, false)
        },
        list: function() {
            return query("/langs/", "GET", {}, false)
        },
    },
    // SMTP contains the endpoints for /smtp
    SMTP: {
        // get() - Queries the API for GET /smtp
        get: function() {
            return query("/smtp/", "GET", {}, false)
        },
        // post() - Posts a SMTP to POST /smtp
        post: function(smtp) {
            return query("/smtp/", "POST", smtp, false)
        }
    },
    // SMTPId contains the endpoints for /smtp/:id
    SMTPId: {
        // get() - Queries the API for GET /smtp/:id
        get: function(id) {
            return query("/smtp/" + id, "GET", {}, false)
        },
        // put() - Puts a SMTP to PUT /smtp/:id
        put: function(smtp) {
            return query("/smtp/" + smtp.id, "PUT", smtp, false)
        },
        // delete() - Deletes a SMTP at DELETE /smtp/:id
        delete: function(id) {
            return query("/smtp/" + id, "DELETE", {}, false)
        }
    },
    // IMAP containts the endpoints for /imap/
    IMAP: {
        get: function() {
            return query("/imap/", "GET", {}, !1)
        },
        post: function(e) {
            return query("/imap/", "POST", e, !1)
        },
        validate: function(e) {
            return query("/imap/validate", "POST", e, true)
        }
    },
    // users contains the endpoints for /users
    users: {
        // get() - Queries the API for GET /users
        get: function() {
            return query("/users/", "GET", {}, true)
        },
        // getPermissions() - Queries the API for GET /users/:id
        getPermissions: function() {
            return query("/users/permissions", "GET", {}, true)
        },
        // post() - Posts a user to POST /users
        post: function(user) {
            return query("/users/", "POST", user, true)
        },
        // post() - Posts a user to POST /users
        owners: function(owners) {
            return query("/users/owners", "POST", owners, false)
        },
        // post() - update encryption details
        updateEncryption: function(data) {
            return query("/users/encryption", "POST", data, false)
        },
        // post() - update encryption details
        getEncryption: function() {
            return query("/users/encryption/", "GET", {}, false)
        }
    },
    // teams contains the endpoints for /teams
    teams: {
        // get() - Queries the API for GET /teams
        get: function() {
            return query("/teams/", "GET", {}, true)
        },
        // post() - Posts a team to POST /teams
        post: function(team) {
            
            return query("/teams/", "POST", team, true);

        },
        // put() - Puts a team to PUT /team/:id
        put: function(team) {
            return query("/teams/" + team.id, "PUT", team, true)
        },
        // delete() - Deletes a team at DELETE /teams/:id
        delete: function(id) {
            return query("/teams/" + id, "DELETE", {}, false)
        }
    },
    // departments contains the endpoints for /departments
    departments: {
        // get() - Queries the API for GET /departments
        get: function() {
            return query("/departments/", "GET", {}, true)
        },
        // post() - Posts a department to POST /departments
        post: function(department) {
            return query("/departments/", "POST", department, true);

        },
        // put() - Puts a department to PUT /department/:id
        put: function(department) {
            return query("/departments/" + department.id, "PUT", department, true)
        },
        // delete() - Deletes a department at DELETE /departments/:id
        delete: function(id) {
            return query("/departments/" + id, "DELETE", {}, false)
        }
    },
    // campaignId contains the endpoints for /campaigns/:id
    departmentId: {
        // get() - Queries the API for GET /campaigns/:id
        get: function(id) {
            
            return query("/departments/" + id, "GET", {}, true)
        },
    },
    // userId contains the endpoints for /users/:id
    userId: {
        // get() - Queries the API for GET /users/:id
        get: function(id) {
            return query("/users/" + id, "GET", {}, true)
        },
        // put() - Puts a user to PUT /users/:id
        put: function(user) {
            return query("/users/" + user.id, "PUT", user, true)
        },
        // delete() - Deletes a user at DELETE /users/:id
        delete: function(id) {
            return query("/users/" + id, "DELETE", {}, true)
        }
    },
    results: {
        get: function() {
            return query("/results/", "GET", {}, false)
        },
    },
    webhooks: {
        get: function() {
            return query("/webhooks/", "GET", {}, false)
        },
        post: function(webhook) {
            return query("/webhooks/", "POST", webhook, false)
        },
    },
    webhookId: {
        get: function(id) {
            return query("/webhooks/" + id, "GET", {}, false)
        },
        put: function(webhook) {
            return query("/webhooks/" + webhook.id, "PUT", webhook, true)
        },
        delete: function(id) {
            return query("/webhooks/" + id, "DELETE", {}, false)
        },
        ping: function(id) {
            return query("/webhooks/" + id + "/validate", "POST", {}, true)
        },
    },
    // import handles all of the "import" functions in the api
    import_email: function(req) {
        return query("/import/email", "POST", req, false)
    },
    // clone_site handles importing a site by url
    clone_site: function(req) {
        return query("/import/site", "POST", req, false)
    },
    // send_test_email sends an email to the specified email address
    send_test_email: function(req) {
        return query("/util/send_test_email", "POST", req, true)
    },
    reset: function() {
        return query("/reset", "POST", {}, true)
    },
    mfa: function (req) {
        return query("/mfa", "POST", req, true)
    }
}
window.api = api

// list of available languages.
var langs = []

function getOwners(ids){
    let ownersList = []
    api.users.owners({'owners': ids}).success(function(data){
        ownersList = data
    })
    return ownersList
}

// Register our moment.js datatables listeners
$(document).ready(function() {
    // Setup nav highlighting
    var path = '/' + location.pathname.split('/')[1];
    var link = "";
    $('.nav-sidebar li').each(function() {
        var $this = $(this);
        link = $this.find("a").attr('href');
        // if the current path is like this link, make it active
        if (link === path) {
            $this.addClass('active');
        }
        let specialTags = [
            {p: "/campaigns", val: "/campaign_parents"},
            {p: "/library_settings", val: "/category"},
            {p: "/library_settings", val: "/topic"},
        ];
        for (let index = 0; index < specialTags.length; index++) {
            const tag = specialTags[index];
            if (path === tag.p && location.pathname.endsWith(tag.val) && link != undefined && link.endsWith(tag.val)) {
                if(!$this.hasClass('active')) {
                    $this.addClass('active');
                }
            }   
        }
    })
    $.fn.dataTable.moment('MMMM Do YYYY, h:mm:ss a');
    // Setup tooltips
    $('[data-toggle="tooltip"]').tooltip()
});