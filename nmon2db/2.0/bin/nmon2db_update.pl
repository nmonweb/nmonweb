#!/usr/bin/perl
# Program name: nmon2db_update.pl
# Purpose - Insert data from nmon files to one DB (Derby/DB2/Oracle ...) without
# 		delete previous data
# Author - David López
# Disclaimer:  this provided "as is".  
# Date - 12/12/11
#
use warnings;
use strict;
use DBI;
use FileHandle;
use Time::Local;
use File::Basename;
use POSIX qw/strftime/;

my $nmon2db_ver="1.0.0 Dec 12, 2011";

## 	Your Customizations Go Here            ##
#################################################

# Location of nmon files (need read/write access)
my $NMON_DIR="/opt/ibm/nmon2db/data/nmon"; # location of the nmon files 
my $LOG_DIR="/opt/ibm/nmon2db/log";        # loc
my $LOG_FILE="$LOG_DIR/NMON.log"; # location of log of process

# Database connection
my $DBURL="DBI:mysql:database=NMONDB;host=localhost;port=3306";
my $DBUSER="nmon_adm";
my $DBPASS="nmon_adm00";

#################################################################
# End "Your Customizations Go Here".  
# You're on your own, if you change anything beyond this line :-)
# See below for more information on these variables
#################################################################

####################################################################
#			Overview
####################################################################
# This program provides the following functions
#  1. Insert nmon daily performance data (from multiple
#	partitions) into DB 
#  2. Provides configuration and AIX tuning change control
#
#  This was written for AIX servers, but will work with linux as well 
#  (Linux nmon provides different charts than AIX)
#  
#
#  Prereq's 
#  1. Web server
#     a. Web server 
#     b. perl
#     c. cron job to start "nmon2db.pl" script
#  2. AIX or Linux servers
#     a. nmon TOPAS-NMON lauch for smitty topas (Start Persistent nmon recording)
# 
#  Process
#  1. Use "nmon " on AIX/Linux partitions to collect performance data
#  2. Upload nmon data to a staging area ($NMON_DIR) on the web server 
#     a. Upload choices choices ftp, nfs, scp, rsync, .....
#     b. Adding servers is automatic.  The nmon2db.pl script will create
#	 all necessary Records in BBDD the first time it encounters 
#	 data from a new server.
#  3. Cron job on web server runs nmon2db.pl, which insert data 
#	into database for the web pages that connect to DB for show charts
#  4. Point web browser to provided index.html file
#  
#  Key files/directories
#  A. nmon files
#	1. Must have ".nmon" filename extension 
#	2. Location on web server = $NMON_DIR (or subdir). 
# 	   a. User id that runs nmon2db.pl  must have read/write access
#	3. After processing, the nmon files are gzip'd (save space, prevents 
#	   redundant processing). 
#  B. Web server directories
#	1. $HTTP_DIR is the parent directory for the HTML files
# 
####################################################################

####################################################################
#############		Main Program 			############
####################################################################

my $dbh;			# Connection to Database
my %sql_fields;			# Fields to update/insert to DB
				# Format: <category>, <field1, field2, ...>
my %proc_fields;		# Information of that fields of file NMON
				# must process
				# Format: <category>, <boolean, boolean, ...>
my %time_sample;		# Date for each sample in the file NMON
my $id_host;			# ID of the Host to process in this moment
my %map_tables;			# Map of tables to INSERT/UPDATE
my %map_fields;			# Map of fields of tables to INSERT/UPDATE
my %map_variable;
my %map_var_fields;
my @nmon;			# Lines of NMON file
my $start;			# Date of begin the process for information
my %MONTH2NUMBER;
my @MONTH2ALPHA;
my $HOSTNAME;
my $SN;
my $AIXVER;
my $VIOS;

&main();

sub main() {

  my @nmon_files;			# List of files
  my $FILENAME;
  my $x;
  my $rc;

  # You can run this script with a path to files NMON
  if( @ARGV ) {
    # Check if directory is correct
    die "Directory no valid\n" if ! -d $ARGV[0];
    $NMON_DIR=$ARGV[0];

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
  
  # Ccombine standard error with standard out, and both send to FILELOG
  #open STDOUT, "> $LOG_FILE";
  #open STDERR, '>&STDOUT';

  # First, check de connection with Database and check the data model
  $rc = &connect_db();
  if( $rc ne 0 ) {
    TRACE( "ERROR", "Don't connect to DB" );
    return 1;
  }

  # Initialize common variables
  &initialize;

  # Process all "nmon" files located in the $NMON_DIR directory
  # The processed files are either compressed with gzip (default) 
  @nmon_files=`ls $NMON_DIR/*.nmon 2>/dev/null`;
  #opendir(DIR, $NMON_DIR );
  #while( (my $filename = readdir(DIR))){
  #  next if $filename !~ /.nmon$/;
  #  push(@nmon_files, $NMON_DIR . "\\" . $filename);
  #}
  #close(DIR);
  if (@nmon_files eq 0 ) { die ("No nmon or csv files found in $NMON_DIR\n"); }
  chomp(@nmon_files);
  
  # Process one to one file
  foreach $FILENAME ( @nmon_files ) {
    # Initialize all variables tables and
    %sql_fields = ();
    %proc_fields = ();
    %time_sample = ();
    $id_host = -1;
    @nmon = ();
    $HOSTNAME = "";
    $SN = "";
    $VIOS = "";
    
    $start=time();
    TRACE( "INFO", "Process $FILENAME" );
    
    # Parse nmon file, skip if unsuccessful
    if (( &get_nmon_data($FILENAME) ) gt 0 ) { 
      TRACE( "ERROR", "No valid data for this file" );
      next;
    }
  
    # Begin DB transaction 
    $dbh->begin_work;

    # Check if is new in the database or change de Serie Number (Partition Mobility)
    if (( &check_host() ) gt 0 ) {
      &TRACE( "ERROR", "No valid data for this file" );
      $dbh->rollback;			# Rollback DB Transaction
      next;
    }
    
    # Prepare the data to insert to Database depeding the NMON version
    if ((&prepare_data() ) gt 0 ) {
      TRACE( "ERROR", "No valid data for this file" );
      $dbh->rollback;			# Rollback DB Transaction
      next;
    }
    
    ## Insert into tables all data from file NMON
    if ((&charge_samples() ) gt 0 ) {
      TRACE( "ERROR", "No valid data for this file" );
      $dbh->rollback;			# Rollback DB Transaction
      next;
    }

    # Process the hdisk Values
    #if ((&process_multi_values_in_same_line("VG")) gt 0 ) { next; }
    #if ((&process_multi_values_in_same_line("JFS")) gt 0 ) { next; }

    # Process all multiples values of one elements in the same line
    #if ((&process_multi_values_in_same_line("FC")) gt 0 ) { next; }
    #if ((&process_multi_values_in_same_line("NET")) gt 0 ) { next; }
    #if ((&process_multi_values_in_same_line("NETPACKET")) gt 0 ) { next; }
    #if ((&process_multi_values_in_same_line("NETSIZE")) gt 0 ) { next; }
    #if ((&process_multi_values_in_same_line("NETERROR")) gt 0 ) { next; }

    # Processs WLM data
    if ((&process_wlm_data()) gt 0 ) { next; }

    # Make COMMIT
    $dbh->commit;				# Commit DB Transaction    

    ## Compress the file to save space, 
    system("gzip","$FILENAME");
  
    TRACE( "INFO", "End processing $FILENAME");
    
  } # end foreach nmon_files
  exit 0;
}


############################################
#############  Subroutines 	############
############################################

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
	      AutoCommit=>1,
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
## initialize
##################################################################
sub initialize {
  %MONTH2NUMBER = ( "jan", 1, "feb",2, "mar",3, "apr",4, "may",5, "jun",6,
		    "jul",7, "aug",8, "sep",9, "oct",10, "nov",11, "dec",12 );
  @MONTH2ALPHA 	= ( "junk","jan", "feb", "mar", "apr", "may", "jun",
		    "jul", "aug", "sep", "oct", "nov", "dec" );
  
  # Map with data necesary for process variables lines of nmon with information
  # in various lines
  # Format: Hash of arrays whith two values and one hash
  #			<FIELD_WITH_NAMES_IN_NMON_FILES>,<TABLE_TO_INSERT>,
  #					'<FIELD_IN_NMON>,<FIELD_IN_BD>, ..., <FIELD_IN_NMON>,<FIELD_IN_BD>'
  %map_variable = (
	  DISK => [ 'BBBB', 'DISK',
		    'DISKBUSY,BUSY,DISKREAD,READ_,DISKWRITE,WRITE_,DISKXFER,XFER,DISKRXFER,RXFER,DISKBSIZE,KBSIZE,DISKSERV,SERV,DISKWAIT,WAIT' ],
	  VG => [ 'BBBVG', 'VG',
		    'VGBUSY,BUSY,VGREAD,READ_,VGWRITE,WRITE_,VGXFER,XFER,VGSIZE,SIZE' ],
	  JFS => [ '', 'JFS',
		    'JFSFILE,FILE_PCT,JFSINODE,INODE_PCT' ]
      );

  # Map with data necesary for process variables lines of nmon with information
  # in then same line and varios values for the same element
  # Format: Hash of arrays whith two values and one hash
  #			<CATEGORY IN NMON FILE>,<TABLE>, 
  #					'<FIELD_IN_NMON>,<FIELD_IN_BD>, ..., <FIELD_IN_NMON>,<FIELD_IN_BD>'
  %map_var_fields = (
	  FC => [ 'IOADAPT', 'FC', 
            'READ-KB/S,READ_,WRITE-KB/S,WRITE_,XFER-TPS,XFER' ],
    NET => [ 'NET', 'NET', 
            'READ-KB/S,READ_,WRITE-KB/S,WRITE_' ],
    NETSIZE => [ 'NETSIZE', 'NET',
            'READSIZE,SIZE_READ,WRITESIZE,SIZE_WRITE' ],
    NETPACKET => [ 'NETPACKET', 'NET',
            'READS/S,PACKET_READ,WRITES/S,PACKET_WRITE' ],
    NETERROR => [ 'NETERROR', 'NET',
            'IERRS,IERRS,OERRS,OERRS,COLLISIONS,COLLISIONS' ]
      );

  %sql_fields = ();
  %proc_fields = ();
  
} # end initialize


##################################################################
## get_nmon_data
##################################################################
sub get_nmon_data {
  
  # Get data from nmon file, extract specific data fields (hostname, date, ...)
  my $FILENAME = $_[0];
  my $key;
  my @cols;
  my @ZZZZ;
  my $DATE;
  my $NMONVER;
  my $i;
  my $j;
  my $DAY; my $MMM; my $YR; my $MON; my $m;
  my $HR; my $MIN; my $SEC;
  my @cols_aux;
  my @nmon2;
 
  # Read nmon file
  unless (open(FILE, $FILENAME)) { return(1); }
  @nmon2=<FILE>;  # input entire file
  close(FILE);
  chomp(@nmon);
  
  # Cleanup nmon data remove trailing commas and colons
  for($i=0; $i<@nmon2;$i++ ) {
      $nmon2[$i] =~ s/[:,]*\s*$//;
      # Joins lines for DISK* (DISKSIZE, DISREAD, etc.) that go in two or more lines
      # (DISKREAD and DISKREAD1, ...)
      @cols_aux = split(/,/, $nmon2[$i] );
      next if $cols_aux[0] !~ m/DISK(.*)\d$/;
      if( $i ne 0 ) {
	  for( $j = 2; $j < @cols_aux; $j++ ) {
	      $nmon2[$i-1] .= "," . $cols_aux[$j];
	  }
	  delete $nmon2[$i];
      }
  }
  
  # Put in the correct array the values
  for($i=0; $i<@nmon2;$i++ ) {
      next if not exists $nmon2[$i];
      push(@nmon, $nmon2[$i]);
  }
  
  # Block for validation
  eval {
    # Get nmon/server settings (search string, return column, delimiter)
    $AIXVER	=&get_setting("AAA,AIX",2,",");
    $VIOS	=&get_setting("AAA,VIOS",2,",");
    $DATE	=&get_setting("AAA,date",2,",");
    $HOSTNAME	=&get_setting("host",2,",");
    $NMONVER	=&get_setting("AAA,version",2,",");
  
    # Check NMON version 
    if ( $NMONVER !~ /TOPAS-NMON/ ) {
      TRACE("WARN", "This program is intended for nmon TOPAS-NMON. This file is nmon " . $NMONVER . ". Consider upgrading.");
    }

    # Correct problem with version v10
    if( $NMONVER =~ /v10r/) {
      # Search the line with MEM desc items
      foreach my $line (@nmon) {
	next if $line !~ m/^MEM,Memory/;
	# Subtitution for correct value
	$line =~ s/Real Free Virtual free Real free\(MB\)/Real Free \%,Virtual free \%,Real free\(MB\)/;
	last;
      }
      # This version haven't LPAR section. Make a calculation for this
      # and first add header line with that data add and get the CPU values 
      push(@nmon, "LPAR,Logical Partition XXXX,PhysicalCPU,virtualCPUs,logicalCPUs,VP_User%,VP_Sys%,VP_Wait%,VP_Idle%");
      my $logical_cpu = &get_setting("AAA,cpus",2,",");
      my $virtual_cpu = &get_setting("AAA,cpus",3,",");
      my $new_line;
      my $physical_cpu;
      my @data_aux;
      foreach my $line ( @nmon ) {
    	# Get all lines with CPU_ALL Values
	next if $line !~ m/^CPU_ALL,T/;
	@data_aux = ();
	@data_aux = split(",",$line);
	# Calculate the PhysicalCPU
	# CPU_ALL,TXXXX,User%,Sys%,Wait%,Idle%,Busy,CPUs
	#	0     1     2   3     4      5    6   7
	$physical_cpu = (($data_aux[2] + $data_aux[3] + $data_aux[4]) * $data_aux[7]) / 100;
	$new_line = "LPAR," . $data_aux[1] . "," . $physical_cpu . "," .
		      $virtual_cpu . "," . $logical_cpu . "," .
		      $data_aux[2] . "," . $data_aux[3] . "," .
		      $data_aux[4] . "," . $data_aux[5]; 
	push(@nmon, $new_line);	
      }
    }
    
    if ($AIXVER eq "-1") {
      $SN=$HOSTNAME; 	# Probably a Linux host
    } else {
      $SN	=&get_setting("AAA,SerialNumber",2,",");
      $SN =(split(/\s+/,$SN))[0]; # "systemid IBM,SN ..."
    }
  };
  if( $@ ) {
    TRACE( "ERROR", "Error to get nmon/server settings");
    TRACE( "ERROR", "\t$@" );
    return 1;
  }
  
  # Block for calculate TIME from NMON file
  eval {
    ##########
    # Calculate UTC time (seconds since 1970)
    # NMON V9  dd/mm/yy
    # NMON V10+ dd-MMM-yyyy
    if ( $DATE =~ /[a-zA-Z]/ ) {   # Alpha = assume dd-MMM-yyyy date format
      ($DAY, $MMM, $YR)=split(/\-/,$DATE);
      $MMM=lc($MMM);
      $MON=$MONTH2NUMBER{$MMM};
    } else {
      ($DAY, $MON, $YR)=split(/\//,$DATE);
      $YR=$YR + 2000;
      $MMM=$MONTH2ALPHA[$MON];
    } # end if
  };
  if( $@ ) {
    TRACE( "ERROR", "Error to eval Date format '$DATE' from nmon/server settings");
    TRACE( "ERROR", "\t$@" );
    return 1;
  }
  
  # Block for get the samples
  eval {    
    ## Format correct DATE/TIME for each sample (MM/DD/YYYY HH:MM:SS)
    # Fill the %UTC hash array
    @ZZZZ=grep(/^ZZZZ/, @nmon);
    for ($i=0; $i<@ZZZZ;$i++){
    
      @cols=split(/,/,$ZZZZ[$i]);
      $key=$cols[1]; # T0001....
      
      ($DAY,$m,$YR)=split(/-/,$cols[3]);  # $cols[3] = DD-MMM-YYYY
      ($HR,$MIN,$SEC)=split(/:/,$cols[2]);  # $cols[2] = HH:MM:SS
    
      # With NMON_TOPAS, the first record no have a correct date. In this case
      # fixes with the second record
      if( $i == 0 && $YR < 2000 ) {
        @cols_aux=split(/,/,$ZZZZ[$i+1]);
        ($DAY,$m,$YR)=split(/-/,$cols_aux[3]);  # $cols[3] = DD-MMM-YYYY
      }
    
      $m=lc($m);
      $m=$MONTH2NUMBER{$m}; # timelocal month = 0-11
      $MON = sprintf("%02d", $m );
  
      $time_sample{$cols[1]} = "$YR-$MON-$DAY-$HR.$MIN.$SEC.000000";
      $time_sample{"ENDTIME"} = $time_sample{$cols[1]};
    } # end for

    # Get the first SAMPLE
    $time_sample{"BEGINTIME"} = $time_sample{"T0001"};
  };
  if( $@ ) {
    TRACE( "ERROR", "Error to get SAMPLES from nmon/server settings");
    TRACE( "ERROR", "\t$@" );
    return 1;
  }
  TRACE("INFO", "End of read NMON file");
  return(0);
} # end get_nmon_data

##################################################################
## check_host
##################################################################
sub check_host {
  # Check if server exist in database or if change your serial number
  # If no exists, create new record and get your ID  

  my $select = "";
  my $cur = "";
  my @machine;
  my @types;
  my @hosts;
  my $id_machine;
  my $type;
  my $insert;

  # Block for check Host
  eval {
    # Get data for this hostname
    $select = "SELECT * FROM HOST WHERE name = '$HOSTNAME'";
    $cur = $dbh->prepare($select);
    $cur->execute() || return -1;
    @hosts = $cur->fetchrow_array;
    
    # If no exists, create this record
    if( @hosts le 1 ) {
      TRACE( "ERROR", "Error in CHECK_MACHINE");
      TRACE( "ERROR", "\t$@" );
      return 1;
    }
    # Save the ID of the host
    $id_host = $hosts[0];
  };
  if( $@ ) {
    TRACE( "ERROR", "Error in CHECK_HOST");
    TRACE( "ERROR", "\t$@" );
    return 1;
  }

  TRACE("INFO", "Finished check_host");
  return 0;
}

##################################################################
## prepare_data
##################################################################
sub prepare_data {
  # For each data to insert to database, check version NMON and
  # define the fields to fill
  my $cont;
  my $cont2;
  my $value;
  my $aux_proc_fields = "";
  my $aux_sql_fields = "";
  my @fields;
  my %convert;
  my $category;
  
  # Block for prepare_data
  eval {
    # For each category of data in the NMON file, search your correspondence in 
    # the name of table column in database
    foreach $category (keys(%map_fields)) {
      # Convert to hash the fields of this category, using key the name of the
      # field in the NMON file and value the name of table column in DB
      %convert = split(/,/, $map_fields{$category});
      $aux_proc_fields = "";
      $aux_sql_fields = "";
      
      # Search the first occurrance of $process and get all your fields
      for( $cont = 0; $cont < @nmon; $cont++ ) {
        if( $nmon[$cont] =~ /^$category,/ ) {
          @fields = split(",",$nmon[$cont]);
          # For each field found in file NMON ....
          for( $cont2 = 2; $cont2 < @fields; $cont2++ ) {
            if( $aux_proc_fields ne "" )	{ $aux_proc_fields .= ","; }
            
            # ... check if is necesary process this field, searching the column
            # table in DB that corresponding
            if( exists $convert{ $fields[$cont2]} ) {
            #if( $convert{$fields[$cont2]} ne "" ) {
              # This field must process
              $aux_proc_fields .= "true";
  
              # Save the column name of this field
              if( $aux_sql_fields ne "" )	{ $aux_sql_fields .= ","; }
              $aux_sql_fields .= $convert{$fields[$cont2]};
            }
            else {
              # This field no must process
              $aux_proc_fields .= "false";
            }
          }
          # Insert this category in the two hash whith information for prcesss
          # lines of data
          $sql_fields{$category} = $aux_sql_fields;
          $proc_fields{$category} = $aux_proc_fields;
          last;
        }
      }
    }
  };
  if( $@ ) {
    TRACE( "ERROR", "Error in PREPARE_DATA");
    TRACE( "ERROR", "\t$@" );
    return 1;
  }
  TRACE("INFO", "Finished prepare_data");
  return 0;
}

##################################################################
## charge_samples
##################################################################
sub charge_samples {
  # For each category configured, get data from file NMON and
  # get the ID for each sample. If sample is not exits, return error (no update)
  my $sample;
  my $select = "";
  my $id_sample;
  my $sth;
  my $category = "";
  my @lines;
  my @data_table;
  my @fields;
  my @process;
  my $table;
  my $operation;
  my $buffer;
  my $cont;
  my $field;
  my $i; my $j;
  my $aux;

  # Block for search each SAMPLE for this HOST, and get this ID
  eval {
    # Now, for each sample, get the unique id for this and insert into table
    $select = "SELECT id FROM SAMPLES WHERE DATE = ? AND " .
			" SERVER = ?";
    $sth = $dbh->prepare($select) || die( "error en la consulta\n");
    for my $sample ( sort keys %time_sample ) {
      next if $sample !~ /^T0/;
      # Insert the new samples
      
      # Get the unique Key
      $sth->execute($time_sample{$sample}, $id_host);
      ($id_sample) = $sth->fetchrow;
    
      # Now change the date for id_sample
      $time_sample{$sample} = $id_sample;
    }
  };
  if( $@ ) {
    TRACE( "ERROR", "Error in GET OLD SAMPLES" );
    TRACE( "ERROR", $@ );
    return 1;
  }

  TRACE("INFO", "Finished charge_samples");
  return 0;
}

##################################################################
## process_multi_values_in_same_line
##################################################################
sub process_multi_values_in_same_line {
  my $type_process = $_[0];
  # Process the NET, NET..., IOADAPT, ... with multiples values
  # in the same line. In the first line, put the element and category
  # in one field
  # Example:
  #NET,Network I/O ORAPRO1,en4-read-KB/s,en5-read-KB/s,lo0-read-KB/s,en4-write-KB/s,en5-write-KB/s,lo0-write-KB/s
  #NETPACKET,Network Packets ORAPRO1,en4-reads/s,en5-reads/s,lo0-reads/s,en4-writes/s,en5-writes/s,lo0-writes/s
  #NETSIZE,Network Size ORAPRO1,en4-readsize,en5-readsize,lo0-readsize,en4-writesize,en5-writesize,lo0-writesize
  
  my @lines;                  # Lines of nmon to process
  my $line_search;            # Type of line to filter nmon lines
  my @elements;               # Elements to process (fcs0, net, ...)
  my $element;                # Current element 
  my @fields;                 # Fields in the first line of nmon for this category
                              # need for know the position of each element/value
  my @values;                 # Values of fields nmon's line
  my @data_table;             # Data of insert in the Database
  my @pos_fields;             # Array with position for each field to insert into Database
  my %convert;                # Map with fields of table with corresponding with fields in nmon lines
  my $category;               # Category 
  my $sql_table;              # Name of table to insert values
  my @sql_fields;             # Name of fields in table to insert/update
  my $cont_fields;            # Aux. cont for num_fields
  my $sql;                    # SQL Sentence
  my $sth_select;             # Pointer to process SQL to search element
  my $sth_insert;             # Pointer to process SQL to insert
  my $sth_update;             # Pointer to process SQL to update
  my @values_db;              # Values for insert/update
  my $id_name;                # ID element in Database
  my $cont;                   # Aux. cont 
  my $num_line;               # Aux. cont num lines
  my $num_field;              # Aux. cont num fields
  my $aux; my $aux2;          # Aux. variables
    
  # Get of HASH %map_var_fields the data to process
  if( not exists $map_var_fields{$type_process} ) {
    TRACE( "ERROR", "Not found in map_var_fields the key $type_process\n");
    return 1;
  }
  $line_search = $map_var_fields{$type_process}[0];
  $sql_table 	= $map_var_fields{$type_process}[1];
  %convert 	= split(/,/, $map_var_fields{$type_process}[2]);

  # Get the "elements" (network interfaces, ioadapter, ...)  from first line
  # in NMON file for first line that process for this category
  # Samples:
  # JFSFILE,JFS Filespace %Used <host>,/,/home,/usr,/var,/tmp,...
  # NET,Network I/O <host>,en10-read-KB/s,lo0-read-KB/s,en10-write-KB/s,lo0-write-KB/s
  # SEA,Shared Ethernet Adapter <host>,ent10-read-KB/s,ent10-write-KB/s
  # IOADAPT,Disk Adapter <host>,sissas1_read-KB/s,sissas1_write-KB/s,sissas1_xfer-tps
  @lines = grep( /^$line_search/, @nmon);
  return 1 if @lines < 1;
  @fields = split(/,/, $lines[0] );
  for( $cont = 2; $cont < @fields; $cont++ ) {
      $aux = $fields[$cont];
      # Eliminate from field since first ocurrence of "_" or "-", only if not
      # is a path
      if( substr($aux, 1, 1) ne "/" ) {
        ($aux) = $aux =~ /^([^_]*)/;
        if( $aux eq $fields[$cont] ) {
          ($aux) = $aux =~ /^([^-]*)/;
        }
      }
      push(@elements, $aux);
  }
  # Remove duplicate elements (NET, SEA, ...)
  my %aux_hash = map { $_, 1 } @elements;
  @elements = keys %aux_hash;
  if( scalar @elements == 0 ) {
      TRACE("ERROR", "Don't process_variables_values - No valid fields found");
      return 1;
  }

  # Get all lines of nmon with begin that corresponding with the type of
  # line to search 
  @lines = grep( /^$line_search,/, @nmon);

  # Now, for each element, search values in nmon file and insert into table
  for $element (sort @elements ) {
    # Clear arrays to use in each element
    @data_table = ();
    @values = ();
    @pos_fields = ();
    @sql_fields = ();
    $cont_fields = 0;
    
    # Find the fields to insert into database and the number of field in the line
    for my $category ( sort keys %convert ) {
      for( $num_field = 2; $num_field < @fields; $num_field++ ) {
        # Only process the fields that begin with the current element
        next if $fields[$num_field] !~ /^$element/;
  
        # Get only string between <element>_<field>
        $aux = $fields[$num_field];
        ($aux) = $aux =~ /_(.*)/;
        unless( $aux ) {
          ($aux) = $fields[$num_field] =~ /-(.*)/;
        }
        if( $category eq uc($aux) ) {
          push( @sql_fields, $convert{$category} );
          $pos_fields[$cont_fields] = $num_field;
          $cont_fields++;
          last;
        }
      }
    }
    if( $cont_fields == 0 ) {
      TRACE("ERROR", "Don't process_variables_values - No valid fields found");
      return 1;
    }
    
    # Now, with fields and data to insert, Get the ID for this element
    $sql = "SELECT ID FROM " . $sql_table . "_NAMES " .
                          "WHERE SERVER = $id_host AND NAME = '$element'";
		
    $sth_select = $dbh->prepare($sql) || die( "error en la consulta\n");
    $sth_select->execute() || return -1;
    @values_db = $sth_select->fetchrow_array;
    
    # If no exists, create this record
    if( @values_db < 1 ) {
      $sql = "INSERT INTO " . $sql_table . "_NAMES (server, NAME) VALUES " .
                                                "($id_host, '$element')";
      $sth_insert = $dbh->prepare( $sql );
      $sth_insert->execute();
      $sth_select->execute();
      @values_db = $sth_select->fetchrow_array;
    }
    # Save the ID of the Name
    $id_name = $values_db[0];

    # Prepare the SQL sentence
    $sql = "INSERT INTO $sql_table (";
    for( $cont = 0; $cont < @sql_fields; $cont++ ) {
        if( $cont eq 0 ) { $sql .= $sql_fields[$cont]; }
        else { $sql.= ", $sql_fields[$cont]"; }
    }
    $sql .= ", ID_SAMPLE, ID_NAME) VALUES ( ";
    for( $cont = 0; $cont < $cont_fields; $cont++ ) {
        if( $cont ne 0 ) { $sql .= ", "; }
        $sql.= "? "; 
    }
    $sql .= ", ?, ? )";
    $sth_insert = $dbh->prepare($sql) || die( "error en la consulta\n");

    # Prepare the SQL sentence
    $sql = "UPDATE $sql_table SET ";
    for( $cont = 0; $cont < $cont_fields; $cont++ ) {
        if( $cont ne 0 ) { $sql .= ", "; }
        $sql.= "$sql_fields[$cont] = ? ";
    }
    $sql .= " WHERE ID_SAMPLE = ? AND ID_NAME = ? ";
    $sth_update = $dbh->prepare($sql) || die( "error en la consulta\n");

    $sql = "SELECT COUNT(*) FROM $sql_table " .
                        "WHERE ID_SAMPLE = ? AND ID_NAME = ?";
    $sth_select = $dbh->prepare($sql) || die( "error en la consulta\n");

    # Get values for all lines of nmon for this category, skip the first line,
    # that has the name of fields
    for( $num_line = 1; $num_line < @lines; $num_line++ ) {
      # Get fields of the line
      @values = split(/,/, $lines[$num_line]);
      @data_table = ();
    
      for $num_field (@pos_fields) {
        push (@data_table, $values[$num_field]);
      }
      # Add to array of number of id_sample and element
      push( @data_table, $time_sample{$values[1]} );
      push( @data_table, $id_name );
    
      # Check if exists now values for this sample and element
      eval {
        $sth_select->execute($time_sample{$values[1]}, $id_name)
              or die "\tERROR-> $element\n";
        @values_db = $sth_select->fetchrow_array;
        if( $values_db[0] != 0 ) {
        	$sth_update->execute(@data_table)
      		    or die "\tERROR-> $element\n";
        }
        else {
        	$sth_insert->execute(@data_table)
      		    or die "\tERROR-> $element\n";
        }
      };
      return 1 if $@;
    }
  }

  TRACE("INFO", "Finished process_variables_values " . $type_process);
  return 0;
}

##################################################################
## process_wlm_data
##################################################################
sub process_wlm_data {
  # Process the WLM data
  # Example:
  #   WLMCPU,T0001,0,0,0,0,33,40,0,7,0,0
  #   WLMMEM,T0001,0,27,1,16,25,44,0,1,3,1
  #   WLMBIO,T0001,0,0,0,0,0,0,0,0,0,0
  
  my @lines;                  # Lines of nmon to process
  my $line;
  my @wlm_class;              # Class of WLM
  my $class;
  my $id_class;               # Id Class in DB
  my @categories;             # Category of data (WLMCPU, WLMMEM or WLMBIO)
  my $category;               # Category 
  my @values;                 # Values of fields nmon's line
  my $cont;                   # Aux. cont 

  my $sql;                    # SQL Sentence
  my $sth_select;             # Pointer to process SQL to search element
  my $sth_insert;             # Pointer to process SQL to insert
  my $sth_update;             # Pointer to process SQL to update
  my @values_db;              # Values for insert/update
  my $cpu_value;
  my $mem_value;
  my $bio_value;

  my %data = ();              # Map with data for all Timestamp
  my @wlm_data;               # Array con wlm data in the map
  my $timestamp;

  my $num_line;               # Aux. cont num lines
  my $num_field;              # Aux. cont num fields

  my @data_table;             # Data of insert in the Database
  my $sql_table;              # Name of table to insert values

  # Clear all variables
  @lines = ();
  @wlm_class = ();

  # Before for all, check if WLM is active
  @lines = grep( /^BBBP,\d+,wlmcntrl -q,/, @nmon);
  for $line (@lines ) {
    if( $line =~ /stopped/ ) {
      TRACE( "INFO", "WLM not active. No data" );
      return 0;
    }
  }

  # Add to WLM defaults Class (Unclassified, Unmanaged, Default, Shared, System)
  @wlm_class = ( "Unclassified", "Unmanaged", "Default", "Shared", "System" );

  # Get WLM class defined by user. Get this values for BBBP lines, search field
  # WLMclasses
  #   Example: BBBP,1697,WLMclasses,"Shared:"
  @lines = grep( /^BBBP,\d+,WLMclasses,/, @nmon);
  for $line (@lines ) {
    @values = split(/,/, $line);
    $class = $values[3];
    $class =~ s/"+//g; $class =~ s/:$//;
    next if $class =~ /^\t/;
    next if ($class =~ /^System$/ || $class =~ /^Default$/ || $class =~ /^Shared$/);
    next if $class eq "";

    push(@wlm_class, $class)
  }

  # For each category get all data and insert/update into Database
  # ----------------------------------------------------------------------------
  for( $cont = 0; $cont < @wlm_class; $cont++ ) {
    # Clear variables
    %data = ();
    @wlm_data = ();
    $class = $wlm_class[$cont];

    # Search Class ID from Name or create new Class Name
    $sql = "SELECT ID FROM WLM_CLASS " .
                          "WHERE SERVER = $id_host AND NAME = '$class'";
  
    $sth_select = $dbh->prepare($sql) || die( "error en la consulta\n");
    $sth_select->execute() || return -1;
    @values_db = $sth_select->fetchrow_array;
    
    # If no exists, create this record
    if( @values_db < 1 ) {
      $sql = "INSERT INTO WLM_CLASS (server, NAME) VALUES " .
                                                "($id_host, '$class')";
      $sth_insert = $dbh->prepare( $sql );
      $sth_insert->execute();
      $sth_select->execute();
      @values_db = $sth_select->fetchrow_array;
    }
    # Save the ID of the Name
    $id_class = $values_db[0];

    # Prepare the SQL sentence
    $sql = "INSERT INTO WLM ( CPU, MEM, BIO, ID_SAMPLE, ID_NAME) " .
            "VALUES ( ?, ?, ?, ?, ? )";
    $sth_insert = $dbh->prepare($sql) || die( "error en la consulta\n");
  
    # Prepare the SQL sentence
    $sql = "UPDATE WLM SET CPU = ?, MEM = ?, BIO = ? " . 
              " WHERE ID_SAMPLE = ? AND ID_NAME = ? ";
    $sth_update = $dbh->prepare($sql) || die( "error en la consulta\n");
  
    $sql = "SELECT COUNT(*) FROM WLM " .
                        "WHERE ID_SAMPLE = ? AND ID_NAME = ?";
    $sth_select = $dbh->prepare($sql) || die( "error en la consulta\n");

    # For each timestamp create a new array and insert into map
    %data = ();
    for $timestamp ( sort keys(%time_sample) ) {
      next if $timestamp =~ /TIME$/;

      # Get all lines with this timestamp and begin with 
      @data_table = (); $cpu_value = $mem_value = $bio_value = 0;
      @lines = grep( /^(WLMCPU|WLMMEM|WLMBIO),$timestamp,/, @nmon);

      # And for each line, get values
      for $line (@lines) {
        @values = split(/,/, $line);
        # For each type of data, get the column that corresponding for class
        if( $values[0] eq "WLMCPU" ) {
          $cpu_value = $values[$cont+2];
        } elsif( $values[0] eq "WLMMEM" ) {
          $mem_value = $values[$cont+2];
        } elsif( $values[0] eq "WLMBIO" ) {
          $bio_value = $values[$cont+2];
        } else {
          TRACE( "ERROR: WLM type of data not valid: $values[0]\n");
          return -1;
        }
      }

      # Add to array of data all data for insert/update
      push( @data_table, $cpu_value );
      push( @data_table, $mem_value );
      push( @data_table, $bio_value );
      push( @data_table, $time_sample{$timestamp} );
      push( @data_table, $id_class );

      # Check if exists now values for this sample and element
      eval {
        $sth_select->execute($time_sample{$timestamp}, $id_class)
              or die "\tERROR-> WLM\n";
        @values_db = $sth_select->fetchrow_array;
        if( $values_db[0] != 0 ) {
          $sth_update->execute(@data_table)
              or die "\tERROR-> WLM\n";
        }
        else {
          $sth_insert->execute(@data_table)
              or die "\tERROR-> WLM\n";
        }
      };
      if( $@ ) {
        TRACE( "ERROR", "Error to insert/update data WLM");
        TRACE( "ERROR", "\t$@" );
        return 1;
      }
    }
  }
    
  TRACE("INFO", "Finished process_wlm_data ");
  return 0;
}

##################################################################
## get_setting
##################################################################
sub get_setting {
  ###	Get an nmon setting from csv file            
  ###	finds first occurance of $search             
  ###	Return the selected column...$return_col     
  ###	Syntax:                                      
  ###     get_setting($search,$col_to_return,$separator)

  my $i;
  my $value="-1";
  my ($search,$col,$separator)= @_;    # search text, $col, $separator
  
  for ($i=0; $i<@nmon; $i++){
  
    if ($nmon[$i] =~ /$search/ ) {
      $value=(split(/$separator/,$nmon[$i]))[$col];
      $value =~ s/["']*//g;  #remove non alphanum characters
      return($value);
    } # end if
    
  } # end for
  
  return($value);
} # end get_setting

##################################################################
## dbierrorlog
##################################################################
sub dbierrorlog {
  # Process error DB
  TRACE( "ERROR", "Callback DBI Error\n" );
  TRACE( "ERROR", "$DBI::errstr \n" );
}

###################################################################
### dbierrorlog
###################################################################
sub TRACE {
  my $type    = $_[0];
  my $output  = $_[1];
  my $now     = strftime('%D %T',localtime);
  
  print FILELOG "$now $type $output\n";
}
