<?php

    # Get environment
    if (PHP_SAPI === 'cli') { 
        $query = 'cpu_all_ALL';
        $id_power = '6';
        $fromdate = '2012-7-01 00:00:00';
        $todate = '2012-7-31 23:59:59';
    } 
    else {
        $query = $_GET["query"] or die( "Missing query parameter");
        $id_power = $_GET["id_power"] or die( "Missing host parameter");
        $fromdate = $_GET["fromdate"] or die( "Missing fromdate parameter");
        $todate = $_GET["todate"] or die( "Missing todate parameter");
    }

    # Connect to Database
    include("db.php");
    // Select the SQL to execute
    switch( $query ) {
        case 'cpu_all':
	    $sql = "SELECT CAL.DATE AS DATE, CAL.HOST_NAME, DAT.MEDIA ".
			" FROM (SELECT CAL.DATE, ".
				" HOST.ID AS HOST_ID, ".
				" HOST.NAME AS HOST_NAME ".
			    " FROM TMP_CALENDAR CAL,  ".
					" MACHINE INNER JOIN HOST ON (MACHINE.ID = HOST.MACHINE) ".
			    " WHERE MACHINE.ID = ? ".
			    " ORDER BY CAL.DATE, HOST.ID ) CAL ".
				" LEFT JOIN ( ".
				" SELECT DATE_FORMAT(SMP.DATE, '%Y-%m%-%d') AS DATE,  ".
				    " HOST.ID AS HOST_ID,  ".
				    " AVG(LPAR.PHYSICALCPU) AS MEDIA ".
				  " FROM ENVIRONMENT ENV, HOST, MACHINE, SAMPLES SMP, LPAR  ".
				  " WHERE SMP.DATE BETWEEN ? AND ? ".
				   " AND  SMP.SERVER = HOST.ID  ".
				   " AND  HOST.ENVIRONMENT = ENV.ID  ".
				   " AND  HOST.MACHINE = MACHINE.ID  ".
				   " AND  MACHINE.ID = ? ".
				   " AND  LPAR.ID_SAMPLE = SMP.ID  ".
				  " GROUP BY DATE_FORMAT(SMP.DATE, '%d/%m/%y'),  ".
				      " MACHINE.DESC, ".
				      " HOST.NAME  ".
				  " ORDER BY SMP.DATE, HOST.NAME ".
				" ) DAT ON (CAL.DATE = DAT.DATE AND CAL.HOST_ID = DAT.HOST_ID) ".
			" ORDER BY DATE, CAL.HOST_NAME";
	    break;
        case 'cpu_all_ALL':
	    $id_power = 999;
	    $sql =
		    " SELECT CAL.DATE AS DATE, CAL.MACHINE, DAT.MEDIA " .
		    " FROM (   SELECT CAL.DATE AS DATE, " .
				    " MACHINE.ID AS MACHINE_ID, " .
				    " MACHINE.DESC AS MACHINE " .
				" FROM TMP_CALENDAR CAL,  MACHINE " .
				" WHERE MACHINE.DESC IS NOT NULL " .
				" ORDER BY CAL.DATE ) CAL " . 
			    " LEFT JOIN (  " .
				    " SELECT TODO.DATE AS DATE,  " .
					    " CAST(TODO.MACHINE AS UNSIGNED) AS MACHINE_ID,  " .
					    " SUM(TODO.MEDIA) AS MEDIA " .
				    " FROM ( SELECT DATE_FORMAT(SMP.DATE, '%Y-%m%-%d') AS DATE,  " .
						" MACHINE.ID AS MACHINE, " .
						" HOST.NAME AS HOST,  " .
						" AVG(LPAR.PHYSICALCPU) AS MEDIA  " .
					    " FROM (SAMPLES SMP JOIN HOST ON SMP.SERVER = HOST.ID)  " .
					    " JOIN MACHINE ON MACHINE.ID = HOST.MACHINE, " .
				    		    " LPAR " .
					    " WHERE SMP.DATE BETWEEN ? AND ? " .
					    " AND SMP.ID = LPAR.ID_SAMPLE " .
					    " GROUP BY DATE_FORMAT(SMP.DATE, '%d/%m/%y'),  " .
						    " MACHINE.ID, " .
					    " HOST.NAME ) TODO " .
				    " GROUP BY TODO.DATE, TODO.MACHINE ) DAT  " .
	    		    " ON (DAT.DATE = CAL.DATE AND DAT.MACHINE_ID = CAL.MACHINE_ID)  " .
		    " ORDER BY DATE, CAL.MACHINE ";
	    break;

        default:
            die( "No query available yet");
    }     

    $resul = db_query_calendar_group($sql, $id_power, $fromdate, $todate);
    echo $resul;
?>
