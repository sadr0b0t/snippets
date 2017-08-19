#include"timer_handler.h"

void setup() {
    Serial.begin(9600);
    
    init_handler();
    pinMode(13, OUTPUT);
}

void loop() {
    Serial.println("Hello from loop!");
    delay(5000);
}

