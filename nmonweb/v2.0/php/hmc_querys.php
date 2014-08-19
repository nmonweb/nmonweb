<?php

    # Get environment
    if (PHP_SAPI === 'cli') { 
        $query = 'hmc_1';
        $type = 'sample';
        $system = '3';
        $fromdate = '2014-05-01';
        $todate = '2014-06-26';
    } 
    else {
        $query = $_GET["query"] or die( "Missing query parameter");
        $type = $_GET["type"] or die( "Missing type parameter");
        $system = $_GET["system"] or die( "Missing host parameter");
        $fromdate = $_GET["fromdate"] or die( "Missing fromdate parameter");
        $todate = $_GET["todate"] or die( "Missing todate parameter");
    }

    # Connect to Database
    include("hmc_db.php");

    // Select the SQL to execute
    switch( $query ) {
        case 'hmc_1':
            if( $type == 'sample' )
                $sql = "SELECT DATE AS 'DATE', CFG_CPU AS 'CONFIG', UTIL_CPU AS 'UTIL' " .
                            " FROM PROC " .
                            " WHERE SYSTEM = ? " .
                            " AND DATE BETWEEN ? AND ? " .
                            " ORDER BY DATE";
            else 
                $sql = "SELECT DATE_FORMAT(DATE, '%Y-%m%-%d') AS 'DATE_', " .
                            " MAX(CFG_CPU) AS 'CONFIG', " .
                            " MAX(UTIL_CPU) AS 'MAX_', " .
                            " AVG(UTIL_CPU) AS 'AVG_'" .
                            " FROM PROC " .
                            " WHERE SYSTEM = ? " .
                            " AND DATE BETWEEN ? AND ? " .
                            " GROUP BY DATE_FORMAT(DATE, '%d/%m/%y') " .
                            " ORDER BY DATE";
		$resul = db_execute_group_by_date($sql, $system, $fromdate, $todate);
            break;
        case 'hmc_2':
	    if( $type == 'sample' ) {
                $sql = "( SELECT DAT.DATE AS 'DATE_', POOL.NAME , DAT.UTIL_CPU AS UTIL_CPU".
			" FROM SYSTEM INNER JOIN POOLPROC DAT " .
				" ON (DAT.SYSTEM = SYSTEM.ID), POOL ".
			" WHERE DAT.SYSTEM = ? ".
			    " AND DAT.DATE BETWEEN ? AND ? ".
			    " AND DAT.POOL = POOL.ID ) ".
			" UNION ALL " .
			" (SELECT DAT.DATE AS 'DATE_', 'Proc. Dedicados' as 'POOL', SUM(DAT.UTIL_CPU) AS UTIL_CPU" .
			    " FROM SYSTEM INNER JOIN LPARPROC DAT " .
				    " ON (DAT.SYSTEM = SYSTEM.ID) " .
			    " WHERE DAT.SYSTEM = ? " .
				" AND DATE BETWEEN ? AND ? " .
				" AND DAT.PROC_MODE = 2 " .
			   " GROUP BY DAT.DATE) " .
			"ORDER BY 1, 2";
	    }
	    else {
                $sql = "SELECT DATE_FORMAT(DATE, '%Y-%m%-%d') AS 'DATE_', ".
				" POOL.NAME as 'POOL', AVG(DAT.UTIL_CPU) AS UTIL_CPU ".
			" FROM SYSTEM INNER JOIN POOLPROC DAT  ".
				" ON (DAT.SYSTEM = SYSTEM.ID), POOL ".
			" WHERE DAT.SYSTEM = ? ".
			 " AND DAT.DATE BETWEEN ? AND ? ".
			 " AND  DAT.POOL = POOL.ID ".
			 " GROUP BY DATE_FORMAT(DATE, '%d/%m/%y'), POOL.NAME " .
			 " UNION " .
			 "SELECT DATE_FORMAT(DATE_, '%Y-%m%-%d') AS 'DATE',  ".
				    "'Proc. Dedicados' as 'POOL', ".
				    " AVG(UTIL_CPU_) AS 'UTIL_CPU' ".
			" FROM (SELECT DATE AS DATE_, ". 
					" SUM(DAT.UTIL_CPU) AS UTIL_CPU_ ".
			    " FROM SYSTEM INNER JOIN LPARPROC DAT ".
				    " ON (DAT.SYSTEM = SYSTEM.ID)  ".
			    " WHERE DAT.SYSTEM = ? ".
				" AND DAT.DATE BETWEEN ? AND ?  ".
			    " AND DAT.PROC_MODE = 2 ".
			    " GROUP BY DATE) DATOS ".
			" GROUP BY DATE_FORMAT(DATE_, '%d/%m/%y') ".
			" ORDER BY 1, 2";
	    }
	    $resul = db_execute_group_by_date_and_data($sql, $system, $fromdate, $todate);
	    break;
        case 'hmc_3':
	    if( $type == 'sample' ) {
                $sql = "SELECT DAT.DATE, LPAR.NAME, DAT.UTIL_CPU ".
			" FROM SYSTEM INNER JOIN LPARPROC DAT " .
				" ON (DAT.SYSTEM = SYSTEM.ID), LPAR ".
			" WHERE DAT.SYSTEM = ? ".
			    " AND DAT.DATE BETWEEN ? AND ? ".
			    " AND DAT.LPAR = LPAR.ID ".
			" ORDER BY DAT.DATE, LPAR.NAME";
	    }
	    else {
                $sql = "SELECT DATE_FORMAT(DATE, '%Y-%m%-%d') AS DATE, ".
				" LPAR.NAME, AVG(DAT.UTIL_CPU) ".
			" FROM SYSTEM INNER JOIN LPARPROC DAT  ".
				" ON (DAT.SYSTEM = SYSTEM.ID), LPAR ".
			" WHERE DAT.SYSTEM = ? ".
			 " AND DAT.DATE BETWEEN ? AND ? ".
			 " AND  DAT.LPAR = LPAR.ID ".
			 " GROUP BY DATE_FORMAT(DATE, '%d/%m/%y'), LPAR.NAME ".
			 " ORDER BY DAT.DATE, LPAR.NAME ";
	    }
	    $resul = db_execute_group_by_date_and_data($sql, $system, $fromdate, $todate);
	    break;
        case 'hmc_8':
	    if( $type == 'sample' ) {
                $sql = "SELECT DAT.DATE, " .
			" IFNULL(LPAR.DESCRIPTION,LPAR.NAME), DAT.UTIL_CPU ".
			" FROM SYSTEM INNER JOIN LPARPROC DAT " .
				" ON (DAT.SYSTEM = SYSTEM.ID), LPAR ".
			" WHERE DAT.SYSTEM = ? ".
			    " AND DAT.DATE BETWEEN ? AND ? ".
			    " AND DAT.LPAR = LPAR.ID " .
			    " AND LPAR.PRODUCCION = 'Y' " .
			" ORDER BY DAT.DATE, LPAR.NAME";
	    }
	    else {
                $sql = "SELECT DATE_FORMAT(DATE, '%Y-%m%-%d') AS DATE, ".
				" IFNULL(LPAR.DESCRIPTION,LPAR.NAME), AVG(DAT.UTIL_CPU) ".
			" FROM SYSTEM INNER JOIN LPARPROC DAT  ".
				" ON (DAT.SYSTEM = SYSTEM.ID), LPAR ".
			" WHERE DAT.SYSTEM = ? ".
			 " AND DAT.DATE BETWEEN ? AND ? ".
			 " AND  DAT.LPAR = LPAR.ID ".
 			 " AND LPAR.PRODUCCION = 'Y' " .
			 " GROUP BY DATE_FORMAT(DATE, '%d/%m/%y'), LPAR.NAME ".
			 " ORDER BY DAT.DATE, LPAR.NAME ";
	    }
	    $resul = db_execute_group_by_date_and_data($sql, $system, $fromdate, $todate);
	    break;
        case 'hmc_4':
	    $sql = "SELECT ".
			" SUM(IF(UTIL_CPU < 10, 1, 0)) AS 'Menos 10%' , ".
			" SUM(IF(UTIL_CPU >= 10 AND UTIL_CPU < 20, 1, 0)) AS 'Menos 20%', ".
			" SUM(IF(UTIL_CPU >= 20 AND UTIL_CPU < 30, 1, 0)) AS 'Menos 30%', ".
			" SUM(IF(UTIL_CPU >= 30 AND UTIL_CPU < 40, 1, 0)) AS 'Menos 40%', ".
			" SUM(IF(UTIL_CPU >= 40 AND UTIL_CPU < 50, 1, 0)) AS 'Menos 50%', ".
			" SUM(IF(UTIL_CPU >= 50 AND UTIL_CPU < 60, 1, 0)) AS 'Menos 60%', ".
			" SUM(IF(UTIL_CPU >= 60 AND UTIL_CPU < 70, 1, 0)) AS 'Menos 70%', ".
			" SUM(IF(UTIL_CPU >= 70 AND UTIL_CPU < 80, 1, 0)) AS 'Menos 80%', ".
			" SUM(IF(UTIL_CPU >= 80 AND UTIL_CPU < 90, 1, 0)) AS 'Menos 90%', ".
			" SUM(IF(UTIL_CPU >= 90 AND UTIL_CPU < 95, 1, 0)) AS 'Menos 95%', ".
			" SUM(IF(UTIL_CPU >= 95, 1, 0)) AS 'Mayor 95%' ".
			" FROM ( SELECT (UTIL_CPU * 100) / CFG_CPU AS 'UTIL_CPU' ".
			       " FROM  POOLPROC  ".
			       " WHERE SYSTEM = ? ".
			       " AND DATE BETWEEN ? AND ? ".
			" ) DATOS;";
	    $resul = db_execute($sql, $system, $fromdate, $todate);
	    break;
        case 'hmc_5':
	    $sql = "SELECT CONVERT(DATE_FORMAT(DATE,'%k'), UNSIGNED) AS date, ".
			" MIN(UTIL_CPU) AS minimo, ".
			" AVG(UTIL_CPU) AS media, ".
			" MAX(UTIL_CPU) AS maximo, ".
			" MAX(CFG_CPU) - MAX(NAS_CPU) AS configurado, ".
			" MAX(CFG_CPU) AS instalado ".
		    " FROM  PROC ".
		    " WHERE SYSTEM = ? ".
		    " AND DATE BETWEEN ? AND ? ".
		    " GROUP BY CONVERT(DATE_FORMAT(DATE,'%k'), UNSIGNED) ".
		    " ORDER BY 1 ";
	    $resul = db_execute($sql, $system, $fromdate, $todate);
	    break;
        case 'hmc_6':
	    $sql = "SELECT ".
			" SUM(IF(UTIL_CPU < 10, 1, 0)) AS 'Menos 10%' , ".
			" SUM(IF(UTIL_CPU >= 10 AND UTIL_CPU < 20, 1, 0)) AS 'Menos 20%', ".
			" SUM(IF(UTIL_CPU >= 20 AND UTIL_CPU < 30, 1, 0)) AS 'Menos 30%', ".
			" SUM(IF(UTIL_CPU >= 30 AND UTIL_CPU < 40, 1, 0)) AS 'Menos 40%', ".
			" SUM(IF(UTIL_CPU >= 40 AND UTIL_CPU < 50, 1, 0)) AS 'Menos 50%', ".
			" SUM(IF(UTIL_CPU >= 50 AND UTIL_CPU < 60, 1, 0)) AS 'Menos 60%', ".
			" SUM(IF(UTIL_CPU >= 60 AND UTIL_CPU < 70, 1, 0)) AS 'Menos 70%', ".
			" SUM(IF(UTIL_CPU >= 70 AND UTIL_CPU < 80, 1, 0)) AS 'Menos 80%', ".
			" SUM(IF(UTIL_CPU >= 80 AND UTIL_CPU < 90, 1, 0)) AS 'Menos 90%', ".
			" SUM(IF(UTIL_CPU >= 90 AND UTIL_CPU < 95, 1, 0)) AS 'Menos 95%', ".
			" SUM(IF(UTIL_CPU >= 95, 1, 0)) AS 'Mayor 95%' ".
			" FROM ( SELECT (UTIL_CPU * 100) / CFG_CPU AS 'UTIL_CPU' ".
			       " FROM  POOLPROC  ".
			       " WHERE SYSTEM = ? ".
			       " AND DATE BETWEEN ? AND ? ".
			       " AND DATE_FORMAT(DATE, '%k') BETWEEN 8 AND 15 " .
			" ) DATOS;";
	    $resul = db_execute($sql, $system, $fromdate, $todate);
	    break;
        case 'hmc_7':
	    $sql = "SELECT ".
			" SUM(IF(UTIL_CPU < 10, 1, 0)) AS 'Menos 10%' , ".
			" SUM(IF(UTIL_CPU >= 10 AND UTIL_CPU < 20, 1, 0)) AS 'Menos 20%', ".
			" SUM(IF(UTIL_CPU >= 20 AND UTIL_CPU < 30, 1, 0)) AS 'Menos 30%', ".
			" SUM(IF(UTIL_CPU >= 30 AND UTIL_CPU < 40, 1, 0)) AS 'Menos 40%', ".
			" SUM(IF(UTIL_CPU >= 40 AND UTIL_CPU < 50, 1, 0)) AS 'Menos 50%', ".
			" SUM(IF(UTIL_CPU >= 50 AND UTIL_CPU < 60, 1, 0)) AS 'Menos 60%', ".
			" SUM(IF(UTIL_CPU >= 60 AND UTIL_CPU < 70, 1, 0)) AS 'Menos 70%', ".
			" SUM(IF(UTIL_CPU >= 70 AND UTIL_CPU < 80, 1, 0)) AS 'Menos 80%', ".
			" SUM(IF(UTIL_CPU >= 80 AND UTIL_CPU < 90, 1, 0)) AS 'Menos 90%', ".
			" SUM(IF(UTIL_CPU >= 90 AND UTIL_CPU < 95, 1, 0)) AS 'Menos 95%', ".
			" SUM(IF(UTIL_CPU >= 95, 1, 0)) AS 'Mayor 95%' ".
			" FROM ( SELECT (UTIL_CPU * 100) / CFG_CPU AS 'UTIL_CPU' ".
			       " FROM  POOLPROC  ".
			       " WHERE SYSTEM = ? ".
			       " AND DATE BETWEEN ? AND ? ".
			       " AND (DATE_FORMAT(DATE, '%k') > 15 ".
			       "   OR DATE_FORMAT(DATE, '%k') < 8) ".
			" ) DATOS;";
	    $resul = db_execute($sql, $system, $fromdate, $todate);
	    break;
        case 'hmc_9':
	    $sql = "SELECT LPAR.NAME AS 'NAME', MAX(DAT.UTIL_CPU) AS 'MAX', ".
			    " AVG(DAT.UTIL_CPU) AS 'AVG', " . 
			    " MIN(DAT.UTIL_CPU) AS 'MIN' " . 
		    " FROM SYSTEM INNER JOIN LPARPROC DAT " .
			    " ON (DAT.SYSTEM = SYSTEM.ID), LPAR ".
		    " WHERE DAT.SYSTEM = ? ".
			" AND DAT.DATE BETWEEN ? AND ? ".
			" AND DAT.LPAR = LPAR.ID ".
		    " GROUP BY LPAR.NAME" .
		    " ORDER BY LPAR.NAME";
	    $resul = db_execute($sql, $system, $fromdate, $todate);
	    break;

	case 'hmc_avg_all':
	    $sql = "SELECT SYS.DESC AS 'POWER_', " .
			" DATE_FORMAT(DATE, '%c') AS 'ORDEN_', " .
			" ((AVG(UTIL_CPU) * 100) / MAX(CFG_CPU)) AS 'AVG_', " .
			" DATE_FORMAT(DATE, '%b') AS 'MES_' " .
			" FROM PROC INNER JOIN SYSTEM AS SYS ON (PROC.SYSTEM = SYS.ID) " .
			" WHERE DATE BETWEEN ? AND ? " .
			" GROUP BY SYS.DESC, 2 " .
			" ORDER BY SYS.DESC, 2 ASC";
	    $resul = db_execute($sql, NULL, $fromdate, $todate);
            break;

	case 'hmc_max_all':
	    $sql = "SELECT SYS.DESC AS 'POWER_', " .
			" DATE_FORMAT(DATE, '%c') AS 'ORDEN_', " .
			" ((MAX(UTIL_CPU) * 100) / MAX(CFG_CPU)) AS 'MAX_', " .
			" DATE_FORMAT(DATE, '%b') AS 'MES_' " .
			" FROM PROC INNER JOIN SYSTEM AS SYS ON (PROC.SYSTEM = SYS.ID) " .
			" WHERE DATE BETWEEN ? AND ? " .
			" GROUP BY SYS.DESC, 2 " .
			" ORDER BY SYS.DESC, 2 ASC";
	    $resul = db_execute($sql, NULL, $fromdate, $todate);
            break;

	case 'test':
	    $sql = "( SELECT DAT.DATE AS 'DATE_', POOL.NAME as 'POOL', DAT.UTIL_CPU AS UTIL_CPU".
		    " FROM SYSTEM INNER JOIN POOLPROC DAT " .
			    " ON (DAT.SYSTEM = SYSTEM.ID), POOL ".
		    " WHERE DAT.SYSTEM = $system ".
			" AND DAT.DATE BETWEEN '$fromdate' AND '$todate' ".
			" AND DAT.POOL = POOL.ID ) ".
		    " UNION ALL " .
		    " (SELECT DAT.DATE AS 'DATE_', 'Proc. Dedicados' as 'POOL', SUM(DAT.UTIL_CPU) AS UTIL_CPU" .
			" FROM SYSTEM INNER JOIN LPARPROC DAT " .
				" ON (DAT.SYSTEM = SYSTEM.ID), POOL " .
		    " WHERE DAT.SYSTEM = $system ".
			" AND DAT.DATE BETWEEN '$fromdate' AND '$todate' ".
			    " AND DAT.POOL = POOL.ID " .
			    " AND DAT.PROC_MODE = 2 " .
		       " GROUP BY DAT.DATE) " .
		    "ORDER BY 1, 2";
	    $resul = db_test($sql, $system, $fromdate, $todate);
	    break;

        default:
            $result = "";
	    die( "No query available yet");

    }     

    echo $resul;
    if (PHP_SAPI === 'cli') { 
	echo "\n\n";
    }
?>
