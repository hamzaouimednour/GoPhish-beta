document.getElementById("azure-ad-button").addEventListener("click", function () {
    var tenant_id = "e9f6b4e9-a09e-4099-a428-a64ab61b7d3c";
    var client_id = "89a0e419-c5c8-40e4-93e3-5cb413add77a";
    var redirect_uri = "https://adm.pp.trawler.cc/auth/callback";
    var response_type = "code"; // or "token"
    var auth_url = "https://login.microsoftonline.com/" + tenant_id + "/oauth2/authorize?client_id=" + client_id + "&response_type=" + response_type + "&redirect_uri=" + redirect_uri;
    window.location = auth_url;
});
