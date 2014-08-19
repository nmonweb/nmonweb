<?php

    # Get environment
    if (PHP_SAPI === 'cli') { 
        $query = 'PAGE2';
        $host = 'AIX_TEST1';
        $first_day = '2014-5-14';
        $second_day = '2014-5-21';
    } 
    else {
        $query = $_GET["query"] or die( "Missing query parameter");
        $host = $_GET["host"] or die( "Missing host parameter");
        $first_day = $_GET["first_day"] or die( "Missing first_day parameter");
        $second_day = $_GET["second_day"] or die( "Missing second_day parameter");
    }

    # Connect to Database
    include("db.php");

    // For default, not group data
    $type_result = 'date';

    // Select the SQL to execute
    switch( $query ) {
        case 'CPU1':
        case 'CPU2':
        case 'CPU3':
        case 'CPU4':
	    $sql = "CALL QUERY_COMPARA_" . $query . "( ?, ?, ? )";
	    $resul = db_query_comparador($sql, $host, $first_day, $second_day);
	    if( is_null($resul) ) {
	    $sql = "CALL QUERY_COMPARA_" . $query . "_ALT( ?, ?, ? )";
		$resul = db_query_comparador($sql, $host, $first_day, $second_day);
	    }
            break;
        case 'MEM':
        case 'MEM2':
        case 'MEM3':
        case 'MEM4':
        case 'PAGE1':
        case 'PAGE2':
        case 'PAGE3':
        case 'PAGE4':
	    $sql = "CALL QUERY_COMPARA_" . $query . "( ?, ?, ? )";
	    $resul = db_query_comparador($sql, $host, $first_day, $second_day);
            break;
        default:
            die( "No query available yet");
    }     

    //echo $resul;

    function db_query_comparador( $query, $host, $fromdate, $todate ) {
        // Local variables
        $parameters = array();
        $jsondata = array();
	$row = array();
        $num_row = 0;
        $num_fields = 0;
	$field_count = 0;
	    
	// Make a connection
	$dbcon = dbconnect();
	if( !$dbcon ) {
		echo "Can't connect to DB";
		return;
	}
	
	// Prepare SQL sentence
	if( !($stmt = $dbcon->prepare($query)) ) {
		echo "Error: $dbcon->error() ";
		$dbcon->close();
		return;
	}
		
	// Prepare parameters
	$stmt->bind_param( "sss", $host, $fromdate, $todate );

	// Execute SQL and get result
	$stmt->execute();

        // Get fields to bind_result
        $meta = $stmt->result_metadata();
        while ( $field = $meta->fetch_field() ) {
            $parameters[] = &$row[$field->name]; 
        }
        call_user_func_array(array($stmt, 'bind_result'), $parameters);
        
        // Process the result
        while ( $stmt->fetch() ) {
            $field_count = 0;
            foreach( $row as $key => $val ) {
		if( $field_count++ == 0 ) {
		    $jsondata[$num_row]['date'] = $val;
		}
		else {
                    $jsondata[$num_row]['data' . $field_count] = utf8_encode($val);
		}
            }
            $num_row++;
        }        

	// Close SQL
	$stmt->close();
	$dbcon->close();

	if( is_null($jsondata) || empty($jsondata) ) { 	return null; }
	
	// Encode result to JSON format
	echo json_encode($jsondata);
	
	return 0;
    }	
?>
