/*! NMONDB2WEB v2.0.0 nmonweb.js                                            */
/*! Purpose - Show NMON data in graphics from DB                            */
/*! Author - David L—pez                                                    */
/*! Disclaimer:  this provided "as is".                                     */
/*! License: GNU                                                            */
/*! Date - 28/02/14                                                         */

// Init the dialog defaults
// -----------------------------------------------------------------------------
function initDialogVM() {

    // Process Calendars
    $( "#fromdate" ).datepicker({
        defaultDate: "-1W",
        maxDate: "-1D",
        numberOfMonths: 2,
        showWeek: true,
        onClose: function( selectedDate ) {
            $( "#todate" ).datepicker( "option", "minDate", selectedDate );
        }
        });
    $( "#todate" ).datepicker({
        defaultDate: "-1D",
        maxDate: "-1D",
        numberOfMonths: 2,
        showWeek: true,
        onClose: function( selectedDate ) {
            $( "#fromdate" ).datepicker( "option", "maxDate", selectedDate );
        }
    });
    $("#fromdate").datepicker("setDate", begin_date);
    $("#todate").datepicker("setDate", end_date);

    $( "#fromdateHMC" ).datepicker({
        defaultDate: "-1W",
        maxDate: "-1D",
        numberOfMonths: 2,
        showWeek: true,
        onClose: function( selectedDate ) {
            $( "#todateHMC" ).datepicker( "option", "minDate", selectedDate );
        }
        });
    $( "#todateHMC" ).datepicker({
        defaultDate: "-1D",
        maxDate: "-1D",
        numberOfMonths: 2,
        showWeek: true,
        onClose: function( selectedDate ) {
            $( "#fromdateHMC" ).datepicker( "option", "maxDate", selectedDate );
        }
    });
    $("#fromdateHMC").datepicker("setDate", begin_date);
    $("#todateHMC").datepicker("setDate", end_date);
    
    // Select Host
    $("#listEnv").change( function() { selectEnv();}); 
    
    $("#dialog-vm").dialog({
        autoOpen: false,
        height: 280,
        width: 350,
        modal: true,
        buttons: {
            Ok: function() {
                var environment = "";
                var VM = "";
                var VM_text = "";
                $("#listEnv option:selected").each( function() {
                    environment = $(this).val();
                });
                $("#listVM option:selected").each( function() {
                    VM = $(this).val();
                    VM_text = $(this).text();
                });
                if ( VM == "" || environment == "" ) {
                    alert( $.t("message.nmon.missing") );
                    return;
                }
                var fromdate = $('#fromdate').datepicker('getDate');
                var todate = $('#todate').datepicker('getDate');
                if ( todate < fromdate || fromdate == null || todate == null ) {
                    alert( $.t("message.nmon.nodate") );
                    return;
                }
                begin_date = fromdate;
                end_date = todate;
                end_date.setHours(23); end_date.setMinutes(59); end_date.setSeconds(59);
                selected_element = VM;
                text_selected_element = VM_text;
                dialog_cancel = false;
                
                $(this).dialog("close");

                // Select 
                onSelectMenu(opt_menu);
            },
            Cancel: function() {
                dialog_cancel = true; 
                $(this).dialog("close");
            }
        }
    });   

    $("#dialog-hmc").dialog({
        autoOpen: false,
        height: 280,
        width: 350,
        modal: true,
        buttons: {
            Ok: function() {
                var system = "", system_name = "";
                $("#listSystems option:selected").each( function() {
                    system = $(this).val();
                    system_name = $(this).text();
                });
                if ( system == "" ) {
                    alert( $.t("message.nmon.missing") );
                    return;
                }
                var fromdate = $('#fromdateHMC').datepicker('getDate');
                var todate = $('#todateHMC').datepicker('getDate');
                if ( todate < fromdate || fromdate == null || todate == null ) {
                    alert( $.t("message.nmon.nodate") );
                    return;
                }
                begin_date = fromdate;
                end_date = todate;
                end_date.setHours(23); end_date.setMinutes(59); end_date.setSeconds(59);
                selected_element = system;
                text_selected_element = system_name;
                dialog_cancel = false;
                
                $(this).dialog("close");

                // Select 
                onSelectMenu(opt_menu);
            },
            Cancel: function() {
                dialog_cancel = true; 
                $(this).dialog("close");
            }
        }
    });   
}

// After load all components call the initianlization for dialog
// -----------------------------------------------------------------------------
function initDialogVMPost( opt_menu ) {
    var newtitle = "";

    // Depending the type of operation put the title or change others texts
    switch( opt_menu ) {
        case 'VM':
            newtitle = '<b>' + $.t("dialog_vm.title") + '</b>';
            break;
        case 'COMPARE':
            newtitle = '<b>' + $.t("dialog_compare.title") + '</b>';
            $("#label_fromdate").text($.t('dialog_compare.first_day'));
            $("#label_todate").text($.t('dialog_compare.second_day'));
            break;
    }

    // Change title for this dialog (bug in JQuery Dialog and i18n)
    $("#dialog-vm").parent().find("span.ui-dialog-title").html(newtitle);

    // Get environments defined in database and create his corresponding buttons
    $.getJSON('php/listenvironment.php', {},
                                function(data){ getListEnvironments(data); });
}

// After load all components call the initianlization for dialog
// -----------------------------------------------------------------------------
function initDialogHMCPost( opt_menu ) {
    var newtitle = "";

    // Change title for this dialog (bug in JQuery Dialog and i18n)
    newtitle = '<b>' + $.t("dialog_hmc.title") + '</b>';
    $("#dialog-hmc").parent().find("span.ui-dialog-title").html(newtitle);

    // Get environments defined in database and create his corresponding buttons
    $.getJSON('php/hmc_list_systems.php', {},function(data){ getListHMC(data); });
}

// With data from database, add in the select all environments
// -----------------------------------------------------------------------------
function getListEnvironments(data) {
    // Remove list environments old in combo box
    $('option', '#listEnv').remove();
    
    // Make a new option for each host
    $.each(data,function(index,value) {
        $('#listEnv').append(
                $('<option></option>').val(value.id).html(value.desc));
    });

    // Make default for Machine not yet assigned to any environment
    $('#listEnv').append(
        $('<option></option>').val('---').html( $.t('bodyarea.host_notassigned') ));

    // Get the hosts for first environment
    selectEnv();
}

// With data from Managened Systems, list it and open the dialog
// -----------------------------------------------------------------------------
function getListHMC(data) {
    // Remove list environments old in combo box
    $('option', '#listSystems').remove();
    
    // Make a new option for each host
    $.each(data,function(index,value) {
        $('#listSystems').append(
                $('<option></option>').val(value.id).html(value.name));
    });
}


// Select environment. Reload hosts
// -----------------------------------------------------------------------------
function selectEnv() {
    var environment = "";

    // Remove list hosts old in combo box
    $('option', "#listVM").remove();

    // Get the selected environment
    $("#listEnv option:selected").each( function() {
        environment = $(this).val();
    });
    if ( environment == "" || environment == null ) {
        return;
    }
    
    // Get List of hosts for this environment
    $.getJSON('php/listhosts.php', {env:environment},function(data){ getListHost(data); });
}

// Process list hosts
// -----------------------------------------------------------------------------
function getListHost(data) {
    var select = $('#listVM');

    // Remove list hosts old in combo box
    $('option', select).remove();

    // Make a new option for each host
    $.each(data,function(index,value) {
        select.append(
                $('<option></option>').val(value.host).html(value.desc));
    });
}