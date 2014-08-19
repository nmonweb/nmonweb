<?php

	# Get environment
	if (PHP_SAPI === 'cli') { 
	$host = 'TSM1';
	} 
	else {
		$host = $_GET["host"] or die( "Missing host parameter");
	}

	# Connect to Database
	include("db.php");
	$dbcon=dbconnect();
	if( !$dbcon ) {
		echo "No hay conexión";
		return;
	}
	
	$query = "SELECT DATE_FORMAT(SMP.DATE, '%Y-%m%-%d') AS DATE, " .
				"AVG(LPAR.PHYSICALCPU) AS MED_CPU, " .
				"MAX(LPAR.PHYSICALCPU) AS MAX_CPU, " .
				"MAX(LPAR.ENTITLED) AS ENTITLED " .
				"FROM VIEW_SAMPLES SMP," .
				"LPAR WHERE SMP.HOST = ? " .
				"AND  SMP.ID = LPAR.ID_SAMPLE " .
				"GROUP BY DATE_FORMAT(SMP.DATE, '%d/%m/%y') " .
				"ORDER BY SMP.DATE";
	if ($stmt = $dbcon->prepare($query)) {
		$stmt->bind_param("s", $host);
	    $stmt->execute();

	    $stmt->bind_result($DATE, $MED_CPU, $MAX_CPU, $ENTITLED);
	    $jsondata = array();
	    $cont = 0;
	    while ($stmt->fetch()) {
			echo "$DATE\t$MED_CPU\t$MAX_CPU\n";
			$cont++;
	    }
	    $stmt->close();
		echo json_encode($jsondata);
	}
	else {
		echo "Error: $dbcon->error() ";
	}
	$dbcon->close();
?>
