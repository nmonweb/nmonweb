/*! NMONDB2WEB v2.0.0 nmonweb.js                                            */
/*! Purpose - Show NMON data in graphics from DB                            */
/*! Author - David López                                                    */
/*! Disclaimer:  this provided "as is".                                     */
/*! License: GNU                                                            */
/*! Date - 28/02/14                                                         */

// Global Variables
// -----------------------------------------------------------------------------
var begin_date = new Date();    // Date for begin of period
var end_date = new Date();      // Date for end of period
var selected_element = "",      // Select element (VM/Managed System/etc.)
    text_selected_element = "", // Select element (VM/Managed System/etc.)
    opt_menu = "";              // Select Menu (VM/HMC/COMPARE/GROUP)
    dialog_cancel = true;       // If Dialog send Cancel

// Load document
// -----------------------------------------------------------------------------
$(document).ready( function(){

    // Init the default dates
    begin_date.setDate( begin_date.getDate() - 5 );
    end_date.setDate( end_date.getDate() - 1 );

    // Hide the output
    $("#output").hide();

    // Default function for JQuery UI elements
    $( "#radio" ).buttonset();
    
    // Init the controls and text for international
    initInternational();

    // Init the dialog
    initDialogVM();

    // Click options
    $("#nmonweb").click( function() {
        selectNMONWEB();
    });
    $("#hmcweb").click( function() {
        selectHMC();
    });
    $("#compare_dates").click( function() {
        selectCompareDate();
    });  
    $("#compare_group").click( function() {
        selectCompareGroup();
    });  
});

// Init the controls and text for international
// -----------------------------------------------------------------------------
function initInternational() {
    
    // Get the main language from navigator and get the first part (en-US -> en)
    language_complete = navigator.language.split("-");
    language = (language_complete[0]);

    // will init i18n with default settings and set language from navigator
    $.i18n.init({lng: language, fallbackLng: 'dev', debug: false, getAsync: true}, function(t) { 
        $("html").i18n();
    });
        
    // Set the language to DatePicker. If is "en" (English) change for default
    // JQueryUI language
    if( language == "en" ) {
        language = "";
    }
    $.datepicker.setDefaults($.datepicker.regional[language]);
}

// Select NMONWEB
// -----------------------------------------------------------------------------
function selectNMONWEB() {    
    // Put the option that work for dialog
    opt_menu = "VM";
    
    // Init the dialog after load all components of windows
    initDialogVMPost(opt_menu);

    // Hide the output
    $("#output").hide();

    // Init the output after the Ok button
    initOutputVM();
    
    // Change the selection of the button
    $("#dialog-vm").dialog("open");
}

// Select NHMCWEB
// -----------------------------------------------------------------------------
function selectHMCWEB() {
    alert("hmcweb");
}

// Compare dates for a one host
// -----------------------------------------------------------------------------
function selectCompareDate() {
    // Put the option that work for dialog
    opt_menu = "COMPARE";
    
    // Init the dialog after load all components of windows
    initDialogVMPost(opt_menu);

    // Hide the output
    $("#output").hide();

    // Init the output after the Ok button
    initOutputCompare();
    
    // Change the selection of the button
    $("#dialog-vm").dialog("open");
}

// Show data from HMC
// -----------------------------------------------------------------------------
function selectHMC() {
    // Put the option that work for dialog
    opt_menu = "HMC";
    
    // Init the dialog after load all components of windows
    initDialogHMCPost(opt_menu);

    // Hide the output
    $("#output").hide();

    // Init the output after the Ok button
    initOutputHMC();
    
    // Change the selection of the button
    $("#dialog-hmc").dialog("open");
}

// Compare dates for a one host
// -----------------------------------------------------------------------------
function selectCompareGroup() {
    alert("compare_dates");    
}

// From dialog if create a new graphic call to this procedure
// -----------------------------------------------------------------------------
function onSelectMenu( typeofmenu ) {
    // Depending the dialog, call to a correnct procedure    
    switch( typeofmenu ) {
        case "VM":
            prepareOutputVM();
            break;
        case "COMPARE":
            prepareOutputCompare();
            break;
        case "HMC":
            prepareOutputHMC();
            break;
        default:
            alert( "No implementado aun");
            break;
    }
}
