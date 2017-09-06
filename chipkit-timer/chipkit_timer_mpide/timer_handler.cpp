#include "WProgram.h"

extern "C"{
    #include "timer_setup.h"
}

#include "timer_handler.h"

void init_handler() {
    // Настроим и запустим таймер с периодом 20 миллисекунд (50 срабатываний в секунду == 50Гц):
    // prescaler=1:64, adjustment=25000-1:
    // 80000000/64/25000=50 (срабатывает 50 раз в секунду, т.е. каждые 20мс),
    // минус 1, т.к. считаем от нуля.
    // Обработчик прерывания от таймера - функция handle_interrupts 
    // (с заданными настройками будет вызываться каждые 20мс).
    initTimerISR(TIMER3, TIMER_PRESCALER_1_64, 25000-1);
}

/**
 * Процедура, вызываемая прерыванием по событию таймера с заданным периодом.
 */
void handle_interrupts(int timer) {
    static int led_val = 0;
    static unsigned long prev_time = 0;
    static int count = 0;
    

    unsigned long _time = micros();
    unsigned long diff = _time-prev_time;
    prev_time = _time;
    
    if(count == 0) {
        Serial.print("goodbye from timer: ");
        Serial.println(diff, DEC);
        
        digitalWrite(13, led_val);
        led_val = !led_val;
        
        count = 50;
    }
    count--;
}

