/*
	landing_pages.js
	Handles the creation, editing, and deletion of landing pages
	Author: Jordan Wright <github.com/jordan-wright>
*/
var pages = []
var usersOwnership = []


// Save attempts to POST to /templates/
function save(idx) {
    var page = {}
    page.name = $("#name").val()
    editor = CKEDITOR.instances["html_editor"]
    page.html = editor.getData()
    page.capture_credentials = $("#capture_credentials_checkbox").prop("checked")
    page.capture_passwords = $("#capture_passwords_checkbox").prop("checked")
    page.redirect_url = $("#redirect_url_input").val()
    page.redirection_page = parseInt($("#redirection_page").val())
    page.language = parseInt($("#language").val())
    page.category = parseInt($("#category").val())
    page.topic = parseInt($("#topic").val())
    page.visibility = parseInt($("#visibility").val())
    if (idx != -1) {
        page.id = pages[idx].id
        api.pageId.put(page)
            .success(function (data) {
                successFlash("Page edited successfully!")
                load()
                dismiss()
            })
            .error(function (data) {
                modalError(data.responseJSON.message)
            })
    } else {
        // Submit the page
        api.pages.post(page)
            .success(function (data) {
                successFlash("Page added successfully!")
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
    $("#html_editor").val("")
    $("#url").val("")
    $("#language").val("")
    $("#category").val("")
    $("#topic").val("")
    $("#language, #category, #topic").trigger("change")
    $("#modal").find("input[type='checkbox']").prop("checked", false)
    $("#capture_passwords").hide()
    $("#modal").modal('hide')
}

var deletePage = function (idx) {
    Swal.fire({
        title: "Are you sure?",
        text: "This will delete the landing page. This can't be undone!",
        type: "warning",
        animation: false,
        showCancelButton: true,
        confirmButtonText: "Delete " + escapeHtml(pages[idx].name),
        confirmButtonColor: "#428bca",
        reverseButtons: true,
        allowOutsideClick: false,
        preConfirm: function () {
            return new Promise(function (resolve, reject) {
                api.pageId.delete(pages[idx].id)
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
                'Landing Page Deleted!',
                'This landing page has been deleted!',
                'success'
            );
        }
        $('button:contains("OK")').on('click', function () {
            location.reload()
        })
    })
}

function importSite() {
    url = $("#url").val()
    if (!url) {
        modalError("No URL Specified!")
    } else {
        api.clone_site({
                url: url,
                include_resources: false
            })
            .success(function (data) {
                $("#html_editor").val(data.html)
                CKEDITOR.instances["html_editor"].setMode('wysiwyg')
                $("#importSiteModal").modal("hide")
            })
            .error(function (data) {
                modalError(data.responseJSON.message)
            })
    }
}

function edit(idx) {
    $("#modalSubmit").unbind('click').click(function () {
        save(idx)
    })
    $("#html_editor").ckeditor()
    $("#language, #topic, #category").select2({
        placeholder: 'select option',
    })
    setupAutocomplete(CKEDITOR.instances["html_editor"])
    var page = {}
    if (idx != -1) {
        $("#modalLabel").text("Edit Landing Page")
        page = pages[idx]
        $("#name").val(page.name)
        $("#html_editor").val(page.html)
        $("#capture_credentials_checkbox").prop("checked", page.capture_credentials)
        $("#capture_passwords_checkbox").prop("checked", page.capture_passwords)
        $("#language").val(page.language)
        $("#language").trigger("change")
        $("#category").val(page.category)
        $("#category").trigger("change")
        $("#topic").val(page.topic)
        $("#topic").trigger("change")
        $("#visibility").val(page.visibility)
        $("#visibility").prop("checked", page.visibility)

        if (page.capture_credentials) {
            $("#capture_passwords").show()
            $("#redirect_url").show()
        }
    } else {
        let enLang = getArrayKeyByValue(langs, 'en', 'code')
        $("#language").val(enLang.id)
        $("#language").trigger("change")
        $("#modalLabel").text("New Landing Page")
    }
}

function copy(idx) {
    $("#modalSubmit").unbind('click').click(function () {
        save(-1)
    })
    $("#html_editor").ckeditor()
    var page = pages[idx]
    $("#name").val("Copy of " + page.name)
    $("#html_editor").val(page.html)
    $("#language").val(page.language)
    $("#language").trigger('change')
    $("#category").val(page.category)
    $("#category").trigger('change')
    $("#topic").val(page.topic)
    $("#topic").trigger('change')
    $("#visibility").val(page.visibility)
    $("#visibility").prop("checked", page.visibility)
}

function load() {
    dismiss()
    /*
        load() - Loads the current pages using the API
    */
    $("#pagesTable").hide()
    $("#emptyMessage").hide()
    $("#loading").show()

    // load Languages
    if(!langs.length)
    api.lang.list()
        .success(function (ps) {
            $('#language option:not([value=""])').remove()
            if(ps.length){
                langs = ps
                ps.forEach(element => {
                    $('#language').append('<option value="' + element.id + '">' + element.name + '</option>')
                });
            }
        })

    api.librarySettings.get('topic')
        .success(function (ps) {
            $('#topic option:not([value=""])').remove()
            if(ps.length){
                ps.forEach(element => {
                    $('#topic').append('<option value="' + element.id + '">' + element.name + '</option>')
                });
            }
        })

    api.librarySettings.get('category')
        .success(function (ps) {
            $('#category option:not([value=""])').remove()
            if(ps.length){
                ps.forEach(element => {
                    $('#category').append('<option value="' + element.id + '">' + element.name + '</option>')
                });
            }
        })
        
    api.pages.get()
        .success(function (ps) {
            pages = ps
            $("#loading").hide()
            if (pages.length > 0) {
                                
                // Get Owners usenrames
                let owners = []
                $.each(pages, function (i, page) {
                    if(!owners.includes(page.owner)){
                        owners.push(page.owner)
                    }
                })
                usersOwnership = getOwners(owners)

                $("#pagesTable").show()
                pagesTable = $("#pagesTable").DataTable({
                    destroy: true,
                    columnDefs: [{
                        orderable: false,
                        targets: "no-sort"
                    }]
                });
                pagesTable.clear()
                pageRows = []
                $.each(pages, function (i, page) {
                    // page language
                    let pageLang = getArrayKeyByValue(langs, page.language, 'id')
                    let pageLanguage = (typeof pageLang === 'object' && pageLang !== null && pageLang.hasOwnProperty('name')) ? flagLanguage(pageLang) : '-';
                    // page owner
                    let pageOwner = getArrayKeyByValue(usersOwnership, page.owner, 'id')
                    let pageOwnerName = (typeof pageOwner === 'object' && pageOwner !== null && pageOwner.hasOwnProperty('username')) ? pageOwner.username : '-';

                    pageRows.push([
                        escapeHtml(page.name),
                        escapeHtml(pageOwnerName),
                        pageLanguage,
                        escapeHtml(page.visibility === 1 ? 'public' : 'default'),
                        moment(page.modified_date).format('MMMM Do YYYY, h:mm:ss a'),
                        "<div class='pull-right'><span data-toggle='modal' data-backdrop='static' data-target='#modal'><button class='btn btn-primary' data-toggle='tooltip' data-placement='left' title='Edit Page' onclick='edit(" + i + ")'>\
                    <i class='fa fa-pencil'></i>\
                    </button></span>\
		    <span data-toggle='modal' data-target='#modal'><button class='btn btn-primary' data-toggle='tooltip' data-placement='left' title='Copy Page' onclick='copy(" + i + ")'>\
                    <i class='fa fa-copy'></i>\
                    </button></span>\
                    <button class='btn btn-danger' data-toggle='tooltip' data-placement='left' title='Delete Page' onclick='deletePage(" + i + ")'>\
                    <i class='fa fa-trash-o'></i>\
                    </button></div>"
                    ])
                })
                pagesTable.rows.add(pageRows).draw()
                $('[data-toggle="tooltip"]').tooltip()
            } else {
                $("#emptyMessage").show()
            }
        })
        .error(function () {
            $("#loading").hide()
            errorFlash("Error fetching pages")
        })

}

$(document).ready(function () {
       
    $("#visibility").click(function () {
        $(this).val(Number($(this).is(":checked")))
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
    $("#capture_credentials_checkbox").change(function () {
        $("#capture_passwords").toggle()
    })

    // Select2 Defaults
    $.fn.select2.defaults.set("width", "100%");
    $.fn.select2.defaults.set("dropdownParent", $("#modal-body"));
    $.fn.select2.defaults.set("theme", "bootstrap");
    $.fn.select2.defaults.set("sorter", function(data) {
        return data.sort(function(a, b) {
            if (a.text.toLowerCase() > b.text.toLowerCase()) {
                return 1;
            }
            if (a.text.toLowerCase() < b.text.toLowerCase()) {
                return -1;
            }
            return 0;
        });
    })

    CKEDITOR.on('dialogDefinition', function (ev) {
        // Take the dialog name and its definition from the event data.
        var dialogName = ev.data.name;
        var dialogDefinition = ev.data.definition;

        // Check if the definition is from the dialog window you are interested in (the "Link" dialog window).
        if (dialogName == 'link') {
            dialogDefinition.minWidth = 500
            dialogDefinition.minHeight = 100

            // Remove the linkType field
            var infoTab = dialogDefinition.getContents('info');
            infoTab.get('linkType').hidden = true;
        }
    });

    load()
})
