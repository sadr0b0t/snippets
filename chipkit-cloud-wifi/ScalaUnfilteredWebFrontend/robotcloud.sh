#!/bin/sh 
setsid java -jar scala-unfiltered-web-frontend-1.0-SNAPSHOT.jar > robotcloud.log 2>&1 &
echo $!>robotcloud.pid

