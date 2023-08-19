let departments = []
let entity_id = null;
// Save attempts to POST or PUT to /departments/
const save = (id) => {
        if (entity_id != null) {
            idd = entity_id;
        } else {
            let teamid = $("#teamid").val();
            idd = parseInt(teamid);
        }
        let department = {
            name: $("#name").val(),
            team_id: idd
        }
        api.departments.post(department)
            .success((data) => {
                successFlash("Department " + escapeHtml(department.name) + " registered successfully!")
                if (entity_id != null) {
                    loadWithId(entity_id)
                } else {
                    load()
                }


                dismiss()
                $("#modal").modal('hide')
            })
            .error((data) => {
                modalError(data.responseJSON.message)
            })

    }
    // Save attempts to PUT to /departments/
const put = (id) => {
    if (id == -1) {
        save(id);
        return;
    }
   
    let teamid = $("#teamid").val();
    idd = parseInt(teamid);
    let departmentput = {
            id: id,
            name: $("#name").val(),
            teamId: idd
        }
        // Submit the department

    api.departments.put(departmentput)
        .success(function(data) {
            successFlash("Department updated successfully!")
            load()
            dismiss()
            $("#modal").modal('hide')
        })
        .error(function(data) {
            modalError(data.responseJSON.message)
        })

}

const dismiss = () => {
    $("#username").val("")
    $("#password").val("")
    $("#confirm_password").val("")
    $("#role").val("")
    $("#force_password_change_checkbox").prop('checked', true)
    $("#account_locked_checkbox").prop('checked', false)
    $("#modal\\.flashes").empty()
}

const edit = (id) => {
    $("#modalSubmit").unbind('click').click(() => {
        put(id)
    })
    $("#role").select2()
    if (id == -1) {
        $("#userModalLabel").text("New Department")
        $("#role").val("user")
        $("#role").trigger("change")
    } else {
        $("#userModalLabel").text("Edit Department")
        api.departments.get(id)
            .success((department) => {
                $("#username").val(department.name)
            })
            .error(function() {
                errorFlash("Error fetching Department")
            })
    }
}

const deleteUser = (id) => {
    var department = departments.find(x => x.id == id)
    if (!department) {
        return
    }
    Swal.fire({
        title: "Are you sure?",
        text: "This will delete the Department for " + escapeHtml(department.name) + " as well as all of the objects they have created.\n\nThis can't be undone!",
        type: "warning",
        animation: false,
        showCancelButton: true,
        confirmButtonText: "Delete",
        confirmButtonColor: "#428bca",
        reverseButtons: true,
        allowOutsideClick: false,
        preConfirm: function() {
            return new Promise((resolve, reject) => {
                    api.departments.delete(id)
                        .success((msg) => {
                            resolve()
                        })
                        .error((data) => {
                            reject(data.responseJSON.message)
                        })
                })
                .catch(error => {
                    Swal.showValidationMessage(error)
                })
        }
    }).then(function(result) {
        if (result.value) {
            Swal.fire(
                'Department Deleted!',
                "The department account for " + escapeHtml(department.name) + " and all associated objects have been deleted!",
                'success'
            );
        }
        $('button:contains("OK")').on('click', function() {
            location.reload()
        })
    })
}

const loadWithId = (id) => {
    // department.id = window.location.pathname.split('/').slice(-1)[0]
    // idd = parseInt(id);
    var entitys = JSON.parse(localStorage.getItem("entitys"));
    if (entitys) {
        entitys.forEach(element => {
            if (element.id == id) {
                document.getElementById("entityName").innerHTML = element.name;
            }
        });
    }

    
    entity_id = parseInt(id);
    api.departmentId.get(entity_id)
        .success(function(d) {
           
            departments = d.departments;
            $("#loading").hide()
            $("#userTable").show()
            let userTable = $("#userTable").DataTable({
                destroy: true,
                columnDefs: [{
                    orderable: false,
                    targets: "no-sort"
                }]
            });
            userTable.clear();
            userRows = [];
            $.each(departments, (i, department) => {
                userRows.push([
                    escapeHtml(department.name),
                    "<div class='pull-right'>\
                    <button class='btn btn-primary edit_button' data-toggle='modal' data-backdrop='static' data-target='#modal' data-user-id='" + department.id + "'>\
                    <i class='fa fa-pencil'></i>\
                    </button>\
                    <button class='btn btn-danger delete_button' data-user-id='" + department.id + "'>\
                    <i class='fa fa-trash-o'></i>\
                    </button></div>"
                ]);
            })
            userTable.rows.add(userRows).draw();
        })
        .error(() => {
            errorFlash("Error fetching departments")
        })
}

const load = () => {
    $("#userTable").hide()
    $("#loading").show()

    let teamid = $("#teamid").val();
    idd = parseInt(teamid);


    api.departmentId.get(idd)
        .success((us) => {
            departments = us.departments
            $("#loading").hide()
            $("#userTable").show()
            let userTable = $("#userTable").DataTable({
                destroy: true,
                columnDefs: [{
                    orderable: false,
                    targets: "no-sort"
                }]
            });
            userTable.clear();
            userRows = []
            $.each(departments, (i, department) => {
                userRows.push([
                    escapeHtml(department.name),
                    "<div class='pull-right'>\
                    <button class='btn btn-primary edit_button' data-toggle='modal' data-backdrop='static' data-target='#modal' data-user-id='" + department.id + "'>\
                    <i class='fa fa-pencil'></i>\
                    </button>\
                    <button class='btn btn-danger delete_button' data-user-id='" + department.id + "'>\
                    <i class='fa fa-trash-o'></i>\
                    </button></div>"
                ])
            })
            userTable.rows.add(userRows).draw();
        })
        .error(() => {
            errorFlash("Error fetching departments")
        })
}

$(document).ready(function() {
    let id = window.location.pathname.split('/').slice(-1)[0];
    
    idd = parseInt(id);
    if (Number.isInteger(idd)) {
      
        loadWithId(idd)
    } else {
        load()
    }
    
    // Setup the event listeners
    $("#modal").on("hide.bs.modal", function() {
        dismiss();
    });
    // Select2 Defaults
    $.fn.select2.defaults.set("width", "100%");
    $.fn.select2.defaults.set("dropdownParent", $("#role-select"));
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
    $("#new_button").on("click", function() {
        edit(-1)
    })
    $("#userTable").on('click', '.edit_button', function(e) {
        edit($(this).attr('data-user-id'))
    })
    $("#userTable").on('click', '.delete_button', function(e) {
        deleteUser($(this).attr('data-user-id'))
    })
    $("#userTable").on('click', '.impersonate_button', function(e) {
        impersonate($(this).attr('data-user-id'))
    })
});