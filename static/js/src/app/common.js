$(document).ready(function () {

    let permissions = [];
    api.users.getPermissions().success((perms) => {
        
        permissions = perms
        
        let tablesDOM = {
            'campaigns':        '#campaignTable',
            'campaign_parents': '#campaignParentsTable',
            'groups':           '#groupTable',
            'templates':        '#templateTable',
            'users':            '#userTable',
            'webhooks':         '#webhookTable',
            'landing_pages':    '#pagesTable',
            'sending_profiles': '#profileTable',
        };

        let buttonsDOM = {
            'update':   'tbody > tr > td:last-child > .pull-right button.btn.btn-primary',
            'delete':   'tbody > tr > td:last-child > .pull-right button.btn.btn-danger'
        };

        let buttonsCampaignDOM = {
            'launch': 'tbody > tr > td:last-child > .pull-right button.btn.launch-campaign',
            'stop': 'tbody > tr > td:last-child > .pull-right button.btn.stop-campaign',
        };

        for (const [key, element] of Object.entries(tablesDOM)) {
            let tableSelector = $(element);
            if(tableSelector.length){
                for (const [perm, selector] of Object.entries(buttonsDOM)) {
                    let btnSelector = tableSelector.find(selector);
                    if(btnSelector.length && !permissions.includes(key + '.' + perm)) btnSelector.prop("disabled", true);
                }       
                // campaign parents permissions check
                if(key === 'campaign_parents' && !permissions.includes('campaign_parents.create')){
                    tableSelector.find(buttonsCampaignDOM['launch']).prop("disabled", true);
                    tableSelector.find(buttonsCampaignDOM['stop']).prop("disabled", true);
                }
        }


        }

    }).error(function () { errorFlash("Error fetching user permissions.") })

})
