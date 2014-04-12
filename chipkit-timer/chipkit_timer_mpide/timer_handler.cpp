#ifndef WProgram_h
    #include "WProgram.h"
#endif

extern "C"{
    #include "timer_setup.h"
}

#include "timer_handler.h"

void init_handler() {
    // Настроим и запустим таймер с периодом 20миллисекунд (50 срабатываний в секунду):
    // prescalar=1:64, period=0x61A8:
    // 80000000/64/0x61A8=50 (срабатывает 50 раз в секунду, т.е. каждые 20мс)
    // Обработчик прерывания от таймера - функция handle_interrupts 
    // (с заданными настройками будет вызываться каждые 20мс).
    initTimerISR(TIMER3, TIMER_PRESCALAR_1_64, 0x61A8);
}

int count = 50;
int led_val = 0;

/**
 * Процедура, вызываемая прерыванием по событию таймера с заданным периодом.
 */
void handle_interrupts(int timer) {
    if(count == 0) {
        Serial.println("good by from timer");
        
        digitalWrite(13, led_val);
        led_val = !led_val;
        
        count = 50;
    }
    count--;
}

