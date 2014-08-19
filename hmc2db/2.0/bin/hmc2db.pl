#!/usr/bin/perl
# Program name: hmc2db.pl
# Purpose - Insert data from HMC lslparutil files to one DB (Derby/DB2/Oracle ...)
# Author - David López
# Disclaimer:  this provided "as is".  
# Date - 01/05/12
# Changes - 07/15/14 - Change cast string -> floating-point number to string -> unsiged integer
#
use warnings;
use strict;
use DBI;
use FileHandle;
use Time::Local;
use File::Basename;
use POSIX qw/strftime/;

my $lparutil2db_ver="1.1.1 Jul 15, 2014";

## 	Your Customizations Go Here            ##
#################################################

# Location of nmon files (need read/write access)
my $DIR_BASE="/opt/hmc2db";
my $DAT_DIR="$DIR_BASE/data"; # location of the nmon files 
my $LOG_DIR="$DIR_BASE/log";        # loc
my $LOG_FILE="$LOG_DIR/hmc2db.log"; # location of log of process

# Database connection
my $DBURL="DBI:mysql:database=HMCDB;host=localhost;port=3306";
my $DBUSER="hmc_adm";
my $DBPASS="hmc_adm00";

#################################################################
# End "Your Customizations Go Here".  
# You're on your own, if you change anything beyond this line :-)
# See below for more information on these variables
#################################################################

my $dbh;			# Connection to Database
my @lines;                      # Lines of file

####################################################################
#############		Main Program 			############
####################################################################

&main();

sub main() {

  my @list_files;			# List of files
  my $FILENAME;
  my $x;
  my $rc;
  my $serial_number;
  my $id_system;

  # You can run this script with a path to files NMON
  if( @ARGV ) {
    # Check if directory is correct
    die "Directory no valid\n" if ! -d $ARGV[0];
    $DAT_DIR=$ARGV[0];

    # Get name of directory for make a file name for log file
    my ($name,$path,$suffix) = fileparse($ARGV[0]);
    $LOG_FILE=$LOG_DIR . "/" . $name . ".log";
  }

  # Open file log
  eval {
    open FILELOG, ">>$LOG_FILE" or die "unable to open $LOG_FILE $!";
    FILELOG->autoflush(1);
  };
  if ($@) {
    print "ERROR - $@\n";
    return 1;
  }

  # First, check de connection with Database and check the data model
  $rc = &connect_db();
  if( $rc ne 0 ) {
    TRACE( "ERROR", "Don't connect to DB" );
    return 1;
  }

  # Process all "txt" files located in the $DAT_DIR directory
  # The processed files are either compressed with gzip (default) 
  opendir(DIR, $DAT_DIR );
  while( (my $filename = readdir(DIR))){
    next if $filename !~ /Server-(.+)-(.+)-SN(.+)_(.+).txt$/;
    push(@list_files, $DAT_DIR . "/" . $filename);
  }
  close(DIR);
  if (@list_files eq 0 ) { die ("No nmon or csv files found in $DAT_DIR\n"); }
  chomp(@list_files);
  
  # Process one to one file
  foreach $FILENAME ( @list_files ) {
    TRACE( "INFO", "Process $FILENAME" );

    # Get Name of System from FILENAME ("Server-<TYPE>-<MODEL>-SN<NUM_SERIE>_stats.txt)
    next if $FILENAME !~ /Server-(.+)-(.+)-SN(.+)_(.+).txt$/;
    $serial_number = $3;

    # Get ID from serial_number
    $id_system = &get_id_for_system($serial_number);
    if( $id_system < 1 ) {
      TRACE( "ERROR", "No posible get ID from System $serial_number" );
      $dbh->rollback;			# Rollback DB Transaction
      next;
    }

    # Read data from file
    if (( &get_data_from_file($FILENAME) ) gt 0 ) { 
      TRACE( "ERROR", "No valid data for this file" );
      $dbh->rollback;			# Rollback DB Transaction
      next;
    }

    ## Process PROC values
    if (( &process_pool_values($id_system) ) gt 0 ) { 
      TRACE( "ERROR", "No valid data for this file" );
      $dbh->rollback;			# Rollback DB Transaction
      next;
    }
    
    # Process PROCPOOL values
    if (( &process_procpool_values($id_system) ) gt 0 ) { 
      TRACE( "ERROR", "No valid data for this file" );
      $dbh->rollback;			# Rollback DB Transaction
      next;
    }

    # Process PROC values
    if (( &process_pool_values($id_system) ) gt 0 ) { 
      TRACE( "ERROR", "No valid data for this file" );
      $dbh->rollback;			# Rollback DB Transaction
      next;
    }

    # Process LPAR values
    if (( &process_lpar_values($id_system) ) gt 0 ) { 
      TRACE( "ERROR", "No valid data for this file" );
      $dbh->rollback;			# Rollback DB Transaction
      next;
    }

    # Make COMMIT
    $dbh->commit;				# Commit DB Transaction    

    TRACE( "INFO", "End processing $FILENAME");
  } # end foreach nmon_files
  exit 0;
}

###################################################################
### TRACE
###################################################################
sub TRACE {
  my $type    = $_[0];
  my $output  = $_[1];
  my $now     = strftime('%T',localtime);
  
  print FILELOG "$now $type $output\n";
}

##################################################################
## connect_db
##################################################################
sub connect_db {
  # This subroutine make a connection with DB and check then
  # data model
  
  eval {
    # Connect to Database
    $dbh = DBI->connect($DBURL, $DBUSER, $DBPASS, 
	    { RaiseError=>0,
	      PrintError=>0,
	      AutoCommit=>0,
	      HandleError=>\&dbierrorlog})
		   or die "ERROR: Error connection to DB $DBI::errstr\n"; 

    # Disabled Autocommit
     $dbh->{mysql_no_autocommit_cmd} = 1;
  };
  # Return error if there are some problem
  return 1 if $@;
    
  # All correct  
  return 0;
}

##################################################################
## dbierrorlog
##################################################################
sub dbierrorlog {
  # Process error DB
  TRACE( "ERROR", "Callback DBI Error\n" );
  TRACE( "ERROR", "$DBI::errstr \n" );
}

##################################################################
## get_field_value
##################################################################
sub get_field_value {
  ###	Get value for a field in one line
  ###	Syntax:                                      
  ###     get_setting($line,$field)

  my $line   = $_[0];
  my $field  = $_[1];
  my $value;
  my @fields;
  my @values;
  my $aux;
  
  # Get Fields with value included
  return if ! defined $line;
  return if ! defined $field;
  @fields = split(/,/, $line);

  # For each field, search the field to get value
  foreach $aux ( @fields ) {
    # Extract field name and value
    @values = split(/=/, $aux);
    next if $values[0] !~ $field;
    return $values[1];
  }
} # end get_field_value

##################################################################
## get_data_from_file
##################################################################
sub get_data_from_file {
  
  # Get data from file, extract timestamps
  my $FILENAME = $_[0];
  my $key;
  my @data;
  my $DAY; my $YR; my $MON;
  my $HR; my $MIN; my $SEC;
  my $value;
 
  # Read nmon file
  unless (open(FILE, $FILENAME)) { return(1); }
  @lines=<FILE>;  # input entire file
  close(FILE);
  chomp(@lines);

  TRACE("INFO", "End of read file");
  return(0);
} # end get_data_from_file

##################################################################
## convert_time
##################################################################
sub convert_time {
  ###	Convert time in HMC format to SQL format
  ###	Syntax:                                      
  ###     convert_time($time)
  
  my $time = $_[0];
  my $DAY; my $YR; my $MON;
  my $HR; my $MIN; my $SEC;
  my @data;
  
  # Check parameters
  return if ! defined $time;
  
  # Split date and time in two variables
  @data = split(/ /, $time);

  # Get date in format MM/DD/YYYY HH:MM:SS
  ($MON,$DAY,$YR)=split(/\//,$data[0]);  
  ($HR,$MIN,$SEC)=split(/:/,$data[1]);

  # Make date in SQL format
  $time = "$YR-$MON-$DAY-$HR.$MIN.$SEC.000000";
  return $time; 
}

##################################################################
## get_id_for_system
##################################################################
sub get_id_for_system {
  ###	Get ID from serial number from DB or create one
  ###	Syntax:                                      
  ###     get_id_for_system($serial_number)
  my $serial_number = $_[0];

  my $sql;                    # SQL Sentence
  my $sth_select;             # Pointer to process SQL to search element
  my $sth_insert;             # Pointer to process SQL to insert
  my @values_db;              # Values for insert/update
  my $id_system;

  # Check parameters
  return if ! defined $serial_number;
  
  # Search Num. Serial in table SYSTEM
  $sql = "SELECT ID FROM SYSTEM WHERE NUM_SERIE = '$serial_number'";
  $sth_select = $dbh->prepare($sql) || die( "error en la consulta\n");
  $sth_select->execute() || return -1;
  @values_db = $sth_select->fetchrow_array;

  if( @values_db < 1 ) {
    $sql = "INSERT INTO SYSTEM (NUM_SERIE) VALUES ( '$serial_number' )";
    $sth_insert = $dbh->prepare( $sql );
    $sth_insert->execute();
    $sth_select->execute();
    @values_db = $sth_select->fetchrow_array;
  }
  # Save the ID of the Name
  $id_system = $values_db[0];
  return $id_system;
}

##################################################################
## get_id_for_pool
##################################################################
sub get_id_for_pool {
  ###	Get ID from POOL name from DB or create one
  ###	Syntax:                                      
  ###     get_id_for_system($id_syste, $pool_name)

  my $id_system     = $_[0];
  my $pool_name     = $_[1];
  my $sql;                    # SQL Sentence
  my $sth_select;             # Pointer to process SQL to search element
  my $sth_insert;             # Pointer to process SQL to insert
  my @values_db;              # Values for insert/update
  my $id_pool;

  # Check parameters
  return if ! defined $id_system;
  return if ! defined $pool_name;
  
  # Search Num. Serial in table POOL
  $sql = "SELECT ID FROM POOL WHERE NAME = '$pool_name' AND SYSTEM = $id_system";
  $sth_select = $dbh->prepare($sql) || die( "error en la consulta\n");
  $sth_select->execute() || return -1;
  @values_db = $sth_select->fetchrow_array;

  if( @values_db < 1 ) {
    $sql = "INSERT INTO POOL (NAME, SYSTEM) VALUES ( '$pool_name', $id_system )";
    $sth_insert = $dbh->prepare( $sql );
    $sth_insert->execute();
    $sth_select->execute();
    @values_db = $sth_select->fetchrow_array;
  }
  # Save the ID of the Name
  $id_pool = $values_db[0];
  return $id_pool;
}

##################################################################
## get_id_for_lpar
##################################################################
sub get_id_for_lpar {
  ###	Get ID from LPAR name from DB or create one
  ###	Syntax:                                      
  ###     get_id_for_lpar($id_syste, $pool_name)

  my $id_system     = $_[0];
  my $lpar_name     = $_[1];
  my $sql;                    # SQL Sentence
  my $sth_select;             # Pointer to process SQL to search element
  my $sth_insert;             # Pointer to process SQL to insert
  my @values_db;              # Values for insert/update
  my $id_lpar;

  # Check parameters
  return if ! defined $id_system;
  return if ! defined $lpar_name;
  
  # Search Num. Serial in table POOL
  $sql = "SELECT ID FROM LPAR WHERE NAME = '$lpar_name' AND SYSTEM = $id_system";
  $sth_select = $dbh->prepare($sql) || die( "error en la consulta\n");
  $sth_select->execute() || return -1;
  @values_db = $sth_select->fetchrow_array;

  if( @values_db < 1 ) {
    $sql = "INSERT INTO LPAR (NAME, SYSTEM) VALUES ( '$lpar_name', $id_system )";
    $sth_insert = $dbh->prepare( $sql );
    $sth_insert->execute();
    $sth_select->execute();
    @values_db = $sth_select->fetchrow_array;
  }
  # Save the ID of the Name
  $id_lpar = $values_db[0];
  return $id_lpar;
}

##################################################################
## process_pool_values
##################################################################
sub process_pool_values {
  # Process lines for pool lines
  ###	Syntax:                                      
  ###     process_pool_values($id_system)

  my $id_system = $_[0];
  my @process_lines;
  my $line;
  my $value;
  my $date;
  my $total_cycles;
  my $prev_total_cycles;
  my $util_cycles;
  my $prev_util_cycles;
  my $max_pool_units;
  my $res_pool_units;
  my $total_cpu;
  my $util_cpu;
  my $sql;
  my $sth_delete;             # Pointer to process SQL to previous delete to insert
  my $sth_insert;             # Pointer to process SQL to insert

  # Get all lines with "resourcetype=pool"
  @process_lines = grep(/resource_type=pool/, @lines);

  # Clear variables
  $prev_total_cycles = 0;
  $prev_util_cycles = 0;

  # Prepare the SQL transactions
  $sql = "DELETE FROM PROC WHERE DATE = ? AND SYSTEM = $id_system";
  $sth_delete = $dbh->prepare($sql) || die( "error en la consulta\n");

  $sql = "INSERT INTO PROC (DATE, SYSTEM, CFG_CPU, NAS_CPU, UTIL_CPU) " .
            " VALUES (?, $id_system, ?, ?, ? )";
  $sth_insert = $dbh->prepare($sql) || die( "error en la consulta\n");

  # For each line, get values
  foreach my $line ( sort @process_lines ) {
    next if $line !~ /^time=/;
    next if $line !~ /event_type=sample/;
  
    # Get date and time and convert in SQL format
    $value = get_field_value($line, "time");
    next if ! defined $value;
    $date = convert_time($value);
    
    # Get values for get total CPUs in Pool
    $max_pool_units = get_field_value($line, "configurable_pool_proc_units");
    $res_pool_units = get_field_value($line, "borrowed_pool_proc_units");
    $total_cpu = $max_pool_units + $res_pool_units;
    
    # Get values for cycles for calculate Utilization's CPU
    $value = get_field_value($line, "total_pool_cycles");
    $total_cycles = $value;
    $value = get_field_value($line, "utilized_pool_cycles");
    $util_cycles = $value;
    
    # Calculate values utilization CPU
    if( $prev_total_cycles == 0 || $prev_util_cycles == 0 ) {
      # If there aren't previous values, calculate num. CPU utilization with
      # this values
      $util_cpu = sprintf ("%.2f",($util_cycles / $total_cycles ) * $total_cpu);
    }
    else {
      # If there are previous values, calculate with diff into previous and
      # current values
      eval {
	$util_cpu = sprintf ("%.2f",
	  (($util_cycles - $prev_util_cycles) / ($total_cycles - $prev_total_cycles))
								    * $total_cpu);
      };
      if( $@ ) {
	TRACE( "ERROR", "Error in calculate util_cpu");
	TRACE( "ERROR", "\t$@" );
	return 1;
      }
    }

    # Put the current values into previous variables
    $prev_util_cycles = $util_cycles;
    $prev_total_cycles = $total_cycles;
    
    # Insert values
    eval {
      $sth_delete->execute($date,  )
            or die "\tERROR-> DELETE PROCPOOL\n";
      $sth_insert->execute($date, $total_cpu, $res_pool_units, $util_cpu )
          or die "\tERROR-> WLM\n";
    };
    if( $@ ) {
      TRACE( "ERROR", "Error to insert/update data PROCPOOL");
      TRACE( "ERROR", "\t$@" );
      return 1;
    }
  }

  return 0;
}

##################################################################
## process_procpool_values
##################################################################
sub process_procpool_values {
  # Process lines for procpool lines
  ###	Syntax:                                      
  ###     process_procpool_values($id_system)

  my $id_system = $_[0];
  my @process_lines;
  my %pool_names;
  my $line;
  my $value;
  my $date;
  my $pool;
  my $time_cycles;
  my $total_cycles;
  my $prev_total_cycles;
  my $util_cycles;
  my $prev_util_cycles;
  my $total_cpu;
  my $util_cpu;
  my $sql;
  my $sth_delete;             # Pointer to process SQL to previous delete to insert
  my $sth_insert;             # Pointer to process SQL to insert
  my @values_db;              # Values for insert/update

  # Get all lines with "resourcetype=procpool"
  @process_lines = grep(/resource_type=procpool/, @lines);

  # First get all Pool Names and check if exists or not
  foreach my $line ( sort @process_lines ) {
    next if $line !~ /^time=/;
    $value = get_field_value($line, "shared_proc_pool_name");
    next if ! defined $value;
  
    # Next if exists the current pool
    next if exists $pool_names{$value};

    # Get value from DB for this Pool or create it
    $pool_names{$value} = get_id_for_pool($id_system, $value);
    if( $pool_names{$value} < 0 ) {
      TRACE("ERROR", "Can't get the ID for Pool: $value");
      return 1;
    }
  }
  
  # Prepare the SQL transactions
  $sql = "DELETE FROM POOLPROC WHERE DATE = ? AND SYSTEM = $id_system AND POOL = ?";
  $sth_delete = $dbh->prepare($sql) || die( "error en la consulta\n");

  $sql = "INSERT INTO POOLPROC (DATE, SYSTEM, POOL, CFG_CPU, UTIL_CPU) " .
            " VALUES (?, $id_system, ?, ?, ? )";
  $sth_insert = $dbh->prepare($sql) || die( "error en la consulta\n");
  
  # Now, for each Pool, get values
  foreach $pool (sort keys %pool_names ) {
    # Clear variables
    $prev_total_cycles = 0;
    $prev_util_cycles = 0;
    
    # For each line, get values
    foreach my $line ( sort @process_lines ) {
      next if $line !~ /^time=/;
      next if $line !~ /shared_proc_pool_name=$pool/;
      next if $line !~ /event_type=sample/;
    
      # Get date and time and convert in SQL format
      $value = get_field_value($line, "time");
      next if ! defined $value;
      $date = convert_time($value);
      
      # Get values for cycles for calculate Utilization's CPU
      $value = get_field_value($line, "time_cycles");
      $time_cycles = $value;
      $value = get_field_value($line, "total_pool_cycles");
      $total_cycles = $value;
      $value = get_field_value($line, "utilized_pool_cycles");
      $util_cycles = $value;
  
      # Get num CPUs in Pool
      $total_cpu = sprintf( "%d", ($total_cycles / $time_cycles) );
  
      # Calculate values utilization CPU
      if( $prev_total_cycles == 0 || $prev_util_cycles == 0 ) {
        # If there aren't previous values, calculate num. CPU utilization with
        # this values
        $util_cpu = sprintf ("%.2f",($util_cycles / $total_cycles ) * $total_cpu );
      }
      else {
        # If there are previous values, calculate with diff into previous and
        # current values
        $util_cpu = sprintf ("%.2f",
          (($util_cycles - $prev_util_cycles) / ($total_cycles - $prev_total_cycles))
                                                                    * $total_cpu );
      }
    
      # Put the current values into previous variables
      $prev_util_cycles = $util_cycles;
      $prev_total_cycles = $total_cycles;
      
      # Insert values
      eval {
        $sth_delete->execute($date, $pool_names{$pool} )
              or die "\tERROR-> DELETE PROCPOOL\n";
        $sth_insert->execute($date, $pool_names{$pool},$total_cpu, $util_cpu )
            or die "\tERROR-> WLM\n";
      };
      if( $@ ) {
        TRACE( "ERROR", "Error to insert/update data PROCPOOL");
        TRACE( "ERROR", "\t$@" );
        return 1;
      }
    }
  }

  return 0;
}

##################################################################
## process_lpar_values
##################################################################
sub process_lpar_values {
  # Process lines for procpool lines
  ###	Syntax:                                      
  ###     process_lpar_values($id_system)

  my $id_system = $_[0];
  my @process_lines;
  my %lpar_names;
  my $line;
  my $value;
  my $date;
  my $lpar;
  my $id_pool;
  my $name_pool;
  my $proc_mode;
  my $procs;
  my $proc_units;
  my $sharing_mode;
  my $mem;
  my $entitled_cycles;
  my $prev_entitle_cycles;
  my $capped_cycles;
  my $prev_capped_cycles;
  my $uncapped_cycles;
  my $prev_uncapped_cycles;
  my $total_cpu;
  my $util_cpu;
  my $sql;
  my $sth_delete;             # Pointer to process SQL to previous delete to insert
  my $sth_insert;             # Pointer to process SQL to insert
  my @values_db;              # Values for insert/update

  # Get all lines with "resourcetype=lpar"
  @process_lines = grep(/resource_type=lpar/, @lines);

  # First get all Pool Names and check if exists or not
  foreach my $line ( sort @process_lines ) {
    next if $line !~ /^time=/;
    next if $line !~ /event_type=sample/;
    $value = get_field_value($line, "lpar_name");
    next if ! defined $value;
  
    # Next if exists the current pool
    next if exists $lpar_names{$value};
    
    # Next if name contained "Full System"
    next if $value =~ /Full System/;

    # Get value from DB for this Pool or create it
    $lpar_names{$value} = get_id_for_lpar($id_system, $value);
    if( $lpar_names{$value} < 0 ) {
      TRACE("ERROR", "Can't get the ID for LPAR: $value");
      return 1;
    }
  }
  
  # Prepare the SQL transactions
  $sql = "DELETE FROM LPARPROC WHERE DATE = ? AND SYSTEM = $id_system AND LPAR = ?";
  $sth_delete = $dbh->prepare($sql) || die( "error en la consulta\n");

  $sql = "INSERT INTO LPARPROC (DATE, SYSTEM, LPAR, POOL, PROC_MODE, PROCS, " .
                  "PROC_UNITS, SHARING_MODE, MEM, UTIL_CPU) " .
            " VALUES (?, $id_system, ?, ?, ?, ?, ?, ?, ?, ? )";
  $sth_insert = $dbh->prepare($sql) || die( "error en la consulta\n");
  
  # Now, for each Pool, get values
  foreach $lpar (sort keys %lpar_names ) {
    # Clear variables
    $prev_entitle_cycles = 0;
    $capped_cycles = 0;
    $prev_capped_cycles = 0;
    $uncapped_cycles = 0;
    $prev_uncapped_cycles = 0;
    $id_pool = -1;
    $name_pool = "";
    
    @process_lines = grep(/lpar_name=$lpar,/, sort @lines);

    # For each line, get values
    foreach my $line ( sort @process_lines ) {
      next if $line !~ /^time=/;
      next if $line !~ /resource_type=lpar/;
      next if $line !~ /event_type=sample/;
      
      # Get value for field entitled_cycles for check if this LPAR is running or not
      $value = get_field_value($line, "entitled_cycles");
      $entitled_cycles = $value;
      next if $entitled_cycles == 0;

      # Get field for Pool assigned to LPAR
      $value = get_field_value($line, "curr_shared_proc_pool_name");
      next if ! defined $value;
      if( $value eq "" ) { $value = "DefaultPool"; }
      if( ($name_pool ne $value) ) {
        $name_pool = $value;
        $id_pool = get_id_for_pool($id_system, $value);
      }

      # Get date and time and convert in SQL format
      $value = get_field_value($line, "time");
      next if ! defined $value;
      $date = convert_time($value);
      
      # Get Values for info LPAR
      $value = get_field_value($line, "curr_proc_mode");
      if( $value eq "shared" ) {    $proc_mode = 1;    }
      elsif( $value eq "ded" ) {    $proc_mode = 2;    }
      else { next;  }
      
      $value = get_field_value($line, "curr_procs");
      $procs = sprintf( "%d", $value );

      $value = get_field_value($line, "curr_sharing_mode");
      if( $value eq "uncap" )  {    $sharing_mode = 1;    }
      elsif( $value eq "cap" ) {    $sharing_mode = 2;    }
      elsif( $value eq "share_idle_procs" )
                               {    $sharing_mode = 3;    }
      else { next;  }

      $value = get_field_value($line, "curr_procs");
      $procs = sprintf( "%f", $value );

      $value = get_field_value($line, "curr_mem");
      $mem = $value;

      # Calculate PROCS, and Utilization CPU for Shared Processor Mode
      if( $proc_mode == 1 ) {
        $value = get_field_value($line, "curr_proc_units");
        $proc_units = sprintf( "%f", $value );

      }
      # Calculate Utilization CPU for Dedicated Processor Mode
      else {
        # Fill values for Dedicated Proc. Mode
        $proc_units = $procs;
      }

      # Calculate Util CPU with formula :
      # ((capped_cycles + uncapped_cycles) / entitled_cycles) * curr_proc_units
      $value = get_field_value($line, "capped_cycles");
      $capped_cycles = $value;
      $value = get_field_value($line, "uncapped_cycles");
      $uncapped_cycles = $value;
      next if ($uncapped_cycles + $capped_cycles) == ($prev_uncapped_cycles + $prev_capped_cycles) ||
                ($prev_entitle_cycles == $entitled_cycles);
      if( ($prev_uncapped_cycles + $prev_capped_cycles) == 0 ||
                                            ($prev_entitle_cycles == 0) ) {
        $util_cpu = sprintf ("%.2f",
              (($capped_cycles + $uncapped_cycles) / $entitled_cycles) * $proc_units );
      }
      else {
        $util_cpu = sprintf ("%.2f",
              ((($prev_capped_cycles - $capped_cycles) +
                          ($prev_uncapped_cycles - $uncapped_cycles))
                        / ($prev_entitle_cycles - $entitled_cycles)) * $proc_units );
      }

      # Put the current values into previous variables
      $prev_uncapped_cycles = $uncapped_cycles;
      $prev_capped_cycles = $capped_cycles;
      $prev_entitle_cycles = $entitled_cycles;
      
      # Insert values
      eval {
        $sth_delete->execute($date, $lpar_names{$lpar} )
              or die "\tERROR-> DELETE PROCPOOL\n";
        $sth_insert->execute($date, $lpar_names{$lpar}, $id_pool,
                              $proc_mode, $procs, $proc_units, $sharing_mode,
                              $mem, $util_cpu )
            or die "\tERROR-> $date, $id_system, $lpar_names{$lpar}($lpar), $name_pool, $id_pool, $proc_mode, $procs, $proc_units, $sharing_mode, $mem, $util_cpu\n";
      };
      if( $@ ) {
        TRACE( "ERROR", "Error to insert/update data LPARPOOL");
        TRACE( "ERROR", "\t$@" );
        return 1;
      }
    }
  }

  return 0;
}
