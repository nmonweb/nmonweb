/*! NMONDB2WEB v2.0.0 nmonweb.js                                            */
/*! Purpose - Show NMON data in graphics from DB                            */
/*! Author - David L—pez                                                    */
/*! Disclaimer:  this provided "as is".                                     */
/*! License: GNU                                                            */
/*! Date - 28/02/14                                                         */

// Init the dialog defaults
// -----------------------------------------------------------------------------
function initOutputHMC() {
    var cont = 0,
        newDiv = "";

    // Formed the left menu for select type of charts
    $("#menu_left").html("");
    for( var cont = 1; cont < 2; cont++ ) {
        newDiv = '<li class="ui-widget-content">' + $.t("menu_hmc.tab"+cont) + "</li>";
        $("#menu_left").append(newDiv)
    }
    $("#menu_left li").bind("click", function() {
        showDataHMC($(this).text());
        $(this).addClass("ui-selected").siblings().removeClass("ui-selected");
    });
    $('#menu_left li:first').addClass('ui-selected');

    // Create Toolbar
    createToolbarHMC();
}

// Init the dialog defaults
// -----------------------------------------------------------------------------
function prepareOutputHMC() {
    var cont = 0,
        newDiv = "";

    // Generate the accordion for managed-system
    $("#output").show();

    // Refresh then 
    refreshParametersHMC();
    
    // Get the current selection from left menu
    var index = $('#menu_left .ui-selected').map(function() {
        return $(this).text();
    });
    showDataHMC( index[0] );
}

// Refresh table parameters
// -----------------------------------------------------------------------------
function refreshParametersHMC() {
    var thead = "";
    var values = "";
    
    // Formed head of table
    thead = "<thead><tr class='ui-widget-header'>";
    thead += "<th>Managed-System</th>";
    thead += "<th>From Date</th>";
    thead += "<th>To Date</th>";
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

// Create Toolbar managed-system
// -----------------------------------------------------------------------------
function createToolbarHMC() {

    // Empty toolbar previous
    $("#toolbar").empty();

    // Create button for change options
    $("#toolbar").append('<button id="change_opts">' + $.t("toolbar_vm.options") + '</button>');
    $( "#change_opts" ).button().click( function() { changeOptionsHMC(); } );

    // Create button for navigate for previous days/weeks
    $("#toolbar").append('<button id="prev_week"> ' + $.t("toolbar_vm.prev_week") + '</button>');
    $("#prev_week" ).button(
        {   text: false,
            icons: {
                primary: "ui-icon-seek-start"
            }
        }).click( function() { changeDateHMC(-7); } );
    $("#toolbar").append('<button id="prev_day">' + $.t("toolbar_vm.prev_day") + '</button>');
    $("#prev_day" ).button(
        {   text: false,
            icons: {
                primary: "ui-icon-seek-prev"
            }
        }).click( function() { changeDateHMC(-1); } );
    
    // Create button for navigate for next days/weeks
    $("#toolbar").append('<button id="next_day">' + $.t("toolbar_vm.next_day") + '</button>');
    $( "#next_day" ).button(
        {   text: false,
            icons: {
                primary: "ui-icon-seek-next"
            }
        }).click( function() { changeDateHMC(1); } );
    $("#toolbar").append('<button id="next_week"> ' + $.t("toolbar_vm.next_week") + '</button>');
    $("#next_week" ).button(
        {   text: false,
            icons: {
                primary: "ui-icon-seek-end"
            }
        }).click( function() { changeDateHMC(7); } );
}

// Init the dialog defaults
// -----------------------------------------------------------------------------
function changeOptionsHMC() {
    // Init the dialog after load all components of windows
    initDialogHMCPost("HMC");

    // Change the selection of the button
    $("#dialog-hmc").dialog("open");   
}

// Change from toolbar the value
// -----------------------------------------------------------------------------
function changeDateHMC( variation ) {
    // Change the begin and end date
    begin_date.setDate( begin_date.getDate() + variation );
    end_date.setDate( end_date.getDate() + variation );

    // Change the show parameters
    refreshParametersHMC();
    
    // Get the current selection from left menu
    var index = $('#menu_left .ui-selected').map(function() {
        return $(this).text();
    });
    showDataHMC( index[0] );
}

// Show Data
// -----------------------------------------------------------------------------
function showDataHMC( selectTab ) {
    var select_type = 'sample'
    var elapsed = end_date - begin_date;
    var max_elap = ((((7*24)*60)*60)*1000);
    
    // Inicializa los datos de los gr‡ficos
    initGraphDefault();

    // If elapsed time is upper to 5 days, the query must work with average
    // and not with one to one samples
    if( elapsed > max_elap ) {
        select_type = 'average'
    }

    // Clear the others graphics
    $('.graphic').empty();
    
    // Depending the TAB show the graphics
    switch( selectTab ) {
        case $.t("menu_hmc.tab1"):
            makeGraphHMC("hmc_1", select_type, selected_element, text_selected_element, begin_date, end_date, 'graphic1');
            makeGraphHMC("hmc_2", select_type, selected_element, text_selected_element, begin_date, end_date, 'graphic2');
            makeGraphHMC("hmc_8", select_type, selected_element, text_selected_element, begin_date, end_date, 'graphic3');
            makeGraphHMC("hmc_3", select_type, selected_element, text_selected_element, begin_date, end_date, 'graphic4');
            makeGraphHMC("hmc_9", select_type, selected_element, text_selected_element, begin_date, end_date, 'graphic5');
            break;
    }    
}

// Put options for graph before get the data, and select the type of method
// for get data in database
// -----------------------------------------------------------------------------
function makeGraphHMC( typeGraph, typeData, host, desc, fromdate, todate, container ) {
    var     char_type,       // Char Type (line/area/bar/column/...)
            title,           // Title of chart
            subtitle,        // Subtitle of chart
            axis_title,      // Title of Y axis of chart
            series = [],     // Array with names of series of data
            type_xserie,     // Type of X axis (datetime/linear)
            type_group = 'individual';
                            // Type of Group of data (individual/group)
    var     filename = host;
    var     type_query;

    // For all charts, put the subtitle
    subtitle = desc + " (" + fromdate.toLocaleDateString() + " - " + todate.toLocaleDateString() + ")";

    // For default all X Series is date
    type_xserie = 'datetime';
    type_query = 'group_date';

    // Pone el nombre del fichero para exportar
    filename = typeGraph + "_" + fromdate.getFullYear() + fromdate.getMonth() + fromdate.getDate() +"_" + host;
    filename.toUpperCase()

    // Put the title of graphic
    title = $.t('graph.' + typeGraph + '.title');
    
    // Put every options for each type graph
    switch( typeGraph ) {
        case 'hmc_1':
            axis_title = $.t('graph.common.processors');
            if( typeData == 'sample' ) {
                char_type = 'line';
                series[0] = {};     series[0].name = $.t('graph.hmc_1.serie_1');
                series[1] = {};     series[1].name = $.t('graph.hmc_1.serie_2');
                                    series[1].type = 'area';
            }
            else {
                char_type = 'line';
                series[0] = {};     series[0].name = $.t('graph.hmc_1.serie_1');
                series[1] = {};     series[1].name = $.t('graph.hmc_1.serie_avg_2');
                series[2] = {};     series[2].name = $.t('graph.hmc_1.serie_avg_3');
                                    series[2].type = 'area';
            }
            break;

        case 'hmc_2':
        case 'hmc_3':
        case 'hmc_8':
            axis_title = $.t('graph.common.processors');
            type_query = 'group_date_data';
            char_type = 'area';
    	    break;

        case 'hmc_4':
        case 'hmc_6':
        case 'hmc_7':
            type_query = 'pie';
            char_type = 'pie';
            series[0] = $.t('graph.common.less_10');
            series[1] = $.t('graph.common.between_10_20');
            series[2] = $.t('graph.common.between_20_30');
            series[3] = $.t('graph.common.between_30_40');
            series[4] = $.t('graph.common.between_40_50');
            series[5] = $.t('graph.common.between_50_70');
            series[6] = $.t('graph.common.between_60_70');
            series[7] = $.t('graph.common.between_70_80');
            series[8] = $.t('graph.common.between_80_90');
            series[9] = $.t('graph.common.between_90_95');
            series[10] = $.t('graph.common.higher_95');
            type_xserie = 'linear';
            break;

        case 'hmc_5':
            char_type = 'line';
            axis_title = $.t('graph.common.processors');
            series[0] = {};     series[0].name = $.t('graph.common.min');
            series[1] = {};     series[1].name = $.t('graph.common.avg');
            series[2] = {};     series[2].name = $.t('graph.common.max');
            series[3] = {};     series[3].name = $.t('graph.common.assigned');
            series[4] = {};     series[4].name = $.t('graph.common.installed');
            type_xserie = 'linear';
            break;

        case 'hmc_9':
            type_query = 'group_stacked';
            char_type = 'column';
            axis_title = $.t('graph.common.processors');
            break;

        case 'hmc_avg_all':
            type_query = 'group_nodate_data';
            char_type = 'column';
            type_xserie = 'linear';
            axis_title = $.t('graph.common.cpu%');
    	    break;

        case 'hmc_max_all':
            type_query = 'group_nodate_data';
            char_type = 'column';
            type_xserie = 'linear';
            axis_title = $.t('graph.common.cpu%');
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
        tooltip:	  '%A, %b %e, %Y',
        filename:     filename
    };

    // If samples, change the tooltip
    if( typeData == 'sample' ) {
        options.tooltip = '%A, %b %e, %Y <b>%H:%M</b>';
    }

    // Convert dates
    var query_from = fromdate.getFullYear() + "-" + (fromdate.getMonth()+1) + "-" + fromdate.getDate() + " " +
                            fromdate.getHours() + ":" + fromdate.getMinutes() + ":" + fromdate.getSeconds();
    var query_to = todate.getFullYear() + "-" + (todate.getMonth()+1) + "-" + todate.getDate() + " " +
                            todate.getHours() + ":" + todate.getMinutes() + ":" + todate.getSeconds();
    var date_diff = todate - fromdate;
    if( (todate - fromdate) <= (24 * 3600 * 1000) ) {
        options.tickInterval = 3600 * 1000; // Una hora
    }

    // Call to JQuery for the type of chart
    switch( type_query ) {
        case 'group_date':
            $.getJSON('php/hmc_querys.php', {query:typeGraph,type:typeData,system:host,fromdate:query_from,todate:query_to},
                function(data){makeGraphJSON(options, data);});
            break;
        case 'group_date_data':
            $.getJSON('php/hmc_querys.php', {query:typeGraph,type:typeData,system:host,fromdate:query_from,todate:query_to},
                                function(data){makeGraphJSONGroup(options, data);});
            break
        case 'pie':
            $.getJSON('php/hmc_querys.php', {query:typeGraph,type:typeData,system:host,fromdate:query_from,todate:query_to},
                            function(data){makeGraphJSONColumnPie(options, data);});
            break;
        case 'group_nodate_data':
            $.getJSON('php/hmc_querys.php', {query:typeGraph,type:typeData,system:host,fromdate:query_from,todate:query_to},
                            function(data){makeGraphJSONGroupNoDate(options, data);});
        case 'group_stacked':
            $.getJSON('php/hmc_querys.php', {query:typeGraph,type:typeData,system:host,fromdate:query_from,todate:query_to},
                            function(data){makeGraphJSONColumnStackedINCREMENTAL(options, data);});
            break;
    }
}


