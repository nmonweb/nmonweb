<?php
	# Connect to Database
	include("hmc_db.php");
	$dbcon=dbconnect();
	if( !$dbcon ) {
		echo "No hay conexión";
		return;
	}
	
	$query = "SELECT COALESCE(SYSTEM.DESC, SYSTEM.NUM_SERIE), ".
                " SYSTEM.ID ".
                " FROM SYSTEM ".
                " ORDER BY 1";
	if ($stmt = $dbcon->prepare($query)) {
	    $stmt->execute();

	    $stmt->bind_result($NAME, $ID);
	    $jsondata = array();
	    $cont = 0;
	    while ($stmt->fetch()) {
			$jsondata[$cont]['name'] = htmlentities($NAME);
			$jsondata[$cont]['id'] = $ID;
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
