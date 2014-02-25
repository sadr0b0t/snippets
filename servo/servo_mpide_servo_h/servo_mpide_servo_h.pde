#include <Servo.h> 

// Объект "серво-мотор" для управления серво-мотором
Servo servo1; 
void setup() 
{ 
  servo1.attach(8);  // подключаем мотор к 9му пину 
} 
 
void loop() 
{
    // исходное положение 0 градусов
    servo1.write(0);
    delay(1000);
    // повернули на 90 градусов
    servo1.write(90);
    delay(1000);
    // повернули на 180 градусов
    servo1.write(180);
    delay(1000);
}

