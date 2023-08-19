
var items = []
var langs = []
var topics = []
var category = []
var templates = []
var pages = []
var redirections = []

var action = ''
var scenario = {}
var libraryTemplate = 0

// Save attempts to POST to /templates/
function save(idx) {
    var library = {}
    library.name = $("#name").val()
    library.description = $("#description").val()
    library.tags = $("#tags").val()
    library.url = $("#url").val()
    library.redirection_url = $("#redirection_checkbox").is(":checked") ? $("#redirection_url").val() : ''
    library.visibility = parseInt($("#visibility").val())
    library.sending_profile_id = parseInt($("#profile").val())
    library.landing_page_id = parseInt($('#page').val())
    library.template_id = parseInt($('#template').val())
    library.language_id = parseInt($("#language").val())
    library.category_id = parseInt($("#category").val())
    library.topic_id = parseInt($("#topic").val())
    library.redirection_page_id = parseInt($("#redirection").val())

    if(!library.redirection_url && !library.redirection_page_id){
        Swal.fire({
            title: 'Attention',
            text: 'Redirection Page / URL is mandatory element',
            type: 'info'
        });
        return false;
    }

    if(!library.url || !library.sending_profile_id){
        Swal.fire({
            title: 'Attention',
            text: 'Sending Setup section is mandatory element',
            type: 'info'
        });
        return false;
    }

    if (idx != -1) {
        library.id = idx
        api.libraryTemplates.put(library)
            .success(function (data) {
                successFlash("Scenario edited successfully!")
                if(action !== 'edit') dismiss()
            })
            .error(function (data) {
                errorFlash(data.responseJSON.message)
            })
    } else {
        // Submit the page
        api.libraryTemplates.post(library)
            .success(function (data) {
                successFlash("Scenario added successfully!")
                if(action !== 'edit') dismiss()
            })
            .error(function (data) {
                errorFlash(data.responseJSON.message)
            })
    }
}

function dismiss() {
    // $("#flashes").empty()
    $("#name").val("")
    $("#description").val("")
    $("#tags").val("")
    $("#url").val("")
    $("body").find("input[type='checkbox'], input[type='radio']").prop("checked", false)
    $("#category").val('')
    $("#topic").val('')
    $("#language").val('')
    $("#profile").val('')
    $("#page, #template").val('')
    $("#redirection, #redirection_url").val('')
    $('#category, #topic, #language, #profile').trigger("change")
    $("#redirection_url").hide()
}

function load(requestAction) {
    /*
        load() - Loads the current items using the API
    */
    $("#emptyMessage, emptyMessage3, emptyMessage2, emptyMessage5").hide()
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
    
    // load topics
    if(!topics.length)
    api.librarySettings.get('topic')
        .success(function (ps) {
            $('#topic option:not([value=""])').remove()
            if(ps.length){
                topics = ps
                ps.forEach(element => {
                    $('#topic').append('<option value="' + element.id + '">' + element.name + '</option>')
                });
            }
        }).error(function () {
            $("#loading").hide()
            errorFlash("Error fetching topics")
        })
    
    // load category
    if(!category.length)
    api.librarySettings.get('category')
        .success(function (ps) {
            $('#category option:not([value=""])').remove()
            if(ps.length){
                category = ps
                ps.forEach(element => {
                    $('#category').append('<option value="' + element.id + '">' + element.name + '</option>')
                });
            }
        }).error(function () {
            $("#loading").hide()
            errorFlash("Error fetching categories")
        })

    // load landing pages
    if(!pages.length)
    api.pages.get()
        .success(function (ps) {
            pages = ps;
            if (pages.length > 0) {
                                
                // Get Owners usenrames
                let owners = []
                $.each(pages, function (i, tmp) {
                    if(!owners.includes(tmp.owner)){
                        owners.push(tmp.owner)
                    }
                })
                usersOwnership = getOwners(owners)

                $("#pagesTable").show()
                pagesTable = $("#pagesTable").DataTable({
                    destroy: true,
                    columnDefs: [{
                        orderable: false,
                        targets: "no-sort",
                    }],
                    aaSorting: [[1, 'asc']]
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
                    // page category
                    let pageCategory = getArrayKeyByValue(topics, page.topic, 'id')
                    let pageCategoryName = (typeof pageCategory === 'object' && pageCategory !== null && pageCategory.hasOwnProperty('name')) ? pageCategory.name : '-';
                    // page topic
                    let pageTopic = getArrayKeyByValue(category, page.category, 'id')
                    let pageTopicName = (typeof pageTopic === 'object' && pageTopic !== null && pageTopic.hasOwnProperty('name')) ? pageTopic.name : '-';

                    pageRows.push([
                        '<input type="radio" name="page" value="'+page.id+'"/>',
                        escapeHtml(page.name),
                        escapeHtml(pageCategoryName),
                        escapeHtml(pageTopicName),
                        escapeHtml(pageOwnerName),
                        moment(page.modified_date).format('YYYY-MM-DD HH:mm'),
                        pageLanguage
                    ])
                })
                pagesTable.rows.add(pageRows).draw()
                $('[data-toggle="tooltip"]').tooltip()

            } else {
                $("#emptyMessage3").show()
            }
        }).error(function () {
            $("#loading").hide()
            errorFlash("Error fetching landing pages")
        })

    // load email templates
    if(!templates.length)
    api.templates.get()
        .success(function (ps) {
            templates = ps;
            if (templates.length > 0) {
                
                // Get Owners usenrames
                let owners = []
                $.each(templates, function (i, tmp) {
                    if(!owners.includes(tmp.owner)){
                        owners.push(tmp.owner)
                    }
                })
                usersOwnership = getOwners(owners)

                $("#templatesTable").show()
                templatesTable = $("#templatesTable").DataTable({
                    destroy: true,
                    columnDefs: [{
                        orderable: false,
                        targets: "no-sort"
                    }],
                    aaSorting: [[1, 'asc']]
                });
                templatesTable.clear()
                templateRows = []
                $.each(templates, function (i, template) {
                     // page language
                    let templateLang = getArrayKeyByValue(langs, template.language, 'id')
                    let templateLanguage = (typeof templateLang === 'object' && templateLang !== null && templateLang.hasOwnProperty('name')) ? flagLanguage(templateLang) : '-';
                    // page owner
                    let templateOwner = getArrayKeyByValue(usersOwnership, template.owner, 'id')
                    let templateOwnerName = (typeof templateOwner === 'object' && templateOwner !== null && templateOwner.hasOwnProperty('username')) ? templateOwner.username : '-';
                    // page category
                    let templateCategory = getArrayKeyByValue(topics, template.topic, 'id')
                    let templateCategoryName = (typeof templateCategory === 'object' && templateCategory !== null && templateCategory.hasOwnProperty('name')) ? templateCategory.name : '-';
                    // page topic
                    let templateTopic = getArrayKeyByValue(category, template.category, 'id')
                    let templateTopicName = (typeof templateTopic === 'object' && templateTopic !== null && templateTopic.hasOwnProperty('name')) ? templateTopic.name : '-';

                    templateRows.push([
                        '<input type="radio" name="template" value="'+template.id+'"/>',
                        escapeHtml(template.name),
                        escapeHtml(templateCategoryName),
                        escapeHtml(templateTopicName),
                        escapeHtml(templateOwnerName),
                        moment(template.modified_date).format('YYYY-MM-DD HH:mm'),
                        templateLanguage
                    ])
                })
                templatesTable.rows.add(templateRows).draw()
                $('[data-toggle="tooltip"]').tooltip()

            } else {
                $("#emptyMessage2").show()
            }
        }).error(function () {
            $("#loading").hide()
            errorFlash("Error fetching email templates")
        })



    // load redirections pages
    if(!redirections.length)
    api.redirectionPages.get()
        .success(function (ps) {
            redirections = ps;
            if (redirections.length > 0) {
                
                // Get Owners usenrames
                let owners = []
                $.each(redirections, function (i, tmp) {
                    if(!owners.includes(tmp.owner)){
                        owners.push(tmp.owner)
                    }
                })
                usersOwnership = getOwners(owners)

                $("#redirectionsTable").show()
                redirectionsTable = $("#redirectionsTable").DataTable({
                    destroy: true,
                    columnDefs: [{
                        orderable: false,
                        targets: "no-sort"
                    }],
                    aaSorting: [[1, 'asc']]
                });
                redirectionsTable.clear()
                redirectionRows = []
                $.each(redirections, function (i, rp) {
                     // page language
                    let rpLang = getArrayKeyByValue(langs, rp.language, 'id')
                    let rpLanguage = (typeof rpLang === 'object' && rpLang !== null && rpLang.hasOwnProperty('name')) ? flagLanguage(rpLang) : '-';
                    // page owner
                    let rpOwner = getArrayKeyByValue(usersOwnership, rp.owner, 'id')
                    let rpOwnerName = (typeof rpOwner === 'object' && rpOwner !== null && rpOwner.hasOwnProperty('username')) ? rpOwner.username : '-';

                    redirectionRows.push([
                        '<input type="radio" name="redirection" value="'+rp.id+'"/>',
                        escapeHtml(rp.name),
                        escapeHtml(rpOwnerName),
                        moment(rp.modified_date).format('YYYY-MM-DD HH:mm'),
                        rpLanguage
                    ])
                })
                redirectionsTable.rows.add(redirectionRows).draw()
                $('[data-toggle="tooltip"]').tooltip()

            } else {
                $("#emptyMessage5").show()
            }
        }).error(function () {
            $("#loading").hide()
            errorFlash("Error fetching redirection pages")
        })



    api.SMTP.get()
        .success(function(profiles) {
            if (profiles.length == 0) {
                errorFlash("No profiles found!")
                return false
            } else {
                var profile_s2 = $.map(profiles, function(obj) {
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

        
    $("#language, #topic, #category").select2({
        placeholder: "All",
        allowClear: true
    });

    if(requestAction !== 'new'){
        if(requestAction === 'edit') $('#saveButton').attr('onclick', 'save('+libraryTemplate+')')
        console.log('scenario N'+ libraryTemplate)
        api.libraryTemplates.getTemplate(libraryTemplate)
            .success(function (ps) {
                scenario = ps
                if(scenario){

                    // fill data
                    $('#name').val(requestAction === 'copy' ? 'Copy of ' + scenario.name : scenario.name)
                    $('#description').val(scenario.description)
                    $('#tags').val(scenario.tags)
                    $('#url').val(scenario.url)
                    $('#visibility').val(scenario.visibility)
                    $('#visibility').prop('checked', scenario.visibility)
                    $('#language').val(scenario.language_id)
                    $('#category').val(scenario.category_id)
                    $('#topic').val(scenario.topic_id)
                    $('#page').val(scenario.landing_page_id)
                    $('#template').val(scenario.template_id)
                    $('#profile').val(scenario.sending_profile_id)
                    if(scenario.redirection_url){
                        $("#redirection_checkbox").prop('checked', true)
                        $('#redirection_url').val(scenario.redirection_url).show()
                        $('#redirection').val('')
                    }else{
                        $("#redirection_checkbox").prop('checked', false)
                        $('#redirection_url').val('').hide()
                        $('#redirection').val(scenario.redirection_page_id)
                        redirectionsTable.rows().every( function () {
                            $(this.node()).find('input[name="redirection"][value="'+scenario.redirection_page_id+'"]').prop('checked', true).trigger('click');
                        } );
                    }
                    $('#language, #category, #topic, #profile').trigger('change')
                    pagesTable.rows().every( function () {
                        $(this.node()).find('input[name="page"][value="'+scenario.landing_page_id+'"]').prop('checked', true).trigger('click');
                    } );
                    templatesTable.rows().every( function () {
                        $(this.node()).find('input[name="template"][value="'+scenario.template_id+'"]').prop('checked', true).trigger('click');
                    } );
                }
            }).error(function () {
                $("#loading").hide()
                errorFlash("Error fetching scenario")
            })
    }
    

    $(document).on('click', '[name="page"]', function(){ 

        let checkedItem = $(this).val()
        $('#page').val(checkedItem)
        if ( ! $.fn.DataTable.isDataTable( '#pagesTable' ) ) {
            pagesTable = $('#pagesTable').DataTable();
        }
        pagesTable.rows().every( function () {
            $(this.node()).find('input[name="page"]:checked').not('[value="'+checkedItem+'"]').prop('checked', false);
        } );
    })

    $(document).on('click', '[name="template"]', function(){ 

        let checkedItem = $(this).val()
        $('#template').val(checkedItem)
        if ( ! $.fn.DataTable.isDataTable( '#templatesTable' )) {
            templatesTable = $('#templatesTable').DataTable();
        }
        templatesTable.rows().every( function () {
            $(this.node()).find('input[name="page"]:checked').not('[value="'+checkedItem+'"]').prop('checked', false);
        } );
    })

    $(document).on('click', '[name="redirection"]', function(){ 

        $("#redirection_checkbox").prop('checked', false)
        $('#redirection_url').val('').hide()

        let checkedItem = $(this).val()
        $('#redirection').val(checkedItem)
        if ( ! $.fn.DataTable.isDataTable( '#redirectionsTable' )) {
            redirectionsTable = $('#redirectionsTable').DataTable();
        }
        redirectionsTable.rows().every( function () {
            $(this.node()).find('input[name="redirection"]:checked').not('[value="'+checkedItem+'"]').prop('checked', false);
        });
    })
    
    $("#redirection_checkbox").change(function () {
        if($(this).is(":checked")){
            $("#redirection_url").show()
            $("#redirection").val('')
            if ( ! $.fn.DataTable.isDataTable( '#redirectionsTable' )) {
                redirectionsTable = $('#redirectionsTable').DataTable();
            }
            redirectionsTable.rows().every( function () {
                $(this.node()).find('input[name="redirection"]:checked').prop('checked', false);
            });
        }else{
            $('#redirection_url').val('').hide()
        }
    })

}

// Attempts to send a test email by POSTing to /campaigns/
function sendTestEmail() {
    var test_email_request = {
        template: {
            name: $('[name="template"]:checked').parents('td').next('td').text()
        },
        first_name: $("input[name=to_first_name]").val(),
        last_name: $("input[name=to_last_name]").val(),
        email: $("input[name=to_email]").val(),
        position: $("input[name=to_position]").val(),
        url: $("#url").val(),
        page: {
            name: $('[name="page"]:checked').parents('td').next('td').text()
        },
        smtp: {
            name: $("#profile").select2("data")[0].text
        }
    }
    btnHtml = $("#sendTestModalSubmit").html()
    $("#sendTestModalSubmit").html('<i class="fa fa-spinner fa-spin"></i> Sending')
        // Send the test email
    api.send_test_email(test_email_request)
        .success(function(data) {
            $("#sendTestEmailModal\\.flashes").empty().append("<div style=\"text-align:center\" class=\"alert alert-success\">\
            <i class=\"fa fa-check-circle\"></i> Email Sent!</div>")
            $("#sendTestModalSubmit").html(btnHtml)
        })
        .error(function(data) {
            $("#sendTestEmailModal\\.flashes").empty().append("<div style=\"text-align:center\" class=\"alert alert-danger\">\
            <i class=\"fa fa-exclamation-circle\"></i> " + data.responseJSON.message + "</div>")
            $("#sendTestModalSubmit").html(btnHtml)
        })
}


$(document).ready(function () {

    $("#redirection_checkbox").prop("checked", false)
    action = location.pathname.split('/')[2]
    libraryTemplate = parseInt(location.pathname.split('/')[3])

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
    
    $.fn.select2.defaults.set("width", "100%");
    $.fn.select2.defaults.set("dropdownParent", $("body"));
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

    load(action)

})
