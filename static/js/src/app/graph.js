var victims = []

document.getElementById("btn_convert").addEventListener("click", function() {
    html2canvas(document.getElementById("down01"),
        {
            allowTaint: true,
            useCORS: true
        }).then(function (canvas) {
            var anchorTag = document.createElement("a");
            document.body.appendChild(anchorTag);
        //  document.getElementById("previewImg").appendChild(canvas);
            anchorTag.download = "Statistics of active campaigns.jpg";
            anchorTag.href = canvas.toDataURL();
            anchorTag.target = '_blank';
            anchorTag.click();
        });
});
document.getElementById("btn_convert1").addEventListener("click", function() {
    html2canvas(document.getElementById("down02"),
        {
            allowTaint: true,
            useCORS: true
        }).then(function (canvas) {
            var anchorTag = document.createElement("a");
            document.body.appendChild(anchorTag);
        //  document.getElementById("previewImg").appendChild(canvas);
            anchorTag.download = "Number of successive victims.jpg";
            anchorTag.href = canvas.toDataURL();
            anchorTag.target = '_blank';
            anchorTag.click();
        });
});
document.getElementById("btn_convert2").addEventListener("click", function() {
    html2canvas(document.getElementById("down03"),
        {
            allowTaint: true,
            useCORS: true
        }).then(function (canvas) {
            var anchorTag = document.createElement("a");
            document.body.appendChild(anchorTag);
        //  document.getElementById("previewImg").appendChild(canvas);
            anchorTag.download = "Entities with the highest rates.jpg";
            anchorTag.href = canvas.toDataURL();
            anchorTag.target = '_blank';
            anchorTag.click();
        });
});

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

function exportToCsvClick(){
    exportToCsv("lastcampaign.csv",lastCampaignDataToExport);
}
