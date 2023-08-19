
var library = {}
var langs = []
var topics = []
var category = []
var teams = []
var usersOwnership = []

function dismiss() {
    $("#modal\\.flashes").empty()
    $("#name").val("")
    $("#modal").find("input[type='checkbox']").prop("checked", false)
    $("#modal").modal('hide')
}

var deleteItem = function (idx) {
    Swal.fire({
        title: "Are you sure?",
        text: "This will delete the specified Scenario. This can't be undone!",
        type: "warning",
        animation: false,
        showCancelButton: true,
        confirmButtonText: "Delete " + escapeHtml(items[idx].name),
        confirmButtonColor: "#428bca",
        reverseButtons: true,
        allowOutsideClick: false,
        preConfirm: function () {
            return new Promise(function (resolve, reject) {
                api.libraryTemplates.delete(items[idx].id)
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
                'Scenario Deleted!',
                'This scenario has been deleted!',
                'success'
            );
        }
        $('button:contains("OK")').on('click', function () {
            location.reload()
        })
    })
}

function search() {
    let searchKeywords = {
        'language': parseInt($('#language').val()),
        'topic': parseInt($('#topic').val()),
        'category': parseInt($('#category').val()),
        'entity': parseInt($('#entity').val()),
    }
    $('.cover-spin').show()

    api.libraryTemplates.search(searchKeywords)
        .success(function (ps) {
            library.masters = ps.master
            library.teams = ps.team
            library.privates = ps.private

            $("#loading").hide()
            $.each(library, function (typeLib, lib) {

                $("#emptyMessage-" + typeLib).hide()

                let tableLib = $("#" + typeLib + "Table")
                if (!$.fn.DataTable.isDataTable(tableLib)) {
                    libTable = tableLib.DataTable({
                        lengthMenu: [5, 10, 25, 50, 100],
                        destroy: true,
                        autoWidth: false,
                        columnDefs: [{
                            orderable: false,
                            width: '1%',
                            targets: "no-sort"
                        }, {
                            width: '65%',
                            targets: 1
                        }],
                        aaSorting: [[1, 'asc']]
                    });
                } else {
                    libTable = tableLib.DataTable();
                }

                if (lib.length) {
                    // Get Owners usenrames
                    let owners = []
                    $.each(lib, function (i, tmp) {
                        if (!owners.includes(tmp.owner)) {
                            owners.push(tmp.owner)
                        }
                    })
                    usersOwnership = getOwners(owners)

                    tableLib.show()
                    libTable.clear().draw();
                    pageRows = []
                    $.each(lib, function (i, item) {
                        // page language
                        let templateLang = getArrayKeyByValue(langs, item.language_id, 'id')
                        let templateLanguage = (typeof templateLang === 'object' && templateLang !== null && templateLang.hasOwnProperty('name')) ? flagLanguage(templateLang) : '-';

                        let scenarioTags = item.tags.split(";")
                        let scenarioTagsHTML = scenarioTags.map(t => '<span class="mtm badge badge-secondary">' + t + '</span>').join(' ');
                        // owner username
                        let templateOwner = getArrayKeyByValue(usersOwnership, item.owner, 'id')
                        let templateOwnerName = (typeof templateOwner === 'object' && templateOwner !== null && templateOwner.hasOwnProperty('username')) ? templateOwner.username : '-';

                        let cRows = [
                            '<input type="radio" name="library" value="' + item.id + '" />',
                            '<strong>' + escapeHtml(item.name) + '</strong> \
                            <div style="text-align: justify;text-justify: inter-word;">'+ escapeHtml(item.description) + '</div> \
                            '+ scenarioTagsHTML,
                            escapeHtml(templateOwner.teamname),
                            escapeHtml(templateOwnerName),
                            '<center>' + templateLanguage + '<div>' + moment(item.modified_date).format('YYYY-MM-DD HH:mm') + '</div></center>',

                        ];
                        if (typeLib !== 'teams' || !templateOwner.teamname) cRows.splice(2, 1);

                        pageRows.push(cRows)
                    })
                    libTable.rows.add(pageRows).draw()
                    libTable.columns.adjust().draw()
                    $('[data-toggle="tooltip"]').tooltip()
                } else {
                    libTable.clear().draw();
                    // tableLib.hide();
                    $("#emptyMessage-" + typeLib).show()
                }
            })
        })
        .error(function () {
            $("#loading").hide()
            errorFlash("Error fetching Scenario Library")
        })
        .always(function () {
            $('.cover-spin').hide()
        })
}

function load() {
    /*
        load() - Loads the current items using the API
    */
    $("#mastersTable, #teamsTable, #privatesTable").hide()
    $("#emptyMessage-masters, #emptyMessage-teams, #emptyMessage-privates").hide()
    $("#loading").show()

    // load Languages
    if (!langs.length)
        api.lang.list()
            .success(function (ps) {
                $('#language option:not([value=""])').remove()
                if (ps.length) {
                    langs = ps
                    ps.forEach(element => {
                        $('#language').append('<option value="' + element.id + '">' + element.name + '</option>')
                    });
                }
            })

    // load topics
    if (!topics.length)
        api.librarySettings.get('topic')
            .success(function (ps) {
                $('#topic option:not([value=""])').remove()
                if (ps.length) {
                    topics = ps
                    ps.forEach(element => {
                        $('#topic').append('<option value="' + element.id + '">' + element.name + '</option>')
                    });
                }
            })

    // load category
    if (!category.length)
        api.librarySettings.get('category')
            .success(function (ps) {
                $('#category option:not([value=""])').remove()
                if (ps.length) {
                    category = ps
                    ps.forEach(element => {
                        $('#category').append('<option value="' + element.id + '">' + element.name + '</option>')
                    });
                }
            })

    // load entities
    if (!teams.length)
        api.teams.get()
            .success(function (ps) {
                $('#entity option:not([value=""])').remove()
                if (ps.length) {
                    teams = ps
                    ps.forEach(element => {
                        $('#entity').append('<option value="' + element.id + '">' + element.teamname + '</option>')
                    });
                }
            })

    api.libraryTemplates.get()
        .success(function (ps) {
            library.masters = ps.master
            library.teams = ps.team
            library.privates = ps.private

            $("#loading").hide()
            $.each(library, function (typeLib, lib) {
                if (lib.length) {

                    let owners = []
                    $.each(lib, function (i, tmp) {
                        if (!owners.includes(tmp.owner)) {
                            owners.push(tmp.owner)
                        }
                    })
                    usersOwnership = getOwners(owners)

                    let tableLib = $("#" + typeLib + "Table")
                    tableLib.show()
                    libTable = tableLib.DataTable({
                        lengthMenu: [5, 10, 25, 50, 100],
                        destroy: true,
                        autoWidth: false,
                        columnDefs: [{
                            orderable: false,
                            width: '1%',
                            targets: "no-sort"
                        }, {
                            width: '65%',
                            targets: 1
                        }],
                        aaSorting: [[1, 'asc']]
                    });
                    libTable.clear()
                    pageRows = []
                    $.each(lib, function (i, item) {
                        // page language
                        let templateLang = getArrayKeyByValue(langs, item.language_id, 'id')
                        let templateLanguage = (typeof templateLang === 'object' && templateLang !== null && templateLang.hasOwnProperty('name')) ? flagLanguage(templateLang) : '-';

                        let scenarioTags = item.tags.split(";")
                        let scenarioTagsHTML = scenarioTags.map(t => '<span class="mtm badge badge-secondary">' + t + '</span>').join(' ');
                        // owner username
                        let templateOwner = getArrayKeyByValue(usersOwnership, item.owner, 'id')
                        let templateOwnerName = (typeof templateOwner === 'object' && templateOwner !== null && templateOwner.hasOwnProperty('username')) ? templateOwner.username : '-';

                        let cRows = [
                            '<input type="radio" name="library" value="' + item.id + '" />',
                            '<strong>' + escapeHtml(item.name) + '</strong> \
                            <div style="text-align: justify;text-justify: inter-word;">'+ escapeHtml(item.description) + '</div> \
                            '+ scenarioTagsHTML,
                            escapeHtml(templateOwner.teamname),
                            escapeHtml(templateOwnerName),
                            '<center>' + templateLanguage + '<div>' + moment(item.modified_date).format('YYYY-MM-DD HH:mm') + '</div></center>',

                        ];
                        if (typeLib !== 'teams' || !templateOwner.teamname) cRows.splice(2, 1);

                        pageRows.push(cRows)
                    })
                    libTable.rows.add(pageRows).draw()
                    $('[data-toggle="tooltip"]').tooltip()
                } else {
                    $("#emptyMessage-" + typeLib).show()
                }
            })
        })
        .error(function () {
            $("#loading").hide()
            errorFlash("Error fetching Scenario Library")
        })

    $("#language, #topic, #category, #entity").select2({
        placeholder: "All",
        allowClear: true
    });

    $(document).on('click', '[name="library"]', function () {

        let checkedItem = $(this).val()
        $('#library').val(checkedItem)
        $.each(['masters', 'teams', 'private'], function (i, lib) {
            libsTable = $('#' + lib + 'Table').DataTable();

            libsTable.rows().every(function () {
                $(this.node()).find('input[name="library"]:checked').not('[value="' + checkedItem + '"]').prop('checked', false);
            });
        })
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

    load()

    $("#language, #topic, #category, #entity").on('change', function () {
        search()
    });

})
