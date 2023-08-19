var campaigns = []
    // statuses is a helper map to point result statuses to ui classes
if(typeof statuses === 'undefined')
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
        icon: "fa-envelope",
        point: "ct-point-opened"
    },
    "Email Reported": {
        color: "#45d6ef",
        label: "label-warning",
        icon: "fa-bullhorne",
        point: "ct-point-reported"
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
    "Campaign Created": {
        label: "label-success",
        icon: "fa-rocket"
    }
}
if(typeof statsMapping === 'undefined')
var statsMapping = {
    "sent": "Email Sent",
    "opened": "Email Opened",
    "email_reported": "Email Reported",
    "clicked": "Clicked Link",
    "submitted_data": "Submitted Data",
}


/* Renders a pie chart using the provided chartops */

function generateTimelineChart(campaigns) {
    var overview_data = {
        'click': [],
        'submit': [],
    }
    $.each(campaigns, function (i, campaign) {
        var campaign_date = moment.utc(campaign.created_date).local()
        // Clicked events also contain our data submitted events
        overview_data.click.push({
            campaign_id: campaign.id,
            name: campaign.name,
            x: campaign_date.valueOf(),
            y: Math.floor(percentage(campaign.stats.clicked, campaign.stats.total))
        })

        overview_data.submit.push({
            campaign_id: campaign.id,
            name: campaign.name,
            x: campaign_date.valueOf(),
            y: Math.floor(percentage(campaign.stats.submitted_data, campaign.stats.total))
        })
    })

    Highcharts.chart('overview_chart_click', {
        chart: {
            zoomType: 'x',
            type: 'areaspline'
        },
        title: {
            text: 'Phishing Success Overview (Clicked Links Rate)'
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
            max: 100,
            title: {
                text: "% of Success"
            }
        },
        tooltip: {
            formatter: function () {
                return Highcharts.dateFormat('%A, %b %d %l:%M:%S %P', new Date(this.x)) +
                    '<br>' + this.point.name + '<br>% Success: <b>' + this.y + '%</b>'
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
                point: {
                    events: {
                        click: function (e) {
                            window.location.href = "/campaigns/" + this.campaign_id
                        }
                    }
                }
            }
        },
        credits: {
            enabled: false
        },
        series: [{
            data: overview_data.click,
            color: "#f05b4f",
            fillOpacity: 0.5
        }]
    })
    
    Highcharts.chart('overview_chart_submit', {
        chart: {
            zoomType: 'x',
            type: 'areaspline'
        },
        title: {
            text: 'Phishing Success Overview (Submitted Data Rate)'
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
            max: 100,
            title: {
                text: "% of Success"
            }
        },
        tooltip: {
            formatter: function () {
                return Highcharts.dateFormat('%A, %b %d %l:%M:%S %P', new Date(this.x)) +
                    '<br>' + this.point.name + '<br>% Success: <b>' + this.y + '%</b>'
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
                point: {
                    events: {
                        click: function (e) {
                            window.location.href = "/campaigns/" + this.campaign_id
                        }
                    }
                }
            }
        },
        credits: {
            enabled: false
        },
        series: [{
            data: overview_data.submit,
            color: "#f05b4f",
            fillOpacity: 0.5
        }]
    })
}


$(document).ready(function() {
    Highcharts.setOptions({
        global: {
            useUTC: false
        }
    })
    api.campaigns.summary()
        .success(function(data) {
            campaigns = data.campaigns
            if (campaigns.length > 0) {
                // Build the charts
                //generateStatsPieCharts(campaigns)
                generateTimelineChart(campaigns)
            }
        })
        .error(function() {
            errorFlash("Error fetching campaigns")
        })
})