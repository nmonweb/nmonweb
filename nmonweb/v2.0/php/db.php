<?php
    # ---------------------------------------------------------------------------------------------
    # Name:     dbconnect
    # Function:    Connect to DB MySQL with parameters in INI file
    # Return:    Connection Object    
    # ---------------------------------------------------------------------------------------------
    function dbconnect()
    {
        # Parsed ini file 
        $parameters = parse_ini_file('/Users/david/.nmonweb.ini', true);
        
        # Check if exists all parameters
        if( ! $parameters['DB_NMONWEB']['host'] || ! $parameters['DB_NMONWEB']['user'] ||
            ! $parameters['DB_NMONWEB']['password'] || ! $parameters['DB_NMONWEB']['dbname'] ||
            ! $parameters['DB_NMONWEB']['port'] ) {
            die ('Missing parameters for connecto to DB');
        }
        
        $dbcon = new mysqli($parameters['DB_NMONWEB']['host'], $parameters['DB_NMONWEB']['user'],
                    $parameters['DB_NMONWEB']['password'], $parameters['DB_NMONWEB']['dbname'],
                    $parameters['DB_NMONWEB']['port'], $parameters['DB_NMONWEB']['socket'])
               or die ('Could not connect to the database server' . mysqli_connect_error());

        if( $parameters["DB_NMONWEB"]['lc_time_names'] ) {
            $dbcon->query("SET lc_time_names = '" . $parameters['DB_NMONWEB']['lc_time_names'] . "'");
        }
        
        return $dbcon;
    }

    # ---------------------------------------------------------------------------------------------
    # Name:     db_query_date_data
    # Function:    Execute SQL and return data in format:
    #                [ {"date:": "YYYY-MM-DD HH:MM:SS", "data1": XXXXX, "data2": YYYY },
    #                   {"date:": "YYYY-MM-DD HH:MM:SS", "data1": XXXXX, "data2": YYYY },
    #                   ......
    #                   {"date:": "YYYY-MM-DD HH:MM:SS", "data1": XXXXX, "data2": YYYY } ]
    # Parameters:
    #           SQL. The first field is a Date
    #           Name of host
    #           Begin Date
    #           End Date
    # Return:    Data 
    # ---------------------------------------------------------------------------------------------
    function db_query_date_data( $query, $host, $fromdate, $todate ) {
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
                if( $field_count == 0 ) {
                    $jsondata[$num_row]['date'] = $val;
                }
                else {
                    $jsondata[$num_row]['data' . $field_count ] = $val;
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

    # ---------------------------------------------------------------------------------------------
    # Name:     db_query_date_group_data
    # Function:    Execute SQL and return data in format:
    #                [ {"date:": "YYYY-MM-DD HH:MM:SS", "FIELD_NAME1": XXXXX },
    #                   {"date:": "YYYY-MM-DD HH:MM:SS", "FIELD_NAME2": YYYY },
    #                   ......
    #                   {"date:": "YYYY-MM-DD HH:MM:SS", "FIELD_NAME1": XXXX },
    #                   {"date:": "YYYY-MM-DD HH:MM:SS", "FIELD_NAME2": YYYY } ]
    #           but the Query return only DATE, FIELD_NAME and VALUE. Put the first field with
    #           the date (is the first field in SQL sentence), but get the name of the second
    #           field from second field of row, and the value from the three field of the row
    # Parameters:
    #           SQL. The first field is a Date
    #           Name of host
    #           Begin Date
    #           End Date
    # Return:    Data 
    # ---------------------------------------------------------------------------------------------
    function db_query_date_group_data( $query, $host, $fromdate, $todate ) {
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
        $stmt->bind_param( "sss", $host, $fromdate, $todate );

        // Execute SQL and get result
        $stmt->execute();

        // Get fields to bind_result
        $meta = $stmt->result_metadata();
        while ( $field = $meta->fetch_field() ) {
            $parameters[] = &$row[$field->name]; 
        }
        call_user_func_array(array($stmt, 'bind_result'), $parameters);

        // Get all keys for array with fields names
        $keys = array_keys($row);

        // Process the result
        while ( $stmt->fetch() ) {
            $jsondata[$num_row]['date'] = $row[$keys[0]];
            $jsondata[$num_row][ $row[$keys[1]] ] = $row[$keys[2]];
            $num_row++;
        }        
        
        // Close SQL
        $stmt->close();
        $dbcon->close();
        
        // Encode result to JSON format
        echo json_encode($jsondata);
    }    

    # ---------------------------------------------------------------------------------------------
    # Name:     db_query_calendar_group
    # Function:    Execute SQL and return data in format:
    #                [ {"date:": "YYYY-MM-DD HH:MM:SS", "FIELD_NAME1": XXXXX },
    #                   {"date:": "YYYY-MM-DD HH:MM:SS", "FIELD_NAME2": YYYY },
    #                   ......
    #                   {"date:": "YYYY-MM-DD HH:MM:SS", "FIELD_NAME1": XXXX },
    #                   {"date:": "YYYY-MM-DD HH:MM:SS", "FIELD_NAME2": YYYY } ]
    #           but the Query return only DATE, FIELD_NAME and VALUE. Put the first field with
    #           the date (is the first field in SQL sentence), but get the name of the second
    #           field from second field of row, and the value from the three field of the row.
    #           Before call to query, fill a temporary table CALENDAR for get all values for
    #           one period
    # Parameters:
    #           SQL. The first field is a Date
    #           Name of host
    #           Begin Date
    #           End Date
    # Return:    Data 
    # ---------------------------------------------------------------------------------------------
    function db_query_calendar_group( $query, $id_host, $fromdate, $todate ) {
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
        
        // First fill calendar only with date range
        $proc_query = "call fill_calendar('" . $fromdate . "', '" . $todate . "')";
        $resul = mysqli_query($dbcon, $proc_query );

        // Prepare SQL sentence
        if( !($stmt = $dbcon->prepare($query)) ) {
            echo "Error: $dbcon->error() ";
            $dbcon->close();
            return;
        }
            
        // Prepare parameters
        if( $id_host == 999 ) {
            $stmt->bind_param( "ss", $fromdate, $todate );
        }
        else {
            $stmt->bind_param( "issi", $id_host, $fromdate, $todate, $id_host );
        }

        // Execute SQL and get result
        $stmt->execute();

        // Get fields to bind_result
        $meta = $stmt->result_metadata();
        while ( $field = $meta->fetch_field() ) {
            $parameters[] = &$row[$field->name]; 
        }
        call_user_func_array(array($stmt, 'bind_result'), $parameters);

        // Get all keys for array with fields names
        $keys = array_keys($row);

        // Process the result
        while ( $stmt->fetch() ) {
            $jsondata[$num_row]['date'] = $row[$keys[0]];
            $jsondata[$num_row][ $row[$keys[1]] ] = $row[$keys[2]];
            $num_row++;
        }        
        
        // Close SQL
        $stmt->close();
        $dbcon->close();
                
        // Encode result to JSON format
        echo json_encode($jsondata);
    }    

    # ---------------------------------------------------------------------------------------------
    # Name:     db_query_with_fields_name
    # Function:    Execute SQL and return data in format:
    #                [ {"date:": "YYYY-MM-DD HH:MM:SS", "FIELD_NAME1": XXXXX },
    #                   {"date:": "YYYY-MM-DD HH:MM:SS", "FIELD_NAME2": YYYY },
    #                   ......
    #                   {"date:": "YYYY-MM-DD HH:MM:SS", "FIELD_NAME1": XXXX },
    #                   {"date:": "YYYY-MM-DD HH:MM:SS", "FIELD_NAME2": YYYY } ]
    #           The field name is the same that field in SQL sentence
    # Parameters:
    #           SQL. The first field is a Date
    #           Name of host
    #           Begin Date
    #           End Date
    # Return:    Data 
    # ---------------------------------------------------------------------------------------------
    function db_query_with_fields_name( $query, $id_host, $fromdate, $todate ) {
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
        $stmt->bind_param( "sss", $id_host, $fromdate, $todate );

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

//        $result = $stmt->get_result();
//        $finfo = $result->fetch_fields();
//    
//        // Get number of fields
//        $cont = 0;
//        $jsondata = '';
//        
//        // First field is date, and second the data, and the nexts, values
//        while ($row = $result->fetch_array(MYSQLI_NUM)) {
//            for( $row_count = 0; $row_count < $result->field_count; $row_count++ ) {
//                if( $finfo[$row_count]->type == 253 ) {
//                    $jsondata[$cont][ utf8_encode($finfo[$row_count]->name) ] = utf8_encode($row[$row_count]);
//                }
//                else {
//                    $jsondata[$cont][ utf8_encode($finfo[$row_count]->name) ] = $row[$row_count];
//                }
//            }
//            $cont++;
//        }
//
        // Close SQL
        $stmt->close();
        $dbcon->close();
        
        // Encode result to JSON format
        echo json_encode($jsondata);
    }    
?>
