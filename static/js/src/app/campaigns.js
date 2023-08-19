let operationDetailsDataToExport = [];
operationDetailsDataToExport.push([
    'Name',
    'Template',
    'Group',
    'Risque level',
    'Created Date',
    'Status'
]);
let operationResultDataToExport = [];
operationResultDataToExport.push([
    'id', 'status', 'ip', 'latitude', 'longitude', 'send date', 'reported', 'modified date', 'email', 'first name', 'last name', 'position', 'department', 'entity', 'location'
]);
// labels is a map of campaign statuses to
// CSS classes
var labels = {
    "In progress": "label-primary",
    "Queued": "label-info",
    "Completed": "label-success",
    "Emails Sent": "label-success",
    "Error": "label-danger"
}

var campaigns = []
var campaign = {}
var groups = []
var libraryTemplates = []

// Launch attempts to POST to /campaigns/
function launch() {
    Swal.fire({
        title: "Are you sure?",
        text: "This will schedule the operation to be launched.",
        type: "question",
        animation: false,
        showCancelButton: true,
        confirmButtonText: "Schedule",
        confirmButtonColor: "#428bca",
        reverseButtons: true,
        allowOutsideClick: false,
        showLoaderOnConfirm: true,
        preConfirm: function () {
            return new Promise(function (resolve, reject) {
                groups = []
                $("#users").select2("data").forEach(function (group) {
                    groups.push({
                        name: group.text
                    });
                })
                // Validate our fields
                var send_by_date = $("#send_by_date").val()
                if (send_by_date != "") {
                    send_by_date = moment(send_by_date, "MMMM Do YYYY, h:mm a").utc().format()
                }
                campaign = {
                    name: $("#name").val(),
                    campaign_parent_id: parseInt(window.location.pathname.split('/').slice(-1)[0]),
                    library_template_id: parseInt($('#library').val()),
                    launch_date: moment($("#launch_date").val(), "MMMM Do YYYY, h:mm a").utc().format(),
                    send_by_date: send_by_date || null,
                    groups: groups,
                }
                // Submit the campaign
                api.campaigns.post(campaign)
                    .success(function (data) {
                        resolve()
                        campaign = data
                    })
                    .error(function (data) {
                        $("#modal\\.flashes").empty().append("<div style=\"text-align:center\" class=\"alert alert-danger\">\
            <i class=\"fa fa-exclamation-circle\"></i> " + data.responseJSON.message + "</div>")
                        Swal.close()
                    })
            })
        }
    }).then(function (result) {
        if (result.value) {
            Swal.fire(
                'Operation Scheduled!',
                'This operation has been scheduled for launch!',
                'success'
            );
        }
        $('button:contains("OK")').on('click', function () {
            // window.location = "/campaigns/" + campaign.id.toString()
            location.reload()
        })
    })
}

function dismiss() {
    $("#modal\\.flashes").empty();
    $("#name").val("");
    $("#template").val("").change();
    $("#page").val("").change();
    $("#url").val("");
    $("#profile").val("").change();
    $("#users").val("").change();
    $("#modal").modal('hide');
}

function deleteCampaign(idx) {
    Swal.fire({
        title: "Are you sure?",
        text: "This will delete the operation. This can't be undone!",
        type: "warning",
        animation: false,
        showCancelButton: true,
        confirmButtonText: "Delete " + campaigns[idx].name,
        confirmButtonColor: "#428bca",
        reverseButtons: true,
        allowOutsideClick: false,
        preConfirm: function () {
            return new Promise(function (resolve, reject) {
                api.campaignId.delete(campaigns[idx].id)
                    .success(function (msg) {
                        resolve()
                    })
                    .error(function (data) {
                        reject(data.responseJSON.message)
                    })
            })
        }
    }).then(function (result) {
        if (result.value) {
            Swal.fire(
                'Operation Deleted!',
                'This operation has been deleted!',
                'success'
            );
        }
        $('button:contains("OK")').on('click', function () {
            location.reload()
        })
    })
}

function setupOptions() {
    api.groups.summary()
        .success(function (summaries) {
            groups = summaries.groups
            if (groups.length == 0) {
                modalError("No groups found!")
                return false;
            } else {
                var group_s2 = $.map(groups, function (obj) {
                    obj.text = obj.name
                    obj.title = obj.num_targets + " targets"
                    return obj
                });
                $("#users.form-control").select2({
                    placeholder: "Select Groups",
                    data: group_s2,
                });
            }
        });
    api.templates.get()
        .success(function (templates) {
            if (templates.length == 0) {
                modalError("No templates found!")
                return false
            } else {
                var template_s2 = $.map(templates, function (obj) {
                    obj.text = obj.name
                    return obj
                });
                var template_select = $("#template.form-control")
                template_select.select2({
                    placeholder: "Select a Template",
                    data: template_s2,
                });
                if (templates.length === 1) {
                    template_select.val(template_s2[0].id)
                    template_select.trigger('change.select2')
                }
            }
        });
    api.pages.get()
        .success(function (pages) {
            if (pages.length == 0) {
                modalError("No pages found!")
                return false
            } else {
                var page_s2 = $.map(pages, function (obj) {
                    obj.text = obj.name
                    return obj
                });
                var page_select = $("#page.form-control")
                page_select.select2({
                    placeholder: "Select a Landing Page",
                    data: page_s2,
                });
                if (pages.length === 1) {
                    page_select.val(page_s2[0].id)
                    page_select.trigger('change.select2')
                }
            }
        });
    api.SMTP.get()
        .success(function (profiles) {
            if (profiles.length == 0) {
                modalError("No profiles found!")
                return false
            } else {
                var profile_s2 = $.map(profiles, function (obj) {
                    obj.text = obj.name
                    return obj
                });
                var profile_select = $("#profile.form-control")
                profile_select.select2({
                    placeholder: "Select a Sending Profile",
                    data: profile_s2,
                }).select2("val", profile_s2[0]);
                if (profiles.length === 1) {
                    profile_select.val(profile_s2[0].id)
                    profile_select.trigger('change.select2')
                }
            }
        });
}

function edit(campaign) {
    setupOptions();
}

function copy(idx) {
    setupOptions();
    // Set our initial values
    api.campaignId.get(campaigns[idx].id)
        .success(function (campaign) {
            $("#name").val("Copy of " + campaign.name)
            if (!campaign.template.id) {
                $("#template").select2({
                    placeholder: campaign.template.name
                });
            } else {
                $("#template").val(campaign.template.id.toString());
                $("#template").trigger("change.select2")
            }
            if (!campaign.page.id) {
                $("#page").select2({
                    placeholder: campaign.page.name
                });
            } else {
                $("#page").val(campaign.page.id.toString());
                $("#page").trigger("change.select2")
            }
            if (!campaign.smtp.id) {
                $("#profile").select2({
                    placeholder: campaign.smtp.name
                });
            } else {
                $("#profile").val(campaign.smtp.id.toString());
                $("#profile").trigger("change.select2")
            }
            $("#url").val(campaign.url)
            $("#library").val(campaign.library_template_id)
            $.each(['masters', 'teams', 'private'], function (i, lib) {
                libsTable = $('#' + lib + 'Table').DataTable();
                libsTable.rows().every(function () {
                    $(this.node()).find('input[name="library"][value="' + campaign.library_template_id + '"]').prop('checked', true).trigger("click");
                });
            })
        })
        .error(function (data) {
            $("#modal\\.flashes").empty().append("<div style=\"text-align:center\" class=\"alert alert-danger\">\
            <i class=\"fa fa-exclamation-circle\"></i> " + data.responseJSON.message + "</div>")
        })
}

$(document).ready(function () {
    $("#launch_date").datetimepicker({
        "widgetPositioning": {
            "vertical": "bottom"
        },
        "showTodayButton": true,
        "defaultDate": moment(),
        "format": "MMMM Do YYYY, h:mm a"
    })
    $("#send_by_date").datetimepicker({
        "widgetPositioning": {
            "vertical": "bottom"
        },
        "showTodayButton": true,
        "useCurrent": false,
        "format": "MMMM Do YYYY, h:mm a"
    })
    // Setup multiple modals
    // Code based on http://miles-by-motorcycle.com/static/bootstrap-modal/index.html
    $('.modal').on('hidden.bs.modal', function (event) {
        $(this).removeClass('fv-modal-stack');
        $('body').data('fv_open_modals', $('body').data('fv_open_modals') - 1);
    });
    $('.modal').on('shown.bs.modal', function (event) {
        // Keep track of the number of open modals
        if (typeof ($('body').data('fv_open_modals')) == 'undefined') {
            $('body').data('fv_open_modals', 0);
        }
        // if the z-index of this modal has been set, ignore.
        if ($(this).hasClass('fv-modal-stack')) {
            return;
        }
        $(this).addClass('fv-modal-stack');
        // Increment the number of open modals
        $('body').data('fv_open_modals', $('body').data('fv_open_modals') + 1);
        // Setup the appropriate z-index
        $(this).css('z-index', 1040 + (10 * $('body').data('fv_open_modals')));
        $('.modal-backdrop').not('.fv-modal-stack').css('z-index', 1039 + (10 * $('body').data('fv_open_modals')));
        $('.modal-backdrop').not('fv-modal-stack').addClass('fv-modal-stack');
    });
    // Scrollbar fix - https://stackoverflow.com/questions/19305821/multiple-modals-overlay
    $(document).on('hidden.bs.modal', '.modal', function () {
        $('.modal:visible').length && $(document.body).addClass('modal-open');
    });
    $('#modal').on('hidden.bs.modal', function (event) {
        dismiss()
    });
    let apiSchema = api.campaigns
    let campaignParentID = ""

    if (window.location.pathname.startsWith("/campaign_parents")) {
        apiSchema = api.campaignParentId
        campaignParentID = window.location.pathname.split('/').slice(-1)[0]
    }

    // Load groups
    api.groups.summary()
        .success(function (summaries) {
            groups = summaries.groups
        });

    // Load Library Templates
    api.libraryTemplates.get()
        .success(function (lt) {
            libraryTemplates = libraryTemplates.concat(lt.master, lt.private, lt.team)
        });

    apiSchema.summary(campaignParentID)
        .success(function (data) {

            campaigns = data.campaigns
            campaigns_parent = data.hasOwnProperty('campaigns_parent') ? data.campaigns_parent : null
            if (campaigns_parent.status === "END") $('#operation-create').prop("disabled", true)
            if (campaigns_parent.hasOwnProperty('name')) $('.campaign-name').text(escapeHtml(campaigns_parent.name))
            campaigns_parent_owner = data.hasOwnProperty('owner') ? $('#campaign-owner').text(escapeHtml(data.owner)) : null

            if (data.hasOwnProperty('advancement')) {
                $("#campaign-advancement").html(escapeHtml(data.advancement + "%"));

                const circle01 = document.createElement("span");
                circle01.className = "desactive-circle";
                circle01.id = "desactive-circle01";
                document.getElementById("circle01").appendChild(circle01);
                const circle02 = document.createElement("span");
                circle02.className = "desactive-circle";
                circle02.id = "desactive-circle02";
                document.getElementById("circle02").appendChild(circle02);
                const circle03 = document.createElement("span");
                circle03.className = "desactive-circle";
                circle03.id = "desactive-circle03";
                document.getElementById("circle03").appendChild(circle03);
                const circle04 = document.createElement("span");
                circle04.className = "desactive-circle";
                circle04.id = "desactive-circle04";
                document.getElementById("circle04").appendChild(circle04);
                const circle05 = document.createElement("span");
                circle05.className = "desactive-circle";
                circle05.id = "desactive-circle05";
                document.getElementById("circle05").appendChild(circle05);
                const circle06 = document.createElement("span");
                circle06.className = "desactive-circle";
                circle06.id = "desactive-circle06";
                document.getElementById("circle06").appendChild(circle06);
                const circle07 = document.createElement("span");
                circle07.className = "desactive-circle";
                circle07.id = "desactive-circle07";
                document.getElementById("circle07").appendChild(circle07);
                const circle08 = document.createElement("span");
                circle08.className = "desactive-circle";
                circle08.id = "desactive-circle08";
                document.getElementById("circle08").appendChild(circle08);
                const circle09 = document.createElement("span");
                circle09.className = "desactive-circle";
                circle09.id = "desactive-circle09";
                document.getElementById("circle09").appendChild(circle09);
                const circle10 = document.createElement("span");
                circle10.className = "desactive-circle";
                circle10.id = "desactive-circle10";
                document.getElementById("circle10").appendChild(circle10);
                const circle11 = document.createElement("span");
                circle11.className = "desactive-circle";
                circle11.id = "desactive-circle11";
                document.getElementById("circle11").appendChild(circle11);
                const circle12 = document.createElement("span");
                circle12.className = "desactive-circle";
                circle12.id = "desactive-circle12";
                document.getElementById("circle12").appendChild(circle12);


                if (data.advancement > 1) {
                    const circle12a = document.createElement("span");
                    circle12a.className = "active-circle";
                    document.getElementById("circle12").appendChild(circle12a);
                    document.getElementById("desactive-circle12").style = "display:none;";
                }
                if (data.advancement > 8) {
                    const circle11a = document.createElement("span");
                    circle11a.className = "active-circle";
                    document.getElementById("circle11").appendChild(circle11a);
                    document.getElementById("desactive-circle11").style = "display:none;";
                }
                if (data.advancement > 16) {
                    const circle10a = document.createElement("span");
                    circle10a.className = "active-circle";
                    document.getElementById("circle10").appendChild(circle10a);
                    document.getElementById("desactive-circle10").style = "display:none;";
                }
                if (data.advancement > 20) {
                    const circle09a = document.createElement("span");
                    circle09a.className = "active-circle";
                    document.getElementById("circle09").appendChild(circle09a);
                    document.getElementById("desactive-circle09").style = "display:none;";
                }
                if (data.advancement > 30) {
                    const circle08a = document.createElement("span");
                    circle08a.className = "active-circle";
                    document.getElementById("circle08").appendChild(circle08a);
                    document.getElementById("desactive-circle08").style = "display:none;";
                }
                if (data.advancement > 40) {
                    const circle07a = document.createElement("span");
                    circle07a.className = "active-circle";
                    document.getElementById("circle07").appendChild(circle07a);
                    document.getElementById("desactive-circle07").style = "display:none;";
                }
                if (data.advancement > 50) {
                    const circle06a = document.createElement("span");
                    circle06a.className = "active-circle";
                    document.getElementById("circle06").appendChild(circle06a);
                    document.getElementById("desactive-circle06").style = "display:none;";
                }
                if (data.advancement > 60) {
                    const circle05a = document.createElement("span");
                    circle05a.className = "active-circle";
                    document.getElementById("circle05").appendChild(circle05a);
                    document.getElementById("desactive-circle05").style = "display:none;";
                }
                if (data.advancement > 70) {
                    const circle04a = document.createElement("span");
                    circle04a.className = "active-circle";
                    document.getElementById("circle04").appendChild(circle04a);
                    document.getElementById("desactive-circle04").style = "display:none;";
                }
                if (data.advancement > 80) {
                    const circle03a = document.createElement("span");
                    circle03a.className = "active-circle";
                    document.getElementById("circle03").appendChild(circle03a);
                    document.getElementById("desactive-circle03").style = "display:none;";
                }
                if (data.advancement > 90) {
                    const circle02a = document.createElement("span");
                    circle02a.className = "active-circle";
                    document.getElementById("circle02").appendChild(circle02a);
                    document.getElementById("desactive-circle02").style = "display:none;";
                }
                if (data.advancement == 100) {
                    const circle01a = document.createElement("span");
                    circle01a.className = "active-circle";
                    document.getElementById("circle01").appendChild(circle01a);
                    document.getElementById("desactive-circle01").style = "display:none;";
                }



            }

            $("#loading").hide()

            if (campaigns.length > 0) {
                $("#campaignTable").show()
                $("#campaignTableArchive").show()
                $("#campaignDetailPerDayTable").show()
                $("#campaignTableDetailPerDayArchive").show()
                $("#loadingDetail").hide()
                activeCampaignsTable = $("#campaignTable").DataTable({
                    columnDefs: [{
                        orderable: false,
                        targets: "no-sort"
                    }],
                    order: [
                        [1, "desc"]
                    ]
                });

                archivedCampaignsTable = $("#campaignTableArchive").DataTable({
                    columnDefs: [{
                        orderable: false,
                        targets: "no-sort"
                    }],
                    order: [
                        [1, "desc"]
                    ]
                });

                opRows = {
                    'active': [],
                    'archived': []
                }

                let compainStatList = [];
                //
                var options = { year: 'numeric', month: 'long', day: 'numeric' };
                var opt_weekday = { weekday: 'long' };
                var today = new Date();
                var weekday = toTitleCase(today.toLocaleDateString("fr-FR", opt_weekday));

                function toTitleCase(str) {
                    return str.replace(
                        /\w\S*/g,
                        function (txt) {
                            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
                        }
                    );
                }

                var the_date = weekday + ", " + today.toLocaleDateString("fr-FR", options);
                activeDetailPerDayCampaignsTable = $("#campaignDetailPerDayTable").DataTable({
                    columnDefs: [{
                        orderable: false,
                        targets: "no-sort"
                    }],
                    order: false
                });
                archivedDetailPerDayCampaignsTable = $("#campaignTableDetailPerDayArchive").DataTable({
                    columnDefs: [{
                        orderable: false,
                        targets: "no-sort"
                    }],
                    order: [
                        [1, "desc"]
                    ]
                });
                rowsPerDay = {
                    'active': [],
                    'archived': []
                }
                //
                var k = 0;
                $.each(campaigns, function (i, campaign) {
                    label = labels[campaign.status] || "label-default";
                    var today = new Date(campaign.launch_date);
                    let compaignStats = {
                        'date': "",
                        'clicked': 0,
                        'opened': 0,
                        'sent': 0,
                    }
                    compaignStats.date = toTitleCase(today.toLocaleDateString("en-EN", opt_weekday));
                    compaignStats.clicked = campaign.stats.clicked;
                    compaignStats.opened = campaign.stats.opened;
                    compaignStats.sent = campaign.stats.sent;
                    compainStatList.push(compaignStats);

                    //section for tooltips on the status of a campaign to show some quick stats
                    var launchDate;
                    if (moment(campaign.launch_date).isAfter(moment())) {
                        launchDate = "Scheduled to start: " + moment(campaign.launch_date).format('MMMM Do YYYY, h:mm:ss a')
                        var quickStats = launchDate + "<br><br>" + "Number of recipients: " + campaign.stats.total
                    } else {
                        launchDate = "Launch Date: " + moment(campaign.launch_date).format('MMMM Do YYYY, h:mm:ss a')
                        var quickStats = launchDate + "<br><br>" + "Number of recipients: " + campaign.stats.total + "<br><br>" + "Emails opened: " + campaign.stats.opened + "<br><br>" + "Emails clicked: " + campaign.stats.clicked + "<br><br>" + "Submitted Credentials: " + campaign.stats.submitted_data + "<br><br>" + "Errors : " + campaign.stats.error + "<br><br>" + "Reported : " + campaign.stats.email_reported
                    }


                    // Load Operation details
                    api.campaignId.results(campaign.id)
                        .success(function (c) {
                            let opGroups = [];
                            let opGroupsNames = '';
                            if (c.hasOwnProperty('campaign_groups_summary')) c.campaign_groups_summary.forEach(element => { opGroups.push(element.group_id) });
                            opGroups = getArrayKeyByValues(groups, opGroups, 'id');
                            if (opGroups.length) opGroups.forEach(element => { opGroupsNames += (element?.name || "none") + "<br>" });

                            // load Scenario Library name
                            let libraryTemplateObject = getArrayKeyByValue(libraryTemplates, c.library_template_id, 'id')
                            libraryTemplateName = (libraryTemplateObject.hasOwnProperty('name')) ? libraryTemplateObject.name : '';
                            let risLevel = (campaign.stats.clicked / campaign.stats.sent)
                            var row = [
                                escapeHtml(campaign.name),
                                escapeHtml(libraryTemplateName),
                                opGroupsNames,
                                risLevel > 0.5 ? "Critical" : risLevel > 0.3 ? "High" : risLevel > 0.1 ? "Medium" : risLevel > 0 ? "Low" : "Zero",
                                moment(campaign.created_date).format('MMMM Do YYYY, h:mm:ss a'),
                                "<span class=\"label " + label + "\" data-toggle=\"tooltip\" data-placement=\"right\" data-html=\"true\" title=\"" + quickStats + "\">" + campaign.status + "</span>",
                                "<div class='pull-right'><a class='btn btn-primary' href='/campaigns/" + campaign.id + "' data-toggle='tooltip' data-placement='left' title='View Results'>\
                            <i class='fa fa-bar-chart'></i>\
                            </a>\
                            <span data-toggle='modal' data-backdrop='static' data-target='#modal'><button class='btn btn-primary' data-toggle='tooltip' data-placement='left' title='Copy Operation' onclick='copy(" + i + ")'>\
                            <i class='fa fa-copy'></i>\
                            </button></span>\
                            <button class='btn btn-danger' onclick='deleteCampaign(" + i + ")' data-toggle='tooltip' data-placement='left' title='Delete Operation'>\
                            <i class='fa fa-trash-o'></i>\
                            </button></div>"
                            ]
                            opRows['active'].push(row);

                            operationDetailsDataToExport.push([
                                campaign.name,
                                escapeHtml(libraryTemplateName),
                                opGroupsNames.replace('\<br\>', '\n'),
                                "Manageable",
                                moment(campaign.created_date).format('MMMM Do YYYY, h:mm:ss a'),
                                campaign.status
                            ]);
                            if (c.hasOwnProperty('results')) {
                                c.results.forEach(r => {
                                    operationResultDataToExport.push([
                                        r.id,
                                        r.status,
                                        r.ip,
                                        r.latitude,
                                        r.longitude,
                                        r.send_date,
                                        r.reported,
                                        r.modified_date,
                                        r.email,
                                        r.first_name,
                                        r.last_name,
                                        r.position,
                                        r.department,
                                        r.entity,
                                        r.location
                                    ]);

                                });
                            }
                            k++;
                        });

                })

                activeCampaignsTable.rows.add(opRows['active']).draw()
                //archivedCampaignsTable.rows.add(opRows['archived']).draw()

                let tableStatisticsPerDay = [];
                const weekOfday = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
                weekOfday.forEach(day => {
                    let mail_sent = 0;
                    let mail_clicks = 0;
                    let mail_clicked = 0;
                    let mail_opened = 0;
                    compainStatList.forEach(element => {
                        if (element.date == day) {
                            mail_sent += parseInt(element.sent);
                            mail_clicks += parseInt(element.clicked);
                            mail_clicked += parseInt(element.clicked);
                            mail_opened += parseInt(element.opened);
                        }
                    });
                    tableStatisticsPerDay.push({
                        "day": day,
                        "mail_sent": mail_sent,
                        "mail_clicks": mail_clicks,
                        "mail_clicked": percentage(mail_clicked, mail_sent),
                        "mail_opened": percentage(mail_opened, mail_sent)
                    });
                });
                let StatisticsPerDayRows = {
                    'active': [],
                    'archived': []
                };
                tableStatisticsPerDay.forEach(dayStats => {
                    var statsRow = [
                        escapeHtml(dayStats.day),
                        escapeHtml(dayStats.mail_sent),
                        escapeHtml(dayStats.mail_clicks),
                        escapeHtml(dayStats.mail_opened + " %"),
                        escapeHtml(dayStats.mail_clicked + " %"),
                    ];

                    StatisticsPerDayRows['archived'].push(statsRow);
                    StatisticsPerDayRows['active'].push(statsRow);
                });

                activeDetailPerDayCampaignsTable.rows.add(StatisticsPerDayRows['active']).draw();
                archivedDetailPerDayCampaignsTable.rows.add(StatisticsPerDayRows['archived']).draw();

                $('[data-toggle="tooltip"]').tooltip()
            } else {
                $("#emptyMessage").show()
                $("#emptyDetailMessage").show()
                $("#emptyDetailPerDayMessage").show()
                $("#emptyDetailPerDepartmentMessage").show()
                $("#loadingDetail").hide()
                $("#loadingDetailPerDepartment").hide()
                $("#loadingDetailPerDay").hide()
            }
        })
        .error(function (err) {
            $("#loading").hide()
            if (err.status == 403) {
                $('.main').children().not('#flashes').remove();
                errorFlash("Your are not authorized to perform this operation!")
            }
            else errorFlash("Error fetching operations")
        })
    // Select2 Defaults
    $.fn.select2.defaults.set("width", "100%");
    $.fn.select2.defaults.set("dropdownParent", $("#modal_body"));
    $.fn.select2.defaults.set("theme", "bootstrap");
    $.fn.select2.defaults.set("sorter", function (data) {
        return data.sort(function (a, b) {
            if (a.text.toLowerCase() > b.text.toLowerCase()) {
                return 1;
            }
            if (a.text.toLowerCase() < b.text.toLowerCase()) {
                return -1;
            }
            return 0;
        });
    })
})