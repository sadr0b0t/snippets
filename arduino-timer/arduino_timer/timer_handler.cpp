#include "Arduino.h"

extern "C"{
    #include "timer_setup.h"
}

void init_handler() {
    // http://www.robotshop.com/letsmakerobots/arduino-101-timers-and-interrupts
    // 1. CPU frequency 16Mhz for Arduino
    // 2. maximum timer counter value (256 for 8bit, 65536 for 16bit timer)
    // 3. Divide CPU frequency through the choosen prescaler (16000000 / 256 = 62500)
    // 4. Divide result through the desired frequency (62500 / 2Hz = 31250)
    // 5. Verify the result against the maximum timer counter value (31250 < 65536 success) if fail, choose bigger prescaler.
    
    // Настроим и запустим таймер с периодом 20 миллисекунд (50 срабатываний в секунду == 50Гц):
    // prescaler=1:8, period=40000:
    // 16000000/8/50=40000 (50Hz - срабатывает 50 раз в секунду, т.е. каждые 20мс),
    // минус 1, т.к. считаем от нуля.
    // Обработчик прерывания от таймера - функция handle_interrupts 
    // (с заданными настройками будет вызываться каждые 20мс).
    initTimerISR(TIMER1, TIMER_PRESCALER_1_8, 40000-1);
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

    if(count == 50) {
        Serial.print("goodbye from timer: ");
        Serial.println(diff, DEC);

        digitalWrite(13, led_val);
        led_val = !led_val;

        count = 0;
    }
    count++;
}

