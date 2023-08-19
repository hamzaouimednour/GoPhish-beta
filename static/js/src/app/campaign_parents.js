/*
	campaign_parents.js
	Handles the creation, editing, and deletion of Campaigns
	Author: Dart Dragunov
*/
var campaigns = []


// Save attempts to POST to /templates/
function save(idx) {

    // init campaign object
    var campaign = {}
    campaign.name = $("#name").val()

    if (idx != -1) {
        // reinit campaign object
        campaign = getArrayKeyByValue(campaigns,idx,'id')
        campaign.name = $("#name").val()
        // Submit modification
        api.campaignParentId.put(campaign)
            .success(function (data) {
                successFlash("Campaign edited successfully!")
                load()
                dismiss()
            })
    } else {
        // Submit the Campaign
        api.campaignParents.post(campaign)
            .success(function (data) {
                successFlash("Campaign added successfully!")
                load()
                dismiss()
            })
            .error(function (data) {
                modalError(data.responseJSON.message)
            })
    }
}

function dismiss() {
    $("#modal\\.flashes").empty()
    $("#name").val("")
    $("#modal").find("input[type='checkbox']").prop("checked", false)
    $("#modal").modal('hide')
}

function buttons(status, i) {
    let btns = "\ <button class='btn btn-primary edit_button' data-toggle='modal' data-backdrop='static' data-target='#modal' data-campaign-id='" + i + "'>\<i class='fa fa-pencil'></i></button>\
    <button class='btn btn-danger' onclick='deleteCampaign(" + i + ")' data-toggle='tooltip' data-placement='left' title='Delete Campaign'><i class='fa fa-trash-o'></i></button>"
    switch (status) {
        case "DOWN":
            return "<button class='btn btn-success launch-campaign' data-toggle='tooltip' data-placement='left' title='Launch Campaign' onclick='launchCampaign(" + i + ")'> <i class='fa fa-play'></i></button>" + btns
        case "UP":
            return "<button class='btn btn-danger stop-campaign' data-toggle='tooltip' data-placement='left' title='Stop Campaign' onclick='stopCampaign(" + i + ")' "+(status == "END" ? 'disabled': '')+"> <i class='fa fa-stop'></i></button>" + btns
        default:
            return "<button class='btn btn-default' data-toggle='tooltip' data-placement='left' title='Campaign Stopped' disabled> <i class='fa fa-ban'></i></button>" + btns
    }
}

var deleteCampaign = function (idx) {
    Swal.fire({
        title: "Are you sure?",
        text: "This will delete the Camapign and stop all its Operations. This can't be undone!",
        type: "warning",
        animation: false,
        showCancelButton: true,
        confirmButtonText: "Delete " + escapeHtml(getArrayKeyByValue(campaigns,idx,'id').name),
        confirmButtonColor: "#428bca",
        reverseButtons: true,
        allowOutsideClick: false,
        preConfirm: function () {
            return new Promise(function (resolve, reject) {
                api.campaignParentId.delete(getArrayKeyByValue(campaigns,idx,'id').id)
                    .success(function (msg) {
                        resolve()
                    })
                    .error(function (data) {
                        reject(data.responseJSON.message)
                    })
            })
        }
    }).then(function (result) {
        if (result.value){
            Swal.fire(
                'Campaign Deleted!',
                'This Campaign has been deleted!',
                'success'
            );
        }
        $('button:contains("OK")').on('click', function () {
            location.reload()
        })
    })
}

function edit(idx) {
    $("#modalSubmit").unbind('click').click(function () {
        save(idx)
    })
    var campaign = {}
    if (idx != -1) {
        $("#campaignModalLabel").text("Edit Campaign")
        campaign = getArrayKeyByValue(campaigns,idx,'id');
        $("#name").val(campaign.name)
    } else {
        $("#campaignModalLabel").text("New Campaign")
    }
}

function launchCampaign(idx) {
    Swal.fire({
        title: "Are you sure?",
        text: "This will launch all operations within this Camapign!",
        type: "warning",
        animation: false,
        showCancelButton: true,
        confirmButtonText: "Launch Campaign",
        confirmButtonColor: "#8BCA42",
        reverseButtons: true,
        allowOutsideClick: false,
        preConfirm: function () {
            return new Promise(function (resolve, reject) {
                api.campaignParentId.launch(idx)
                    .success(function (msg) {
                        resolve()
                    })
                    .error(function (data) {
                        reject(data.responseJSON.message)
                        $("#loading").hide()
                        
                        if(data.status == 406){
                            // alertFlash()
                            Swal.fire(data.responseJSON.message, '', 'warning')
                        }else{
                            // errorFlash()
                            Swal.fire('Failed Launching Campaign', '', 'erorr')
                        }
                        
                    })
            })
        }
    }).then(function (result) {
        if (result.value){
            Swal.fire(
                'Campaign Launched!',
                'This Campaign has been launched!',
                'success'
            );
        }
        $('button:contains("OK")').on('click', function () {
            location.reload()
        })
    })
}

function stopCampaign(idx) {
    Swal.fire({
        title: "Are you sure?",
        text: "This will stop all scheduled/ongoing operations within this Camapign!",
        type: "warning",
        animation: false,
        showCancelButton: true,
        confirmButtonText: "Stop Campaign",
        confirmButtonColor: "#CA4247",
        reverseButtons: true,
        allowOutsideClick: false,
        preConfirm: function () {
            return new Promise(function (resolve, reject) {
                api.campaignParentId.stop(idx)
                    .success(function (msg) {
                        resolve()
                    })
                    .error(function (data) {
                        reject(data.responseJSON.message)
                        $("#loading").hide()
                        errorFlash("Failed Stopping Campaign")
                    })
            })
        }
    }).then(function (result) {
        if (result.value){
            Swal.fire(
                'Campaign Stopped!',
                'This Campaign has been stopped!',
                'success'
            );
        }
        $('button:contains("OK")').on('click', function () {
            location.reload()
        })
    })
}


function load() {
    /*
        load() - Loads the current campaigns using the API
    */
    $("#campaignParentsTable").hide()
    $("#emptyMessage").hide()
    $("#loading").show()
    api.campaignParents.get()
        .success(function (ps) {
            
            
            campaigns = ps.campaigns;
            campaignsDetails = ps.campaigns_details;
            campaignsAdvancements = ps.campaigns_advancements;
            
            $("#loading").hide()
            if (campaigns.length > 0) {
                $("#campaignParentsTable").show()
                campaignParentsTable = $("#campaignParentsTable").DataTable({
                    destroy: true,
                    columnDefs: [{
                        orderable: false,
                        targets: "no-sort"
                    }]
                });
                campaignParentsTable.clear()
                pageRows = []
                $.each(campaigns, function (i, campaign) {
                    let campaignDetail = campaignsDetails.find(c => c.id === campaign.id)
                    let campaignsProgress = campaignsAdvancements.find(c => c.id === campaign.id)
                   
                    pageRows.push([
                        "<a href='/campaign_parents/"+campaign.id+"'>" + escapeHtml(campaign.name) + "</a>",
                        escapeHtml(campaignDetail.owner),
                        escapeHtml(campaignDetail.operations),
                        escapeHtml(campaignsProgress.advancement + "%" ),
                        "<div class='pull-right'>"+buttons(campaign.status, campaign.id)+"</div>"
                    ])
                })
                campaignParentsTable.rows.add(pageRows).draw()
                $('[data-toggle="tooltip"]').tooltip()
            } else {
                $("#emptyMessage").show()
            }
        })
        .error(function () {
            $("#loading").hide()
            errorFlash("Error fetching campaigns")
        })
}

$(document).ready(function () {
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
    $.fn.modal.Constructor.prototype.enforceFocus = function () {
        $(document)
            .off('focusin.bs.modal') // guard against infinite focus loop
            .on('focusin.bs.modal', $.proxy(function (e) {
                if (
                    this.$element[0] !== e.target && !this.$element.has(e.target).length
                    // CKEditor compatibility fix start.
                    &&
                    !$(e.target).closest('.cke_dialog, .cke').length
                    // CKEditor compatibility fix end.
                ) {
                    this.$element.trigger('focus');
                }
            }, this));
    };
    // Scrollbar fix - https://stackoverflow.com/questions/19305821/multiple-modals-overlay
    $(document).on('hidden.bs.modal', '.modal', function () {
        $('.modal:visible').length && $(document.body).addClass('modal-open');
    });
    $('#modal').on('hidden.bs.modal', function (event) {
        dismiss()
    });

    load();

    $("#campaignParentsTable").on('click', '.edit_button', function(e) {
        edit($(this).attr('data-campaign-id'))
    })
})
