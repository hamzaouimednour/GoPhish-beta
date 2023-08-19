var map = null
var doPoll = true;

// statuses is a helper map to point result statuses to ui classes
var statuses = {
    "Email Sent": {
        color: "#1abc9c",
        label: "label-success",
        icon: "fa-envelope",
        point: "ct-point-sent"
    },
    "Emails Sent": {
        color: "#1abc9c",
        label: "label-success",
        icon: "fa-envelope",
        point: "ct-point-sent"
    },
    "In progress": {
        label: "label-primary"
    },
    "Queued": {
        label: "label-info"
    },
    "Completed": {
        label: "label-success"
    },
    "Email Opened": {
        color: "#f9bf3b",
        label: "label-warning",
        icon: "fa-envelope-open",
        point: "ct-point-opened"
    },
    "Clicked Link": {
        color: "#F39C12",
        label: "label-clicked",
        icon: "fa-mouse-pointer",
        point: "ct-point-clicked"
    },
    "Success": {
        color: "#f05b4f",
        label: "label-danger",
        icon: "fa-exclamation",
        point: "ct-point-clicked"
    },
    //not a status, but is used for the campaign timeline and user timeline
    "Email Reported": {
        color: "#45d6ef",
        label: "label-info",
        icon: "fa-bullhorn",
        point: "ct-point-reported"
    },
    "Error": {
        color: "#6c7a89",
        label: "label-default",
        icon: "fa-times",
        point: "ct-point-error"
    },
    "Error Sending Email": {
        color: "#6c7a89",
        label: "label-default",
        icon: "fa-times",
        point: "ct-point-error"
    },
    "Submitted Data": {
        color: "#f05b4f",
        label: "label-danger",
        icon: "fa-exclamation",
        point: "ct-point-clicked"
    },
    "Unknown": {
        color: "#6c7a89",
        label: "label-default",
        icon: "fa-question",
        point: "ct-point-error"
    },
    "Sending": {
        color: "#428bca",
        label: "label-primary",
        icon: "fa-spinner",
        point: "ct-point-sending"
    },
    "Retrying": {
        color: "#6c7a89",
        label: "label-default",
        icon: "fa-clock-o",
        point: "ct-point-error"
    },
    "Scheduled": {
        color: "#428bca",
        label: "label-primary",
        icon: "fa-clock-o",
        point: "ct-point-sending"
    },
    "Campaign Created": {
        label: "label-success",
        icon: "fa-rocket"
    }
}

var statusMapping = {
    "Email Sent": "sent",
    "Email Opened": "opened",
    "Clicked Link": "clicked",
    "Submitted Data": "submitted_data",
    "Email Reported": "reported",
}

// This is an underwhelming attempt at an enum
// until I have time to refactor this appropriately.
var progressListing = [
    "Email Sent",
    "Email Opened",
    "Clicked Link",
    "Submitted Data"
]

var campaign = {}
var bubbles = []

function dismiss() {
    $("#modal\\.flashes").empty()
    $("#modal").modal('hide')
}

/**
 * Returns an HTML string that displays the OS and browser that clicked the link
 * or submitted credentials.
 * 
 * @param {object} event_details - The "details" parameter for a campaign
 *  timeline event
 * 
 */
var renderDevice = function(event_details) {
    var ua = UAParser(details.browser['user-agent'])
    var detailsString = '<div class="timeline-device-details">'

    var deviceIcon = 'laptop'
    if (ua.device.type) {
        if (ua.device.type == 'tablet' || ua.device.type == 'mobile') {
            deviceIcon = ua.device.type
        }
    }

    var deviceVendor = ''
    if (ua.device.vendor) {
        deviceVendor = ua.device.vendor.toLowerCase()
        if (deviceVendor == 'microsoft') deviceVendor = 'windows'
    }

    var deviceName = 'Unknown'
    if (ua.os.name) {
        deviceName = ua.os.name
        if (deviceName == "Mac OS") {
            deviceVendor = 'apple'
        } else if (deviceName == "Windows") {
            deviceVendor = 'windows'
        }
        if (ua.device.vendor && ua.device.model) {
            deviceName = ua.device.vendor + ' ' + ua.device.model
        }
    }

    if (ua.os.version) {
        deviceName = deviceName + ' (OS Version: ' + ua.os.version + ')'
    }

    deviceString = '<div class="timeline-device-os"><span class="fa fa-stack">' +
        '<i class="fa fa-' + escapeHtml(deviceIcon) + ' fa-stack-2x"></i>' +
        '<i class="fa fa-vendor-icon fa-' + escapeHtml(deviceVendor) + ' fa-stack-1x"></i>' +
        '</span> ' + escapeHtml(deviceName) + '</div>'

    detailsString += deviceString

    var deviceBrowser = 'Unknown'
    var browserIcon = 'info-circle'
    var browserVersion = ''

    if (ua.browser && ua.browser.name) {
        deviceBrowser = ua.browser.name
            // Handle the "mobile safari" case
        deviceBrowser = deviceBrowser.replace('Mobile ', '')
        if (deviceBrowser) {
            browserIcon = deviceBrowser.toLowerCase()
            if (browserIcon == 'ie') browserIcon = 'internet-explorer'
        }
        browserVersion = '(Version: ' + ua.browser.version + ')'
    }

    var browserString = '<div class="timeline-device-browser"><span class="fa fa-stack">' +
        '<i class="fa fa-' + escapeHtml(browserIcon) + ' fa-stack-1x"></i></span> ' +
        deviceBrowser + ' ' + browserVersion + '</div>'

    detailsString += browserString
    detailsString += '</div>'
    return detailsString
}

function renderTimeline(data) {
    record = {
        "id": data[0],
        "first_name": data[2],
        "last_name": data[3],
        "email": data[4],
        "position": data[5],
        "status": data[6],
        "reported": data[7],
        "send_date": data[8]
    }
    results = '<div class="timeline col-sm-12 well well-lg">' +
        '<h6>Timeline for ' + escapeHtml(record.first_name) + ' ' + escapeHtml(record.last_name) +
        '</h6><span class="subtitle">Email: ' + escapeHtml(record.email) +
        '<br>Result ID: ' + escapeHtml(record.id) + '</span>' +
        '<div class="timeline-graph col-sm-6">'
    $.each(campaign.timeline, function(i, event) {
            if (!event.email || event.email == record.email) {
                // Add the event
                results += '<div class="timeline-entry">' +
                    '    <div class="timeline-bar"></div>'
                results +=
                    '    <div class="timeline-icon ' + statuses[event.message].label + '">' +
                    '    <i class="fa ' + statuses[event.message].icon + '"></i></div>' +
                    '    <div class="timeline-message">' + escapeHtml(event.message) +
                    '    <span class="timeline-date">' + moment.utc(event.time).local().format('MMMM Do YYYY h:mm:ss a') + '</span>'
                if (event.details) {
                    details = JSON.parse(event.details)
                    if (event.message == "Clicked Link" || event.message == "Submitted Data") {
                        deviceView = renderDevice(details)
                        if (deviceView) {
                            results += deviceView
                        }
                    }
                    if (event.message == "Submitted Data") {
                        results += '<div class="timeline-replay-button"><button onclick="replay(' + i + ')" class="btn btn-success">'
                        results += '<i class="fa fa-refresh"></i> Replay Credentials</button></div>'
                        results += '<div class="timeline-event-details"><i class="fa fa-caret-right"></i> View Details</div>'
                    }
                    if (details.payload) {
                        results += '<div class="timeline-event-results">'
                        results += '    <table class="table table-condensed table-bordered table-striped">'
                        results += '        <thead><tr><th>Parameter</th><th>Value(s)</tr></thead><tbody>'
                        $.each(Object.keys(details.payload), function(i, param) {
                            if (param == "rid") {
                                return true;
                            }
                            results += '    <tr>'
                            results += '        <td>' + escapeHtml(param) + '</td>'
                            results += '        <td>' + escapeHtml(details.payload[param]) + '</td>'
                            results += '    </tr>'
                        })
                        results += '       </tbody></table>'
                        results += '</div>'
                    }
                    if (details.error) {
                        results += '<div class="timeline-event-details"><i class="fa fa-caret-right"></i> View Details</div>'
                        results += '<div class="timeline-event-results">'
                        results += '<span class="label label-default">Error</span> ' + details.error
                        results += '</div>'
                    }
                }
                results += '</div></div>'
            }
        })
        // Add the scheduled send event at the bottom
    if (record.status == "Scheduled" || record.status == "Retrying") {
        results += '<div class="timeline-entry">' +
            '    <div class="timeline-bar"></div>'
        results +=
            '    <div class="timeline-icon ' + statuses[record.status].label + '">' +
            '    <i class="fa ' + statuses[record.status].icon + '"></i></div>' +
            '    <div class="timeline-message">' + "Scheduled to send at " + record.send_date + '</span>'
    }
    results += '</div></div>'
    return results
}

var renderTimelineChart = function(chartopts) {
    return Highcharts.chart('timeline_chart', {
        chart: {
            zoomType: 'x',
            type: 'line',
            height: "200px"
        },
        title: {
            text: 'Campaign Timeline'
        },
        xAxis: {
            type: 'datetime',
            dateTimeLabelFormats: {
                second: '%l:%M:%S',
                minute: '%l:%M',
                hour: '%l:%M',
                day: '%b %d, %Y',
                week: '%b %d, %Y',
                month: '%b %Y'
            }
        },
        yAxis: {
            min: 0,
            max: 2,
            visible: false,
            tickInterval: 1,
            labels: {
                enabled: false
            },
            title: {
                text: ""
            }
        },
        tooltip: {
            formatter: function() {
                return Highcharts.dateFormat('%A, %b %d %l:%M:%S %P', new Date(this.x)) +
                    '<br>Event: ' + this.point.message + '<br>Email: <b>' + this.point.email + '</b>'
            }
        },
        legend: {
            enabled: false
        },
        plotOptions: {
            series: {
                marker: {
                    enabled: true,
                    symbol: 'circle',
                    radius: 3
                },
                cursor: 'pointer',
            },
            line: {
                states: {
                    hover: {
                        lineWidth: 1
                    }
                }
            }
        },
        credits: {
            enabled: false
        },
        series: [{
            data: chartopts['data'],
            dashStyle: "shortdash",
            color: "#cccccc",
            lineWidth: 1,
            turboThreshold: 0
        }]
    })
}

/* Renders a pie chart using the provided chartops */
var renderPieChart = function(chartopts) {
    return Highcharts.chart(chartopts['elemId'], {
        chart: {
            type: 'pie',
            events: {
                load: function() {
                    var chart = this,
                        rend = chart.renderer,
                        pie = chart.series[0],
                        left = chart.plotLeft + pie.center[0],
                        top = chart.plotTop + pie.center[1];
                    this.innerText = rend.text(chartopts['data'][0].count, left, top).
                    attr({
                        'text-anchor': 'middle',
                        'font-size': '18px',
                        'font-weight': 'bold',
                        'fill': chartopts['colors'][0],
                        'font-family': 'Helvetica,Arial,sans-serif'
                    }).add();
                },
                render: function() {
                    this.innerText.attr({
                        text: chartopts['data'][0].y + " %"
                    })
                }
            }
        },
        title: {
            text: chartopts['title']
        },
        plotOptions: {
            pie: {
                innerSize: '80%',
                dataLabels: {
                    enabled: false
                }
            }
        },
        credits: {
            enabled: false
        },
        tooltip: {
            formatter: function() {
                if (this.key == undefined) {
                    return false
                }
                return '<span style="color:' + this.color + '">\u25CF</span>' + this.point.name + ': <b>' + this.y + '%</b><br/>'
            }
        },
        series: [{
            data: chartopts['data'],
            colors: chartopts['colors'],
        }]
    })
}

/* Updates the bubbles on the map

@param {campaign.result[]} results - The campaign results to process
*/
var updateMap = function(results) {
    if (!map) {
        return
    }
    bubbles = []
    $.each(campaign.results, function(i, result) {
        // Check that it wasn't an internal IP
        if (result.latitude == 0 && result.longitude == 0) {
            return true;
        }
        newIP = true
        $.each(bubbles, function(i, bubble) {
            if (bubble.ip == result.ip) {
                bubbles[i].radius += 1
                newIP = false
                return false
            }
        })
        if (newIP) {
            bubbles.push({
                latitude: result.latitude,
                longitude: result.longitude,
                name: result.ip,
                fillKey: "point",
                radius: 2
            })
        }
    })
    map.bubbles(bubbles)
}

/* poll - Queries the API and updates the UI with the results
 *
 * Updates:
 * * Timeline Chart
 * * Email (Donut) Chart
 * * Map Bubbles
 * * Datatables
 */
function poll() {
    campaign.id = window.location.pathname.split('/').slice(-1)[0]
    api.campaignParentId.results(campaign.id)
        .success(function(c) {
            campaign = c
            if(!campaign.hasOwnProperty('results')){
                campaign.results = []
            }
                /* Update the timeline */
            var timeline_series_data = []
            $.each(campaign.timeline, function(i, event) {
                var event_date = moment.utc(event.time).local()
                timeline_series_data.push({
                    email: event.email,
                    message: event.message,
                    x: event_date.valueOf(),
                    y: 1,
                    marker: {
                        fillColor: statuses[event.message].color
                    }
                })
            })
            var timeline_chart = $("#timeline_chart").highcharts()
            timeline_chart.series[0].update({
                    data: timeline_series_data
                })
                /* Update the results donut chart */
            var email_series_data = {}
                // Load the initial data
            Object.keys(statusMapping).forEach(function(k) {
                email_series_data[k] = 0
            });
            $.each(campaign.results, function(i, result) {
                email_series_data[result.status]++;
                if (result.reported) {
                    email_series_data['Email Reported']++
                }
                // Backfill status values
                var step = progressListing.indexOf(result.status)
                for (var i = 0; i < step; i++) {
                    email_series_data[progressListing[i]]++
                }
            })
            $.each(email_series_data, function(status, count) {
                    var email_data = []
                    if (!(status in statusMapping)) {
                        return true
                    }
                    email_data.push({
                        name: status,
                        y: Math.floor((count / campaign.results.length) * 100),
                        count: count
                    })
                    email_data.push({
                        name: '',
                        y: 100 - Math.floor((count / campaign.results.length) * 100)
                    })
                    // var chart = $("#" + statusMapping[status] + "_chart").highcharts()
                    // chart.series[0].update({
                    //     data: email_data
                    // })
                })
                /* Update the map information */
            updateMap(campaign.results)
            $('[data-toggle="tooltip"]').tooltip()
            $("#refresh_message").hide()
            $("#refresh_btn").show()
        })
}

function load() {
    campaign.id = window.location.pathname.split('/').slice(-1)[0]
    var use_map = JSON.parse(localStorage.getItem('gophish.use_map'))
    api.campaignParentId.results(campaign.id)
        .success(function(c) {
            
            campaign = c;
            if(!campaign.hasOwnProperty('results')){
                campaign.results = []
            }
            if (campaign) {
                $("#loading").hide()
                $("#campaignResults").show()
                    //

                $("#loadingDetail").hide()
                $("#campaignDetailTable").show()
                $("#campaignTableDetailArchive").show()
                $("#loadingDetailPerDay").hide()
                    //loadingDetailPerDepartment
                $("#loadingDetailPerDepartment").hide()
                $("#campaignDetailPerDepartmentTable").show()
                $("#archivedDetailPerDepartmentCampaigns").show()
                $("#campaign-operations").hide()

                //
                var email_series_data = {}
                var timeline_series_data = []
                Object.keys(statusMapping).forEach(function(k) {
                    email_series_data[k] = 0
                });
                //
                activeDetailCampaignsTable = $("#campaignDetailTable").DataTable({
                    columnDefs: [{
                        orderable: false,
                        targets: "no-sort"
                    }],
                    order: [
                        [1, "desc"]
                    ]
                });
                archivedDetailCampaignsTable = $("#campaignTableDetailArchive").DataTable({
                    columnDefs: [{
                        orderable: false,
                        targets: "no-sort"
                    }],
                    order: [
                        [1, "desc"]
                    ]
                });
                activeDetailDepartmentCampaignsTable = $("#campaignDetailPerDepartmentTable").DataTable({
                    columnDefs: [{
                        orderable: false,
                        targets: "no-sort"
                    }],
                    order: [
                        [1, "desc"]
                    ]
                });
                // archivedDetailDepartmentCampaignsTable = $("#campaignTableDetailPerDepartmentArchive").DataTable({
                //     columnDefs: [{
                //         orderable: false,
                //         targets: "no-sort"
                //     }],
                //     order: [
                //         [1, "desc"]
                //     ]
                // });
                rows = {
                        'active': [],
                        'archived': []
                    }
                    //
                    //

                let statPerDay = {
                    'day': 'Lundi',
                    'mail_sent': 10,
                    'mail_click': 2,
                    'mail_read_rate': 50,
                    'mail_read_click': 100,
                }
                let statsPerDay = [statPerDay];

                //
                let departmentList = [];
                let locationList = [];
                let departmentStatLists = [];
                let departmentStatList = {
                    "name": "",
                    'clicked': 0,
                    'opened': 0,
                    'sent': 0
                };
                $.each(campaign.results, function(i, result) {
                        email_series_data[result.status]++;
                        if (result.reported) {
                            email_series_data['Email Reported']++
                        }
                        // Backfill status values
                        var step = progressListing.indexOf(result.status)
                        for (var i = 0; i < step; i++) {
                            email_series_data[progressListing[i]]++
                        }
                        //
                        let depExist = false;
                        departmentList.forEach(dep => {
                            if (dep == result.department) {
                                depExist = true;
                            }
                        });
                        if (depExist == false) {
                            departmentList.push(result.department);
                        }
                        let locExist = false;
                        locationList.forEach(loc => {
                            if (loc == result.location) {
                                locExist = true;
                            }
                        });
                        if (locExist == false) {
                            locationList.push(result.location);
                        }

                        //
                        let reported = "";
                        if (result.reported) {
                            reported = 'Yes';
                        } else {
                            reported = 'No';
                        }
                        var rowDetails = [
                            escapeHtml(result.first_name),
                            escapeHtml(result.last_name),
                            escapeHtml(result.email),
                            escapeHtml(result.position),
                            escapeHtml(result.location),
                            escapeHtml(result.department),
                            escapeHtml(result.status),
                            escapeHtml(reported),
                        ]
                        rows['active'].push(rowDetails)
                        rows['archived'].push(rowDetails)
                            //

                    })
                    //
                activeDetailCampaignsTable.rows.add(rows['active']).draw()
                archivedDetailCampaignsTable.rows.add(rows['archived']).draw()
                $('[data-toggle="tooltip"]').tooltip()
                    //

                // Setup tooltips
                $('[data-toggle="tooltip"]').tooltip()

                // Setup the graphs
                $.each(campaign.timeline, function(i, event) {
                    if (event.message == "Campaign Created") {
                        return true
                    }
                    var event_date = moment.utc(event.time).local()
                    timeline_series_data.push({
                        email: event.email,
                        message: event.message,
                        x: event_date.valueOf(),
                        y: 1,
                        marker: {
                            fillColor: statuses[event.message].color
                        }
                    })
                })
                renderTimelineChart({
                    data: timeline_series_data
                })
                let globalStat = [];
                $.each(email_series_data, function(status, count) {
                    var email_data = []
                    if (!(status in statusMapping)) {
                        return true
                    }
                    email_data.push({
                        name: status,
                        y: Math.floor((count / campaign.results.length) * 100),
                        count: count
                    })
                    email_data.push({
                        name: '',
                        y: 100 - Math.floor((count / campaign.results.length) * 100)
                    })
                    // var chart = renderPieChart({
                    //     elemId: statusMapping[status] + '_chart',
                    //     title: status,
                    //     name: status,
                    //     data: email_data,
                    //     colors: [statuses[status].color, '#dddddd']
                    // })
                    
                    if(email_data[0].name == "Email Sent"){
                        $("#mail_sent-advancement").html(escapeHtml(email_data[0].y + "%"));
                        buildCerle(email_data[0].y,"mail_sent-");
                    }else if(email_data[0].name == "Email Opened"){
                        $("#mail_opened-advancement").html(escapeHtml(email_data[0].y + "%"));
                        buildCerle(email_data[0].y,"mail_opened-");
                    }else if(email_data[0].name == "Clicked Link"){
                        $("#mail_link-advancement").html(escapeHtml(email_data[0].y + "%"));
                        buildCerle(email_data[0].y,"mail_link-");
                    }else if(email_data[0].name == "Submitted Data"){
                        $("#mail_sub_data-advancement").html(escapeHtml(email_data[0].y + "%"));
                        buildCerle(email_data[0].y,"mail_sub_data-");
                    }else if(email_data[0].name == "Email Reported"){
                        $("#mail_reported-advancement").html(escapeHtml(email_data[0].y + "%"));
                        buildCerle(email_data[0].y,"mail_reported-");
                    }
                    globalStat.push({
                            name: status,
                            y: Math.floor((count / campaign.results.length) * 100),
                        })

                })

                // Init Gauge
                setGauge(globalStat) 

                select = document.getElementById('departmentCompagin');
                var optAll = document.createElement('option');
                    optAll.value = "All";
                    optAll.innerHTML = "All";
                    select.appendChild(optAll);
                departmentList.forEach(dep => {
                    var opt = document.createElement('option');
                    opt.value = dep;
                    opt.innerHTML = dep;
                    select.appendChild(opt);
                })
                selectLocation = document.getElementById('location');
                var optAll2 = document.createElement('option');
                    optAll2.value = "All";
                    optAll2.innerHTML = "All";
                selectLocation.appendChild(optAll2);
                locationList.forEach(dep => {
                        var opt = document.createElement('option');
                        opt.value = dep;
                        opt.innerHTML = dep;
                        selectLocation.appendChild(opt);
                    })
                    //
                if (use_map) {
                    $("#resultsMapContainer").show()
                    map = new Datamap({
                        element: document.getElementById("resultsMap"),
                        responsive: true,
                        fills: {
                            defaultFill: "#ffffff",
                            point: "#283F50"
                        },
                        geographyConfig: {
                            highlightFillColor: "#1abc9c",
                            borderColor: "#283F50"
                        },
                        bubblesConfig: {
                            borderColor: "#283F50"
                        }
                    });
                }
                updateMap(campaign.results);

                departmentList.forEach(dep => {
                    let mail_sent = 0;
                    let mail_clicked = 0;
                    let mail_opened = 0;
                    let newData = {
                        "name": dep,
                        "sent": 0,
                        "opened": 0,
                        "clicked": 0,
                    }
                    campaign.results.forEach(res => {
                        if (dep == res.department) {
                            mail_sent++;
                        }
                    });
                    newData.sent = mail_sent;
                    departmentStatLists.push(newData);

                });
                //departmentStatLists
                let StatisticsPerDepRows = {
                    'active': [],
                    'archived': []
                };
                departmentStatLists.forEach(depStatRow => {
                    var newRow = [
                        escapeHtml(depStatRow.name),
                        escapeHtml(depStatRow.sent),
                        escapeHtml(depStatRow.clicked),
                        escapeHtml(depStatRow.opened + " %"),
                        escapeHtml(depStatRow.clicked + " %"),
                    ];
                    StatisticsPerDepRows['archived'].push(newRow);
                    StatisticsPerDepRows['active'].push(newRow);
                });

                activeDetailDepartmentCampaignsTable.rows.add(StatisticsPerDepRows['active']).draw();
                // archivedDetailDepartmentCampaignsTable.rows.add(StatisticsPerDepRows['archived']).draw();
            }

        })
        .error(function() {
            $("#loading").hide()
            $("#campaignResults").hide()
            $("#campaign-operations").show()
        })
}
function buildCerle(data, id){
    const circle01 = document.createElement("span");
    circle01.className = "desactive-circle";
    circle01.id=id+"desactive-circle01";
    document.getElementById(id+"circle01").appendChild(circle01);
    const circle02 = document.createElement("span");
    circle02.className = "desactive-circle";
    circle02.id=id+"desactive-circle02";
    document.getElementById(id+"circle02").appendChild(circle02);
    const circle03 = document.createElement("span");
    circle03.className = "desactive-circle";
    circle03.id=id+"desactive-circle03";
    document.getElementById(id+"circle03").appendChild(circle03);
    const circle04 = document.createElement("span");
    circle04.className = "desactive-circle";
    circle04.id=id+"desactive-circle04";
    document.getElementById(id+"circle04").appendChild(circle04);
    const circle05 = document.createElement("span");
    circle05.className = "desactive-circle";
    circle05.id=id+"desactive-circle05";
    document.getElementById(id+"circle05").appendChild(circle05);
    const circle06 = document.createElement("span");
    circle06.className = "desactive-circle";
    circle06.id=id+"desactive-circle06";
    document.getElementById(id+"circle06").appendChild(circle06);
    const circle07 = document.createElement("span");
    circle07.className = "desactive-circle";
    circle07.id=id+"desactive-circle07";
    document.getElementById(id+"circle07").appendChild(circle07);
    const circle08 = document.createElement("span");
    circle08.className = "desactive-circle";
    circle08.id=id+"desactive-circle08";
    document.getElementById(id+"circle08").appendChild(circle08);
    const circle09 = document.createElement("span");
    circle09.className = "desactive-circle";
    circle09.id=id+"desactive-circle09";
    document.getElementById(id+"circle09").appendChild(circle09);
    const circle10 = document.createElement("span");
    circle10.className = "desactive-circle";
    circle10.id=id+"desactive-circle10";
    document.getElementById(id+"circle10").appendChild(circle10);
    const circle11 = document.createElement("span");
    circle11.className = "desactive-circle";
    circle11.id=id+"desactive-circle11";
    document.getElementById(id+"circle11").appendChild(circle11);
    const circle12 = document.createElement("span");
    circle12.className = "desactive-circle";
    circle12.id=id+"desactive-circle12";
    document.getElementById(id+"circle12").appendChild(circle12);
    if(data > 1){
        const circle12a = document.createElement("span");
        circle12a.className = "active-circle";
        document.getElementById(id+"circle12").appendChild(circle12a);
        document.getElementById(id+"desactive-circle12").style = "display:none;";
    }
    if(data > 8){
        const circle11a = document.createElement("span");
        circle11a.className = "active-circle";
        document.getElementById(id+"circle11").appendChild(circle11a);
        document.getElementById(id+"desactive-circle11").style = "display:none;";
    }
    if(data > 16){
        const circle10a = document.createElement("span");
        circle10a.className = "active-circle";
        document.getElementById(id+"circle10").appendChild(circle10a);
        document.getElementById(id+"desactive-circle10").style = "display:none;";
    }
    if(data > 20){
        const circle09a = document.createElement("span");
        circle09a.className = "active-circle";
        document.getElementById(id+"circle09").appendChild(circle09a);
        document.getElementById(id+"desactive-circle09").style = "display:none;";
    }
    if(data > 30){
        const circle08a = document.createElement("span");
        circle08a.className = "active-circle";
        document.getElementById(id+"circle08").appendChild(circle08a);
        document.getElementById(id+"desactive-circle08").style = "display:none;";
    }
    if(data > 40){
        const circle07a = document.createElement("span");
        circle07a.className = "active-circle";
        document.getElementById(id+"circle07").appendChild(circle07a);
        document.getElementById(id+"desactive-circle07").style = "display:none;";
    }
    if(data > 50){
        const circle06a = document.createElement("span");
        circle06a.className = "active-circle";
        document.getElementById(id+"circle06").appendChild(circle06a);
        document.getElementById(id+"desactive-circle06").style = "display:none;";
    }
    if(data > 60){
        const circle05a = document.createElement("span");
        circle05a.className = "active-circle";
        document.getElementById(id+"circle05").appendChild(circle05a);
        document.getElementById(id+"desactive-circle05").style = "display:none;";
    }
    if(data > 70){
        const circle04a = document.createElement("span");
        circle04a.className = "active-circle";
        document.getElementById(id+"circle04").appendChild(circle04a);
        document.getElementById(id+"desactive-circle04").style = "display:none;";
    }
    if(data > 80){
        const circle03a = document.createElement("span");
        circle03a.className = "active-circle";
        document.getElementById(id+"circle03").appendChild(circle03a);
        document.getElementById(id+"desactive-circle03").style = "display:none;";
    }
    if(data > 90){
        const circle02a = document.createElement("span");
        circle02a.className = "active-circle";
        document.getElementById(id+"circle02").appendChild(circle02a);
        document.getElementById(id+"desactive-circle02").style = "display:none;";
    }
    if(data == 100){
        const circle01a = document.createElement("span");
        circle01a.className = "active-circle";
        document.getElementById(id+"circle01").appendChild(circle01a);
        document.getElementById(id+"desactive-circle01").style = "display:none;";
    }
}
function filterByDepartment() {
    activeDetailCampaignsTable
        .clear()
        .draw();
    var e = document.getElementById("departmentCompagin");
    var selectedValue = e.options[e.selectedIndex].text;
    var eLoc = document.getElementById("location");
    var selectedLocValue = eLoc.options[eLoc.selectedIndex].text;
    let rows = {
        'active': [],
        'archived': []
    };
    $.each(campaign.results, function(i, result) {
        if ((selectedValue == result.department || selectedValue == "All")&& (selectedLocValue == "All" || selectedLocValue == result.department)) {
            if (result.reported) {
                reported = 'Yes';
            } else {
                reported = 'No';
            }
            var rowDetails = [
                escapeHtml(result.first_name),
                escapeHtml(result.last_name),
                escapeHtml(result.email),
                escapeHtml(result.position),
                escapeHtml(result.location),
                escapeHtml(result.department),
                escapeHtml(result.status),
                escapeHtml(reported),
            ];
            rows['active'].push(rowDetails);
            rows['archived'].push(rowDetails);
        }
    });

    activeDetailCampaignsTable.rows.add(rows['active']).draw();
    archivedDetailCampaignsTable.rows.add(rows['archived']).draw();

}

function filterByLocalisation() {
    activeDetailCampaignsTable
        .clear()
        .draw();
    var e = document.getElementById("location");
    var selectedValue = e.options[e.selectedIndex].text;
    var eDep = document.getElementById("departmentCompagin");
    var selectedDepValue = eDep.options[eDep.selectedIndex].text;
    let rows = {
        'active': [],
        'archived': []
    };
    $.each(campaign.results, function(i, result) {
        if ((selectedValue == result.location || selectedValue == "All") && (selectedDepValue == "All" || selectedDepValue == result.department)) {
            if (result.reported) {
                reported = 'Yes';
            } else {
                reported = 'No';
            }
            var rowDetails = [
                escapeHtml(result.first_name),
                escapeHtml(result.last_name),
                escapeHtml(result.email),
                escapeHtml(result.position),
                escapeHtml(result.location),
                escapeHtml(result.department),
                escapeHtml(result.status),
                escapeHtml(reported),
            ];
            rows['active'].push(rowDetails);
            rows['archived'].push(rowDetails);
        }
    });

    activeDetailCampaignsTable.rows.add(rows['active']).draw();
    archivedDetailCampaignsTable.rows.add(rows['archived']).draw();
}
var setRefresh

function refresh() {
    if (!doPoll) {
        return;
    }
    $("#refresh_message").show()
    $("#refresh_btn").hide()
    load();
    poll()
    clearTimeout(setRefresh)
    setRefresh = setTimeout(refresh, 60000)
};

function setGauge(globalStat) {
    // Submitted Data
    let dataSubmitted = getArrayKeyByValue(globalStat, 'Submitted Data', 'name');
    let submitRate = dataSubmitted.hasOwnProperty('y') ? dataSubmitted.y : 0;
    // Click Data
    let dataClicked = getArrayKeyByValue(globalStat, 'Clicked Link', 'name');
    let clickRate = dataClicked.hasOwnProperty('y') ? dataClicked.y : 0;


    // Level 4 : Critical 
    if (submitRate > 10 || clickRate >= 50) {
        document.getElementsByClassName("gauge--data")[0].style = "transform: rotate(-0.0turn); background-color: rgb(105, 10, 3)";
        document.getElementsByClassName("gauge--needle")[0].style = "transform: rotate(-0.0turn);";
        document.getElementById("riskLevel_label").innerHTML = "Critical";
    }else
    // Level 3 : High
    if (submitRate >= 5 || (clickRate >= 30 && clickRate < 50)) {
        document.getElementsByClassName("gauge--data")[0].style = "transform: rotate(-0.15turn); background-color: red;";
        document.getElementsByClassName("gauge--needle")[0].style = "transform: rotate(-0.15turn);";
        document.getElementById("riskLevel_label").innerHTML = "High";
    }else
    // Level 2 : Meduim
    if ((submitRate >= 1 && submitRate < 5) || (clickRate >= 10 && clickRate < 30)) {
        document.getElementsByClassName("gauge--data")[0].style = "transform: rotate(-0.3turn); background-color: rgb(240, 91, 79);";
        document.getElementsByClassName("gauge--needle")[0].style = "transform: rotate(-0.3turn);";
        document.getElementById("riskLevel_label").innerHTML = "Medium";
    }else
    // Level 1 : Low
    if (submitRate < 1 || clickRate < 10) {
        document.getElementsByClassName("gauge--data")[0].style = "transform: rotate(-0.4turn); background-color: rgb(255, 216, 84);";
        document.getElementsByClassName("gauge--needle")[0].style = "transform: rotate(-0.4turn);";
        document.getElementById("riskLevel_label").innerHTML = "Low";
    }
}

$(document).ready(function() {
    Highcharts.setOptions({
        global: {
            useUTC: false
        }
    });

    campaign.id = window.location.pathname.split('/').slice(-1)[0]
    var use_map = JSON.parse(localStorage.getItem('gophish.use_map'))
    api.campaignParentId.results(campaign.id)
        .success(function(c) {
            
            campaign = c;
            
            if(!campaign.hasOwnProperty('results')){
                campaign.results = []
            }

            if (campaign) {
                $("#loading").hide()
                $("#campaignResults").show()
                    //

                $("#loadingDetail").hide()
                $("#campaignDetailTable").show()
                $("#campaignTableDetailArchive").show()
                $("#loadingDetailPerDay").hide()
                    //loadingDetailPerDepartment
                $("#loadingDetailPerDepartment").hide()
                $("#campaignDetailPerDepartmentTable").show()
                $("#archivedDetailPerDepartmentCampaigns").show()
                $("#campaign-operations").hide()

                //
                var email_series_data = {}
                var timeline_series_data = []
                Object.keys(statusMapping).forEach(function(k) {
                    email_series_data[k] = 0
                });
                //
                activeDetailCampaignsTable = $("#campaignDetailTable").DataTable({
                    columnDefs: [{
                        orderable: false,
                        targets: "no-sort"
                    }],
                    order: [
                        [1, "desc"]
                    ]
                });
                archivedDetailCampaignsTable = $("#campaignTableDetailArchive").DataTable({
                    columnDefs: [{
                        orderable: false,
                        targets: "no-sort"
                    }],
                    order: [
                        [1, "desc"]
                    ]
                });
                activeDetailDepartmentCampaignsTable = $("#campaignDetailPerDepartmentTable").DataTable({
                    columnDefs: [{
                        orderable: false,
                        targets: "no-sort"
                    }],
                    order: [
                        [1, "desc"]
                    ]
                });
                // archivedDetailDepartmentCampaignsTable = $("#campaignTableDetailPerDepartmentArchive").DataTable({
                //     columnDefs: [{
                //         orderable: false,
                //         targets: "no-sort"
                //     }],
                //     order: [
                //         [1, "desc"]
                //     ]
                // });
                rows = {
                        'active': [],
                        'archived': []
                    }
                    //
                    //

                let statPerDay = {
                    'day': 'Lundi',
                    'mail_sent': 10,
                    'mail_click': 2,
                    'mail_read_rate': 50,
                    'mail_read_click': 100,
                }
                let statsPerDay = [statPerDay];

                //
                let departmentList = {};
                let locationList = [];
                $.each(campaign.results, function(i, result) {
                    
                        email_series_data[result.status]++;
                        if (result.reported) {
                            email_series_data['Email Reported']++
                        }
                        // Backfill status values
                        var step = progressListing.indexOf(result.status)
                        for (var i = 0; i < step; i++) {
                            email_series_data[progressListing[i]]++
                        }
                        //
                        if( !departmentList.hasOwnProperty(result.department) ) {
                            departmentList[result.department] = {
                                // total
                                'sent': 0,
                                'opened': 0,
                                'clicked': 0,
                                // rate
                                'clicks': 0,
                                'opens': 0
                            };
                        }
                        //
                        if( !(result.location in locationList) ) {
                            locationList.push(result.location);
                        }
                        //
                        let reported = (result.reported) ? 'Yes' : 'No';
                        //
                        switch (result.status) {
                            case "Email Sent":
                                departmentList[result.department].sent += 1;
                                break;
                            case "Email Opened":
                                departmentList[result.department].opened += 1;
                                break;
                            case "Clicked Link":
                                departmentList[result.department].clicked += 1;
                                break;
                            default:
                                break;
                        }
                        departmentList[result.department].opens = percentage(departmentList[result.department].opened, departmentList[result.department].sent)
                        departmentList[result.department].clicks = percentage(departmentList[result.department].clicked, departmentList[result.department].sent)
                        var rowDetails = [
                            escapeHtml(result.first_name),
                            escapeHtml(result.last_name),
                            escapeHtml(result.email),
                            escapeHtml(result.position),
                            escapeHtml(result.location),
                            escapeHtml(result.department),
                            escapeHtml(result.status),
                            escapeHtml(reported),
                        ]
                        rows['active'].push(rowDetails)
                        rows['archived'].push(rowDetails)
                            //

                    })
                    //
                activeDetailCampaignsTable.rows.add(rows['active']).draw()
                archivedDetailCampaignsTable.rows.add(rows['archived']).draw()
                $('[data-toggle="tooltip"]').tooltip()
                    //

                // Setup tooltips
                $('[data-toggle="tooltip"]').tooltip()

                // Setup the graphs
                $.each(campaign.timeline, function(i, event) {
                    if (event.message == "Campaign Created") {
                        return true
                    }
                    var event_date = moment.utc(event.time).local()
                    timeline_series_data.push({
                        email: event.email,
                        message: event.message,
                        x: event_date.valueOf(),
                        y: 1,
                        marker: {
                            fillColor: statuses[event.message].color
                        }
                    })
                })
                renderTimelineChart({
                    data: timeline_series_data
                })
                let globalStat = [];
                $.each(email_series_data, function(status, count) {
                    var email_data = []
                    if (!(status in statusMapping)) {
                        return true
                    }
                    email_data.push({
                        name: status,
                        y: Math.floor((count / campaign.results.length) * 100),
                        count: count
                    })
                    email_data.push({
                        name: '',
                        y: 100 - Math.floor((count / campaign.results.length) * 100)
                    })
                    
                    if(email_data[0].name == "Email Sent"){
                        $("#mail_sent-advancement").html(escapeHtml(email_data[0].y + "%"));
                        buildCerle(email_data[0].y,"mail_sent-");
                    }else if(email_data[0].name == "Email Opened"){
                        $("#mail_opened-advancement").html(escapeHtml(email_data[0].y + "%"));
                        buildCerle(email_data[0].y,"mail_opened-");
                    }else if(email_data[0].name == "Clicked Link"){
                        $("#mail_link-advancement").html(escapeHtml(email_data[0].y + "%"));
                        buildCerle(email_data[0].y,"mail_link-");
                    }else if(email_data[0].name == "Submitted Data"){
                        $("#mail_sub_data-advancement").html(escapeHtml(email_data[0].y + "%"));
                        buildCerle(email_data[0].y,"mail_sub_data-");
                    }else if(email_data[0].name == "Email Reported"){
                        $("#mail_reported-advancement").html(escapeHtml(email_data[0].y + "%"));
                        buildCerle(email_data[0].y,"mail_reported-");
                    }
                    globalStat.push({
                            name: status,
                            y: Math.floor((count / campaign.results.length) * 100),
                        })

                })
                
                // Init Gauge Risk Level
                setGauge(globalStat)

                select = document.getElementById('departmentCompagin');
                var optAll = document.createElement('option');
                optAll.value = "All";
                optAll.innerHTML = "All";
                select.appendChild(optAll);
                Object.keys(departmentList).forEach(dep => {
                    var opt = document.createElement('option');
                    opt.value = dep;
                    opt.innerHTML = dep;
                    select.appendChild(opt);
                });
                selectLocation = document.getElementById('location');
                var optAll2 = document.createElement('option');
                    optAll2.value = "All";
                    optAll2.innerHTML = "All";
                selectLocation.appendChild(optAll2);
                locationList.forEach(dep => {
                        var opt = document.createElement('option');
                        opt.value = dep;
                        opt.innerHTML = dep;
                        selectLocation.appendChild(opt);
                    })
                    //
                if (use_map) {
                    $("#resultsMapContainer").show()
                    map = new Datamap({
                        element: document.getElementById("resultsMap"),
                        responsive: true,
                        fills: {
                            defaultFill: "#ffffff",
                            point: "#283F50"
                        },
                        geographyConfig: {
                            highlightFillColor: "#1abc9c",
                            borderColor: "#283F50"
                        },
                        bubblesConfig: {
                            borderColor: "#283F50"
                        }
                    });
                }
                updateMap(campaign.results);

                //departmentStatLists
                let StatisticsPerDepRows = {
                    'active': [],
                    'archived': []
                };
                Object.keys(departmentList).forEach(depStatRow => {
                    var newRow = [
                        escapeHtml(depStatRow),
                        escapeHtml(departmentList[depStatRow].sent),
                        escapeHtml(departmentList[depStatRow].clicked),
                        escapeHtml(departmentList[depStatRow].opens + " %"),
                        escapeHtml(departmentList[depStatRow].clicks + " %"),
                    ];
                    StatisticsPerDepRows['archived'].push(newRow);
                    StatisticsPerDepRows['active'].push(newRow);
                });

                activeDetailDepartmentCampaignsTable.rows.add(StatisticsPerDepRows['active']).draw();
                // archivedDetailDepartmentCampaignsTable.rows.add(StatisticsPerDepRows['archived']).draw();
            }

        })
        .error(function() {
            $("#loading").hide()
            $("#campaignResults").hide()
            $("#campaign-operations").show()
        })
        
    // Start the polling loop
    setRefresh = setTimeout(refresh, 60000)
})