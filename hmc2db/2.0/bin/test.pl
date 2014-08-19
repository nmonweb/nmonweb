#!/usr/bin/perl

my $value = 0;
my $value_floating = 0;
my $value_integer = 0;

my $value2 = 0;
my $value_floating2 = 0;
my $value_integer2 = 0;

my $diff = 0;
my $diff_floating = 0;
my $diff_integer = 0;

$value = "29475469380148796";
$value_floating = sprintf("%e", $value);
$value_integer = sprintf("%u", $value );
print "Value 1: $value -> Floating: $value_floating -> Unsigned: $value_integer\n";

$value2 = "29475469380148700";
$value_floating2 = sprintf("%e", $value2);
$value_integer2 = sprintf("%u", $value2 );
print "Value 2: $value2 -> Floating: $value_floating2 -> Unsigned: $value_integer2\n";

$diff = $value - $value2;
$diff_floating = $value_floating - $value_floating2;
$diff_integer = $value_integer - $value_integer2;
print "Diff: $diff -> Floating: $diff_floating -> Unsigned: $diff_integer\n";

