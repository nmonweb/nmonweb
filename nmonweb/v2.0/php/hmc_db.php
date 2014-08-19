<?php
	function dbconnect()
	{
		# Parsed ini file 
		$parameters = parse_ini_file('/Users/david/.nmonweb.ini', true);
		
		# Check if exists all parameters
		if( ! $parameters['DB_HMCWEB']['host'] || ! $parameters['DB_HMCWEB']['user'] ||
			! $parameters['DB_HMCWEB']['password'] || ! $parameters['DB_HMCWEB']['dbname'] ||
			! $parameters['DB_HMCWEB']['port'] ) {
			die ('Missing parameters for connecto to DB');
		}
		
		$dbcon = new mysqli($parameters['DB_HMCWEB']['host'], $parameters['DB_HMCWEB']['user'],
				    $parameters['DB_HMCWEB']['password'], $parameters['DB_HMCWEB']['dbname'],
				    $parameters['DB_HMCWEB']['port'], $parameters['DB_HMCWEB']['socket'])
			   or die ('Could not connect to the database server' . mysqli_connect_error());

		if( $parameters["DB_HMCWEB"]['lc_time_names'] ) {
			$dbcon->query("SET lc_time_names = '" . $parameters['DB_HMCWEB']['lc_time_names'] . "'");
		}
		return $dbcon;
	}

	function db_execute( $query, $system, $fromdate, $todate ) {
        // Local variables
        $parameters = array();
        $jsondata = array();
        $num_row = 0;
        $num_fields = 0;
		
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
		if( $system == NULL ) {
			$stmt->bind_param( "ss", $fromdate, $todate );
		}
		else {
			$stmt->bind_param( "sss", $system, $fromdate, $todate );
		}

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
                $jsondata[$num_row][utf8_encode($key)] = utf8_encode($val);
            }
            $num_row++;
        }        

		// Close SQL
		$stmt->close();
		$dbcon->close();
		
		// Encode result to JSON format
		echo json_encode($jsondata);
	}	

	function db_execute_group_by_date( $query, $system, $fromdate, $todate ) {
        // Local variables
        $row = array();
        $parameters = array();
        $jsondata = array();
        $num_row = 0;
        $num_fields = 0;
		
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
		$stmt->bind_param( "sss", $system, $fromdate, $todate );

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
                if( $field_count == 0 ) {
        			$jsondata[$num_row]['date'] = $val;                   
                }
                else {
                    $jsondata[$num_row][utf8_encode($key)] = utf8_encode($val);                   
                }
                $field_count++;
            }
            $num_row++;
        }        

		// Close SQL
		$stmt->close();
		$dbcon->close();
		
		// Encode result to JSON format
		echo json_encode($jsondata);
	}	
	
	function db_execute_group_by_date_and_data( $query, $host, $fromdate, $todate ) {
        // Local variables
        $row = array();
        $parameters = array();
        $jsondata = array();
        $num_row = 0;
        $num_fields = 0;
        $field_name = "";
		
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
		if( $host == NULL )
			$stmt->bind_param( "ss", $fromdate, $todate );
		else {
            $num_parameters = getalloccurences($query, "?");
            if( $num_parameters == 6 ) {
                $stmt->bind_param( "ssssss", $host, $fromdate, $todate, $host, $fromdate, $todate );
            }
            else
            	$stmt->bind_param( "sss", $host, $fromdate, $todate );
		}
		

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
                switch( $field_count++ ) {
                    case 0:
                        $jsondata[$num_row]['date'] = $val;
                        break;
                    case 1: 
                        $field_name = $val;
                        break;
                    default:
                        $jsondata[$num_row][ $field_name ] = $val;

                }
            }
            $num_row++;
        }        
        
        
//		$result = $stmt->get_result();
//
//		// Get names for fields
//		$finfo = $result->fetch_fields();
//
//		// Get number of fields
//		$num_fields = $result->field_count;
//		$cont = 0;
//		$jsondata = '';
//
//		// First field is date, and the others only data
//		while ($row = $result->fetch_array(MYSQLI_NUM)) {
//            //var_dump($row);
//			$jsondata[$cont]['date'] = $row[0];
//			for( $row_count = 2; $row_count < $result->field_count; $row_count++ ) {
//				$jsondata[$cont][ $row[1] ] = $row[$row_count];
//			}
//			$cont++;
//		}

		// Close SQL
		$stmt->close();
		$dbcon->close();
		
		// Encode result to JSON format
		echo json_encode($jsondata);
	}	

	function db_test( $query, $host, $fromdate, $todate ) {
		
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
        $num_parameters = getalloccurences($query, "?");
        switch( $num_parameters ) {
            case 2:
    			$stmt->bind_param( "ss", $fromdate, $todate );
                break;
            case 3:
                $stmt->bind_param( "sss", $host, $fromdate, $todate );
                break;
            case 6:
                $stmt->bind_param( "ssssss", $host, $fromdate, $todate, $host, $fromdate, $todate );
                break;
            default:
                return;
        }

		// Execute SQL and get result
		$stmt->execute();
		$result = $stmt->get_result();

		// Get names for fields
		$finfo = $result->fetch_fields();

		// Get number of fields
		$num_fields = $result->field_count;
		$cont = 0;
		$jsondata = '';

		// First field is date, and the others only data
		while ($row = $result->fetch_array(MYSQLI_NUM)) {
            //var_dump($row);
			$jsondata[$cont]['date'] = $row[0];
			for( $row_count = 2; $row_count < $result->field_count; $row_count++ ) {
				$jsondata[$cont][ $row[1] ] = $row[$row_count];
			}
			$cont++;
		}

		// Close SQL
		$stmt->close();
		$dbcon->close();
		
		// Encode result to JSON format
		echo json_encode($jsondata);
	}	

	function getalloccurences($haystack,$needle,$offset = 0){
	    $result = 0;
	    for($i = $offset; $i<strlen($haystack); $i++){
		$pos = strpos($haystack,$needle,$i);
		if($pos !== FALSE){
		    $offset =  $pos;
		    if($offset >= $i){
			$i = $offset;
			$result++;
		    }
		}
	    }
	    return $result;
	} 
?>


