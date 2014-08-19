/*! NMONDB2WEB v2.0.0 nmonweb.js                                            */
/*! Purpose - Show NMON data in graphics from DB                            */
/*! Author - David López                                                    */
/*! Disclaimer:  this provided "as is".                                     */
/*! License: GNU                                                            */
/*! Date - 28/02/14                                                         */

// Init the dialog defaults
// -----------------------------------------------------------------------------
function initOutputCompare() {
    var cont = 0,
        newDiv = "";

    // Formed the left menu for select type of charts
    $("#menu_left").html("");
    for( var cont = 1; cont < 4; cont++ ) {
        newDiv = '<li class="ui-widget-content">' + $.t("menu_compare.tab"+cont) + "</li>";
        $("#menu_left").append(newDiv)
    }
    $("#menu_left li").bind("click", function() {
        showDataCompare($(this).text());
        $(this).addClass("ui-selected").siblings().removeClass("ui-selected");
    });
    $('#menu_left li:first').addClass('ui-selected');

    // Create Toolbar
    createToolbarCompare();
}

// Init the dialog defaults
// -----------------------------------------------------------------------------
function prepareOutputCompare() {
    var cont = 0,
        newDiv = "";

    // Generate the accordion for Compare machines
    $("#output").show();

    // Refresh then 
    refreshParametersCompare();
    // Get the current selection from left menu
    var index = $('#menu_left .ui-selected').map(function() {
        return $(this).text();
    });
    showDataCompare( index[0] );
}

// Refresh table parameters
// -----------------------------------------------------------------------------
function refreshParametersCompare() {
    var thead = "";
    var values = "";
    
    // Formed head of table
    thead = "<thead><tr class='ui-widget-header'>";
    thead += "<th>VM Machine</th>";
    thead += "<th>First Date</th>";
    thead += "<th>Second Date</th>";
    thead += "</thead>";

    // Formed the values
    values = "<tbody><tr>";
    values += "<td>" + text_selected_element + "</td>";
    values += "<td>" + begin_date.toDateString() + "</td>";
    values += "<td>" + end_date.toDateString() + "</td>";
    values += "</tr></tbody>";

    // Clear the last table and charge the new values
    $("#show-parameters").html("");
    $("#show-parameters").append(thead + values);
}

// Create Toolbar Compare
// -----------------------------------------------------------------------------
function createToolbarCompare() {

    // Empty toolbar previous
    $("#toolbar").empty();

    // Create button for change options
    $("#toolbar").append('<button id="change_opts">' + $.t("toolbar_vm.options") + '</button>');
    $( "#change_opts" ).button().click( function() { changeOptionsCompare(); } );

    // Create button for navigate for previous days/weeks
    $("#toolbar").append('<button id="prev_week"> ' + $.t("toolbar_vm.prev_week") + '</button>');
    $("#prev_week" ).button(
        {   text: false,
            icons: {
                primary: "ui-icon-seek-start"
            }
        }).click( function() { changeDateCompare(-7); } );
    $("#toolbar").append('<button id="prev_day">' + $.t("toolbar_vm.prev_day") + '</button>');
    $("#prev_day" ).button(
        {   text: false,
            icons: {
                primary: "ui-icon-seek-prev"
            }
        }).click( function() { changeDateCompare(-1); } );
    
    // Create button for navigate for next days/weeks
    $("#toolbar").append('<button id="next_day">' + $.t("toolbar_vm.next_day") + '</button>');
    $( "#next_day" ).button(
        {   text: false,
            icons: {
                primary: "ui-icon-seek-next"
            }
        }).click( function() { changeDateCompare(1); } );
    $("#toolbar").append('<button id="next_week"> ' + $.t("toolbar_vm.next_week") + '</button>');
    $("#next_week" ).button(
        {   text: false,
            icons: {
                primary: "ui-icon-seek-end"
            }
        }).click( function() { changeDateCompare(7); } );
}

// Init the dialog defaults
// -----------------------------------------------------------------------------
function changeOptionsCompare() {
    // Init the dialog after load all components of windows
    initDialogVMPost("COMPARE");

    // Change the selection of the button
    $("#dialog-vm").dialog("open");   
}

// Change from toolbar the value
// -----------------------------------------------------------------------------
function changeDateCompare( variation ) {
    // Change the begin and end date
    begin_date.setDate( begin_date.getDate() + variation );
    end_date.setDate( end_date.getDate() + variation );

    // Change the show parameters
    refreshParametersCompare();
    
    // Get the current selection from left menu
    var index = $('#menu_left .ui-selected').map(function() {
        return $(this).text();
    });
    showDataCompare( index[0] );
}

// Show Data
// -----------------------------------------------------------------------------
function showDataCompare( selectTab ) {
    var select_type = 'sample'
    
    // Clear the others graphics
    $('.graphic').empty();
    
    // Depending the TAB show the graphics
    switch( selectTab ) {
        case $.t("menu_compare.tab1"):
            makeGraphCompare("CPU1", select_type, selected_element, text_selected_element, begin_date, end_date, 'graphic1');
            makeGraphCompare("CPU2", select_type, selected_element, text_selected_element, begin_date, end_date, 'graphic2');
            makeGraphCompare("CPU3", select_type, selected_element, text_selected_element, begin_date, end_date, 'graphic3');
            makeGraphCompare("CPU4", select_type, selected_element, text_selected_element, begin_date, end_date, 'graphic4');
            break;
        case $.t("menu_compare.tab2"):
            makeGraphCompare("MEM", select_type, selected_element, text_selected_element, begin_date, end_date, 'graphic1');
            makeGraphCompare("MEM2", select_type, selected_element, text_selected_element, begin_date, end_date, 'graphic2');
            makeGraphCompare("MEM3", select_type, selected_element, text_selected_element, begin_date, end_date, 'graphic3');
            makeGraphCompare("MEM4", select_type, selected_element, text_selected_element, begin_date, end_date, 'graphic4');
            break;
        case $.t("menu_compare.tab3"):
            makeGraphCompare("PAGE1", select_type, selected_element, text_selected_element, begin_date, end_date, 'graphic1');
            makeGraphCompare("PAGE2", select_type, selected_element, text_selected_element, begin_date, end_date, 'graphic2');
            makeGraphCompare("PAGE3", select_type, selected_element, text_selected_element, begin_date, end_date, 'graphic3');
            makeGraphCompare("PAGE4", select_type, selected_element, text_selected_element, begin_date, end_date, 'graphic4');
            break;
    }    
}

// Put options for graph before get the data, and select the type of method
// for get data in database
// -----------------------------------------------------------------------------
function makeGraphCompare( typeGraph, typeData, host, desc, fromdate, todate, container ) {
    var     char_type,       // Char Type (line/area/bar/column/...)
            title,           // Title of chart
            subtitle,        // Subtitle of chart
            axis_title,      // Title of Y axis of chart
            series = [],     // Array with names of series of data
            type_xserie,     // Type of X axis (datetime/linear)
            type_group = 'individual';
                            // Type of Group of data (individual/group)
    var     filename = host;
    var     aux_pos;

    // Inicializa los datos de los gráficos
    initGraphDefault();

    // For all charts, put the subtitle
    subtitle = desc + " (" + fromdate.toLocaleDateString() + " - " + todate.toLocaleDateString() + ")";

    // For default all X Series is date
    type_xserie = 'datetime';

    // Pone el nombre del fichero para exportar
    filename = typeGraph + "_" + host;
    filename.toUpperCase()

    // Put every options for each type graph
    title = $.t("graph.compare." + typeGraph + ".title");

    switch( typeGraph ) {
        case 'CPU1':
            char_type = 'line';
            axis_title = $.t('graph.common.processors');
            series[0] = {};     series[0].name = fromdate.toLocaleDateString();
            series[1] = {};     series[1].name = todate.toLocaleDateString();
                                series[1].dashStyle = "ShortDash";
                                series[1].lineWidth = 3;
            series[2] = {};     series[2].name = $.t('graph.common.entitled') + fromdate.toLocaleDateString();
                                series[2].dashStyle = 'Dot';
            series[3] = {};     series[3].name = $.t('graph.common.entitled') + todate.toLocaleDateString();
                                series[3].dashStyle = 'Dot';
                                series[3].lineWidth = 3;
            break;
        case 'CPU2':
        case 'CPU3':
        case 'CPU4':
            char_type = 'line';
            axis_title = $.t('graph.common.processors');
            series[0] = {};     series[0].name = $.t("graph.compare." + typeGraph + ".series") + " " + fromdate.toLocaleDateString();
            series[1] = {};     series[1].name = $.t("graph.compare." + typeGraph + ".series") + " " + todate.toLocaleDateString();
                                series[1].dashStyle = "ShortDash";
                                series[1].lineWidth = 3;
            series[2] = {};     series[2].name = $.t("graph.common.total") + " " + fromdate.toLocaleDateString();
                                series[2].dashStyle = 'Dot';
            series[3] = {};     series[3].name = $.t("graph.common.total") + " " + todate.toLocaleDateString();
                                series[3].dashStyle = 'Dot';
                                series[3].lineWidth = 3;
            break;
        case 'MEM':
            char_type = 'line';
            axis_title = $.t('graph.common.memory_mb');
            series[0] = {};     series[0].name = fromdate.toLocaleDateString();
            series[1] = {};     series[1].name = todate.toLocaleDateString();
                                series[1].dashStyle = "ShortDash";
                                series[1].lineWidth = 3;
            series[2] = {};     series[2].name = $.t('graph.common.assigned') + " " + fromdate.toLocaleDateString();
                                series[2].dashStyle = 'Dot';
            series[3] = {};     series[3].name = $.t('graph.common.assigned') + " " + todate.toLocaleDateString();
                                series[3].dashStyle = 'Dot';
                                series[3].lineWidth = 3;
            break;
        case 'MEM2':
        case 'MEM3':
        case 'MEM4':
            char_type = 'line';
            axis_title = $.t('graph.common.memory_mb');
            series[0] = {};     series[0].name = fromdate.toLocaleDateString();
            series[1] = {};     series[1].name = todate.toLocaleDateString();
                                series[1].dashStyle = "ShortDash";
                                series[1].lineWidth = 3;
            break;
        case 'PAGE1':
            char_type = 'line';
            axis_title = $.t('graph.common.numpages');
            series[0] = {};     series[0].name = fromdate.toLocaleDateString();
            series[1] = {};     series[1].name = todate.toLocaleDateString();
                                series[1].dashStyle = "ShortDash";
                                series[1].lineWidth = 3;
            break;
        case 'PAGE2':
        case 'PAGE3':
        case 'PAGE4':
            char_type = 'line';
            axis_title = $.t('graph.common.numpages');
            series[0] = {};     series[0].name = $.t("graph.compare." + typeGraph + ".serie_1") + " " + fromdate.toLocaleDateString();
            series[1] = {};     series[1].name = $.t("graph.compare." + typeGraph + ".serie_1") + " " + todate.toLocaleDateString();
                                series[1].dashStyle = "ShortDash";
                                series[1].lineWidth = 3;
            series[2] = {};     series[2].name = $.t("graph.compare." + typeGraph + ".serie_2") + " " + fromdate.toLocaleDateString();
                                series[2].dashStyle = 'Dot';
            series[3] = {};     series[3].name = $.t("graph.compare." + typeGraph + ".serie_2") + " " + todate.toLocaleDateString();
                                series[3].dashStyle = 'Dot';
                                series[3].lineWidth = 3;
            break;
        default:
            return;
    }
    
    var options = {
        container:    container,
        chart_type:   char_type,
        title:        title,
        subtitle:     subtitle,
        yAxis_title:  axis_title,
        type_xserie:  type_xserie,
        series:       series,
        tooltip:      '%H:%M',
        filename:     filename
    };

    // Convert dates
    var query_from = fromdate.getFullYear() + "-" + (fromdate.getMonth()+1) + "-" + fromdate.getDate();
    var query_to = todate.getFullYear() + "-" + (todate.getMonth()+1) + "-" + todate.getDate();
    var date_diff = todate - fromdate;
    if( (todate - fromdate) <= (24 * 3600 * 1000) ) {
        options.tickInterval = 3600 * 1000; // Una hora
    }

    // Call to JQuery for the type of chart
    $.getJSON('php/comparador.php', {query:typeGraph,host:host,first_day:query_from,second_day:query_to},
        function(data){makeGraphJSONCompara(options, data, todate);});
}


