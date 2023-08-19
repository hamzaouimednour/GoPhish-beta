
// #### Gauge

// The Gauge object encapsulates the behavior
// of simple gauge. Most of the implementation
// is in the CSS rules, but we do have a bit
// of JavaScript to set or read the gauge value

function Gauge(el) {

    // ##### Private Properties and Attributes

    var element, // Containing element for the info component
        data, // `.gauge--data` element
        needle, // `.gauge--needle` element
        value = 0.0, // Current gauge value from 0 to 1
        prop; // Style for transform

    // ##### Private Methods and Functions

    var setElement = function(el) {
        // Keep a reference to the various elements and sub-elements
        element = el;
        data = element.querySelector(".gauge--data");
        needle = element.querySelector(".gauge--needle");
    };

    var setValue = function(x) {
        value = x;
        var turns = -0.5 + (x * 0.5);
        data.style[prop] = "rotate(" + turns + "turn)";
        needle.style[prop] = "rotate(" + turns + "turn)";
    };

    // ##### Object to be Returned

    function exports() {};

    // ##### Public API Methods

    exports.element = function(el) {
        if (!arguments.length) {
            return element;
        }
        setElement(el);
        return this;
    };

    exports.value = function(x) {
        if (!arguments.length) {
            return value;
        }
        setValue(x);
        return this;
    };

    // ##### Initialization

    var body = document.getElementsByTagName("body")[0];
    ["webkitTransform", "mozTransform", "msTransform", "oTransform", "transform"].
    forEach(function(p) {
        if (typeof body.style[p] !== "undefined") {
            prop = p;
        }
    });

    if (arguments.length) {
        setElement(el);
    }

    return exports;

}


function exportToCsv(filename, rows) {
    var processRow = function (row) {
        var finalVal = '';
        for (var j = 0; j < row.length; j++) {
            var innerValue = row[j] === null ? '' : row[j].toString();
            if (row[j] instanceof Date) {
                innerValue = row[j].toLocaleString();
            };
            var result = innerValue.replace(/"/g, '""');
            if (result.search(/("|,|\n)/g) >= 0)
                result = '"' + result + '"';
            if (j > 0)
                finalVal += ';';
            finalVal += result;
        }
        return finalVal + '\n';
    };

    var csvFile = '';
    for (var i = 0; i < rows.length; i++) {
        csvFile += processRow(rows[i]);
    }

    var blob = new Blob([csvFile], { type: 'text/csv;charset=utf-8;' });
    if (navigator.msSaveBlob) { // IE 10+
        navigator.msSaveBlob(blob, filename);
    } else {
        var link = document.createElement("a");
        if (link.download !== undefined) { // feature detection
            // Browsers that support HTML5 download attribute
            var url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
}

function exportListToCsvClick(){
    exportToCsv("opertaion list.csv",operationDetailsDataToExport);
}
function exportResultToCsvClick(){
    console.log("operationResultDataToExport",operationResultDataToExport);
    exportToCsv("opertaion result.csv",operationResultDataToExport);
}


function exportToCsvClick() {
    let apiSchema = api.campaigns;
    let campaignParentID = ""

    if (window.location.pathname.startsWith("/campaign_parents")) {
        apiSchema = api.campaignParentId
        campaignParentID = window.location.pathname.split('/').slice(-1)[0]
    }
    api.campaignId.results(campaignParentID)
        .success(function(c) {
            
            c.campaign_groups_summary.forEach(element => {
                group_id = element.group_id
            });
            console.log("results",c);
            var campaign_parent = c.campaign_parent
            exportToCsv('export.csv', [ ['Name','Owner','Created_date'],[campaign_parent.name,c.owner,campaign_parent.created_date] ]); 
        });
}

document.getElementById("btn_convert2").addEventListener("click", function() {
    html2canvas(document.getElementById("down02"),
        {
            allowTaint: true,
            useCORS: true
        }).then(function (canvas) {
            var anchorTag = document.createElement("a");
            document.body.appendChild(anchorTag);
        //  document.getElementById("previewImg").appendChild(canvas);
            anchorTag.download = "Operation stats.jpg";
            anchorTag.href = canvas.toDataURL();
            anchorTag.target = '_blank';
            anchorTag.click();
        });
});


var gauge = new Gauge(document.getElementById("gauge"));