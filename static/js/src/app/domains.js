console.log(JSON.parse(localStorage.getItem("cart")))
if (!localStorage.getItem("cart")) {
    localStorage.setItem('cart', "[]")

} else if (JSON.parse(localStorage.getItem("cart")).length > 0) {
    let cartCheck = document.getElementById("cartCheck");
    cartCheck.style = "block"
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
var success = document.getElementById("mainForm");

let cart = JSON.parse(localStorage.getItem('cart'));
let cartTotal = 0;
let json = [];
let productExists;
let cartList = document.getElementById("cartList");
var modal = document.getElementById("modal");
var span = document.getElementsByClassName("close")[0];
var btn = document.getElementById("openModalBtn");
var table = document.getElementById("data-table");

for (const property of cart) {
    let productItem = document.createElement("div");
    productItem.innerHTML = `<div <div id = "${property}"><strong>${property} <strong><button style="float: right; value="${property}" class= "btn btn-primary" onclick="removeFromCart('${property}')"><i class="fa fa-trash" ></i></button></div> <br> `;
    cartList.appendChild(productItem);

}
const getDomains = async () => {
    success.style.display = "none"
    cartCheck.style.display = "none"
    for(var i = 1;i<table.rows.length;){
        table.deleteRow(i);
    }    //const element = document.getElementById("data-table");
    //element.remove();
    $("#loading").show()
    let domain = {}
    domain = {
        name: $("#domain-search").val(),

    }
    await sleep(1000);

    api.domains.post(domain)
        .success(function (res) {
            $("#loading").hide()
            json = JSON.parse(res.data)
            console.log(json)

            console.log(json.length)

            for (var i = 0; i < json.length; i++) {
                try {
                    console.log(json[i].length > 0)
                    if (json[i].length > 0) {
                        var row = table.insertRow(-1);
                        var nameCell = row.insertCell(0);
                        var typeCell = row.insertCell(1);
                        var disCell = row.insertCell(2);
                        var priceCell = row.insertCell(3);
                        var actionCell = row.insertCell(4);
                        console.log(domain.name.includes("."))
                        if (domain.name.includes(".")) {
                            nameCell.innerHTML = domain.name.split(".")[0] + '.' + json[i][0].offerId.split("-")[0];
                            let btn1 = document.createElement("button");
                            if (cart.includes(domain.name.split(".")[0] + '.' + json[i][0].offerId.split("-")[0])) {
                                btn1.innerHTML = '<i class="fa fa-trash"></i> Remove from cart'
                            } else {
                                btn1.innerHTML = '<i class="fa fa-shopping-cart"></i> Add to cart';

                            }
                            btn1.style.marginRight = "5px";
                            btn1.setAttribute("data-action", "add-to-cart");
                            btn1.setAttribute("class", "btn btn-primary");

                            btn1.setAttribute("data-name", domain.name.split(".")[0] + '.' + json[i][0].offerId.split("-")[0]);
                            console.log(json[i][0].action == "transfer" && json[i][0].pricingMode == "default")
                            if (json[i][0].action == "transfer" && json[i][0].pricingMode == "default") {
                                btn1.disabled = true

                            }
                            actionCell.appendChild(btn1);

                        } else {
                            nameCell.innerHTML = domain.name + '.' + json[i][0].offerId.split("-")[0];
                            let btn1 = document.createElement("button");
                            if (cart.includes(domain.name + '.' + json[i][0].offerId.split("-")[0])) {
                                btn1.innerHTML = '<i class="fa fa-trash"></i> Remove from cart'
                            } else {
                                btn1.innerHTML = '<i class="fa fa-shopping-cart"></i> Add to cart';

                            }
                            btn1.setAttribute("class", "btn btn-primary");

                            btn1.style.marginRight = "5px";
                            btn1.setAttribute("data-action", "add-to-cart");
                            btn1.setAttribute("data-name", domain.name + '.' + json[i][0].offerId.split("-")[0]);
                            if (json[i][0].action == "transfer" && json[i][0].pricingMode == "default") {
                                btn1.disabled = true

                            }
                            actionCell.appendChild(btn1);

                        }
                        if (json[i][0].action == "transfer" && json[i][0].pricingMode == "default") {
                            typeCell.innerHTML = "Transfer";

                            //  typeCell.style.backgroundImage= "linear-gradient(to right, #1850ad, #3366ff, #66ccff)";
                            // typeCell.style.backgroundColor = "#4d5592";
                            // typeCell.style.color = "white";
                            // typeCell.style.cursor = "pointer";
                            // typeCell.style.border = "none";
                            // typeCell.style.fontWeight = "900";
                            // typeCell.style.borderRadius = "30px";
                            // typeCell.style.textAlign = "center";
                            disCell.innerHTML = "Unavailable";
                            disCell.style.color = "red";
                        } else if (json[i][0].action == "transfer" && json[i][0].pricingMode == "aftermarket1") {
                            typeCell.innerHTML = "Available for purchase";

                            // typeCell.style.backgroundColor = "#4d5592";
                            // typeCell.style.backgroundImage= "linear-gradient(to right, #1850ad, #3366ff, #66ccff)";

                            //typeCell.style.color = "white";
                            //typeCell.style.cursor = "pointer";
                            //typeCell.style.border = "none";
                            //typeCell.style.fontWeight = "900";
                            //typeCell.style.borderRadius = "30px";
                            //typeCell.style.textAlign = "center";
                            disCell.innerHTML = "Available";
                            disCell.style.color = "green";


                        } else if (json[i][0].action == "create" && json[i][0].pricingMode == "premium") {
                            typeCell.innerHTML = "Premium";
                            //typeCell.style.backgroundColor = "#4d5592";
                            //  typeCell.style.backgroundImage= "linear-gradient(to right, #1850ad, #3366ff, #66ccff)";
                            //typeCell.style.color = "white";
                            //typeCell.style.cursor = "pointer";
                            //typeCell.style.border = "none";
                            //typeCell.style.fontWeight = "900";
                            //typeCell.style.borderRadius = "30px";
                            //typeCell.style.textAlign = "center";
                            disCell.innerHTML = "Available";
                            disCell.style.color = "green";

                        } else {
                            disCell.innerHTML = "Available";
                            disCell.style.color = "green";
                        }

                        if (json[i][0].prices[0].price.value === json[i][0].prices[4].price.value && json[i][0].prices[0].price.value === json[i][0].prices[1].price.value && json[i][0].prices[0].price.value !== null) {
                            priceCell.innerHTML = json[i][0].prices[4].price.text
                        } else if (json[i][0].prices[0].price.value == json[i][0].prices[4].price.value && json[i][0].prices[4].price.value != json[i][0].prices[1].price.value) {
                            priceCell.innerHTML = json[i][0].prices[4].price.text + "<br />" + "puis " + json[i][0].prices[1].price.text + "/an";
                        } else if (json[i][0].prices[0].price.value != json[i][0].prices[4].price.value && json[i][0].prices[4].price.value == json[i][0].prices[1].price.value) {
                            priceCell.innerHTML = json[i][0].prices[0].price.text.strike() + ' ' + json[i][0].prices[4].price.text;

                        } else {
                            priceCell.innerHTML = json[i][0].prices[0].price.text.strike() + ' ' + json[i][0].prices[4].price.text + "<br />" + "puis " + json[i][0].prices[1].price.text + "/an";

                        }



                    }
                } catch (error) {
                    console.error(error);
                }

            }
            var buttons = document.querySelectorAll("[data-action='add-to-cart']");
            console.log(buttons)
            for (var i = 0; i < buttons.length; i++) {
                buttons[i].addEventListener("click", function () {
                    var productName = this.getAttribute("data-name");
                    addDomaiToCart(productName);
                    console.log(this.innerHTML)
                    console.log(this.innerHTML == '<i class="fa fa-trash"></i> Remove from cart')
                    if (this.innerHTML.split("</i>")[1] == ' Remove from cart') {
                        this.innerHTML = '<i class="fa fa-shopping-cart"></i> Add to cart';

                    } else if (this.innerHTML.split("</i>")[1] == ' Add to cart') {
                        this.innerHTML = '<i class="fa fa-trash"></i> Remove from cart';

                    }

                });
            }
            function addDomaiToCart(productName) {
                productExists = cart.includes(productName);
                if (!productExists) {
                    cart.push(productName);
                    localStorage.setItem('cart', JSON.stringify(cart));
                    let productItem = document.createElement("div");
                    productItem.innerHTML = `<div id = "${productName}"> <strong>${productName} <strong><button style="float: right; value="${productName}" class ="btn btn-primary" onclick="removeFromCart('${productName}')"> <i class="fa fa-trash" ></i></button></div><br> `
                    cartList.appendChild(productItem);
                } else {
                    const products = JSON.parse(localStorage.getItem('cart'));
                    products.splice(products.indexOf(productName), 1);
                    localStorage.setItem('cart', JSON.stringify(products))
                    document.getElementById(productName).remove()
                    cart = JSON.parse(localStorage.getItem('cart'));

                }


            }
            success.style = "block"
            cartCheck.style = "block"
        })
        .error(function () {
            $("#loading").hide()
            errorFlash("Error fetching ")
        })
}
function removeFromCart(productName) {
    const products = JSON.parse(localStorage.getItem('cart'));
    products.splice(products.indexOf(productName), 1);
    localStorage.setItem('cart', JSON.stringify(products))
    document.getElementById(productName).remove()
    cart = JSON.parse(localStorage.getItem('cart'));
    const element = document.querySelector(`[data-name='${productName}']`);
    console.log(element.innerHTML)

    if (element.innerHTML.split("</i>")[1] == ' Remove from cart') {
        element.innerHTML = '<i class="fa fa-shopping-cart"></i> Add to cart';

    } else if ((element.innerHTML.split("</i>")[1] == ' Add to cart')) {
        element.innerHTML = '<i class="fa fa-trash"></i> Remove from cart';

    }

}
const sendCart = (id) => {
    let finalList = {}
    finalList = {
        finalList: JSON.parse(localStorage.getItem('cart')).join(",")

    }
    api.domains.post(finalList).success(function (res) {
        $("#loading").hide()
        errorFlash("Error fetching ")
    }).error(function () {
        $("#loading").hide()
        errorFlash("Error fetching ")
    })
}

const submit = async () => {
    var modalSubmitbuttom = document.getElementById("modalSubmit");
    modalSubmitbuttom.disabled = false
    let modal = {}

    modal = {
        finalList: JSON.parse(localStorage.getItem('cart')),
        First: $("#First").val(),
        Last: $("#Last").val(),
        email: $("#email").val(),
        country: $("#country").val(),
        line1: $("#line1").val(),
        city: $("#city").val(),
        zip: $("#zip").val(),
        // language: $("#language").val(),
        Phone: $("#Phone").val(),
    }
    let valid = true
    var checkbox = document.getElementById("visibility");

    //modal.visibility = checkbox.checked

    console.log(modal)
    if (!modal.First) {
        valid = false
    }
    if (!modal.Last) {
        valid = false
    }
    if (!modal.email) {
        valid = false
    }
    if (!modal.country) {
        valid = false
    }
    if (!modal.line1) {
        valid = false
    }
    if (!modal.city) {
        valid = false
    }
    if (!modal.zip) {
        valid = false
    }
    /*     if (!modal.language) {
            valid = false
        } */
    if (!modal.Phone) {
        valid = false
    }
    // if (!modal.visibility) {
    //     valid = false
    // }
    if (!valid) {
        modalError("Make sure you fill in all the fields")
        valid = true
    } else {
        
        var modalErrorRemove = document.getElementById("modal.flashes");
        modalSubmitbuttom.disabled = true
        move = document.getElementById("modal.flashes");
        modalErrorRemove.innerHTML = "";
        $("#loadingModal").show()
        await sleep(1000)
        modalAsString = JSON.stringify(modal)
        console.log({ modal: modalAsString })
        api.domains.post({ modal: modalAsString }).success(function (res) {
            console.log(res.data)
          //  var success = document.getElementById("success");
          //  success.style = "block"
            modalSuccess(`<a target="_blank" href=${res.data}>Continu to OVH</a>`)
            $("#loadingModal").hide()
        }).error(function () {
            $("#loadingModal").hide()
            errorFlash("Error fetching ")
        })

    }

}
/* let button = document.getElementById("checkout");

let intervalId = setInterval(function () {
    console.log("here")
    let storedValue = JSON.parse(localStorage.getItem("cart"));
    if (storedValue !== null && storedValue !== "" && storedValue !== []) {
        button.disabled = false;
        clearInterval(intervalId);
    }else {
        button.disabled = true;
    }
}, 1000);

 */