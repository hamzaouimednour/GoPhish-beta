let teams = []

// Save attempts to POST or PUT to /teams/
const save = (id) => {
        let team = {
            teamname: $("#teamname").val()
        }
        api.teams.post(team)
            .success((data) => {
                successFlash("Team " + escapeHtml(team.teamname) + " registered successfully!")
                load()
                dismiss()
                $("#modal").modal('hide')
            })
            .error((data) => {
                modalError(data.responseJSON.message)
            })

    }
    // Save attempts to PUT to /teams/
const put = (id) => {
    if (id == -1) {
        save(id);
        return;
    }
    let teamtoput = {
            id: id,
            teamname: $("#teamname").val()
        }
        // Submit the team

    api.teams.put(teamtoput)
        .success(function(data) {
            successFlash("Team updated successfully!")
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
        $("#userModalLabel").text("New Entity")
        $("#role").val("user")
        $("#role").trigger("change")
    } else {
        $("#userModalLabel").text("Edit Entity")
        api.teams.get(id)
            .success((team) => {
                $("#username").val(team.teamname)
            })
            .error(function() {
                errorFlash("Error fetching entity")
            })
    }
}

const deleteUser = (id) => {
    var team = teams.find(x => x.id == id)
    if (!team) {
        return
    }
    Swal.fire({
        title: "Are you sure?",
        text: "This will delete the entity for " + escapeHtml(team.teamname) + " as well as all of the objects they have created.\n\nThis can't be undone!",
        type: "warning",
        animation: false,
        showCancelButton: true,
        confirmButtonText: "Delete",
        confirmButtonColor: "#428bca",
        reverseButtons: true,
        allowOutsideClick: false,
        preConfirm: function() {
            return new Promise((resolve, reject) => {
                    api.teams.delete(id)
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
                'Entity Deleted!',
                "The Entity for " + escapeHtml(team.teamname) + " and all associated objects have been deleted!",
                'success'
            );
        }
        $('button:contains("OK")').on('click', function() {
            location.reload()
        })
    })
}

function goToDepartmentList(id) {
    window.location.href = 'departments/' + id;
}

const load = () => {
    $("#userTable").hide()
    $("#loading").show()
    api.teams.get()
        .success((us) => {
            teams = us
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
            let teamToSave = [];
            $.each(teams, (i, team) => {
                teamToSave.push({
                    id: team.id,
                    name: team.teamname
                });
                userRows.push([
                    // escapeHtml(team.teamname),
                    "<div onclick='goToDepartmentList(" + team.id + ")'>" + team.teamname + "</div>",
                    "<div class='pull-right'>\
                    <button class='btn btn-primary edit_button' data-toggle='modal' data-backdrop='static' data-target='#modal' data-user-id='" + team.id + "'>\
                    <i class='fa fa-pencil'></i>\
                    </button>\
                    <button class='btn btn-danger delete_button' data-user-id='" + team.id + "'>\
                    <i class='fa fa-trash-o'></i>\
                    </button></div>"
                ])
            });
            localStorage.setItem("entitys", JSON.stringify(teamToSave));
            userTable.rows.add(userRows).draw();
        })
        .error(() => {
            errorFlash("Error fetching teams")
        })

    // get user list
    api.users.get()
        .success((us) => {
            users = us
                // $("#loading").hide()
                // $("#userTable").show()
                // let userTable = $("#userTable").DataTable({
                //     destroy: true,
                //     columnDefs: [{
                //         orderable: false,
                //         targets: "no-sort"
                //     }]
                // });
                // userTable.clear();
                // userRows;
            let teamuser = [];
            $.each(users, (i, user) => {
                // $("#team").select2("user.username")[0].text;
                const div = document.createElement('div');
                teamuser.push([
                    "<div class='checkbox checkbox-primary'>\
                    <input id='teamuser" + user.id + "' type='checkbox'>\
                    <label for='teamuser" + user.id + "'>" + user.username + "</label>\
                </div>\
                    "
                ])
                div.innerHTML = "<div class='checkbox checkbox-primary'>\
                <input id='teamuser" + user.id + "' type='checkbox'>\
                <label for='teamuser" + user.id + "'>" + user.username + "</label>\
            </div>\
                "
            })
        })
        .error(() => {
            errorFlash("Error fetching users")
        })


}

$(document).ready(function() {
    load()
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