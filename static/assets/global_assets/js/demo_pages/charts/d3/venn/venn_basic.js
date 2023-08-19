/* ------------------------------------------------------------------------------
 *
 *  # D3.js - basic Venn diagram
 *
 *  Basic demo d3.js Venn diagram setup
 *
 * ---------------------------------------------------------------------------- */


// Setup module
// ------------------------------

var D3VennBasic = function() {


    //
    // Setup module components
    //

    // Chart
    var _vennBasic = function() {
        if (typeof d3 == 'undefined') {
            console.warn('Warning - d3.min.js is not loaded.');
            return;
        }

        // Main variables
        var element = document.getElementById('d3-venn-basic');


        // Initialize chart only if element exsists in the DOM
        if(element) {
            var sets = [];
            var overlaps = [];
            var i=0;

            api.librarySettings.get('topic')
            .success(function (ps) {
                $('#topic option:not([value=""])').remove()
                if(ps.length){
                    topics = ps
                    ps.forEach(element => {
                        // $('#topic').append('<option value="' + element.id + '">' + element.name + '</option>')
                        sets.push({label: element.name, size: (4*i)+1});
                        // overlaps.push({sets: [0,1*i], size: 1*i});
                        overlaps.push({sets: [i,1], size: (1*i)+1});
                        // overlaps.push({sets: [1*i,1,1.5*i], size: 1*i});
                        i++;
                    });
                }
            })
            // Data set
            // ------------------------------

            // // Circles
            // var sets = [
            //     {label: 'Topics-01', size: 48},
            //     {label: 'Topics-02', size: 35},
            //     {label: 'Topics-03', size: 108}
            // ];

            // // Overlaps
            // var overlaps = [
            //     {sets: [0,1], size: 1},
            //     {sets: [0,2], size: 1},
            //     {sets: [1,2], size: 6},
            //     {sets: [0,1,2], size: 0},
            // ];


            // Initialize chart
            // ------------------------------

            // Draw diagram
            var diagram = venn.drawD3Diagram(d3.select(element), venn.venn(sets, overlaps), 350, 350);


            // Make text semi bold
            diagram.text.style("font-weight", "500");
        }
    };


    //
    // Return objects assigned to module
    //

    return {
        init: function() {
            _vennBasic();
        }
    }
}();


// Initialize module
// ------------------------------

document.addEventListener('DOMContentLoaded', function() {
    D3VennBasic.init();
});
