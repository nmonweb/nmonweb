#!/usr/bin/perl

use warnings;
use strict;
use DBI;
use Time::Local;
use POSIX qw/strftime/;

my $DATE = "04- -2112";
&check_date();

$DATE = "04-DEC-2112";
&check_date();

$DATE = "04-JUN-2114";
&check_date();

$DATE = "04-JUN-2014";
&check_date();

$DATE = "04-DEC-2014";
&check_date();

$DATE = "04-JAN-2014";
&check_date();


sub check_date() {
    
    my $DAY; my $MMM; my $YR; my $MON; my $m;
    my $HR; my $MIN; my $SEC;
    my %MONTH2NUMBER;
    my @MONTH2ALPHA;
      my $current_year  = strftime('%Y',localtime);
    
      %MONTH2NUMBER = ( "jan", 1, "feb",2, "mar",3, "apr",4, "may",5, "jun",6,
                        "jul",7, "aug",8, "sep",9, "oct",10, "nov",11, "dec",12, "", 0 );
      @MONTH2ALPHA 	= ( "junk","jan", "feb", "mar", "apr", "may", "jun",
                        "jul", "aug", "sep", "oct", "nov", "dec" );
    
      # Block for calculate TIME from NMON file
      eval {
        ##########
        # Calculate UTC time (seconds since 1970)
        # NMON V9  dd/mm/yy
        # NMON V10+ dd-MMM-yyyy
        if ( $DATE =~ /[a-zA-Z\s]/ ) {   # Alpha = assume dd-MMM-yyyy date format
          ($DAY, $MMM, $YR)=split(/\-/,$DATE);
          $MMM=lc($MMM);
          $MON=$MONTH2NUMBER{$MMM};
          $MON = 0 if not defined $MON;
    
          # End of modification      
        } else {
          ($DAY, $MON, $YR)=split(/\//,$DATE);
          $YR=$YR + 2000;
          $MON=$MONTH2ALPHA[$MON];
          $m=0 if not defined $m;
        } # end if
      };
      if( $@ ) {
        TRACE( "ERROR", "Error to eval Date format '$DATE' from nmon/server settings");
        TRACE( "ERROR", "\t$@" );
        return 1;
      }
    
        if ( $YR > $current_year or $MON == 0 ) {
          $YR-= 100;		# APAR Add 100 years to date and remove one month
          $MON+= 1;
          if ( $MON > 12 ) {
            $MON=01;
            $YR+=1;
          }
        }
    
        print "$DATE -> $YR-$MON-$DAY\n";
}