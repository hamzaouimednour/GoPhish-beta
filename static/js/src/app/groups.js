var groups = []

// Save attempts to POST or PUT to /groups/
function save(id) {
    var targets = [];
    var e = document.getElementById("team");
    var entitytxt = e.options[e.selectedIndex].text;
    $.each($("#targetsTable").DataTable().rows().data(), function(i, target) {
        targets.push({
            first_name: unescapeHtml(target[0]),
            last_name: unescapeHtml(target[1]),
            email: unescapeHtml(target[2]),
            position: unescapeHtml(target[3]),
            department: unescapeHtml(target[4]),
            entity: entitytxt,
            location: unescapeHtml(target[5])
        })
    })
    var group = {
            name: $("#name").val(),
            targets: targets
        }
        // Submit the group
    if (id != -1) {
        // If we're just editing an existing group,
        // we need to PUT /groups/:id
        group.id = id
        api.groupId.put(group)
            .success(function(data) {
                successFlash("Group updated successfully!")
                load()
                dismiss()
                $("#modal").modal('hide')
            })
            .error(function(data) {
                modalError(data.responseJSON.message)
            })
    } else {
        // Else, if this is a new group, POST it
        // to /groups
        api.groups.post(group)
            .success(function(data) {
                successFlash("Group added successfully!")
                load()
                dismiss()
                $("#modal").modal('hide')
            })
            .error(function(data) {
                modalError(data.responseJSON.message)
            })
    }
}

function dismiss() {
    $("#targetsTable").dataTable().DataTable().clear().draw()
    $("#name").val("")
    $("#modal\\.flashes").empty()
}

function edit(id) {
    targets = $("#targetsTable").dataTable({
        destroy: true, // Destroy any other instantiated table - http://datatables.net/manual/tech-notes/3#destroy
        columnDefs: [{
            orderable: false,
            targets: "no-sort"
        }]
    })
    $("#modalSubmit").unbind('click').click(function() {
        save(id)
    })
    if (id == -1) {
        $("#groupModalLabel").text("New Group");
        var group = {}
    } else {
        $("#groupModalLabel").text("Edit Group");
        api.groupId.get(id)
            .success(function(group) {
                $("#name").val(group.name)
                targetRows = []
                $.each(group.targets, function(i, record) {
                    targetRows.push([
                        escapeHtml(record.first_name),
                        escapeHtml(record.last_name),
                        escapeHtml(record.email),
                        escapeHtml(record.position),
                        escapeHtml(record.department),
                        escapeHtml(record.location),
                        '<span style="cursor:pointer;"><i class="fa fa-trash-o"></i></span>'
                    ])
                });
                targets.DataTable().rows.add(targetRows).draw()
            })
            .error(function() {
                errorFlash("Error fetching group")
            })
    }
    // Handle file uploads
    $("#csvupload").fileupload({
        url: "/api/import/group",
        dataType: "json",
        beforeSend: function(xhr) {
            xhr.setRequestHeader('Authorization', 'Bearer ' + user.api_key);
        },
        add: function(e, data) {
            $("#modal\\.flashes").empty()
            var acceptFileTypes = /(csv|txt)$/i;
            var filename = data.originalFiles[0]['name']
            if (filename && !acceptFileTypes.test(filename.split(".").pop())) {
                modalError("Unsupported file extension (use .csv or .txt)")
                return false;
            }
            data.submit();
        },
        done: function(e, data) {
            
            var dep_exist = false;
            var dep_not_exist = [];

            // each line of csv
            $.each(data.result, function(i, record) {

                if(departments){
                    for( const element of departments){
                        dep_exist = (element.name.toUpperCase() == record.department.toUpperCase());
                        if(dep_exist){
                            addTarget(
                            record.first_name,
                            record.last_name,
                            record.email,
                            record.position,
                            record.department,
                            record.location
                            );
                            break;
                        }
                    }
                }
                // non existing departments Array
                if(!dep_exist) dep_not_exist.push(record.department);
            });
        
            // show non existing departments
            if(dep_not_exist.length) {
                Swal.fire({
                    title: "Department Error",
                    text: "Can't find department(s) : " + escapeHtml(dep_not_exist.join(', ')) + ".",
                    type: "warning",
                    animation: false,
                    showCancelButton: true,
                    allowOutsideClick: false,
                })
            }

            // re draw datatable
            targets.DataTable().draw();
        }
    })
}

var downloadCSVTemplate = function() {
    var csvScope = [{
        'First Name': 'Example',
        'Last Name': 'User',
        'Email': 'foobar@example.com',
        'Position': 'Systems Administrator',
        'Department': 'Administrator',
        'Location': 'Tunis',
    }]
    var filename = 'group_template.csv'
    var csvString = Papa.unparse(csvScope, {})
    var csvData = new Blob([csvString], {
        type: 'text/csv;charset=utf-8;'
    });
    if (navigator.msSaveBlob) {
        navigator.msSaveBlob(csvData, filename);
    } else {
        var csvURL = window.URL.createObjectURL(csvData);
        var dlLink = document.createElement('a');
        dlLink.href = csvURL;
        dlLink.setAttribute('download', filename)
        document.body.appendChild(dlLink)
        dlLink.click();
        document.body.removeChild(dlLink)
    }
}


var deleteGroup = function(id) {
    var group = groups.find(function(x) {
        return x.id === id
    })
    if (!group) {
        return
    }
    Swal.fire({
        title: "Are you sure?",
        text: "This will delete the group. This can't be undone!",
        type: "warning",
        animation: false,
        showCancelButton: true,
        confirmButtonText: "Delete " + escapeHtml(group.name),
        confirmButtonColor: "#428bca",
        reverseButtons: true,
        allowOutsideClick: false,
        preConfirm: function() {
            return new Promise(function(resolve, reject) {
                api.groupId.delete(id)
                    .success(function(msg) {
                        resolve()
                    })
                    .error(function(data) {
                        reject(data.responseJSON.message)
                    })
            })
        }
    }).then(function(result) {
        if (result.value) {
            Swal.fire(
                'Group Deleted!',
                'This group has been deleted!',
                'success'
            );
        }
        $('button:contains("OK")').on('click', function() {
            location.reload()
        })
    })
}

function addTarget(firstNameInput, lastNameInput, emailInput, positionInput, departmentInput, locationInput) {
    // Create new data row.
    var email = escapeHtml(emailInput).toLowerCase();
    var newRow = [
        escapeHtml(firstNameInput),
        escapeHtml(lastNameInput),
        email,
        escapeHtml(positionInput),
        escapeHtml(departmentInput),
        escapeHtml(locationInput),
        '<span style="cursor:pointer;"><i class="fa fa-trash-o"></i></span>'
    ];

    // Check table to see if email already exists.
    var targetsTable = targets.DataTable();
    var existingRowIndex = targetsTable
        .column(2, {
            order: "index"
        }) // Email column has index of 2
        .data()
        .indexOf(email);
    // Update or add new row as necessary.
    if (existingRowIndex >= 0) {
        targetsTable
            .row(existingRowIndex, {
                order: "index"
            })
            .data(newRow);
    } else {
        targetsTable.row.add(newRow);
    }
}

function load() {
    $("#groupTable").hide()
    $("#emptyMessage").hide()
    $("#loading").show()
    api.groups.summary()
        .success(function(response) {
            $("#loading").hide()
            if (response.total > 0) {
                groups = response.groups
                $("#emptyMessage").hide()
                $("#groupTable").show()
                var groupTable = $("#groupTable").DataTable({
                    destroy: true,
                    columnDefs: [{
                        orderable: false,
                        targets: "no-sort"
                    }]
                });
                groupTable.clear();
                groupRows = []
                $.each(groups, function(i, group) {
                    groupRows.push([
                        escapeHtml(group.name),
                        escapeHtml(group.num_targets),
                        moment(group.modified_date).format('MMMM Do YYYY, h:mm:ss a'),
                        "<div class='pull-right'><button class='btn btn-primary' data-toggle='modal' data-backdrop='static' data-target='#modal' onclick='edit(" + group.id + ")'>\
                    <i class='fa fa-pencil'></i>\
                    </button>\
                    <button class='btn btn-danger' onclick='deleteGroup(" + group.id + ")'>\
                    <i class='fa fa-trash-o'></i>\
                    </button></div>"
                    ])
                })
                groupTable.rows.add(groupRows).draw()
            } else {
                $("#emptyMessage").show()
            }
        })
        .error(function() {
            errorFlash("Error fetching groups")
        })
        //teams begin
    let userRole = $("#userRole").val();
    if (userRole == "engineer" || userRole == "reporter" || userRole == "teamAdmin") {
        //department begin
        var userTeamId = $("#userTeamId").val();
        idd = parseInt(userTeamId);
        loadDepartmentById(idd);
        //department end
    } else {
        api.teams.get()
            .success((ts) => {
                teams = ts;
                var page_s2 = $.map(teams, function(obj) {
                    obj.text = obj.teamname,
                        obj.value = obj.id
                    return obj
                });
                var page_select = $("#team.form-control")
                page_select.select2({
                    // placeholder: "Select a Team",
                    data: page_s2,
                });

            })
            .error(() => {
                errorFlash("Error fetching teams")
            })
            //department begin
        loadDepartmentById(1)
            //department end
    }


    //teams end


}

function entityUpdate() {
    let teamid = $("#team").val();
    idd = parseInt(teamid);
    loadDepartmentById(idd);
}

function loadDepartmentById(id) {
    $('#department.form-control').empty();
    api.departmentId.get(id)
        .success((us) => {
            departments = us.departments
            var page_s3 = $.map(departments, function(obj) {
                obj.text = obj.name,
                    obj.value = obj.id
                return obj
            });
            var page_select2 = $("#department.form-control")
            page_select2.select2({
                data: page_s3,
            });
        })
        .error(() => {
            errorFlash("Error fetching departments")
        })
}

$(document).ready(function() {
    load()
        // Setup the event listeners
        // Handle manual additions
    $("#targetForm").submit(function() {
        // Validate the form data
        var targetForm = document.getElementById("targetForm")
        if (!targetForm.checkValidity()) {
            targetForm.reportValidity()
            return
        }
        addTarget(
            $("#firstName").val(),
            $("#lastName").val(),
            $("#email").val(),
            $("#position").val(),
            $("#department option:selected").text(),
            $("#location").val(),
        );
        targets.DataTable().draw();

        // Reset user input.
        $("#targetForm>div>input").val('');
        $("#firstName").focus();
        return false;
    });
    // Handle Deletion
    $("#targetsTable").on("click", "span>i.fa-trash-o", function() {
        targets.DataTable()
            .row($(this).parents('tr'))
            .remove()
            .draw();
    });
    $("#modal").on("hide.bs.modal", function() {
        dismiss();
    });
    $("#csv-template").click(downloadCSVTemplate)
});