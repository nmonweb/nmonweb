<?php

    # Get environment
    if (PHP_SAPI === 'cli') { 
        $query = 'fc_4';
        $type = 'sample';
        $host = 'AIX_TEST1';
        $fromdate = '2014-05-19 00:00:00';
        $todate = '2014-05-19 23:35:59';
    } 
    else {
        $query = $_GET["query"] or die( "Missing query parameter");
        $type = $_GET["type"] or die( "Missing type parameter");
        $host = $_GET["host"] or die( "Missing host parameter");
        $fromdate = $_GET["fromdate"] or die( "Missing fromdate parameter");
        $todate = $_GET["todate"] or die( "Missing todate parameter");
    }

    # Connect to Database
    include("db.php");

    // For default, not group data
    $type_result = 'date';

    // Select the SQL to execute
    switch( $query ) {
        case 'cpu_1':
            if( $type == 'sample' )
                $sql = "CALL QUERY_CPU1_SAMPLE( ?, ?, ? )";
            else 
                $sql = "CALL QUERY_CPU1_AVG( ?, ?, ?)";
            break;
        case 'cpu_2':
            if( $type == 'sample' )
                $sql = "CALL QUERY_CPU2_SAMPLE( ?, ?, ?)";
            else 
                $sql = "CALL QUERY_CPU2_AVG( ?, ?, ? )";
            break;
        case 'cpu_3':
            if( $type == 'sample' )
                $sql = "CALL QUERY_CPU3_SAMPLE( ?, ?, ?)";
            else 
                $sql = "CALL QUERY_CPU3_AVG( ?, ?, ? )";
            break;
        case 'cpu_10':
            if( $type == 'sample' )
                $sql = "CALL QUERY_CPU10_SAMPLE( ?, ?, ?)";
            else 
                $sql = "CALL QUERY_CPU10_AVG( ?, ?, ? )";
            break;
        case 'cpu_4':
	    $sql = "CALL QUERY_CPU4( ?, ?, ? )";
            break;
        case 'cpu_5':
            $type_result = 'group';
            if( $type == 'sample' )
                $sql = "CALL QUERY_CPU5_SAMPLE( ?, ?, ? )";
            else 
                $sql = "CALL QUERY_CPU5_AVG( ?, ?, ? )";
            break;
        case 'cpu_6':
	    $sql = "CALL QUERY_CPU6( ?, ?, ? )";
            break;
        case 'cpu_7':
	    $sql = "CALL QUERY_CPU7( ?, ?, ?)";
            break;
        case 'cpu_8':
	    $sql = "CALL QUERY_CPU8( ?, ?, ?)";
            break;
        case 'cpu_9':
            $type_result = 'field_name';
	    $sql = "CALL QUERY_CPU9( ?, ?, ?)";
            break;
        case 'cpu_11':
            $type_result = 'field_name';
	    $sql = "CALL QUERY_CPU11( ?, ?, ?)";
            break;
        case 'cpu_12':
            $type_result = 'field_name';
	    $sql = "CALL QUERY_CPU12( ?, ?, ?)";
            break;
        case 'mem_1':
            if( $type == 'sample' )
        	$sql = "SELECT SMP.DATE, " .
                            "((MEM.REAL_TOTAL * MEM.PROCESS_PCT) / 102400), " .
                            "((MEM.REAL_TOTAL * MEM.SYSTEM_PCT) / 102400), " .
                            "(MEM.REAL_TOTAL / 1024) " .
			"FROM VIEW_SAMPLES SMP, " .
				"MEMORY MEM " .
			"WHERE SMP.HOST = ? " .
				"AND  SMP.ID = MEM.ID_SAMPLE " .
                                "AND SMP.DATE BETWEEN ? AND ? " .
			"ORDER BY SMP.DATE";
            else
        	$sql = "SELECT DATE_FORMAT(SMP.DATE, '%Y-%m%-%d') AS DATE, " .
                            "AVG(MEM.REAL_TOTAL * (MEM.SYSTEM_PCT+MEM.PROCESS_PCT)) / 102400, " .
                            "MAX(MEM.REAL_TOTAL * (MEM.SYSTEM_PCT+MEM.PROCESS_PCT)) / 102400, " .
                            "MAX(MEM.REAL_TOTAL) / 1024 AS ENTITLED " .
			"FROM VIEW_SAMPLES SMP, " .
				"MEMORY MEM " .
			"WHERE SMP.HOST = ? " .
				"AND  SMP.ID = MEM.ID_SAMPLE " .
                                "AND SMP.DATE BETWEEN ? AND ? " .
			"GROUP BY DATE_FORMAT(SMP.DATE, '%d/%m/%y') " .
			"ORDER BY SMP.DATE";
            break;
        case 'mem_2':
            if( $type == 'sample' )
        	$sql = "SELECT SMP.DATE, " .
                            "(MEM.REAL_TOTAL - MEM.REAL_FREE) / 1024, " .
                            "(MEM.REAL_TOTAL / 1024) " .
			"FROM VIEW_SAMPLES SMP, " .
				"MEMORY MEM " .
			"WHERE SMP.HOST = ? " .
				"AND  SMP.ID = MEM.ID_SAMPLE " .
                                "AND SMP.DATE BETWEEN ? AND ? " .
			"ORDER BY SMP.DATE";
            else
        	$sql = "SELECT DATE_FORMAT(SMP.DATE, '%Y-%m%-%d') AS DATE, " .
                            "AVG(MEM.REAL_TOTAL - MEM.REAL_FREE) / 1024, " .
                            "MAX(MEM.REAL_TOTAL) / 1024 " .
			"FROM VIEW_SAMPLES SMP, " .
				"MEMORY MEM " .
			"WHERE SMP.HOST = ? " .
				"AND  SMP.ID = MEM.ID_SAMPLE " .
                                "AND SMP.DATE BETWEEN ? AND ? " .
			"GROUP BY DATE_FORMAT(SMP.DATE, '%d/%m/%y') " .
			"ORDER BY SMP.DATE";
            break;
        case 'mem_3':
            if( $type == 'sample' )
        	$sql = "SELECT SMP.DATE, " .
                            "FSCACHE_PCT, " .
                            "PROCESS_PCT, " .
                            "SYSTEM_PCT, " .
                            "MINPERM_PCT, " .
                            "MAXPERM_PCT " .
			"FROM VIEW_SAMPLES SMP, " .
				"MEMORY MEM " .
			"WHERE SMP.HOST = ? " .
				"AND  SMP.ID = MEM.ID_SAMPLE " .
                                "AND SMP.DATE BETWEEN ? AND ? " .
			"ORDER BY SMP.DATE";
            else
        	$sql = "SELECT DATE_FORMAT(SMP.DATE, '%Y-%m%-%d') AS DATE, " .
                            "AVG(FSCACHE_PCT), " .
                            "AVG(PROCESS_PCT), " .
                            "AVG(SYSTEM_PCT), " .
                            "AVG(MINPERM_PCT), " .
                            "AVG(MAXPERM_PCT) " .
			"FROM VIEW_SAMPLES SMP, " .
				"MEMORY MEM " .
			"WHERE SMP.HOST = ? " .
				"AND  SMP.ID = MEM.ID_SAMPLE " .
                                "AND SMP.DATE BETWEEN ? AND ? " .
			"GROUP BY DATE_FORMAT(SMP.DATE, '%d/%m/%y') " .
			"ORDER BY SMP.DATE";
            break;
        case 'mem_4':
            if( $type == 'sample' )
        	$sql = "SELECT SMP.DATE, " .
                            "VIRTUAL_FREE_PCT, " .
                            "100 - VIRTUAL_FREE_PCT " .
			"FROM VIEW_SAMPLES SMP, " .
				"MEMORY MEM " .
			"WHERE SMP.HOST = ? " .
				"AND  SMP.ID = MEM.ID_SAMPLE " .
                                "AND SMP.DATE BETWEEN ? AND ? " .
			"ORDER BY SMP.DATE";
            else
        	$sql = "SELECT DATE_FORMAT(SMP.DATE, '%Y-%m%-%d') AS DATE, " .
                            "AVG(VIRTUAL_FREE_PCT), " .
                            "100 - AVG(VIRTUAL_FREE_PCT), " .
                            "MIN(VIRTUAL_FREE_PCT) " .
			"FROM VIEW_SAMPLES SMP, " .
				"MEMORY MEM " .
			"WHERE SMP.HOST = ? " .
				"AND  SMP.ID = MEM.ID_SAMPLE " .
                                "AND SMP.DATE BETWEEN ? AND ? " .
			"GROUP BY DATE_FORMAT(SMP.DATE, '%d/%m/%y') " .
			"ORDER BY SMP.DATE";
            break;
        case 'mem_5':
            if( $type == 'sample' )
        	$sql = "SELECT SMP.DATE, " .
                            "MEM.REAL_FREE " .
			"FROM VIEW_SAMPLES SMP, " .
				"MEMORY MEM " .
			"WHERE SMP.HOST = ? " .
				"AND  SMP.ID = MEM.ID_SAMPLE " .
                                "AND SMP.DATE BETWEEN ? AND ? " .
			"ORDER BY SMP.DATE";
            else
        	$sql = "SELECT DATE_FORMAT(SMP.DATE, '%Y-%m%-%d') AS DATE, " .
                            "AVG(MEM.REAL_FREE) " .
			"FROM VIEW_SAMPLES SMP, " .
				"MEMORY MEM " .
			"WHERE SMP.HOST = ? " .
				"AND  SMP.ID = MEM.ID_SAMPLE " .
                                "AND SMP.DATE BETWEEN ? AND ? " .
			"GROUP BY DATE_FORMAT(SMP.DATE, '%d/%m/%y') " .
			"ORDER BY SMP.DATE";
            break;

        case 'mem_6':
            if( $type == 'sample' )
        	$sql = "SELECT SMP.DATE, " .
                            "NUMPERM_PCT, " .
                            "MINPERM_PCT, " .
                            "MAXPERM_PCT, " .
                            "(100-REAL_FREE_PCT-NUMPERM_PCT) " .
			"FROM VIEW_SAMPLES SMP, " .
				"MEMORY MEM " .
			"WHERE SMP.HOST = ? " .
				"AND  SMP.ID = MEM.ID_SAMPLE " .
                                "AND SMP.DATE BETWEEN ? AND ? " .
			"ORDER BY SMP.DATE";
            else
        	$sql = "SELECT DATE_FORMAT(SMP.DATE, '%Y-%m%-%d') AS DATE, " .
                            "AVG(NUMPERM_PCT), " .
                            "AVG(MINPERM_PCT), " .
                            "AVG(MAXPERM_PCT), " .
                            "AVG(100-REAL_FREE_PCT-NUMPERM_PCT) " .
			"FROM VIEW_SAMPLES SMP, " .
				"MEMORY MEM " .
			"WHERE SMP.HOST = ? " .
				"AND  SMP.ID = MEM.ID_SAMPLE " .
                                "AND SMP.DATE BETWEEN ? AND ? " .
			"GROUP BY DATE_FORMAT(SMP.DATE, '%d/%m/%y') " .
			"ORDER BY SMP.DATE";
            break;

        case 'proc_1':
        case 'proc_2':
        case 'proc_3':
        case 'proc_4':
	    switch( $query ) {
		case 'proc_1':	$field1 = "RUNNABLE";  $field2 = "SWAPIN"; break;
		case 'proc_2':	$field1 = "PSWITCH";  $field2 = "SYSCALL"; break;
		case 'proc_3':	$field1 = "READ_";  $field2 = "WRITE_"; break;
		case 'proc_4':	$field1 = "FORK";  $field2 = "EXEC"; break;
	    }

            if( $type == 'sample' )
                $sql = "SELECT SMP.DATE, " .
                            "PROC." . $field1 . ", " .
                            "PROC." . $field2 . " " .
                            "FROM VIEW_SAMPLES SMP, PROC " .
                            "WHERE SMP.HOST = ? " .
                            "AND  SMP.ID = PROC.ID_SAMPLE " .
                            "AND SMP.DATE BETWEEN ? AND ? " .
                            "ORDER BY SMP.DATE";
            else 
                $sql = "SELECT DATE_FORMAT(SMP.DATE, '%Y-%m%-%d') AS DATE, " .
                            "AVG(PROC." . $field1 . "), " .
                            "AVG(PROC." . $field2 . "), " .
                            "MAX(PROC." . $field1 . "), " .
                            "MAX(PROC." . $field2 . ") " .
                            "FROM VIEW_SAMPLES SMP, PROC " .
                            "WHERE SMP.HOST = ? " .
                            "AND  SMP.ID = PROC.ID_SAMPLE " .
                            "AND SMP.DATE BETWEEN ? AND ? " .
                            "GROUP BY DATE_FORMAT(SMP.DATE, '%d/%m/%y') " .
                            "ORDER BY SMP.DATE";
            break;

        case 'page_1':
            if( $type == 'sample' )
                $sql = "SELECT SMP.DATE, " .
                            "PAGE.FAULTS " .
                            "FROM VIEW_SAMPLES SMP, PAGE " .
                            "WHERE SMP.HOST = ? " .
                            "AND  SMP.ID = PAGE.ID_SAMPLE " .
                            "AND SMP.DATE BETWEEN ? AND ? " .
                            "ORDER BY SMP.DATE";
            else 
                $sql = "SELECT DATE_FORMAT(SMP.DATE, '%Y-%m%-%d') AS DATE, " .
                            "AVG(PAGE.FAULTS), " .
                            "MIN(PAGE.FAULTS), " .
                            "MAX(PAGE.FAULTS) " .
                            "FROM VIEW_SAMPLES SMP, PAGE " .
                            "WHERE SMP.HOST = ? " .
                            "AND  SMP.ID = PAGE.ID_SAMPLE " .
                            "AND SMP.DATE BETWEEN ? AND ? " .
                            "GROUP BY DATE_FORMAT(SMP.DATE, '%d/%m/%y') " .
                            "ORDER BY SMP.DATE";
            break;
	    
        case 'page_2':
        case 'page_3':
        case 'page_4':
	    switch( $query ) {
		case 'page_2':	$field1 = "PGIN";  $field2 = "PGOUT"; break;
		case 'page_3':	$field1 = "PGSIN";  $field2 = "PGSOUT"; break;
		case 'page_4':	$field1 = "RECLAIMS";  $field2 = "SCANS"; break;
	    }

            if( $type == 'sample' )
                $sql = "SELECT SMP.DATE, " .
                            "PAGE." . $field1 . ", " .
                            "PAGE." . $field2 . " " .
                            "FROM VIEW_SAMPLES SMP, PAGE " .
                            "WHERE SMP.HOST = ? " .
                            "AND  SMP.ID = PAGE.ID_SAMPLE " .
                            "AND SMP.DATE BETWEEN ? AND ? " .
                            "ORDER BY SMP.DATE";
            else 
                $sql = "SELECT DATE_FORMAT(SMP.DATE, '%Y-%m%-%d') AS DATE, " .
                            "AVG(PAGE." . $field1 . "), " .
                            "AVG(PAGE." . $field2 . "), " .
                            "MAX(PAGE." . $field1 . "), " .
                            "MAX(PAGE." . $field2 . ") " .
                            "FROM VIEW_SAMPLES SMP, PAGE " .
                            "WHERE SMP.HOST = ? " .
                            "AND  SMP.ID = PAGE.ID_SAMPLE " .
                            "AND SMP.DATE BETWEEN ? AND ? " .
                            "GROUP BY DATE_FORMAT(SMP.DATE, '%d/%m/%y') " .
                            "ORDER BY SMP.DATE";
            break;

        case 'page_5':
            if( $type == 'sample' )
                $sql = "SELECT SMP.DATE, " .
                            "PAGE.PGIN - PAGE.PGSIN, " .
                            "PAGE.PGOUT - PAGE.PGSOUT " .
                            "FROM VIEW_SAMPLES SMP, PAGE " .
                            "WHERE SMP.HOST = ? " .
                            "AND  SMP.ID = PAGE.ID_SAMPLE " .
                            "AND SMP.DATE BETWEEN ? AND ? " .
                            "ORDER BY SMP.DATE";
            else 
                $sql = "SELECT DATE_FORMAT(SMP.DATE, '%Y-%m%-%d') AS DATE, " .
                            "AVG(PAGE.PGIN - PAGE.PGSIN), " .
                            "AVG(PAGE.PGOUT - PAGE.PGSOUT), " .
                            "MAX(PAGE.PGIN - PAGE.PGSIN), " .
                            "MAX(PAGE.PGOUT - PAGE.PGSOUT) " .
                            "FROM VIEW_SAMPLES SMP, PAGE " .
                            "WHERE SMP.HOST = ? " .
                            "AND  SMP.ID = PAGE.ID_SAMPLE " .
                            "AND SMP.DATE BETWEEN ? AND ? " .
                            "GROUP BY DATE_FORMAT(SMP.DATE, '%d/%m/%y') " .
                            "ORDER BY SMP.DATE";
            break;

        case 'fc_1':
        case 'fc_2':
        case 'fc_3':
            $type_result = 'group';
            switch( $query ) {
                case 'fc_1':	$field_name = "READ_";	break;
                case 'fc_2':	$field_name = "WRITE_";	break;
                case 'fc_3':	$field_name = "XFER";	break;
            }
            if( $type == 'sample' )
                $sql = "SELECT SMP.DATE, " .
                    "    FC_NAMES.NAME, " . $field_name . " " .
                    "FROM VIEW_SAMPLES SMP INNER JOIN FC " .
                            " ON (FC.ID_SAMPLE = SMP.ID) , FC_NAMES " .
                    "WHERE SMP.HOST = ? " .
                         "AND SMP.DATE BETWEEN ? AND ? " .
                         "AND FC_NAMES.SERVER = SMP.HOST_ID " . 
                         "AND FC_NAMES.ID = FC.ID_NAME " .
                    "ORDER BY SMP.DATE, FC_NAMES.NAME";
            else 
                $sql = "SELECT DATE_FORMAT(SMP.DATE, '%Y-%m%-%d') AS DATE, " .
                                "FC_NAMES.NAME, " .
                                "AVG(" . $field_name . ") " .
                        "FROM VIEW_SAMPLES SMP INNER JOIN FC " .
                        " ON (FC.ID_SAMPLE = SMP.ID) , FC_NAMES " .
                                "WHERE SMP.HOST = ? " .
                                "AND SMP.DATE BETWEEN ? AND ? " .
                    "AND FC_NAMES.SERVER = SMP.HOST_ID " . 
                    "AND FC_NAMES.ID = FC.ID_NAME " .
                "GROUP BY DATE_FORMAT(SMP.DATE, '%d/%m/%y'), FC_NAMES.NAME " .
                "ORDER BY SMP.DATE, FC_NAMES.NAME";
            break;

        case 'fc_4':
            $type_result = 'field_name';
            $sql = 
            "SELECT " . 
                " FC_NAMES.NAME AS 'NAME'," .
                " MIN( FC.READ_ ) AS 'MIN', " .
                " AVG( FC.READ_ ) AS 'AVG', " .
                " MAX( FC.READ_ ) AS 'MAX' " .
            " FROM VIEW_SAMPLES SMP INNER JOIN FC " .
                     " ON (FC.ID_SAMPLE = SMP.ID) , FC_NAMES " .
            " WHERE SMP.HOST = ? " .
            " AND SMP.DATE BETWEEN ? AND ? " .
                " AND FC_NAMES.SERVER = SMP.HOST_ID  " .
                " AND FC_NAMES.ID = FC.ID_NAME " .
            " GROUP BY FC_NAMES.NAME ";
            break;

        case 'fc_5':
            $type_result = 'field_name';
            $sql = 
            "SELECT " . 
                " FC_NAMES.NAME AS 'NAME'," .
                " MIN( FC.WRITE_ ) AS 'MIN', " .
                " AVG( FC.WRITE_ ) AS 'AVG', " .
                " MAX( FC.WRITE_ ) AS 'MAX' " .
            " FROM VIEW_SAMPLES SMP INNER JOIN FC " .
                     " ON (FC.ID_SAMPLE = SMP.ID) , FC_NAMES " .
            " WHERE SMP.HOST = ? " .
            " AND SMP.DATE BETWEEN ? AND ? " .
                " AND FC_NAMES.SERVER = SMP.HOST_ID  " .
                " AND FC_NAMES.ID = FC.ID_NAME " .
            " GROUP BY FC_NAMES.NAME ";
            break;

        case 'net_1':
        case 'net_2':
        case 'net_3':
        case 'net_4':
            $type_result = 'group';
            switch( $query ) {
                case 'net_1':	$field_name = "READ_";	break;
                case 'net_2':	$field_name = "WRITE_";	break;
                case 'net_3':	$field_name = "PACKET_READ";	break;
                case 'net_4':	$field_name = "PACKET_WRITE";	break;
            }
                if( $type == 'sample' )
                    $sql = "SELECT SMP.DATE, " .
                    "    NET_NAMES.NAME, " . $field_name . " " .
                    "FROM VIEW_SAMPLES SMP INNER JOIN NET " .
                            " ON (NET.ID_SAMPLE = SMP.ID) , NET_NAMES " .
                    "WHERE SMP.HOST = ? " .
                         "AND SMP.DATE BETWEEN ? AND ? " .
                         "AND NET_NAMES.SERVER = SMP.HOST_ID " . 
                         "AND NET_NAMES.ID = NET.ID_NAME " .
                    "ORDER BY SMP.DATE, NET_NAMES.NAME";
                else 
                        $sql = "SELECT DATE_FORMAT(SMP.DATE, '%Y-%m%-%d') AS DATE, " .
                                    "NET_NAMES.NAME, " .
                                    "AVG(" . $field_name . ") " .
                    "FROM VIEW_SAMPLES SMP INNER JOIN NET " .
                            " ON (NET.ID_SAMPLE = SMP.ID) , NET_NAMES " .
                                    "WHERE SMP.HOST = ? " .
                                    "AND SMP.DATE BETWEEN ? AND ? " .
                        "AND NET_NAMES.SERVER = SMP.HOST_ID " . 
                        "AND NET_NAMES.ID = NET.ID_NAME " .
                    "GROUP BY DATE_FORMAT(SMP.DATE, '%d/%m/%y'), NET_NAMES.NAME " .
                    "ORDER BY SMP.DATE, NET_NAMES.NAME";
                break;
	case 'net_5':
	    if( $type == 'sample' )
		$sql = "SELECT SMP.DATE, " .
		    " ROUND(SUM(READ_), 0) AS 'Read', " .
		    " ROUND((SUM(WRITE_) * -1), 0) AS 'Write' " .
		    //" ROUND(SUM(WRITE_), 0) AS 'Write' " .
		"FROM VIEW_SAMPLES SMP INNER JOIN NET " .
			" ON (NET.ID_SAMPLE = SMP.ID) " .
		"WHERE SMP.HOST = ? " .
		     "AND SMP.DATE BETWEEN ? AND ? " .
		" GROUP BY SMP.DATE " . 
		"ORDER BY SMP.DATE";
	    else 
		    $sql = "SELECT DATE_FORMAT(SMP.DATE, '%Y-%m%-%d') AS DATE, " .
		    " ROUND(SUM(READ_), 0) AS 'Read', " .
		    " ROUND((SUM(WRITE_) * -1), 0) AS 'Write' " .
		    //" ROUND(SUM(WRITE_)*-1, 0) AS 'Write' " .
		"FROM VIEW_SAMPLES SMP INNER JOIN NET " .
			" ON (NET.ID_SAMPLE = SMP.ID) " .
				"WHERE SMP.HOST = ? " .
				"AND SMP.DATE BETWEEN ? AND ? " .
		"GROUP BY DATE_FORMAT(SMP.DATE, '%d/%m/%y') " .
		"ORDER BY SMP.DATE";
	    break;
	    
	case 'net_6':
	    if( $type == 'sample' )
		$sql = "SELECT SMP.DATE, " .
		    " ROUND(SUM(SIZE_READ), 0) AS 'Size Read', " .
		    " ROUND((SUM(SIZE_WRITE)), 0) AS 'Size Write' " .
		"FROM VIEW_SAMPLES SMP INNER JOIN NET " .
			" ON (NET.ID_SAMPLE = SMP.ID) " .
		"WHERE SMP.HOST = ? " .
		     "AND SMP.DATE BETWEEN ? AND ? " .
		" GROUP BY SMP.DATE " . 
		"ORDER BY SMP.DATE";
	    else 
		    $sql = "SELECT DATE_FORMAT(SMP.DATE, '%Y-%m%-%d') AS DATE, " .
		    " ROUND(SUM(SIZE_READ), 0) AS 'Read', " .
		    " ROUND((SUM(SIZE_WRITE)), 0) AS 'Write' " .
		"FROM VIEW_SAMPLES SMP INNER JOIN NET " .
			" ON (NET.ID_SAMPLE = SMP.ID) " .
				"WHERE SMP.HOST = ? " .
				"AND SMP.DATE BETWEEN ? AND ? " .
		"GROUP BY DATE_FORMAT(SMP.DATE, '%d/%m/%y') " .
		"ORDER BY SMP.DATE";
	    break;

	case 'net_7':
	    if( $type == 'sample' )
		$sql = "SELECT SMP.DATE, " .
		    " ROUND(SUM(IERRS), 0) AS 'Input Errors', " .
		    " ROUND((SUM(OERRS)), 0) AS 'Output Errors', " .
		    " ROUND((SUM(COLLISIONS)), 0) AS 'Collisions' " .
		"FROM VIEW_SAMPLES SMP INNER JOIN NET " .
			" ON (NET.ID_SAMPLE = SMP.ID) " .
		"WHERE SMP.HOST = ? " .
		     "AND SMP.DATE BETWEEN ? AND ? " .
		" GROUP BY SMP.DATE " . 
		"ORDER BY SMP.DATE";
	    else 
		    $sql = "SELECT DATE_FORMAT(SMP.DATE, '%Y-%m%-%d') AS DATE, " .
		    " ROUND(SUM(IERRS), 0) AS 'Input Errors', " .
		    " ROUND((SUM(OERRS)), 0) AS 'Output Errors', " .
		    " ROUND((SUM(COLLISIONS)), 0) AS 'Collisions' " .
		"FROM VIEW_SAMPLES SMP INNER JOIN NET " .
			" ON (NET.ID_SAMPLE = SMP.ID) " .
				"WHERE SMP.HOST = ? " .
				"AND SMP.DATE BETWEEN ? AND ? " .
		"GROUP BY DATE_FORMAT(SMP.DATE, '%d/%m/%y') " .
		"ORDER BY SMP.DATE";
	    break;

        case 'wlm_1':
        case 'wlm_2':
        case 'wlm_3':
            $type_result = 'group';
            switch( $query ) {
                case 'wlm_1':	$field_name = "CPU";	break;
                case 'wlm_2':	$field_name = "MEM";	break;
                case 'wlm_3':	$field_name = "BIO";	break;
            }
                if( $type == 'sample' )
                    $sql = "SELECT SMP.DATE, " .
                        "    WLM_CLASS.NAME, " . $field_name . " " .
                        "FROM VIEW_SAMPLES SMP, WLM, WLM_CLASS " .
                        "WHERE SMP.HOST = ? " .
                             "AND SMP.DATE BETWEEN ? AND ? " .
			     "AND SMP.ID = WLM.ID_SAMPLE " .
                             "AND WLM.ID_NAME = WLM_CLASS.ID " .
                             "AND WLM_CLASS.NAME <> 'Unmanaged' " .
                        "ORDER BY SMP.DATE, WLM_CLASS.NAME";
                else 
                        $sql = "SELECT DATE_FORMAT(SMP.DATE, '%Y-%m%-%d') AS DATE, " .
                                    "WLM_CLASS.NAME, " .
                                    "AVG(" . $field_name . ") " .
				"FROM VIEW_SAMPLES SMP, WLM, WLM_CLASS " .
                                    "WHERE SMP.HOST = ? " .
                                    "AND SMP.DATE BETWEEN ? AND ? " .
				     "AND SMP.ID = WLM.ID_SAMPLE " .
	                            "AND WLM_CLASS.ID = WLM.ID_NAME " .
	                             "AND WLM_CLASS.NAME <> 'Unmanaged' " .
                    "GROUP BY DATE_FORMAT(SMP.DATE, '%d/%m/%y'), WLM_CLASS.NAME " .
                    "ORDER BY SMP.DATE, WLM_CLASS.NAME";
                break;
        case 'file_1':
            if( $type == 'sample' )
                $sql = "SELECT SMP.DATE, " .
                            "FILE.READCH, " .
                            "FILE.WRITECH " .
                            "FROM VIEW_SAMPLES SMP, FILE " .
                            "WHERE SMP.HOST = ? " .
                            "AND  SMP.ID = FILE.ID_SAMPLE " .
                            "AND SMP.DATE BETWEEN ? AND ? " .
                            "ORDER BY SMP.DATE";
            else 
                $sql = "SELECT DATE_FORMAT(SMP.DATE, '%Y-%m%-%d') AS DATE, " .
                            "AVG(FILE.READCH), " .
                            "AVG(FILE.WRITECH), " .
                            "MAX(FILE.READCH), " .
                            "MAX(FILE.WRITECH) " .
                            "FROM VIEW_SAMPLES SMP, FILE " .
                            "WHERE SMP.HOST = ? " .
                            "AND  SMP.ID = FILE.ID_SAMPLE " .
                            "AND SMP.DATE BETWEEN ? AND ? " .
                            "GROUP BY DATE_FORMAT(SMP.DATE, '%d/%m/%y') " .
                            "ORDER BY SMP.DATE";
            break;

        case 'file_2':
            if( $type == 'sample' )
                $sql = "SELECT SMP.DATE, " .
                            "FILE.IGET, " .
                            "FILE.NAMEI, " .
                            "FILE.DIRBLK " .
                            "FROM VIEW_SAMPLES SMP, FILE " .
                            "WHERE SMP.HOST = ? " .
                            "AND  SMP.ID = FILE.ID_SAMPLE " .
                            "AND SMP.DATE BETWEEN ? AND ? " .
                            "ORDER BY SMP.DATE";
            else 
                $sql = "SELECT DATE_FORMAT(SMP.DATE, '%Y-%m%-%d') AS DATE, " .
                            "AVG(FILE.IGET), " .
                            "AVG(FILE.NAMEI), " .
                            "AVG(FILE.DIRBLK), " .
                            "MAX(FILE.IGET), " .
                            "MAX(FILE.NAMEI), " .
                            "MAX(FILE.DIRBLK) " .
                            "FROM VIEW_SAMPLES SMP, FILE " .
                            "WHERE SMP.HOST = ? " .
                            "AND  SMP.ID = FILE.ID_SAMPLE " .
                            "AND SMP.DATE BETWEEN ? AND ? " .
                            "GROUP BY DATE_FORMAT(SMP.DATE, '%d/%m/%y') " .
                            "ORDER BY SMP.DATE";
            break;

        case 'tend_1':
            $type_result = 'field_name';
            $sql = "CALL GET_TENDENCIA_HOST(?, ?, ?)";
            break;
        default:
            die( "No query available yet");
    }     

    // Execute query
    switch( $type_result ) {
	case 'date':
	    $resul = db_query_date_data($sql, $host, $fromdate, $todate);
	    break;
	case 'field_name':
	    $resul = db_query_with_fields_name($sql, $host, $fromdate, $todate);
	    break;
	case 'group':
	    $resul = db_query_date_group_data($sql, $host, $fromdate, $todate);
	    break;
    }

    echo $resul;
?>
