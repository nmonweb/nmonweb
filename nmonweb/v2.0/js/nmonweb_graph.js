/*! NMONDB2WEB v1.2.0 graphics.js                                           */
/*! Funcion: - Functions for make graphs                                    */
/*! Purpose - Show NMON data in graphics from DB                            */
/*! Author - David López                                                    */
/*! Disclaimer:  this provided "as is".                                     */
/*! License: GNU                                                            */
/*! Date - 08/05/14                                                         */

// Global Variables
// -----------------------------------------------------------------------------

// Graphics defaults 
// -----------------------------------------------------------------------------
function initGraphDefault() {
    Highcharts.setOptions({
//        global: {	useUTC: false },
        credits: {	enabled: false },
        plotOptions: 
                        {	area: { marker: { enabled: false }, stacking: 'normal', connectNulls: false },
                            line: { marker: { enabled: false } } },
        area:  {	zoomType: 'x' },
        line:  {	zoomType: 'x' },	
        legend: {   align: 'center', verticalAlign: 'bottom' },
        tooltip: {  shared: true, crosshairs: true },
        colors: [
                '#2f7ed8','#0d233a','#8bbc21','#910000','#1aadce','#492970',
                '#f28f43','#77a1e5','#c42525','#a6c96a','#E5E4E2','#BCC6CC',
                '#98AFC7',"#E5E4E2","#BCC6CC","#98AFC7","#6D7B8D","#657383",
                "#616D7E","#646D7E","#566D7E","#737CA1","#4863A0","#2B547E",
                "#2B3856","#151B54","#000080","#342D7E","#15317E","#151B8D",
                "#0000A0","#0020C2","#0041C2","#2554C7","#1569C7","#2B60DE",
                "#1F45FC","#6960EC","#736AFF","#357EC7","#488AC7","#3090C7",
                "#659EC7","#87AFC7","#95B9C7","#728FCE","#2B65EC","#306EFF",
                "#157DEC","#1589FF","#6495ED"
             ]
    });

    var aux = $.t('graph.config.months');
    var months = aux.split(',');
    aux = $.t('graph.config.shortMonths');
    var shortMonts = aux.split(',');
    aux = $.t('graph.config.weekdays');
    var weekdays = aux.split(',');
    aux = $.t('graph.config.numericSymbols');
    var numericSymbols = aux.split(',');

    Highcharts.setOptions({
        lang: {
            loading: $.t('graph.config.loading'),
            months: months,
            weekdays: weekdays,
            shortMonths: shortMonts,
            numericSymbols: numericSymbols,
            thousandsSep: $.t('graph.config.thousandsSep'),  
            decimalPoint: $.t('graph.config.decimalPoint'),
            resetZoom: $.t('graph.config.resetZoom'),
            resetZoomTitle: $.t('graph.config.resetZoomTitle')
        }
    });
}

function makeGraphPower( typeGraph, id_power, desc, fromdate, todate, container ) {
    var     char_type,
            title,
            subtitle,
            axis_title,
            series = [],
            type_xserie,
            type_select;

    // For all charts, put the subtitle
    subtitle = desc + " (" + fromdate.toLocaleDateString() + " - " + todate.toLocaleDateString() + ")";

    // For default all X Series is date
    type_xserie = 'datetime';

    // Make type type of selected data
    if( id_power == "999" )
        type_select = typeGraph + "_ALL";
    else
        type_select = typeGraph;

    // Put every options for each type graph
    title = $.t('graph.cpu_all.title');
    axis_title = $.t('graph.common.processors');
    switch( type_select ) {
        case 'cpu_all':
            char_type = 'area';
    	    break;
        case 'cpu_all_ALL':
            char_type = 'line';
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
        filename:     "POWER_" + desc
    };

    // Convert dates
    var query_from = fromdate.getFullYear() + "-" + (fromdate.getMonth()+1) + "-" + fromdate.getDate() + " " +
                            fromdate.getHours() + ":" + fromdate.getMinutes() + ":" + fromdate.getSeconds();
    var query_to = todate.getFullYear() + "-" + (todate.getMonth()+1) + "-" + todate.getDate() + " " +
                            todate.getHours() + ":" + todate.getMinutes() + ":" + todate.getSeconds();

    $.getJSON('php/querys_power.php', {query:type_select,id_power:id_power,fromdate:query_from,todate:query_to},
                        function(data){makeGraphJSONGroup(options, data, false);});
}

function makeGraphJSON(opt_graph, data) {
    var     data_graph = {};
    var     categories = [];
    var     reference,
            dateAux;
    var     minValue = 0;
    
    // If no data, show text 
    if( data == null || typeof data[0] == 'undefined' ) {
        //$('#' + opt_graph.container).append( '<h1>No hay datos</h1>' );
        return;
    }
    
    // For each field of data, make new Array in data_graph Map
    for(key in data[0]) {
        if( key != 'date' ) data_graph[key] = new Array;
    }	

    // Transform data
    $.each(data,function(index,value) {
        // If X Series type is not datetime, reference is the first field
        if( opt_graph.type_xserie == 'linear' ) {
            reference = value.date;
            categories[index] = reference;
        }
        // but if is 'datetime', convert reference in miliseconds
        else {
            var match = value.date.match(/^(\d{4})-(\d{1,2})-(\d{1,2}) (\d{1,2}):(\d{1,2}):(\d{1,2})$/);
            if (match) {
                reference = Date.UTC(+match[1], match[2]-1, +match[3], +match[4], +match[5], +match[6]);
            }
            else {
                match = value.date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
                if (match) {
                    reference = Date.UTC(+match[1], match[2]-1, +match[3]);
                }
                else {
                    return;
                }                    
            }
        }

        // For each field with data, map the correct value in date correct
        jQuery.each(value, function(field_name, field_value) {
            if( field_name != 'date' ) {
                var valor = parseFloat(field_value).toFixed(2);
                data_graph[field_name].push( [reference, parseFloat(valor) ] );
                if ( valor < minValue ) { minValue = parseFloat(valor); }
            }
        });
    });
    
    // define the options
    var options = {
        chart: {    type:     opt_graph.chart_type, 
                    renderTo: opt_graph.container,
                    zoomType: 'x'	},
        title:      {   text: opt_graph.title },
        subtitle:   {	text: opt_graph.subtitle },
        credits:    {   enabled: false },
        series:     opt_graph.series,
        xAxis:      {   type: 'datetime',
                        tickWidth: 0,
                        tickInterval: opt_graph.tickInterval,
                        labels: { rotation: 0 },
                        gridLineWidth: 1 },
        yAxis: [    { 	title: {
                            text: opt_graph.yAxis_title },
                        min: 0,
                        startOnTick: true }],
        plotOptions: {
            series: {
                stacking: 'normal'
            }
        },
        tooltip: {
                xDateFormat:	opt_graph.tooltip },
        exporting: {
                filename: opt_graph.filename
            }
    };

    // If the type is line, is not stacking
    if( opt_graph.chart_type == 'line' ){
        options.plotOptions.series.stacking = null;
    }


    // Only for area, if there are negative value stacking disabled and minimum is empty
    if ( opt_graph.chart_type == 'area' && minValue < 0 ) {
        options.plotOptions.series.stacking = null;
        options.yAxis[0].min = minValue;
    }

    if( opt_graph.type_xserie == 'linear' ) {
        options.xAxis.type = 'linear';
        options.xAxis.categories = categories;
    }
    if( opt_graph.tickInterval != null ) {
        options.xAxis.labels.rotation = 45;
    }
    
    // Charge in Chart values from DB
    var cont = 0;
    $.each(data_graph, function(index, value) {
        options.series[cont].data = value;
    	cont++;
    });

    // Make new chart
//    if( options.chart.type == 'pie' ) { options.exporting.width = 400; }
    var chart = new Highcharts.Chart(options);
}

function makeGraphJSONColumnPie(opt_graph, data) {
    var     data_graph = [];
    var     categories = [];
    var     cont;
    
    // If no data, show text 
    if( data == null || typeof data[0] == 'undefined' ) {
        //$('#' + opt_graph.container).append( '<h1>No hay datos</h1>' );
        return;
    }
    
    // Transform data
    cont = 0;
    jQuery.each(data[0], function(field_name, field_value) {
        // Don't use the index value (date, data1, data2, ....), only values
        var valor = parseInt(field_value);
        if( valor != 0 ) {
            if( opt_graph.chart_type == 'pie' ) {
                var  datos = [opt_graph.series[cont], valor];
                data_graph.push(datos);
            }
            else {
                data_graph.push(valor);
            }
        }
        cont++;
    });

    // define the options
    var options = {
        chart: {    type:     opt_graph.chart_type, 
                    renderTo: opt_graph.container },
        title:      {   text: opt_graph.title },
        subtitle:   {	text: opt_graph.subtitle },
        credits:    {   enabled: false },
        xAxis:      {   categories: opt_graph.series,
			type: 'linear',
			showFirstLabel: true,
                        tickInterval: opt_graph.tickInterval,
                        labels: { rotation: 0 },
			showLastLabel: true
		    },
        series:	[	{ data: data_graph } ],
        yAxis: [    { 	title: {
                            text: opt_graph.yAxis_title },
                        min: 0,
                        startOnTick: true }],
        legend: {   enabled: false },
        tooltip: {  enabled: false },
        exporting: {
                filename: opt_graph.filename
            }
    };
    if( opt_graph.tickInterval != null ) {
        options.xAxis.labels.rotation = 45;
    }

    // Make new chart
    var chart = new Highcharts.Chart(options);
}

function makeGraphJSONGroup(opt_graph, data, debug) {
    var     data_graph = {};
    var     categories = [];
    var     reference,
            dateAux;
    var     checkValues;
    var     minDate = -1,
            maxDate;
    
    // If no data, show text 
    if( data == null || typeof data[0] == 'undefined' ) {
        //$('#' + opt_graph.container).append( '<h1>No hay datos</h1>' );
        return;
    }

    // Transform data
    $.each(data,function(index,value) {
        // If X Series type is not datetime, reference is the first field
        if( opt_graph.type_xserie == 'linear' ) {
            reference = value.date;
            categories[index] = reference;
        }
        // but if is 'datetime', convert reference in miliseconds
        else {
            // First field is date and transform in Javascript date (only, no time)
            if( value.date.length > 10 ) {
                dateAux = new Date(value.date.substring(0,4), 
                                        value.date.substring(5,7)-1, 
                                                        value.date.substring(8,10),
                            value.date.substring(11, 13),
                                value.date.substring(14, 16),
                                    value.date.substring( 17, 19), 0 );
            }
            else {
                dateAux = new Date(value.date.substring(0,4), 
                            value.date.substring(5,7)-1, 
                                    value.date.substring(8,10), 0,0,0,0);
            }
            reference = Date.parse(dateAux);
            if( minDate == -1 ) {
                minDate = reference;
            }
        }

        // For each field with data, map the correct value in date correct
        jQuery.each(value, function(field_name, field_value) {
            if( field_name == 'date' ) return;
            // First check if exists in map the Group Concept (Power, CPU, LPAR, ...)
            if( !data_graph[field_name] ) {
                data_graph[field_name] = new Array;
            }
            if( field_value != null ) {
                var valor = parseFloat(field_value).toFixed(2);
                data_graph[field_name].push( [reference, parseFloat(valor)] );
            }
            else {
                data_graph[field_name].push( [reference, null] );
            }
        });
    });

    // Charge in Chart values from DB
    var cont = 0;
    $.each(data_graph, function(index, value) {
        var aux = value;
        checkValues = 0;
        jQuery.each(aux, function(field_name2, field_value2) {
            checkValues += parseFloat(field_value2[1]);
        } );
        if( checkValues != 0 ) {
            opt_graph.series[cont] = {};
            opt_graph.series[cont].name = index;
            opt_graph.series[cont].data = value;
            cont++;
        }
    });

    // Check if no data
    if( jQuery.isEmptyObject(opt_graph.series) ) {
        //$('#' + opt_graph.container).append( '<h1>No hay datos</h1>' );
        return;
    }

    // define the options
    var options = {
        chart: {    type:     opt_graph.chart_type, 
                    renderTo: opt_graph.container,
                    zoomType: 'x'	},
        title:      {   text: opt_graph.title },
        subtitle:   {	text: opt_graph.subtitle },
        credits:    {   enabled: false },
        series:     opt_graph.series,
        xAxis:      {   type: 'datetime' ,
                        min: minDate,
                        max:  maxDate,    
                        tickWidth: 0,
                        tickInterval: opt_graph.tickInterval,
                        labels: { rotation: 0 },
                        gridLineWidth: 1 },
        yAxis: [    { 	title: {
                            text: opt_graph.yAxis_title },
                        min: 0,
                        startOnTick: true }],
        tooltip: {
                xDateFormat:	opt_graph.tooltip },
        exporting: {
                filename: opt_graph.filename
            }
    };

    if( opt_graph.type_xserie == 'linear' ) {
        options.xAxis.type = 'linear';
        options.xAxis.categories = categories;
    }
    if( opt_graph.tickInterval != null ) {
        options.xAxis.labels.rotation = 45;
    }

    if( debug == true ) {
        $('#graphic_debug').append( '[');
        $.each(options.series, function(index, value) {
            if( index != 0 ) { $('#graphic5').append( ", " ); }
            $('#graphic_debug').append( "{ name: \"" + value.name + "\", <br>data: [");
            $('#graphic_debug').append( dump(value.data) );
            $('#graphic_debug').append( "]}" );
        });
        $('#graphic_debug').append( ']');
        $('#graphic_debug').show();
    }
    
    // Make new chart
//    if( options.chart.type == 'pie' ) { options.exporting.width = 400; }
    var chart = new Highcharts.Chart(options);
}

function makeGraphJSONBar(opt_graph, data) {
    var     data_graph = [];
    var     categories = [];
    var     series = [];
    var     cont;
    var     num_series;
    
    // If no data, show text 
    if( data == null || typeof data[0] == 'undefined' ) {
        //$('#' + opt_graph.container).append( '<h1>No hay datos</h1>' );
        return;
    }
    
    // First, create the series, with name of fields returns in the data
    num_series = 0;
    if ( undefined == opt_graph.series[0] ) {
        jQuery.each(data[0], function(field_name, field_value) {
            if( field_name != 'NAME' ) {
                series[num_series] = {};
                series[num_series].name = field_name;
                series[num_series].data = [];
                num_series++
            }
        });
    }
    else {
        jQuery.each(opt_graph.series, function(index, value) {
                series[num_series] = {};
                series[num_series].name = value.name;
                series[num_series].data = [];
                num_series++
        });
        
    }

    // For each line get from DB Query, ....
    $.each(data,function(index,value) {
        cont = 0;
        // Get all fields
        jQuery.each(value, function(field_name, field_value) {
            // The first field get the category
            if( field_name == 'NAME' ) {
                categories.push(field_value);
            }
            // Others fields, have the value of data for your corresponding serie
            else {
                var valor = parseFloat(field_value).toFixed(2);
                series[cont].data.push(parseFloat(valor));
                cont++;
            }
        });
    });
    
    // If one field named LINE, create a new serie of type line
    jQuery.each(series, function(field_name, field_value) {
        if( field_value.name == 'line' ) {
            field_value.type = 'line';
            field_value.name = 'Tendencia';
            cont++
        }
    });

    // define the options
    var options = {
        chart: {    type:     'column', 
                    renderTo: opt_graph.container },
        title:      {   text: opt_graph.title },
        subtitle:   {	text: opt_graph.subtitle },
        credits:    {   enabled: false },
        xAxis:      {   categories: categories,
                        title: { text: null },
                        showFirstLabel: true,
                        tickInterval: opt_graph.tickInterval,
                        labels: { rotation: 0 },
                        showLastLabel: true },
        yAxis: [    { 	title: {
                            text: opt_graph.yAxis_title } } ],
        tooltip: {  enabled: true },
        legend: {   align: 'center', verticalAlign: 'bottom' },
        series:	    series,
        exporting: {
                filename: opt_graph.filename
            }
    };

    if( opt_graph.tickInterval != null ) {
        options.xAxis.labels.rotation = 45;
    }

    //if( options.chart.type == 'pie' ) { options.exporting.width = 400; }
    var chart = new Highcharts.Chart(options);
}

function dump(arr) {
    var	nivel1;
    var nivel2;
    var field;
    var value;
    var salida = "";

    for( nivel1 in arr ) {
        nivel2 = arr[nivel1];
        if( nivel1 != 0 ) {
            salida += ", ";
        }
        salida += "[ ";
        for( field in nivel2 ) {
            value = nivel2[field];
            if( field != 0 ) {
                salida += ", ";
            }
            if( value == null ) {
                salida += "null";
            }
            else {
                salida += value;
            }
        }
        salida += " ]";
    }
    return salida;
}

function makeGraphJSONGroupNoDate(opt_graph, data) {
    var     data_graph = {};
    var     categories = [];
    var     reference,
            dateAux;
    var     checkValues;
    var     minDate = -1,
            maxDate;
    var     num_field = 0;
    
    // If no data, show text 
    if( data == null || typeof data[0] == 'undefined' ) {
        //$('#' + opt_graph.container).append( '<h1>No hay datos</h1>' );
        return;
    }

    // Transform data
    $.each(data,function(index,value) {
        num_field = 0;
        // For each field with data, map the correct value in date correct
        jQuery.each(value, function(field_name, field_value) {
            num_field++;
            switch( num_field ) {
                // The first field put the category
                case 1:
                    var pos = jQuery.inArray(field_value, categories);
                    if( pos < 0 ) {
                        categories.push(field_value); 
                    }
                    break;
                // The second field put the serie
                case 2:
                    reference = field_value;
                    if( !data_graph[field_value] ) {
                        data_graph[field_value] = new Array;
                    }
                    break;
                // The next value is the data
                case 3: 
                    // First check if exists in map the Group Concept (Power, CPU, LPAR, ...)
                    var valor = parseFloat(field_value).toFixed(2);
                    data_graph[reference].push( parseFloat(valor) );
                    break;
                // The next value is the order
                case 4:
                    data_graph[reference].orden = field_value;
                    break;
                default:
                    break;
            }
        });
    });

    //if( debug == true ) {
        $('#graphic_debug').append( '[');
        $.each(data_graph, function(index, value) {
            if( index != 0 ) { $('#graphic_debug').append( ", " ); }
            $('#graphic_debug').append( "{ name: \"" + value.name + "\", <br>data: [");
            $('#graphic_debug').append( dump(value.data) );
            $('#graphic_debug').append( "]}" );
        });
        $('#graphic_debug').append( ']');
        $('#graphic_debug').show();
    //}

    // Charge in Chart values from DB
    var cont = 0;
    var text = "";
    $.each(data_graph, function(index, value) {
        var aux = value;
        checkValues = 0;
        if ( undefined == opt_graph.series[cont] ) {
            opt_graph.series[cont] = {};
            opt_graph.series[cont].name = index;    
        }
        opt_graph.series[cont].data = value;
        cont++;
    });
    
    // Check if no data
    if( jQuery.isEmptyObject(opt_graph.series) ) {
        //$('#' + opt_graph.container).append( '<h1>No hay datos</h1>' );
        return;
    }
    
    // define the options
    var options = {
        chart: {    type:     opt_graph.chart_type, 
                    renderTo: opt_graph.container,
                    zoomType: 'x'	},
        title:      {   text: opt_graph.title,
                        x: -200 },
        subtitle:   {	text: opt_graph.subtitle,
                        x: -200 },
        credits:    {   enabled: false },
        series:     opt_graph.series,
        xAxis:      {   type: 'linear',
                        categories: categories,
                        tickInterval: opt_graph.tickInterval,
                        labels: {
                            align: 'left',
                            x: 0,
                            y: 0,
                            rotation: 0,
                            style: {
                                fontWeight: 'lighter'
                            }
                        }
                    },
        yAxis: [    { 	title: {
                            text: opt_graph.yAxis_title },
                        min: 0}],
        legend: {
			layout: 'vertical',
			align: 'right',
			verticalAlign: 'center',
			borderWidth: 0,
                        floating: false
		},
        exporting: {
                filename: opt_graph.filename
            }
    };
    
    if( opt_graph.chart_type == 'column' ) {
        options.title.x = 0;
        options.subtitle.x = 0;
        options.xAxis.labels.rotation = 45;
        options.xAxis.labels.y = 15;
        options.legend.floating = true;
        options.series.pointPadding = 0;
        options.series.shadow = false;
    }
    if( opt_graph.tickInterval != null ) {
        options.xAxis.labels.rotation = 45;
    }
    
    options.xAxis.type = 'linear';
    options.xAxis.categories = categories;
    
    // Make new chart
    var chart = new Highcharts.Chart(options);
    charts.push(chart);
}

function makeGraphJSONColumnStacked(opt_graph, data) {
    var     data_graph = {};
    var     categories = [];
    var     reference,
            dateAux;
    var     checkValues;
    var     minDate = -1,
            maxDate;
    var     num_field = 0;
    
    // If no data, show text 
    if( data == null || typeof data[0] == 'undefined' ) {
        return;
    }

    // Transform data
    $.each(data,function(index,value) {
        num_field = 0;
        // For each field with data, map the correct value in date correct
        jQuery.each(value, function(field_name, field_value) {
            if( ++num_field == 1 ) {
                categories.push(field_value); 
            }
            else {
                if( !data_graph[field_name] ) {
                    data_graph[field_name] = new Array;
                }
                var valor = parseFloat(field_value).toFixed(2);
                data_graph[field_name].push( parseFloat(valor) );
            }
        });
    });

    // Charge in Chart values from DB
    var cont = 0;
    var text = "";
    $.each(data_graph, function(index, value) {
        var aux = value;
        checkValues = 0;
        if ( undefined == opt_graph.series[cont] ) {
            opt_graph.series[cont] = {};
            opt_graph.series[cont].name = index;    
        }
        opt_graph.series[cont].data = value;
        cont++;
    });
    
    // Check if no data
    if( jQuery.isEmptyObject(opt_graph.series) ) {
        return;
    }
    
    // define the options
    var options = {
        chart: {    type:     opt_graph.chart_type, 
                    renderTo: opt_graph.container,
                    zoomType: 'x'	},
        title:      {   text: opt_graph.title,
                        x: -200 },
        subtitle:   {	text: opt_graph.subtitle,
                        x: -200 },
        credits:    {   enabled: false },
        plotOptions: {
               series: {
                   stacking: 'normal'
               }
           },
        series:     opt_graph.series,
        tooltip:    {   enabled: true,
                    formatter: function() {
                        var s = '<b>'+ this.x +'</b>';
                        var value = 0;
                        
                        $.each(this.points, function(i, point) {
                            s += '<br/><span style="color:'+point.series.color+'">\u25CF</span> ' + point.series.name + ': ' + parseFloat(point.y).toFixed(2);
                            value += point.y;
                        });
                        s += '<br/><b>Total: ' + parseFloat(value).toFixed(2);
                        
                        return s;
                    },
                    shared: true
                    },
        xAxis:      {   type: 'linear',
                        categories: categories,
                        tickInterval: opt_graph.tickInterval,
                        labels: {
                            align: 'left',
                            x: 0,
                            y: 0,
                            rotation: 0,
                            style: {
                                fontWeight: 'lighter'
                            }
                        }
                    },
        yAxis: [    { 	title: {
                            text: opt_graph.yAxis_title },
                        min: 0}],
        legend: {   align: 'center', verticalAlign: 'bottom' },
        exporting: {
                filename: opt_graph.filename
            }
    };
    
    if( opt_graph.chart_type == 'column' ) {
        options.title.x = 0;
        options.subtitle.x = 0;
        options.xAxis.labels.rotation = 45;
        options.xAxis.labels.y = 15;
        options.series.pointPadding = 0;
        options.series.shadow = false;
    }
    if( opt_graph.tickInterval != null ) {
        options.xAxis.labels.rotation = 45;
    }
    
    options.xAxis.type = 'linear';
    options.xAxis.categories = categories;
    
    // Make new chart
    var chart = new Highcharts.Chart(options);
}

function makeGraphJSONColumnStackedINCREMENTAL(opt_graph, data) {
    var     data_graph = {};
    var     categories = [];
    var     reference,
            dateAux;
    var     checkValues;
    var     minDate = -1,
            maxDate;
    var     num_field = 0;
    
    // If no data, show text 
    if( data == null || typeof data[0] == 'undefined' ) {
        return;
    }

    // Create the three values (MAX,AVG,MIN)
    opt_graph.series[0] = {}; opt_graph.series[0].name = "Min."; opt_graph.series[0].data = new Array;
    opt_graph.series[1] = {}; opt_graph.series[1].name = "Avg."; opt_graph.series[1].data = new Array;
    opt_graph.series[2] = {}; opt_graph.series[2].name = "Max."; opt_graph.series[2].data = new Array;
    
    // Transform data
    $.each(data,function(index,value) {
        // Put the category (NAME)
        categories.push(value.NAME);
        var valorMin = parseFloat(parseFloat(value.MIN).toFixed(2));
        var valorAvg = parseFloat(parseFloat(value.AVG).toFixed(2));
        var valorMax = parseFloat(parseFloat(value.MAX).toFixed(2));
        opt_graph.series[0].data.push(valorMin);
        opt_graph.series[1].data.push(valorAvg - valorMin);
        opt_graph.series[2].data.push(valorMax - valorAvg - valorMin);
    });
    
    opt_graph.series[0].index = 2;
    opt_graph.series[1].index = 1;
    opt_graph.series[2].index = 0;
    
    
    // Check if no data
    if( jQuery.isEmptyObject(opt_graph.series) ) {
        return;
    }
    
    // define the options
    var options = {
        chart: {    type:     opt_graph.chart_type, 
                    renderTo: opt_graph.container,
                    zoomType: 'x'	},
        title:      {   text: opt_graph.title,
                        x: -200 },
        subtitle:   {	text: opt_graph.subtitle,
                        x: -200 },
        credits:    {   enabled: false },
        plotOptions: {
               series: {
                   stacking: 'normal'
               }
           },
        series:     opt_graph.series,
        tooltip:    {   enabled: true,
                    formatter: function() {
                        var s = '<b>'+ this.x +'</b>';
                        var value = 0;
                        
                        $.each(this.points.reverse(), function(i, point) {
                            value += point.y;
                            s += '<br/><span style="color:'+point.series.color+'">\u25CF</span> ' + point.series.name + ': ' + value.toFixed(2);
                        });
                        
                        return s;
                    },
                    shared: true
                    },
        xAxis:      {   type: 'linear',
                        categories: categories,
                        tickInterval: opt_graph.tickInterval,
                        labels: {
                            align: 'left',
                            x: 0,
                            y: 0,
                            rotation: 0,
                            style: {
                                fontWeight: 'lighter'
                            }
                        }
                    },
        yAxis: [    { 	title: {
                            text: opt_graph.yAxis_title },
                        min: 0}],
        legend: {   align: 'center', verticalAlign: 'bottom' },
        exporting: {
                filename: opt_graph.filename
            }
    };
    
    if( opt_graph.chart_type == 'column' ) {
        options.title.x = 0;
        options.subtitle.x = 0;
        options.xAxis.labels.rotation = 45;
        options.xAxis.labels.y = 15;
        options.series.pointPadding = 0;
        options.series.shadow = false;
    }
    if( opt_graph.tickInterval != null ) {
        options.xAxis.labels.rotation = 45;
    }
    
    options.xAxis.type = 'linear';
    options.xAxis.categories = categories;
    
    // Make new chart
    var chart = new Highcharts.Chart(options);
}

function makeGraphJSONCompara(opt_graph, data, day_reference) {
    var     data_graph = {};
    var     categories = [];
    var     reference,
            dateAux;
    
    // If no data, show text 
    if( data == null ) {
        //$('#' + opt_graph.container).append( '<h1>No hay datos</h1>' );
        return;
    }
    
    // For each field of data, make new Array in data_graph Map
    for(key in data[0]) {
        if( key != 'date' ) data_graph[key] = new Array;
    }	

    // Transform data
    $.each(data,function(index,value) {
        // If X Series type is not datetime, reference is the first field
        if( opt_graph.type_xserie == 'linear' ) {
            reference = value.date;
            categories[index] = reference;
        }
        // but if is 'datetime', convert reference in miliseconds
        else {
            // First field is date and transform in Javascript date (only, no time)
            //dateAux = day_reference;
            //dateAux.setHours( value.date.substring(0, 2) );
            //dateAux.setMinutes( value.date.substring(3, 5) );
            //dateAux.setSeconds( value.date.substring(6, 8));
            //console.log( "Horas " + value.date.substring(0, 2)  + " Minuto " + value.date.substring(3, 5)
            //                + " Segundos " + value.date.substring(6, 8) );

            reference = Date.UTC(+day_reference.getFullYear(),
                            day_reference.getMonth(), +day_reference.getDate(),
                                value.date.substring(0, 2), value.date.substring(3, 5),
                                                                value.date.substring(6, 8));
            
            
        }

        // For each field with data, map the correct value in date correct
        jQuery.each(value, function(field_name, field_value) {
            if( field_name != 'date' ) {
                if( field_value != "null" ) {
                    valor = parseFloat(field_value).toFixed(2);
                    data_graph[field_name].push( [reference, parseFloat(valor) ] );
                }
                //else {
                //    data_graph[field_name].push( [reference, null ] );
                //}
            }
        });
    });

    // define the options
    var options = {
        chart: {    type:     opt_graph.chart_type, 
                    renderTo: opt_graph.container,
                    zoomType: 'x'	},
        title:      {   text: opt_graph.title },
        subtitle:   {	text: opt_graph.subtitle },
        credits:    {   enabled: false },
        series:     opt_graph.series,
        xAxis:      {   type: 'datetime',
                tickWidth: 0, gridLineWidth: 1 },
        yAxis: [    { 	title: {
                            text: opt_graph.yAxis_title },
                        min: 0,
                        startOnTick: true }],
        tooltip: {
                xDateFormat:	opt_graph.tooltip },
        exporting: {
                filename: opt_graph.filename
            }
    };

    if( opt_graph.type_xserie == 'linear' ) {
        options.xAxis.type = 'linear';
        options.xAxis.categories = categories;
    }
    
    // Charge in Chart values from DB
    cont = 0;
    $.each(data_graph, function(index, value) {
        options.series[cont].data = value;
    	cont++;
    });

    // Make new chart
    var chart = new Highcharts.Chart(options);
}
