#!/usr/bin/perl
# Program name: alert_aix.pl
# Purpose - Looking at data from the last day alerts AIX machines
#	    concerning consumption of CPU, memory, etc.. sending an
#	    email to one or more mailboxes.
# Author - David L—pez San Juan
# Disclaimer:  this provided "as is".
# License: GNU
# Date - 02/02/14
#
use warnings;
use strict;
use DBI;
use FileHandle;
use Time::Local;
use POSIX qw/strftime/;
use MIME::Lite;
use HTML::Table;

my $alert_aix="1.1.0 Feb 02, 2014";

## 	Your Customizations Go Here            ##
#################################################

# Location of nmon files (need read/write access)
my $LOG_DIR="/opt/nmon2db/log";        # loc
my $LOG_FILE="$LOG_DIR/alert_aix.log"; # location of log of process

# Database connection
my $DBURL="DBI:mysql:database=NMONDB;host=localhost;port=3306";
my $DBUSER="nmon_adm";
my $DBPASS="nmon_adm00";

# Mail address to send alerts
my $MAIL_DEST="mybox\@my_domain.com";

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

&main();

sub main() {

  my $start_date;
  my $end_date;
  my $body 		= "";

  # Get yesterday day complete
  my ($sec, $min, $hour, $mday, $mon, $year) = localtime();
  my $yesterday_midday=timelocal(0,0,12,$mday,$mon,$year) - 24*60*60;
  ($sec, $min, $hour, $mday, $mon, $year) = localtime($yesterday_midday);
  $start_date = sprintf("%4d-%02d-%02d 00:00:00", $year+1900, $mon, $mday);
  $end_date = sprintf("%4d-%02d-%02d 23:59:59", $year+1900, $mon, $mday);
  
  # Open file log
  eval {
    open FILELOG, ">>$LOG_FILE" or die "unable to open $LOG_FILE $!";
    FILELOG->autoflush(1);
  };
  if ($@) {
    print "ERROR - $@\n";
    return 1;
  }
  
  ## Ccombine standard error with standard out, and both send to FILELOG
  #open STDOUT, "> $LOG_FILE";
  #open STDERR, '>&STDOUT';
  
  # First, check de connection with Database and check the data model
  my $rc = &connect_db();
  if( $rc ne 0 ) {
    TRACE( "ERROR", "Don't connect to DB" );
    return 1;
  }

  # Process
  # ---------------------------------------------------------------------------
  $body .= get_wait_high($start_date, $end_date);

  ## Memory
  ## ---------------------------------------------------------------------------
  $body .= get_memory_fscache_low($start_date, $end_date);
  $body .= get_memory_mem_virtual_low($start_date, $end_date);
  $body .= get_memory_mem_high_low($start_date, $end_date);
  
  # Page
  # ----------------------------------------------------------------------------
  $body .= get_memory_page_high($start_date, $end_date);
  
  # Network
  # ----------------------------------------------------------------------------
  $body .= get_network_high($start_date, $end_date);

  # FC
  # ----------------------------------------------------------------------------
  $body .= get_fc_high($start_date, $end_date);

  # WLM
  # ----------------------------------------------------------------------------
  $body .= get_wlm_high($start_date, $end_date);

  sendMail( $MAIL_DEST, $MAIL_DEST, "Alertas AIX", $body);

  eval {
    open FILEHTML, ">/var/www/htdocs/aix/nmonweb/avisos.html" or die "unable to open HTML $!";
    FILELOG->autoflush(1);
  };
  
  print FILEHTML <<HTML;
    <html>
      <head>
       <title>Avisos AIX</title>
      </head>
      <body>
       $body
     </body>
    </html>
HTML

  close( FILEHTML );

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
## dbierrorlog
##################################################################
sub dbierrorlog {
  # Process error DB
  TRACE( "ERROR", "Callback DBI Error\n" );
  TRACE( "ERROR", "$DBI::errstr \n" );
}

###################################################################
### TRACE 
###################################################################
sub TRACE {
  my $type    = $_[0];
  my $output  = $_[1];
  my $now     = strftime('%D %T',localtime);
  
  print FILELOG "$now $type $output\n";
}

###################################################################
### sendMail
###################################################################
sub sendMail {
  my $addr_from = $_[0];
  my $addr_to 	= $_[1];
  my $subject 	= $_[2];
  my $message	= $_[3];

  my $msg = MIME::Lite->new(
		   From     => $addr_from,
		   To       => $addr_to,
		   Subject  => $subject,
		   Type     => 'multipart/mixed'
		   );
                 
  # Add your text message.
  $msg->attach(Type         => 'text/html',
	       Data         => qq{ <body> $message </body> }
	      );
            
  $msg->send;
}

###################################################################
### get_wait_high
###################################################################
sub get_wait_high {
  my $start_date= $_[0];
  my $end_date	= $_[1];
  my $select 	= "";
  my $output 	= "";
  my $sth;             # Pointer to process SQL to search element
  my @row;
  my $MAX_VALUE = 5;

  # Query to DB
  $select = "SELECT HOST.NAME, MAX(LPAR.VP_WAIT_PCT)
	      FROM SAMPLES SMP, LPAR, HOST, ENVIRONMENT ENV
	      WHERE SMP.DATE BETWEEN '$start_date' AND '$end_date'
	       AND  SMP.ID = LPAR.ID_SAMPLE 
	       AND  LPAR.VP_WAIT_PCT > $MAX_VALUE
	       AND  SMP.SERVER = HOST.ID
	       AND  HOST.ENVIRONMENT = ENV.ID
	       AND  ENV.NAME = 'PRO'
	      GROUP BY HOST.NAME
	    UNION 
	      SELECT HOST.NAME, MAX(CPU_ALL.WAIT)
	      FROM SAMPLES SMP, CPU_ALL, HOST, ENVIRONMENT ENV
	      WHERE SMP.DATE BETWEEN '$start_date' AND '$end_date'
	       AND  SMP.ID = CPU_ALL.ID_SAMPLE 
	       AND  CPU_ALL.WAIT > $MAX_VALUE
	       AND  SMP.SERVER = HOST.ID
	       AND  HOST.ENVIRONMENT = ENV.ID
	       AND  ENV.NAME = 'PRO'
	      GROUP BY HOST.NAME
	    ORDER BY 1";
  $sth = $dbh->prepare($select);
  $sth->execute
       or die "SQL Error: $DBI::errstr\n";

  # If no data, return empty
  if( $DBI::rows == 0 ) { return ""; }

  # Format the output
  my $title = "Alto porcentaje de Wait";
  my @head = ( "Máquina", "Wait Máximo" );
  my @data = ( );
  push @data, [ @head ];
  while (@row = $sth->fetchrow_array) {
    push @data, [ @row ];
  }
  return to_html_table($title, @data );
}

###################################################################
### get_memory_fscache_low
###################################################################
sub get_memory_fscache_low {
  my $start_date= $_[0];
  my $end_date	= $_[1];
  my $select 	= "";
  my $output 	= "";
  my $sth;             # Pointer to process SQL to search element
  my @row;

  # Query to DB
  $select = "SELECT HOST.NAME, MIN(MEMORY.FSCACHE_PCT), MINPERM_PCT
	      FROM SAMPLES SMP, MEMORY, HOST, ENVIRONMENT ENV
	      WHERE SMP.DATE BETWEEN '$start_date' AND '$end_date'
	       AND  SMP.ID = MEMORY.ID_SAMPLE 
	       AND  MEMORY.FSCACHE_PCT <= MEMORY.MINPERM_PCT
	       AND  SMP.SERVER = HOST.ID
	       AND  HOST.ENVIRONMENT = ENV.ID
	       AND  ENV.NAME = 'PRO'
	      GROUP BY HOST.NAME
	      ORDER BY 1";
  $sth = $dbh->prepare($select);
  $sth->execute
       or die "SQL Error: $DBI::errstr\n";

  # If no data, return empty
  if( $DBI::rows == 0 ) { return ""; }

  # Format the output
  my $title = "Porcentaje de FS cache por debajo del mínimo";
  my @head = ( "Máquina", "% Minimo alcanzado", "% Min. Configurado" );
  my @data = ( );
  push @data, [ @head ];
  while (@row = $sth->fetchrow_array) {
    push @data, [ @row ];
  }
  return to_html_table($title, @data );
}

###################################################################
### get_memory_mem_virtual_low
###################################################################
sub get_memory_mem_virtual_low {
  my $start_date= $_[0];
  my $end_date	= $_[1];
  my $select 	= "";
  my $output 	= "";
  my $sth;             # Pointer to process SQL to search element
  my @row;
  my $MAX_VALUE	= 90;

  # Query to DB
  $select = "SELECT HOST.NAME, MIN(MEMORY.VIRTUAL_FREE_PCT)
	      FROM SAMPLES SMP, MEMORY, HOST, ENVIRONMENT ENV
	      WHERE SMP.DATE BETWEEN '$start_date' AND '$end_date'
	       AND  SMP.ID = MEMORY.ID_SAMPLE 
	       AND  MEMORY.VIRTUAL_FREE_PCT <= $MAX_VALUE
	       AND  SMP.SERVER = HOST.ID
	       AND  HOST.ENVIRONMENT = ENV.ID
	       AND  ENV.NAME = 'PRO'
	      GROUP BY HOST.NAME
	      ORDER BY 1;";
  $sth = $dbh->prepare($select);
  $sth->execute
       or die "SQL Error: $DBI::errstr\n";

  # If no data, return empty
  if( $DBI::rows == 0 ) { return ""; }

  # Format the output
  my $title = "Memoria virtual usada elevada";
  my @data = ( );
  push @data, [ ( "Máquina", "% Memoria virtual usada" ) ];
  while (@row = $sth->fetchrow_array) {
    push @data, [ @row ];
  }
  return to_html_table($title, @data );
}

###################################################################
### get_memory_mem_high_low 
###################################################################
sub get_memory_mem_high_low {
  my $start_date= $_[0];
  my $end_date	= $_[1];
  my $select 	= "";
  my $output 	= "";
  my $sth;             # Pointer to process SQL to search element
  my @row;
  my $MAX_VALUE	= 80;

  # Query to DB
  $select = "SELECT HOST, FORMAT(TOTAL_MEMORY,2)
	      FROM ( 
		      SELECT HOST.NAME AS HOST, AVG(MEMORY.PROCESS_PCT+MEMORY.SYSTEM_PCT) AS TOTAL_MEMORY
		      FROM SAMPLES SMP, MEMORY, HOST, ENVIRONMENT ENV
		      WHERE SMP.DATE BETWEEN '$start_date' AND '$end_date'
		       AND  SMP.ID = MEMORY.ID_SAMPLE 
		       AND  SMP.SERVER = HOST.ID
		       AND  HOST.ENVIRONMENT = ENV.ID
		       AND  ENV.NAME = 'PRO'
		      GROUP BY HOST.NAME
	      ) DAT
	      WHERE TOTAL_MEMORY > $MAX_VALUE
	      ORDER BY 1;";
  $sth = $dbh->prepare($select);
  $sth->execute
       or die "SQL Error: $DBI::errstr\n";

  # If no data, return empty
  if( $DBI::rows == 0 ) { return ""; }

  # Format the output
  my $title = "Memoria alta (sin FS cache)";
  my @data = ( );
  push @data, [ ( "Máquina", "% Memoria ocupada de media" ) ];
  while (@row = $sth->fetchrow_array) {
    push @data, [ @row ];
  }
  return to_html_table($title, @data );
}

###################################################################
### get_memory_page_high 
###################################################################
sub get_memory_page_high {
  my $start_date= $_[0];
  my $end_date	= $_[1];
  my $select 	= "";
  my $output 	= "";
  my $sth;             # Pointer to process SQL to search element
  my @row;
  my $MAX_VALUE	= 80;

  # Query to DB
  $select = "SELECT HOST, DATO1, DATO2
	    FROM (
		    SELECT HOST.NAME AS HOST, MAX(PGSIN) AS DATO1, MAX(PGSOUT) AS DATO2
		    FROM SAMPLES SMP, PAGE, HOST, ENVIRONMENT ENV
		    WHERE SMP.DATE BETWEEN '$start_date' AND '$end_date'
		     AND  SMP.ID = ID_SAMPLE 
		     AND  SMP.SERVER = HOST.ID
		     AND  HOST.ENVIRONMENT = ENV.ID
		     AND  ENV.NAME = 'PRO'
		    GROUP BY HOST.NAME
		    ) DAT
	    WHERE DAT.DATO1 > $MAX_VALUE
	     OR   DAT.DATO2 > $MAX_VALUE";
  $sth = $dbh->prepare($select);
  $sth->execute
       or die "SQL Error: $DBI::errstr\n";

  # If no data, return empty
  if( $DBI::rows == 0 ) { return ""; }

  # Format the output
  my $title = "Alta paginación";
  my @data = ( );
  push @data, [ ( "Máquina", "Máximo PageIn", "Máximo PageOut" ) ];
  while (@row = $sth->fetchrow_array) {
    push @data, [ @row ];
  }
  return to_html_table($title, @data );
}

###################################################################
### get_network_high 
###################################################################
sub get_network_high {
  my $start_date= $_[0];
  my $end_date	= $_[1];
  my $select 	= "";
  my $output 	= "";
  my $sth;             # Pointer to process SQL to search element
  my @row;
  my $MAX_VALUE	= 100;		# MB/s
  my $MAX_VALUE2 = 10;

  # Query to DB
  $select = "SELECT HOST, DATO1, DATO2, DATO3, DATO4, DATO5
	    FROM (
		    SELECT HOST.NAME AS HOST, format(MAX(READ_) / 1024, 2) AS DATO1, 
			FORMAT(MAX(WRITE_) / 1024, 2) AS DATO2,
			MAX(IERRS) AS DATO3, MAX(OERRS) AS DATO4, MAX(COLLISIONS) AS DATO5
		    FROM SAMPLES SMP, NET, HOST, ENVIRONMENT ENV
		    WHERE SMP.DATE BETWEEN '$start_date' AND '$end_date'
		     AND  SMP.ID = ID_SAMPLE 
		     AND  SMP.SERVER = HOST.ID
		     AND  HOST.ENVIRONMENT = ENV.ID
		     AND  ENV.NAME = 'PRO'
		    GROUP BY HOST.NAME
		    ) DAT
	    WHERE DAT.DATO1 > $MAX_VALUE
	     OR   DAT.DATO2 > $MAX_VALUE
	     OR   DAT.DATO3 > $MAX_VALUE2
	     OR   DAT.DATO4 > $MAX_VALUE2
	     OR   DAT.DATO5 > $MAX_VALUE2";
  $sth = $dbh->prepare($select);
  $sth->execute
       or die "SQL Error: $DBI::errstr\n";

  # If no data, return empty
  if( $DBI::rows == 0 ) { return ""; }

  # Format the output
  my $title = "Utilización red alta";
  my @data = ( );
  push @data, [ ( "Máquina", "Máximo Lecturas (MB/s)", "Máximo Escrituras (MB/s)",
		    "Errores Lectura", "Errores Escritura", "Colisiones" ) ];
  while (@row = $sth->fetchrow_array) {
    push @data, [ @row ];
  }
  return to_html_table($title, @data );
}

###################################################################
### get_fc_high 
###################################################################
sub get_fc_high  {
  my $start_date= $_[0];
  my $end_date	= $_[1];
  my $select 	= "";
  my $output 	= "";
  my $sth;             # Pointer to process SQL to search element
  my @row;
  my $MAX_VALUE	= 100;		# MB/s

  # Query to DB
  $select = "SELECT HOST, DATO1, DATO2
	    FROM (
		    SELECT HOST.NAME AS HOST, format(MAX(READ_) / 1024, 2) AS DATO1, 
			FORMAT(MAX(WRITE_) / 1024, 2) AS DATO2
		    FROM SAMPLES SMP, FC, HOST, ENVIRONMENT ENV
		    WHERE SMP.DATE BETWEEN '$start_date' AND '$end_date'
		     AND  SMP.ID = ID_SAMPLE 
		     AND  SMP.SERVER = HOST.ID
		     AND  HOST.ENVIRONMENT = ENV.ID
		     AND  ENV.NAME = 'PRO'
		    GROUP BY HOST.NAME
		    ) DAT
	    WHERE DAT.DATO1 > $MAX_VALUE
	     OR   DAT.DATO2 > $MAX_VALUE";
  $sth = $dbh->prepare($select);
  $sth->execute
       or die "SQL Error: $DBI::errstr\n";

  # If no data, return empty
  if( $DBI::rows == 0 ) { return ""; }

  # Format the output
  my $title = "Utilización FC alta";
  my @data = ( );
  push @data, [ ( "Máquina", "Máximo Lecturas (MB/s)", "Máximo Escrituras (MB/s)" ) ];
  while (@row = $sth->fetchrow_array) {
    push @data, [ @row ];
  }
  return to_html_table($title, @data );
}

###################################################################
### get_wlm_high 
###################################################################
sub get_wlm_high  {
  my $start_date= $_[0];
  my $end_date	= $_[1];
  my $select 	= "";
  my $output 	= "";
  my $sth;             # Pointer to process SQL to search element
  my @row;

  # Query to DB
  $select = "SELECT HOST, DATO1, DATO2, DATO3
	      FROM (
		    SELECT HOST.NAME AS HOST, WLM_CLASS.NAME AS DATO1, 
						    MAX(WLM.CPU) AS DATO2,
						    MAX(WLM.MEM) AS DATO3
		    FROM SAMPLES SMP, WLM, WLM_CLASS, HOST, ENVIRONMENT ENV
		    WHERE SMP.DATE BETWEEN '$start_date' AND '$end_date'
		       AND  SMP.ID = ID_SAMPLE
		       AND  WLM.ID_NAME = WLM_CLASS.ID
		       AND  WLM_CLASS.NAME IN ('System', 'ITM', 'arcsight', 'SYSDIR')
		       AND  SMP.SERVER = HOST.ID
		       AND  HOST.ENVIRONMENT = ENV.ID
		       AND  ENV.NAME = 'PRO'
		      GROUP BY HOST.NAME, WLM_CLASS.NAME
		      ) DAT
	      WHERE (DATO1 = 'System' 
		 AND (DAT.DATO2 > 25
		      OR   DAT.DATO3 > 50 ))
	      OR (DATO1 <> 'System'
		 AND (DAT.DATO2 > 5
		      OR   DAT.DATO3 > 10 ))
	      ORDER BY 2, 1";
  $sth = $dbh->prepare($select);
  $sth->execute
       or die "SQL Error: $DBI::errstr\n";

  # If no data, return empty
  if( $DBI::rows == 0 ) { return ""; }

  # Format the output
  my $title = "WLM - Utilización CPU/Memoria alta";
  my @data = ( );
  push @data, [ ( "Máquina", "Clase WLM", "% Proceso", "% Memoria" ) ];
  while (@row = $sth->fetchrow_array) {
    push @data, [ @row ];
  }
  return to_html_table($title, @data );
}

###################################################################
### to_html_table
###################################################################
sub to_html_table {
  my ($title, @data ) = @_;
  my $line;

  # Get number of columns and rows
  my $columns = $#{$data[0]} + 1;
  my $rows = $#data + 1;
  if( $columns == 0 || $rows == 0 ) {
    return;
  }

  ## Format the output
  my $output = "<h3>$title</h3>";
  my $html_table = new HTML::Table(
			    -rows=>$rows,
                            -cols=>$columns,
			    -align=>'center',
                            -rules=>'rows',
			    -width=>'50%',
			    -spacing=>0,
                            -padding=>0,
			    -style=>'background:#D8D8D8',
                            -border=>0 );

  $html_table->setColWidth(1, '250px');
  for my $i ( 0 .. $#data ) {
    for my $j ( 0 .. $#{ $data[$i] } ) {
      $html_table->setCell($i+1, $j+1, $data[$i][$j]);
      if( $j != 0 ) { $html_table->setCellAlign($i+1, $j+1, 'center'); }
      if( $j != 0 && $i != 0 ) { $html_table->setCellBGColor($i+1, $j+1, 'white'); }
    }
  }
  $html_table->setRowHead(1);
  $output .= $html_table->getTable();
  return $output;
}



