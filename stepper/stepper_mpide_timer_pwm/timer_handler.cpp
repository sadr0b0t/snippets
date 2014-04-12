#ifndef WProgram_h
    #include "WProgram.h"
#endif

extern "C"{
    #include "timer_setup.h"
}

#include "timer_handler.h"

//// Информация о подключении 1 мотора через драйвер step-dir:

// Подача периодического импульса HIGH/LOW будет вращать мотор
int motor1_pin_pulse;
// Направление (1 - в одну сторону, 0 - в другую)
int motor1_pin_dir;
// Вкл (1)/выкл (0) мотор
int motor1_pin_en;

// задержка между импульсами для мотора, мкс
int motor1_pulse_delay = 500;

//// Настройки для текущего цикла шагов.

// Количество шагов в текущей серии
int motor1_step_count;
// Задержка между 2мя шагами мотора (определяет скорость вращения, 
// 0 для максимальной скорости)
int motor1_step_delay;

//// Динамика

// Счетчик шагов для текущей серии (убывает)
int motor1_step_counter;
// Счетчик микросекунд для текущего шага (убывает)
int motor1_step_timer;

// Частота таймера, мкс
int timer_freq_us = 10; 

/**
 * Задать настройки подключения для мотора1.
 */
void init_motor1(int pin_pulse, int pin_dir, int pin_en, int pulse_delay) {
    motor1_pin_pulse = pin_pulse;
    motor1_pin_dir = pin_dir;
    motor1_pin_en = pin_en;
    motor1_pulse_delay = pulse_delay;
    
    // сбросить все динамические настройки
    motor1_step_counter = 0;
    motor1_step_delay = 0;
    motor1_step_timer = 0;
}

/**
 * Подготовить мотор1 к запуску - задать нужное количество шагов и задержку между
 * шагами для регулирования скорости (0 для максимальной скорости).
 */
void prepare_motor1_steps(int step_count, int step_delay) {
    motor1_step_count = step_count;
    motor1_step_delay = step_delay;
  
    // Взводим счетчики
    motor1_step_counter = motor1_step_count;
    motor1_step_timer = motor1_pulse_delay * 2 + motor1_step_delay;
}

/**
 * Запустить цикл шагов на выполнение - запускаем таймер, обработчик прерываний
 * отрабатывать подготовленную программу.
 */
void start_stepper_cycle() {
    // Запустим таймер с периодом 10 микросекунд (100тыс операций в секунду):
    // 80000000/8/100000=100=0x64
    initTimerISR(TIMER3, TIMER_PRESCALAR_1_8, 0x64);
}

void handle_interrupts(int timer) {
    if(motor1_step_counter > 0) {
        if(motor1_step_timer == motor1_pulse_delay) {
            // импульс1 - готовим шаг
            digitalWrite(motor1_pin_pulse, HIGH);
        } else if(motor1_step_timer == 0) {
            // импусль2 (спустя motor1_pulse_delay микросекунд после импульса1) - завершаем шаг
            digitalWrite(motor1_pin_pulse, LOW);
            
            // переустановим таймер
            motor1_step_timer = motor1_step_delay + motor1_pulse_delay * 2 + timer_freq_us;            
            // посчитаем шаг
            motor1_step_counter--;
        }
    } else {
        // все шаги сделали, цикл завершился, остановим таймер.
    }
    
    motor1_step_timer -= timer_freq_us;
}

