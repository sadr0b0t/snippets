#include "Arduino.h"

extern "C"{
    #include "timer_setup.h"
}

void init_handler() {
    // http://www.atmel.com/Images/Atmel-11057-32-bit-Cortex-M3-Microcontroller-SAM3X-SAM3A_Datasheet.pdf
    // https://store.arduino.cc/usa/arduino-due
    // https://www.arduino.cc/en/Guide/ArduinoDue
    
    // Настроим и запустим таймер с периодом 20 миллисекунд (50 срабатываний в секунду == 50Гц):
    // prescaler=1:128, adjustment=13125:
    // 84000000/128/50=13125 (50Hz - срабатывает 50 раз в секунду, т.е. каждые 20мс),
    // минус 1, т.к. считаем от нуля.
    // Обработчик прерывания от таймера - функция handle_interrupts
    // (с заданными настройками будет вызываться каждые 20мс).
    initTimerISR(TIMER1, TIMER_PRESCALER_1_128, 13125-1);
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

