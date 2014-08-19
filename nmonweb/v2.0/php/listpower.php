<?php
    # Connect to Database
    include("db.php");
    $dbcon=dbconnect();
    if( !$dbcon ) {
    echo "No hay conexión";
    return;
    }
    
    $query = "SELECT IFNULL(MACHINE.DESC, MACHINE.NUM_SERIE), MACHINE.NUM_SERIE, MACHINE.ID " .
        " FROM MACHINE " .
        " WHERE MACHINE.DESC IS NOT NULL " .
        " ORDER BY MACHINE.DESC";
    if ($stmt = $dbcon->prepare($query)) {
        $stmt->execute();
        
        $stmt->bind_result($DESC, $NUM_SERIE, $ID);
        $jsondata = array();
        $cont = 0;
        while ($stmt->fetch()) {
            $jsondata[$cont]['desc'] = utf8_decode($DESC);
            $jsondata[$cont]['num_serie'] = utf8_decode($NUM_SERIE);
            $jsondata[$cont]['id'] = utf8_decode($ID);
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
