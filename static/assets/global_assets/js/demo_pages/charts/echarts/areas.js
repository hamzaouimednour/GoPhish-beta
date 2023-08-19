/* ------------------------------------------------------------------------------
 *
 *  # Echarts - Area charts
 *
 *  Demo JS code for echarts_areas.html page
 *
 * ---------------------------------------------------------------------------- */


// Setup module
// ------------------------------
let lastCampaignDataToExport = [];
lastCampaignDataToExport.push([
    'Name',
    'Owner',
    'Start date',
    'Operation',
    'Status',
    'Risque level'
]);

var EchartsAreas = function () {


    //
    // Setup module components
    //

    // Area charts
    var _areaChartExamples = function () {
        if (typeof echarts == 'undefined') {
            console.warn('Warning - echarts.min.js is not loaded.');
            return;
        }

        // Define elements
        var area_basic_element = document.getElementById('area_basic');
        //
        // Charts configuration
        //

        // Basic area chart
        if (area_basic_element) {

            // Initialize chart
            var area_basic = echarts.init(area_basic_element);

            //
            // Chart config
            //
            api.campaignParents.get()
                .success(function (ps) {
                    let camp = ps.campaigns;
                    let campResult = [];
                    campaigns = ps.campaigns;
                    campaignsDetails = ps.campaigns_details;
                    campaignsAdvancements = ps.campaigns_advancements;
                    let compaign_scheduled = 0;
                    let compaign_progress = 0;
                    let compaign_completed = 0;
                    campaigns.forEach(element => {
                        if (element.status == "DOWN") {
                            compaign_scheduled++;
                        }
                        if (element.status == "UP") {
                            compaign_progress++;
                        }
                        if (element.status == "END") {
                            compaign_completed++;
                        }
                    });
                    document.getElementById("compaign_scheduled").innerHTML = compaign_scheduled;
                    document.getElementById("compaign_progress").innerHTML = compaign_progress;
                    document.getElementById("compaign_completed").innerHTML = compaign_completed;
                    campaignsTable = $("#campaignsTable").DataTable({
                        "info": false,
                        "bPaginate": false,
                        "bSearchable": false,
                        "bFilter": false,
                        columnDefs: [{
                            orderable: false,
                            targets: "no-sort",
                            searchable: false,
                            bSearchable: false,
                            paging: false,
                            aTargets: "no-sort"
                        }]
                    });
                    campaignsTable.clear()
                    pageRows = [];
                    compaignStat = [];
                    $.each(campaigns, function (i, campaign) {

                        let campaignDetail = campaignsDetails.find(c => c.id === campaign.id)
                        let campaignsProgress = campaignsAdvancements.find(c => c.id === campaign.id)
                        let status = '<td><span class="badge bg-danger">Closed</span></td>';
                        let status_msg = 'Closed';
                        if (campaigns[i].status == "DOWN") {
                            status = '<td><span class="badge bg-danger">Closed</span></td>';
                            status_msg = 'Closed';
                        } else {
                            status = '<td><span class="badge bg-blue">Active</span></td>';
                            status_msg = 'Active';
                        }

                        let risqueLevel = "Manageable";
                        api.campaignParentId.summary(campaigns[i].id)
                            .success(function (dt) {
                                let clicked = 0;
                                let submitted = 0;
                                let total = 0;
                                dt.campaigns.forEach(element => {
                                    submitted += element.stats.submitted_data;
                                    clicked += element.stats.clicked;
                                    total += element.stats.total;
                                });
                                let clickLevel = clicked / total * 100;
                                let submitLevel = submitted / total * 100;
                                if (submitLevel > 10 || clickLevel >= 50) {
                                    risqueLevel = "Critical";
                                } else if (submitLevel >= 5 || (clickLevel >= 30 && clickLevel < 50)) {
                                    risqueLevel = "High";
                                } else if ((submitLevel >= 1 && submitLevel < 5) || (clickLevel >= 10 && clickLevel < 30)) {
                                    risqueLevel = "Medium";
                                } else if (submitLevel < 1 || clickLevel < 10) {
                                    risqueLevel = "Low";
                                }
                                // compaignStat.push(dt)
                                var today = new Date(campaigns[i].created_date);
                                var dd = String(today.getDate()).padStart(2, '0');
                                var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
                                var yyyy = today.getFullYear();

                                today = mm + '/' + dd + '/' + yyyy;
                                let creat_dte = today;
                                pageRows = [];
                                pageRows.push([
                                    "<a href='/campaign_parents/" + campaign.id + "'>" + escapeHtml(campaign.name) + "</a>",
                                    escapeHtml(campaignDetail.owner),
                                    escapeHtml(creat_dte),
                                    escapeHtml(campaignDetail.operations),
                                    status,
                                    risqueLevel
                                ]);
                                campaignsTable.rows.add(pageRows).draw();

                                lastCampaignDataToExport.push([
                                    campaign.name,
                                    campaignDetail.owner,
                                    creat_dte,
                                    campaignDetail.operations,
                                    status_msg,
                                    risqueLevel
                                ]);

                            });

                    });
                    camp.forEach(cam => {


                        // let campDte = cam.created_date;


                        var today = new Date(cam.created_date);
                        var dd = String(today.getDate()).padStart(2, '0');
                        var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
                        var yyyy = today.getFullYear();

                        today = mm + '/' + dd + '/' + yyyy;
                        let campDte = today;

                        api.campaignParentId.results(cam.id)
                            .success(function (c) {
                                let mailSent = 0
                                let mailOpened = 0
                                let mailClicked = 0
                                let mailSubData = 0
                                let mailRep = 0
                                c.results.forEach(elt => {
                                    if (elt.status == "Email Sent") {
                                        mailSent++;
                                    } else if (elt.status == "Email Opened") {
                                        mailOpened++;
                                    } else if (elt.status == "Clicked Link") {
                                        mailClicked++;
                                    } else if (elt.status == "Submitted Data") {
                                        mailSubData++;
                                    } else if (elt.status == "") {
                                        mailRep++;
                                    }
                                });
                                campResult.push({
                                    date: campDte,
                                    mailSent: mailSent,
                                    mailOpened: mailOpened,
                                    mailClicked: mailClicked,
                                    mailSubData: mailSubData,
                                    mailRep: mailRep
                                });
                                let dtes = [];
                                let mailSents = [];
                                let mailOpeneds = [];
                                let mailClickeds = [];
                                let mailSubDatas = [];
                                let mailReps = [];
                                let ffffccccddddddd = [];

                                for (let index = 0; index < campResult.length; index++) {
                                    const campResultitem1 = campResult[index];
                                    for (let i = index + 1; i < campResult.length; i++) {
                                        const campResultitem2 = campResult[i];
                                        if (campResultitem1.date == campResultitem2.date) {
                                            var ittttem = {
                                                date: campResultitem2.date,
                                                mailClicked: campResultitem2.mailClicked + campResultitem1.mailClicked,
                                                mailOpened: campResultitem2.mailOpened + campResultitem1.mailOpened,
                                                mailRep: campResultitem2.mailRep + campResultitem1.mailRep,
                                                mailSent: campResultitem2.mailSent + campResultitem1.mailSent,
                                                mailSubData: campResultitem2.mailSubData + campResultitem1.mailSubData,
                                            }
                                            ffffccccddddddd.push(ittttem);
                                        }
                                    }
                                }

                                for (let index = 0; index < campResult.length; index++) {
                                    const element1 = campResult[index];
                                    var flag = 0;
                                    for (let i = 0; i < ffffccccddddddd.length; i++) {
                                        const element2 = ffffccccddddddd[i];
                                        if (element1.date == element2.date) {
                                            flag = 1;
                                        }
                                    }
                                    if (flag == 0) {
                                        ffffccccddddddd.push(element1);
                                    }

                                }
                                
                                ffffccccddddddd.sort((a, b) => new Date(a.date) - new Date(b.date));

                                ffffccccddddddd.forEach(campppprr => {
                                    dtes.push(campppprr.date)
                                    mailSents.push(campppprr.mailSent)
                                    mailOpeneds.push(campppprr.mailOpened)
                                    mailClickeds.push(campppprr.mailClicked)
                                    mailSubDatas.push(campppprr.mailSubData)
                                    mailReps.push(campppprr.mailRep)
                                });

                                // Options
                                area_basic.setOption({

                                    // Define colors
                                    color: ['#2ec7c9', '#b6a2de', '#5ab1ef', '#ffb980', '#d87a80'],

                                    // Global text styles
                                    textStyle: {
                                        fontFamily: 'Roboto, Arial, Verdana, sans-serif',
                                        fontSize: 13
                                    },

                                    // Chart animation duration
                                    animationDuration: 750,

                                    // Setup grid
                                    grid: {
                                        left: 0,
                                        right: 40,
                                        top: 35,
                                        bottom: 0,
                                        containLabel: true
                                    },

                                    // Add legend
                                    legend: {
                                        data: ['Email Sent', 'Mail opened', 'Mail clicked', 'Submitted Data', 'Email Reported'],
                                        itemHeight: 8,
                                        itemGap: 20
                                    },

                                    // Add tooltip
                                    tooltip: {
                                        trigger: 'axis',
                                        backgroundColor: 'rgba(0,0,0,0.75)',
                                        padding: [10, 15],
                                        textStyle: {
                                            fontSize: 13,
                                            fontFamily: 'Roboto, sans-serif'
                                        }
                                    },

                                    // Horizontal axis
                                    xAxis: [{
                                        type: 'category',
                                        boundaryGap: false,
                                        data: dtes,
                                        axisLabel: {
                                            color: '#333'
                                        },
                                        axisLine: {
                                            lineStyle: {
                                                color: '#999'
                                            }
                                        },
                                        splitLine: {
                                            show: true,
                                            lineStyle: {
                                                color: '#eee',
                                                type: 'dashed'
                                            }
                                        }
                                    }],

                                    // Vertical axis
                                    yAxis: [{
                                        type: 'value',
                                        axisLabel: {
                                            color: '#333'
                                        },
                                        axisLine: {
                                            lineStyle: {
                                                color: '#999'
                                            }
                                        },
                                        splitLine: {
                                            lineStyle: {
                                                color: '#eee'
                                            }
                                        },
                                        splitArea: {
                                            show: true,
                                            areaStyle: {
                                                color: ['rgba(250,250,250,0.1)', 'rgba(0,0,0,0.01)']
                                            }
                                        }
                                    }],

                                    // Add series
                                    series: [
                                        {
                                            name: 'Mail clicked',
                                            type: 'line',
                                            data: mailClickeds,
                                            areaStyle: {
                                                normal: {
                                                    opacity: 0.25
                                                }
                                            },
                                            smooth: true,
                                            symbolSize: 7,
                                            itemStyle: {
                                                normal: {
                                                    borderWidth: 2
                                                }
                                            }
                                        },
                                        {
                                            name: 'Mail opened',
                                            type: 'line',
                                            smooth: true,
                                            symbolSize: 7,
                                            itemStyle: {
                                                normal: {
                                                    borderWidth: 2
                                                }
                                            },
                                            areaStyle: {
                                                normal: {
                                                    opacity: 0.25
                                                }
                                            },
                                            data: mailOpeneds
                                        },
                                        {
                                            name: 'Email Sent',
                                            type: 'line',
                                            smooth: true,
                                            symbolSize: 7,
                                            itemStyle: {
                                                normal: {
                                                    borderWidth: 2
                                                }
                                            },
                                            areaStyle: {
                                                normal: {
                                                    opacity: 0.25
                                                }
                                            },
                                            data: mailSents
                                        },
                                        {
                                            name: 'Submitted Data',
                                            type: 'line',
                                            smooth: true,
                                            symbolSize: 7,
                                            itemStyle: {
                                                normal: {
                                                    borderWidth: 2
                                                }
                                            },
                                            areaStyle: {
                                                normal: {
                                                    opacity: 0.25
                                                }
                                            },
                                            data: mailSubDatas
                                        },
                                        {
                                            name: 'Email Reported',
                                            type: 'line',
                                            smooth: true,
                                            symbolSize: 7,
                                            itemStyle: {
                                                normal: {
                                                    borderWidth: 2
                                                }
                                            },
                                            areaStyle: {
                                                normal: {
                                                    opacity: 0.25
                                                }
                                            },
                                            data: mailReps
                                        }
                                    ]
                                });







                            });
                    });
                });

        }


        //
        // Resize charts
        //

        // Resize function
        var triggerChartResize = function () {
            area_basic_element && area_basic.resize();
        };

        // On sidebar width change
        $(document).on('click', '.sidebar-control', function () {
            setTimeout(function () {
                triggerChartResize();
            }, 0);
        });

        // On window resize
        var resizeCharts;
        window.onresize = function () {
            clearTimeout(resizeCharts);
            resizeCharts = setTimeout(function () {
                triggerChartResize();
            }, 200);
        };
    };


    //
    // Return objects assigned to module
    //

    return {
        init: function () {
            _areaChartExamples();
        }
    }
}();


// Initialize module
// ------------------------------

document.addEventListener('DOMContentLoaded', function () {
    EchartsAreas.init();
});
