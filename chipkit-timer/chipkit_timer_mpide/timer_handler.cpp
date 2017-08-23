#include "WProgram.h"

extern "C"{
    #include "timer_setup.h"
}

#include "timer_handler.h"

void init_handler() {
    // Настроим и запустим таймер с периодом 20 миллисекунд (50 срабатываний в секунду == 50Гц):
    // prescaler=1:64, adjustment=25000:
    // 80000000/64/25000=50 (срабатывает 50 раз в секунду, т.е. каждые 20мс)
    // Обработчик прерывания от таймера - функция handle_interrupts 
    // (с заданными настройками будет вызываться каждые 20мс).
    initTimerISR(TIMER3, TIMER_PRESCALER_1_64, 25000);
}

int count = 50;
int led_val = 0;

/**
 * Процедура, вызываемая прерыванием по событию таймера с заданным периодом.
 */
void handle_interrupts(int timer) {
    if(count == 0) {
        Serial.println("goodbye from timer");
        
        digitalWrite(13, led_val);
        led_val = !led_val;
        
        count = 50;
    }
    count--;
}

