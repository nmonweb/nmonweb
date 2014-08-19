<?php
	# Connect to Database
	include("db.php");
	$dbcon=dbconnect();
	if( !$dbcon ) {
		echo "No hay conexión";
		return;
	}
	
	$query = "SELECT NAME, DESCRIPTION " .
		 " FROM ENVIRONMENT " .
		 " ORDER BY ORDEN";
	if ($stmt = $dbcon->prepare($query)) {
	    $stmt->execute();

	    $stmt->bind_result($HOST, $DESCRIPTION);
	    $jsondata = array();
	    $cont = 0;
	    while ($stmt->fetch()) {
			$jsondata[$cont]['id'] = $HOST;
			$jsondata[$cont]['desc'] = utf8_encode( $DESCRIPTION ); 
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
