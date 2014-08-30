#!/bin/sh 
setsid java -cp java-tcp-server-master-1.0-SNAPSHOT.jar edu.nntu.robotserver.RobotServer2 > robotserver.log 2>&1 &
echo $!>robotserver.pid

