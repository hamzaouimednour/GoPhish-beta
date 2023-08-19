
var items = []
var settingType = ""

// Save attempts to POST to /templates/
function save(idx) {
    var item = {}
    item.name = $("#name").val()
    item.type = $("#type").val()
    if (idx != -1) {
        item.id = items[idx].id
        api.librarySettings.put(settingType.toLowerCase(), item)
            .success(function (data) {
                successFlash(settingType+" edited successfully!")
                load()
                dismiss()
            })
            .error(function (data) {
                modalError(data.responseJSON.message)
            })
    } else {
        // Submit the page
        api.librarySettings.post(settingType.toLowerCase(), item)
            .success(function (data) {
                successFlash(settingType+" added successfully!")
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

var deleteItem = function (idx) {
    Swal.fire({
        title: "Are you sure?",
        text: "This will delete the specified "+settingType+". This can't be undone!",
        type: "warning",
        animation: false,
        showCancelButton: true,
        confirmButtonText: "Delete " + escapeHtml(items[idx].name),
        confirmButtonColor: "#428bca",
        reverseButtons: true,
        allowOutsideClick: false,
        preConfirm: function () {
            return new Promise(function (resolve, reject) {
                api.librarySettings.delete(settingType.toLowerCase(), items[idx].id)
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
                settingType+' Deleted!',
                'This '+settingType+' has been deleted!',
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
    var item = {}
    if (idx != -1) {
        $("#modalLabel").text("Edit "+settingType)
        item = items[idx]
        $("#name").val(item.name)
        $("#type").val(item.type)
    } else {
        $("#type").val(settingType.toLowerCase())
        $("#modalLabel").text("New "+settingType)
    }
}


function load() {
    /*
        load() - Loads the current items using the API
    */
    $("#librarySettingsTable").hide()
    $("#emptyMessage").hide()
    $("#loading").show()

    api.librarySettings.get(settingType.toLowerCase())
        .success(function (ps) {
            items = ps
            $("#loading").hide()
            if (items.length > 0) {

                $("#librarySettingsTable").show()
                librarySettingsTable = $("#librarySettingsTable").DataTable({
                    destroy: true,
                    columnDefs: [{
                        orderable: false,
                        targets: "no-sort"
                    }]
                });
                librarySettingsTable.clear()
                pageRows = []
                $.each(items, function (i, item) {

                    pageRows.push([
                        escapeHtml(item.name),
                        "<div class='pull-right'><span data-toggle='modal' data-backdrop='static' data-target='#modal'><button class='btn btn-primary' data-toggle='tooltip' data-placement='left' title='Edit "+settingType+"' onclick='edit(" + i + ")'>\
                    <i class='fa fa-pencil'></i>\
                    </button></span>\
                    <button class='btn btn-danger' data-toggle='tooltip' data-placement='left' title='Delete "+settingType+"' onclick='deleteItem(" + i + ")'>\
                    <i class='fa fa-trash-o'></i>\
                    </button></div>"
                    ])
                })
                librarySettingsTable.rows.add(pageRows).draw()
                $('[data-toggle="tooltip"]').tooltip()
            } else {
                $("#emptyMessage").show()
            }
        })
        .error(function () {
            $("#loading").hide()
            errorFlash("Error fetching "+settingType)
        })

}

$(document).ready(function () {
    settingType = $("#settingType").val()
    
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

    load()
})
