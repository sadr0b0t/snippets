#!/bin/sh 
setsid java -jar scala-unfiltered-webapp-demo-1.0-SNAPSHOT.jar > webapp.log 2>&1 &
echo $!>webapp.pid

