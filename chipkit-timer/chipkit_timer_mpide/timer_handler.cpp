#ifndef WProgram_h
    #include "WProgram.h"
#endif

extern "C"{
    #include "int.h"
}

#include "timer_handler.h"

void init_handler() {
    initISR(TIMER3);
}

int count = 50;
int led_val = 0;

void handle_interrupts(int timer, volatile unsigned int *TMRn, volatile unsigned int *PRn) {
    if(count == 0) {
        Serial.println("good by from timer");
        
        digitalWrite(13, led_val);
        led_val = !led_val;
        
        count = 50;
    }
    count--;
}

