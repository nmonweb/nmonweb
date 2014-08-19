<?php
	if (PHP_SAPI === 'cli') { 
		$env = 'PRO';
	} 
	else {
		$env = $_GET["env"] or die( "Missing environment (env) parameter");
	}

	# Connect to Database
	include("db.php");
	$dbcon=dbconnect();
	if( !$dbcon ) {
		echo "No hay conexión";
		return;
	}
	
	if( $env == '---' ) {
		$query = "SELECT HOST.NAME, " .
			" IF( HOST.DESCRIPTION IS NULL, HOST.NAME, CONCAT(HOST.DESCRIPTION, '/', HOST.NAME)) AS DESCRIPTION" .
			//" CONCAT(IFNULL(HOST.DESCRIPTION,''), ' / ', HOST.NAME ) AS DESCRIPTION " .
			" FROM HOST " .
			" WHERE HOST.ENVIRONMENT IS NULL ".
			" ORDER BY HOST.DESCRIPTION";
		}
	else {
		$query = "SELECT HOST.NAME, " .
			" IF( HOST.DESCRIPTION IS NULL, HOST.NAME, CONCAT(HOST.DESCRIPTION, '/', HOST.NAME)) AS DESCRIPTION" .
			//" CONCAT(IFNULL(HOST.DESCRIPTION,''), ' / ', HOST.NAME ) AS DESCRIPTION " .
			" FROM HOST, ENVIRONMENT " .
			" WHERE ENVIRONMENT.NAME = '$env' " .
			" AND ENVIRONMENT.ID = HOST.ENVIRONMENT" .
			" ORDER BY HOST.DESCRIPTION";		
	}
	if ($stmt = $dbcon->prepare($query)) {
	    $stmt->execute();

	    $stmt->bind_result($HOST, $DESCRIPTION);
	    $jsondata = array();
	    $cont = 0;
	    while ($stmt->fetch()) {
			$jsondata[$cont]['host'] = $HOST;
			$jsondata[$cont]['desc'] = utf8_decode($DESCRIPTION);
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
