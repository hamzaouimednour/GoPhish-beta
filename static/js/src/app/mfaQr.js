$(document).ready(function () {
    $("#mfaForm").submit(function (e) {
        e.preventDefault()
        var mfa_request = {
            passCode: $("#mfa-pass-code").val(),
            secret: $("#TwoFA_Secret").val(),
            checked: $("#use_mfa").is(":checked") ? 1 : 0
        }
        console.log(mfa_request)
        api.mfa(mfa_request)
            .success(function (response) {
                successFlash(response.message)
            })
            .error(function (data) {
                errorFlash(data.message)
            })
        return false
    })
})
