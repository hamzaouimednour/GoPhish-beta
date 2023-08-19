let lastCampaignDataToExport = [];
lastCampaignDataToExport.push([
    'Name',
    'Owner',
    'Start date',
    'Operation',
    'Status',
    'Risque level'
]);
api.campaignParents.get()
    .success(function(ps) {
        campaigns = ps.campaigns;
        campaignsDetails = ps.campaigns_details;
        campaignsAdvancements = ps.campaigns_advancements;
        let compaign_scheduled =0;
        let compaign_progress =0;
        let compaign_completed =0;
        campaigns.forEach(element => {
            if(element.status == "DOWN"){
                compaign_scheduled ++;
            }
            if(element.status == "UP"){
                compaign_progress ++;
            }
            if(element.status == "END"){
                compaign_completed ++;
            }
        });
        document.getElementById("compaign_scheduled").innerHTML = compaign_scheduled;
        document.getElementById("compaign_progress").innerHTML = compaign_progress;
        document.getElementById("compaign_completed").innerHTML = compaign_completed;
        campaignsTable = $("#campaignsTable").DataTable({
            // "aoColumnDefs": [
            //     { "bSearchable": false, "aTargets": [0] }
            // ],
            // "paging": false,
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
        // campaignsTable = $("#campaignsTable").DataTable({
        //     destroy: false,
        //     columnDefs: [{
        //         orderable: false,
        //         targets: "no-sort",
        //         searchable: false
        //     }]
        // });
        campaignsTable.clear()
        pageRows = [];
        compaignStat = [];
        $.each(campaigns, function(i, campaign) {
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
            .success(function(dt) {
                let clicked=0;
                let total =0;
                dt.campaigns.forEach(element => {
                    clicked += element.stats.clicked;
                    total += element.stats.total;
                });
                let level = clicked / total * 100;
                if(level == Infinity){
                    risqueLevel = "Manageable";
                }else if (level < 1){
                    risqueLevel = "Manageable";
                }else if (level < 3 && level > 3){
                    risqueLevel = "Medium";
                }else if (level < 10 && level > 3){
                    risqueLevel = "High";
                }else if (level < 20 && level > 10){
                    risqueLevel = "Critical";
                }else if (level > 20){
                    risqueLevel = "Catastrophic";
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
           
        })
        
    });