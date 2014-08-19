/*! NMONDB2WEB v2.0.0 nmonweb.js                                            */
/*! Purpose - Show NMON data in graphics from DB                            */
/*! Author - David L—pez                                                    */
/*! Disclaimer:  this provided "as is".                                     */
/*! License: GNU                                                            */
/*! Date - 28/02/14                                                         */

// Init the dialog defaults
// -----------------------------------------------------------------------------
function initOutputVM() {
    var cont = 0,
        newDiv = "";

    // Formed the left menu for select type of charts
    $("#menu_left").html("");
    for( var cont = 1; cont < 10; cont++ ) {
        newDiv = '<li class="ui-widget-content">' + $.t("menu_vm.tab"+cont) + "</li>";
        $("#menu_left").append(newDiv)
    }
    $("#menu_left li").bind("click", function() {
        showDataVM($(this).text());
        $(this).addClass("ui-selected").siblings().removeClass("ui-selected");
    });
    $('#menu_left li:first').addClass('ui-selected');

    // Create Toolbar
    createToolbarVM();
}

// Init the dialog defaults
// -----------------------------------------------------------------------------
function prepareOutputVM() {
    var cont = 0,
        newDiv = "";

    // Generate the accordion for VM machines
    $("#output").show();

    // Refresh then 
    refreshParametersVM();
    // Get the current selection from left menu
    var index = $('#menu_left .ui-selected').map(function() {
        return $(this).text();
    });
    showDataVM( index[0] );
}

// Refresh table parameters
// -----------------------------------------------------------------------------
function refreshParametersVM() {
    var thead = "";
    var values = "";
    
    // Formed head of table
    thead = "<thead><tr class='ui-widget-header'>";
    thead += "<th>VM Machine</th>";
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

// Create Toolbar VM
// -----------------------------------------------------------------------------
function createToolbarVM() {

    // Empty toolbar previous
    $("#toolbar").empty();

    // Create button for change options
    $("#toolbar").append('<button id="change_opts">' + $.t("toolbar_vm.options") + '</button>');
    $( "#change_opts" ).button().click( function() { changeOptionsVM(); } );

    // Create button for navigate for previous days/weeks
    $("#toolbar").append('<button id="prev_week"> ' + $.t("toolbar_vm.prev_week") + '</button>');
    $("#prev_week" ).button(
        {   text: false,
            icons: {
                primary: "ui-icon-seek-start"
            }
        }).click( function() { changeDateVM(-7); } );
    $("#toolbar").append('<button id="prev_day">' + $.t("toolbar_vm.prev_day") + '</button>');
    $("#prev_day" ).button(
        {   text: false,
            icons: {
                primary: "ui-icon-seek-prev"
            }
        }).click( function() { changeDateVM(-1); } );
    
    // Create button for navigate for next days/weeks
    $("#toolbar").append('<button id="next_day">' + $.t("toolbar_vm.next_day") + '</button>');
    $( "#next_day" ).button(
        {   text: false,
            icons: {
                primary: "ui-icon-seek-next"
            }
        }).click( function() { changeDateVM(1); } );
    $("#toolbar").append('<button id="next_week"> ' + $.t("toolbar_vm.next_week") + '</button>');
    $("#next_week" ).button(
        {   text: false,
            icons: {
                primary: "ui-icon-seek-end"
            }
        }).click( function() { changeDateVM(7); } );
}

// Init the dialog defaults
// -----------------------------------------------------------------------------
function changeOptionsVM() {
    // Init the dialog after load all components of windows
    initDialogVMPost("VM");

    // Change the selection of the button
    $("#dialog-vm").dialog("open");   
}

// Change from toolbar the value
// -----------------------------------------------------------------------------
function changeDateVM( variation ) {
    // Change the begin and end date
    begin_date.setDate( begin_date.getDate() + variation );
    end_date.setDate( end_date.getDate() + variation );

    // Change the show parameters
    refreshParametersVM();
    
    // Get the current selection from left menu
    var index = $('#menu_left .ui-selected').map(function() {
        return $(this).text();
    });
    showDataVM( index[0] );
}

// Show Data
// -----------------------------------------------------------------------------
function showDataVM( selectTab ) {
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
        case $.t("menu_vm.tab1"):
            makeGraphVM("cpu_1", select_type, selected_element, selected_element, begin_date, end_date, 'graphic1');
            makeGraphVM("cpu_10", select_type, selected_element, selected_element, begin_date, end_date, 'graphic2');
            makeGraphVM("cpu_2", select_type, selected_element, selected_element, begin_date, end_date, 'graphic3');
            makeGraphVM("cpu_3", select_type, selected_element, selected_element, begin_date, end_date, 'graphic4');
            makeGraphVM("cpu_5", select_type, selected_element, selected_element, begin_date, end_date, 'graphic5');
            makeGraphVM("cpu_12", select_type, selected_element, selected_element, begin_date, end_date, 'graphic6');
            break;
        case $.t("menu_vm.tab2"):
            makeGraphVM("cpu_4", select_type, selected_element, selected_element, begin_date, end_date, 'graphic1');
            makeGraphVM("cpu_9", select_type, selected_element, selected_element, begin_date, end_date, 'graphic2');
            makeGraphVM("cpu_6", select_type, selected_element, selected_element, begin_date, end_date, 'graphic3');
            makeGraphVM("cpu_7", select_type, selected_element, selected_element, begin_date, end_date, 'graphic4');
            makeGraphVM("cpu_8", select_type, selected_element, selected_element, begin_date, end_date, 'graphic5');
            break;
        case $.t("menu_vm.tab3"):
            makeGraphVM("mem_1", select_type, selected_element, selected_element, begin_date, end_date, 'graphic1');
            makeGraphVM("mem_5", select_type, selected_element, selected_element, begin_date, end_date, 'graphic2');
            makeGraphVM("mem_2", select_type, selected_element, selected_element, begin_date, end_date, 'graphic3');
            makeGraphVM("mem_3", select_type, selected_element, selected_element, begin_date, end_date, 'graphic4');
            makeGraphVM("mem_4", select_type, selected_element, selected_element, begin_date, end_date, 'graphic5');
            makeGraphVM("mem_6", select_type, selected_element, selected_element, begin_date, end_date, 'graphic6');
            break;
        case $.t("menu_vm.tab4"):
            makeGraphVM("proc_1", select_type, selected_element, selected_element, begin_date, end_date, 'graphic1');
            makeGraphVM("proc_2", select_type, selected_element, selected_element, begin_date, end_date, 'graphic2');
            makeGraphVM("proc_3", select_type, selected_element, selected_element, begin_date, end_date, 'graphic3');
            makeGraphVM("proc_4", select_type, selected_element, selected_element, begin_date, end_date, 'graphic4');
            break;
        case $.t("menu_vm.tab5"):
            makeGraphVM("page_1", select_type, selected_element, selected_element, begin_date, end_date, 'graphic1');
            makeGraphVM("page_2", select_type, selected_element, selected_element, begin_date, end_date, 'graphic2');
            makeGraphVM("page_3", select_type, selected_element, selected_element, begin_date, end_date, 'graphic3');
            makeGraphVM("page_5", select_type, selected_element, selected_element, begin_date, end_date, 'graphic4');
            makeGraphVM("page_4", select_type, selected_element, selected_element, begin_date, end_date, 'graphic5');
            break;
        case $.t("menu_vm.tab6"):
            makeGraphVM("file_1", select_type, selected_element, selected_element, begin_date, end_date, 'graphic1');
            makeGraphVM("file_2", select_type, selected_element, selected_element, begin_date, end_date, 'graphic2');
            break;
        case $.t("menu_vm.tab7"):
            makeGraphVM("fc_1", select_type, selected_element, selected_element, begin_date, end_date, 'graphic1');
            makeGraphVM("fc_4", select_type, selected_element, selected_element, begin_date, end_date, 'graphic2');
            makeGraphVM("fc_2", select_type, selected_element, selected_element, begin_date, end_date, 'graphic3');
            makeGraphVM("fc_5", select_type, selected_element, selected_element, begin_date, end_date, 'graphic4');
            makeGraphVM("fc_3", select_type, selected_element, selected_element, begin_date, end_date, 'graphic5');
            break;
        case $.t("menu_vm.tab8"):
            makeGraphVM("net_5", select_type, selected_element, selected_element, begin_date, end_date, 'graphic1');
            makeGraphVM("net_1", select_type, selected_element, selected_element, begin_date, end_date, 'graphic2');
            makeGraphVM("net_2", select_type, selected_element, selected_element, begin_date, end_date, 'graphic3');
            makeGraphVM("net_3", select_type, selected_element, selected_element, begin_date, end_date, 'graphic4');
            makeGraphVM("net_4", select_type, selected_element, selected_element, begin_date, end_date, 'graphic5');
            makeGraphVM("net_6", select_type, selected_element, selected_element, begin_date, end_date, 'graphic6');
            makeGraphVM("net_7", select_type, selected_element, selected_element, begin_date, end_date, 'graphic7');
            break;
        case $.t("menu_vm.tab9"):
            makeGraphVM("wlm_1", select_type, selected_element, selected_element, begin_date, end_date, 'graphic1');
            makeGraphVM("wlm_2", select_type, selected_element, selected_element, begin_date, end_date, 'graphic2');
            makeGraphVM("wlm_3", select_type, selected_element, selected_element, begin_date, end_date, 'graphic3');
            break;
    }    
}

// Put options for graph before get the data, and select the type of method
// for get data in database
// -----------------------------------------------------------------------------
function makeGraphVM( typeGraph, typeData, host, desc, fromdate, todate, container ) {
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

    // Pone el nombre del fichero para exportar
    filename = typeGraph + "_" + fromdate.getFullYear() + fromdate.getMonth() + fromdate.getDate() +"_" + host;
    filename.toUpperCase()

    // Put every options for each type graph
    switch( typeGraph ) {
        // Physical CPU vs Entitled
        case 'cpu_1':
            char_type = 'line';
            title = $.t('graph.cpu_1.title');
            axis_title = $.t('graph.common.processors');
            if( typeData == 'sample' ) {
                series[0] = {};     series[0].name = $.t('graph.cpu_1.serie_sample_1');
                series[1] = {};     series[1].name = $.t('graph.cpu_1.serie_sample_2');
                series[2] = {};     series[2].name = $.t('graph.cpu_1.serie_sample_3');
            }
            else {
                series[0] = {};     series[0].name = $.t('graph.cpu_1.serie_avg_1');
                series[1] = {};     series[1].name = $.t('graph.cpu_1.serie_avg_2');
                series[2] = {};     series[2].name = $.t('graph.cpu_1.serie_avg_3');
                series[3] = {};     series[3].name = $.t('graph.cpu_1.serie_avg_4');
            }
            break;
        // CPU% vs VPs
        case 'cpu_2':
            char_type = 'area';
            title = $.t('graph.cpu_2.title');
            axis_title = $.t('graph.common.cpu%');
            series[0] = {};     series[0].name = $.t('graph.cpu_2.serie_1');
            series[1] = {};     series[1].name = $.t('graph.cpu_2.serie_2');
            series[2] = {};     series[2].name = $.t('graph.cpu_2.serie_3');
            if( typeData != 'sample' ) {
                series[3] = {};     series[3].name = $.t('graph.cpu_2.serie_4');
                                    series[3].type = 'line';
            }
            break;
        // Total CPU
        case 'cpu_10':
            char_type = 'area';
            title = $.t('graph.cpu_10.title');
            axis_title = $.t('graph.common.cpu%');
            series[0] = {};     series[0].name = $.t('graph.cpu_10.serie_1');
            series[1] = {};     series[1].name = $.t('graph.cpu_10.serie_2');
            series[2] = {};     series[2].name = $.t('graph.cpu_10.serie_3');
            if( typeData != 'sample' ) {
                series[3] = {};     series[3].name = $.t('graph.cpu_10.serie_4');
                                    series[3].type = 'line';
            }
            break;
        // Shared Pool Utilisation
        case 'cpu_3':
            char_type = 'area';
            title = $.t('graph.cpu_3.title');;
            axis_title = $.t('graph.common.processors');
            series[0] = {};     series[0].name = $.t('graph.cpu_3.serie_1');
            series[1] = {};     series[1].name = $.t('graph.cpu_3.serie_2');
            series[2] = {};     series[2].name = $.t('graph.cpu_3.serie_3');
            break;
        // CPU by Thread 
        case 'cpu_5':
            type_group = 'group';
            char_type = 'line';
            title = $.t('graph.cpu_5.title');;
            axis_title = $.t('graph.common.cpu%');
            break;

        // CPU Utilisation for hours
        case 'cpu_4':
            char_type = 'line';
            title = $.t('graph.cpu_4.title');
            axis_title = $.t('graph.common.processors');
            series[0] = {};     series[0].name = $.t('graph.common.max');
            series[1] = {};     series[1].name = $.t('graph.common.avg');
            series[2] = {};     series[2].name = $.t('graph.common.min');
            series[3] = {};     series[3].name = $.t('graph.common.entitled');
            type_xserie = 'linear';
            break;

        // CPU Utilisation Grouped
        case 'cpu_6':
        case 'cpu_7':
        case 'cpu_8':
            char_type = 'pie';
            title = $.t('graph.' + typeGraph + '.title');
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

        // CPU Utilisation for weekdays
        case 'cpu_9':
            char_type = 'bar';
            title = $.t('graph.cpu_9.title');
            axis_title = $.t('graph.common.processors');
            series[0] = {};     series[0].name = $.t('graph.common.max');
            series[1] = {};     series[1].name = $.t('graph.common.avg');
            series[2] = {};     series[2].name = $.t('graph.common.min');
            break;

        // CPU By Thread Stacked
        case 'cpu_12':
            type_query = 'group_stacked';
            char_type = 'column';
            title = $.t('graph.cpu_12.title');;
            axis_title = $.t('graph.common.cpu%');
            break;

        // Memory without FS Cache
        case 'mem_1':
            title = $.t('graph.mem_1.title');
            axis_title = $.t('graph.common.memory');
            if( typeData == 'sample' ) {
                char_type = 'area';
                series[0] = {};     series[0].name = $.t('graph.mem_1.serie_1');
                series[1] = {};     series[1].name = $.t('graph.mem_1.serie_2');
                series[2] = {};     series[2].name = $.t('graph.mem_1.serie_3');
                                    series[2].type = 'line';
            }
            else {
                char_type = 'line';
                series[0] = {};     series[0].name = $.t('graph.common.avg');;
                                    series[0].type = 'area';
                series[1] = {};     series[1].name = $.t('graph.common.max');
                series[2] = {};     series[2].name = $.t('graph.mem_1.serie_3');
                                    series[2].type = 'line';
            }
            break;

        case 'mem_2':
            title = $.t('graph.mem_2.title');
            axis_title = $.t('graph.common.memory');
            char_type = 'area';
            series[0] = {};     series[0].name = $.t('graph.mem_2.serie_1');
            series[1] = {};     series[1].name = $.t('graph.mem_2.serie_2');
                                series[1].type = 'line';
            break;

        case 'mem_3':
            title = $.t('graph.mem_3.title');
            axis_title = $.t('graph.common.memory%');
            char_type = 'area';
            series[0] = {};     series[0].name = $.t('graph.mem_3.serie_1');
            series[1] = {};     series[1].name = $.t('graph.mem_3.serie_2');
            series[2] = {};     series[2].name = $.t('graph.mem_3.serie_3');
            series[3] = {};     series[3].name = $.t('graph.mem_3.serie_4');
                                series[3].type = 'line'; series[3].stacking = null; 
            series[4] = {};     series[4].name = $.t('graph.mem_3.serie_5');
                                series[4].type = 'line'; series[4].stacking = null;
            break;

        case 'mem_4':
            title = $.t('graph.mem_4.title');
            axis_title = $.t('graph.common.memory%');
            if( typeData == 'sample' ) {
                char_type = 'area';
                series[0] = {};     series[0].name = $.t('graph.mem_4.serie_1');
                series[1] = {};     series[1].name = $.t('graph.mem_4.serie_2');
            }
            else {
                char_type = 'line';
                series[0] = {};     series[0].name = $.t('graph.mem_4.serie_1');
                                    series[0].type = 'area';
                series[1] = {};     series[1].name = $.t('graph.mem_4.serie_2');
                                    series[1].type = 'area';
                series[2] = {};     series[2].name = $.t('graph.mem_4.serie_3');
                                    series[2].type = 'line';
            }
            break;

        case 'mem_5':
            title = $.t('graph.mem_5.title');
            axis_title = $.t('graph.common.memory_mb');
            char_type = 'area';
            series[0] = {};     series[0].name = $.t('graph.mem_2.serie_1');
            series[1] = {};     series[1].name = $.t('graph.mem_2.serie_2');
                                series[1].type = 'line';
            break;

        case 'mem_6':
            title = $.t('graph.mem_6.title');
            axis_title = $.t('graph.common.memory%');
            char_type = 'line';
            series[0] = {};     series[0].name = $.t('graph.mem_6.serie_1');
            series[1] = {};     series[1].name = $.t('graph.mem_6.serie_2');
            series[2] = {};     series[2].name = $.t('graph.mem_6.serie_3');
            series[3] = {};     series[3].name = $.t('graph.mem_6.serie_4');
            break;

        case 'proc_1':
            char_type = 'area';
            title = $.t('graph.proc_1.title');
            axis_title = $.t('graph.proc_1.axis');
            series[0] = {};     series[0].name = $.t('graph.proc_1.serie_1');
            series[1] = {};     series[1].name = $.t('graph.proc_1.serie_2');
            if( typeData != 'sample' ) {
                series[2] = {};     series[2].name = $.t('graph.proc_1.serie_3');
                                    series[2].type = 'line'; series[2].stacking = null;
                series[3] = {};     series[3].name = $.t('graph.proc_1.serie_4');
                                    series[3].type = 'line'; series[3].stacking = null;
            }
            break;

        case 'proc_2':
            char_type = 'area';
            title = $.t('graph.proc_2.title');
            axis_title = $.t('graph.proc_2.axis');
            series[0] = {};     series[0].name = $.t('graph.proc_2.serie_1');
            series[1] = {};     series[1].name = $.t('graph.proc_2.serie_2');
            if( typeData != 'sample' ) {
                series[2] = {};     series[2].name = $.t('graph.proc_2.serie_3');
                                    series[2].type = 'line';
                series[3] = {};     series[3].name = $.t('graph.proc_2.serie_4');
                                    series[3].type = 'line';
            }
            break;

        case 'proc_3':
            char_type = 'area';
            title = $.t('graph.proc_3.title');
            axis_title = $.t('graph.proc_3.axis');
            series[0] = {};     series[0].name = $.t('graph.proc_3.serie_1');
            series[1] = {};     series[1].name = $.t('graph.proc_3.serie_2');
            if( typeData != 'sample' ) {
                series[2] = {};     series[2].name = $.t('graph.proc_3.serie_3');
                                    series[2].type = 'line';
                series[3] = {};     series[3].name = $.t('graph.proc_3.serie_4');
                                    series[3].type = 'line';
            }
            break;

        case 'proc_4':
            char_type = 'area';
            title = $.t('graph.proc_4.title');
            axis_title = $.t('graph.proc_4.axis');
            series[0] = {};     series[0].name = $.t('graph.proc_4.serie_1');
            series[1] = {};     series[1].name = $.t('graph.proc_4.serie_2');
            if( typeData != 'sample' ) {
                series[2] = {};     series[2].name = $.t('graph.proc_4.serie_3');
                                    series[2].type = 'line';
                series[3] = {};     series[3].name = $.t('graph.proc_4.serie_4');
                                    series[3].type = 'line';
            }
            break;

        case 'page_1':
            char_type = 'line';
            title = $.t('graph.page_1.title');
            axis_title = $.t('graph.common.numpages');
            series[0] = {};     series[0].name = $.t('graph.page_1.serie_1');
            if( typeData != 'sample' ) {
                series[1] = {};     series[1].name = $.t('graph.page_1.serie_2');
                series[2] = {};     series[2].name = $.t('graph.page_1.serie_3');
            }
            break;

        case 'page_2':
            char_type = 'line';
            title = $.t('graph.page_2.title');
            axis_title = $.t('graph.common.numpages');
            series[0] = {};     series[0].name = $.t('graph.page_2.serie_1');
            series[1] = {};     series[1].name = $.t('graph.page_2.serie_2');
            if( typeData != 'sample' ) {
                series[2] = {};     series[2].name = $.t('graph.page_2.serie_3');
                                    series[2].type = 'line';    series[2].stacking = null;
                series[3] = {};     series[3].name = $.t('graph.page_2.serie_4');
                                    series[3].type = 'line';    series[3].stacking = null;
            }
            break;

        case 'page_3':
            char_type = 'line';
            title = $.t('graph.page_3.title');
            axis_title = $.t('graph.common.numpages');
            series[0] = {};     series[0].name = $.t('graph.page_3.serie_1');
            series[1] = {};     series[1].name = $.t('graph.page_3.serie_2');
            if( typeData != 'sample' ) {
                series[2] = {};     series[2].name = $.t('graph.page_3.serie_3');
                                    series[2].type = 'line'; series[2].stacking = null;
                series[3] = {};     series[3].name = $.t('graph.page_3.serie_4');
                                    series[3].type = 'line'; series[3].stacking = null;
            }
            break;

        case 'page_4':
            char_type = 'line';
            title = $.t('graph.page_4.title');
            axis_title = $.t('graph.common.numpages');
            series[0] = {};     series[0].name = $.t('graph.page_4.serie_1');
            series[1] = {};     series[1].name = $.t('graph.page_4.serie_2');
            if( typeData != 'sample' ) {
                series[2] = {};     series[2].name = $.t('graph.page_4.serie_3');
                                    series[2].type = 'line';
                series[3] = {};     series[3].name = $.t('graph.page_4.serie_4');
                                    series[3].type = 'line';
            }
            break;

        case 'page_5':
            char_type = 'line';
            title = $.t('graph.page_5.title');
            axis_title = $.t('graph.common.numpages');
            series[0] = {};     series[0].name = $.t('graph.page_5.serie_1');
            series[1] = {};     series[1].name = $.t('graph.page_5.serie_2');
            if( typeData != 'sample' ) {
                series[2] = {};     series[2].name = $.t('graph.page_5.serie_3');
                                    series[2].type = 'line';
                series[3] = {};     series[3].name = $.t('graph.page_5.serie_4');
                                    series[3].type = 'line';
            }
            break;

        case 'file_1':
            char_type = 'line';
            title = $.t('graph.file_1.title');
            axis_title = $.t('graph.file_1.axis');
            series[0] = {};     series[0].name = $.t('graph.file_1.serie_1');
            series[1] = {};     series[1].name = $.t('graph.file_1.serie_2');
            if( typeData != 'sample' ) {
                series[2] = {};     series[2].name = $.t('graph.file_1.serie_3');
                series[3] = {};     series[3].name = $.t('graph.file_1.serie_4');
            }
            break;

        case 'file_2':
            char_type = 'line';
            title = $.t('graph.file_2.title');
            axis_title = $.t('graph.file_2.axis');
            series[0] = {};     series[0].name = $.t('graph.file_2.serie_1');
            series[1] = {};     series[1].name = $.t('graph.file_2.serie_2');
            series[2] = {};     series[2].name = $.t('graph.file_2.serie_3');
            if( typeData != 'sample' ) {
                series[3] = {};     series[3].name = $.t('graph.file_2.serie_4');
                series[4] = {};     series[4].name = $.t('graph.file_2.serie_5');
                series[5] = {};     series[5].name = $.t('graph.file_2.serie_6');
            }
            break;

        case 'fc_1':
        case 'fc_2':
        case 'fc_3':
            type_group = 'group';
            char_type = 'line';
            axis_title = $.t('graph.common.kb_s');
            title = $.t('graph.' + typeGraph + '.title');
            break;

        case 'fc_4':
        case 'fc_5':
            type_query = 'group_stacked_minmaxavg';
            char_type = 'column';
            title = $.t('graph.' + typeGraph + '.title');;
            axis_title = $.t('graph.common.kb_s');
            break;

        case 'net_1':
        case 'net_2':
        case 'net_3':
        case 'net_4':
            type_group = 'group';
            char_type = 'line';
            axis_title = $.t('graph.common.kb_s');
            title = $.t('graph.' + typeGraph + '.title');
            break;

        case 'net_5':
            char_type = 'area';
            axis_title = $.t('graph.common.kb_s');
            title = $.t('graph.net_5.title');
            series[0] = {};     series[0].name = $.t('graph.net_5.serie_1');
            series[1] = {};     series[1].name = $.t('graph.net_5.serie_2');
            break;

        case 'net_6':
        case 'net_7':
            char_type = 'line';
            title = $.t('graph.' + typeGraph + '.title');
            axis_title = $.t('graph.' + typeGraph + '.axis');
            series[0] = {};     series[0].name = $.t('graph.' + typeGraph + '.serie_1');
            series[1] = {};     series[1].name = $.t('graph.' + typeGraph + '.serie_2');
            if ( typeGraph == 'net_7' ) {
                series[2] = {};     series[2].name = $.t('graph.' + typeGraph + '.serie_3');
            }
            break;

        case 'wlm_1':
        case 'wlm_2':
        case 'wlm_3':
            type_group = 'group';
            char_type = 'area';
            axis_title = '%';
            title = $.t('graph.' + typeGraph + '.title');
            break;

        case 'tend_1':
            char_type = 'line';
            title = $.t('graph.tend_1.title');
            axis_title = $.t('graph.common.processors');
            series[0] = {};     series[0].name = $.t('graph.common.avg');
            series[1] = {};     series[1].name = $.t('graph.common.max');
            type_xserie = 'linear';
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
    switch( char_type ) {
        case 'bar':
            $.getJSON('php/querys_db.php', {query:typeGraph,type:typeData,host:host,fromdate:query_from,todate:query_to},
                        function(data){makeGraphJSONBar(options, data);});              
            break;
        case 'column':
        case 'pie':
            switch( type_query ) {
                case 'group_nodate_data':
                    $.getJSON('php/querys_db.php', {query:typeGraph,type:typeData,host:host,fromdate:query_from,todate:query_to},
                                    function(data){makeGraphJSONGroupNoDate(options, data);});
                    break;
                case 'group_stacked':
                    $.getJSON('php/querys_db.php', {query:typeGraph,type:typeData,host:host,fromdate:query_from,todate:query_to},
                                    function(data){makeGraphJSONColumnStacked(options, data);});
                    break;
                case 'group_stacked_minmaxavg':
                    $.getJSON('php/querys_db.php', {query:typeGraph,type:typeData,host:host,fromdate:query_from,todate:query_to},
                            function(data){makeGraphJSONColumnStackedINCREMENTAL(options, data);});
                    break;                    
                default:                    
                    $.getJSON('php/querys_db.php', {query:typeGraph,type:typeData,host:host,fromdate:query_from,todate:query_to},
                                    function(data){makeGraphJSONColumnPie(options, data);});
                }
            break;
        default:
            if( type_group == 'individual' ) {
                $.getJSON('php/querys_db.php', {query:typeGraph,type:typeData,host:host,fromdate:query_from,todate:query_to},
                    function(data){makeGraphJSON(options, data);});
            }
            else {
                $.getJSON('php/querys_db.php', {query:typeGraph,type:typeData,host:host,fromdate:query_from,todate:query_to},
                    function(data){makeGraphJSONGroup(options, data, false);});
            }
    }
}


