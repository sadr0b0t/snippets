
#include "WProgram.h"

extern "C"{
    #include "timer_setup.h"
}

#include "timer_handler.h"

//// Информация о подключении 1 мотора через драйвер step-dir:

// Подача периодического импульса HIGH/LOW будет вращать мотор
int motor1_pin_pulse;
int motor2_pin_pulse;
// Направление (1 - в одну сторону, 0 - в другую)
int motor1_pin_dir;
int motor2_pin_dir;
// Вкл (0)/выкл (1) мотор
int motor1_pin_en;
int motor2_pin_en;

// задержка между импульсами для мотора, мкс
int motor1_pulse_delay = 500;
int motor2_pulse_delay = 500;

// Инверсия направления на ножке dir: 1 - не инвертировать направленение, -1 - инвертировать.
int motor1_dir_inv;
int motor2_dir_inv;

//// Настройки для текущего цикла шагов.

// Количество шагов в текущей серии
int motor1_step_count;
int motor2_step_count;
// Задержка между 2мя шагами мотора (определяет скорость вращения, 
// 0 для максимальной скорости)
int motor1_step_delay;
int motor2_step_delay;

//// Динамика

// Счетчик шагов для текущей серии (убывает)
int motor1_step_counter;
int motor2_step_counter;
// Счетчик микросекунд для текущего шага (убывает)
int motor1_step_timer;
int motor2_step_timer;

// Частота таймера, мкс
int timer_freq_us;

// Текущий статус цикла
bool cycle_running = false;

/**
 * Задать настройки подключения для мотора1.
 */
void init_motor1(int pin_pulse, int pin_dir, int pin_en, int pulse_delay, int dir_inv) {
    motor1_pin_pulse = pin_pulse;
    motor1_pin_dir = pin_dir;
    motor1_pin_en = pin_en;
    motor1_pulse_delay = pulse_delay;
    motor1_dir_inv = dir_inv;
    
    // сбросить все динамические настройки
    motor1_step_counter = 0;
    motor1_step_delay = 0;
    motor1_step_timer = 0;
        
    // задать настройки пинов
    pinMode(motor1_pin_pulse, OUTPUT);
    pinMode(motor1_pin_dir, OUTPUT);
    pinMode(motor1_pin_en, OUTPUT);
    
    // пока выключить мотор
    digitalWrite(motor1_pin_en, HIGH);
}

/**
 * Задать настройки подключения для мотора2.
 */
void init_motor2(int pin_pulse, int pin_dir, int pin_en, int pulse_delay, int dir_inv) {
    motor2_pin_pulse = pin_pulse;
    motor2_pin_dir = pin_dir;
    motor2_pin_en = pin_en;
    motor2_pulse_delay = pulse_delay;
    motor2_dir_inv = dir_inv;
    
    // сбросить все динамические настройки
    motor2_step_counter = 0;
    motor2_step_delay = 0;
    motor2_step_timer = 0;
        
    // задать настройки пинов
    pinMode(motor2_pin_pulse, OUTPUT);
    pinMode(motor2_pin_dir, OUTPUT);
    pinMode(motor2_pin_en, OUTPUT);
    
    // пока выключить мотор
    digitalWrite(motor2_pin_en, HIGH);
}

/**
 * Подготовить мотор1 к запуску - задать нужное количество шагов и задержку между
 * шагами для регулирования скорости (0 для максимальной скорости).
 */
void prepare_motor1_steps(int step_count, int step_delay) {
    // задать направление
    if(step_count * motor1_dir_inv > 0) {
        digitalWrite(motor1_pin_dir, HIGH); // туда
    } else {
        digitalWrite(motor1_pin_dir, LOW); // обратно
    }
    // сделать step_count положительным
    step_count = step_count > 0 ? step_count : -step_count;
  
    motor1_step_count = step_count;
    motor1_step_delay = step_delay;
  
    // Взводим счетчики
    motor1_step_counter = motor1_step_count;
    motor1_step_timer = motor1_pulse_delay * 2 + motor1_step_delay;
}

/**
 * Подготовить мотор2 к запуску - задать нужное количество шагов и задержку между
 * шагами для регулирования скорости (0 для максимальной скорости).
 */
void prepare_motor2_steps(int step_count, int step_delay) {
    // задать направление
    if(step_count * motor2_dir_inv > 0) {
        digitalWrite(motor2_pin_dir, HIGH); // туда
    } else {
        digitalWrite(motor2_pin_dir, LOW); // обратно
    }
    // сделать step_count положительным
    step_count = step_count >= 0 ? step_count : -step_count;
    
    motor2_step_count = step_count;
    motor2_step_delay = step_delay;
  
    // Взводим счетчики
    motor2_step_counter = motor2_step_count;
    motor2_step_timer = motor2_pulse_delay * 2 + motor2_step_delay;
}

/**
 * Запустить цикл шагов на выполнение - запускаем таймер, обработчик прерываний
 * отрабатывать подготовленную программу.
 */
void start_stepper_cycle() {
    cycle_running = true;
    
    // включить моторы
    digitalWrite(motor1_pin_en, LOW);
    digitalWrite(motor2_pin_en, LOW);
    
    // для частоты 1 микросекунда (1млн операций в секунду):
    // 80000000/8/1000000=10=0xA
    // (уже подкглючивает)
//    timer_freq_us = 1;
//    initTimerISR(TIMER3, TIMER_PRESCALAR_1_8, 0xA);
    
    // для частоты 5 микросекунд (500000 операций в секунду):
    // 80000000/8/500000=20
    timer_freq_us = 5;
    initTimerISR(TIMER3, TIMER_PRESCALAR_1_8, 20);
    
    // Запустим таймер с периодом 10 микросекунд (100тыс операций в секунду):
    // 80000000/8/100000=100=0x64
//    timer_freq_us = 10;
//    initTimerISR(TIMER3, TIMER_PRESCALAR_1_8, 0x64);
}

bool is_cycle_running() {
    return cycle_running;
}

int get_motor1_step_count() {
    return motor1_step_count - motor1_step_counter;
}

int get_motor2_step_count() {
    return motor2_step_count - motor2_step_counter;
}

void handle_interrupts(int timer) {
    if(motor1_step_counter > 0) {
        motor1_step_timer -= timer_freq_us;
        
        if(motor1_step_timer < motor1_pulse_delay + timer_freq_us && motor1_step_timer >= motor1_pulse_delay) {
            // motor1_step_timer ~ motor1_pulse_delay с учетом погрешности таймера timer_freq_us =>
            // импульс1 - готовим шаг
            digitalWrite(motor1_pin_pulse, HIGH);
        } else if(motor1_step_timer < timer_freq_us) {
            // motor1_step_timer ~ 0 с учетом погрешности таймера (timer_freq_us) =>
            // импульс2 (спустя motor1_pulse_delay микросекунд после импульса1) - завершаем шаг
            digitalWrite(motor1_pin_pulse, LOW);
                       
            // посчитаем шаг
            motor1_step_counter--;
            
            // сделали последний шаг
            if(motor1_step_counter == 0) {
                Serial.print("Finished motor1:");
                Serial.println(millis(), DEC);
            }
            
            // переустановим таймер
            motor1_step_timer =  motor1_pulse_delay * 2 + motor1_step_delay; 
        }
    }
    
    if(motor2_step_counter > 0) {
        motor2_step_timer -= timer_freq_us;
        
        if(motor2_step_timer < motor2_pulse_delay + timer_freq_us && motor2_step_timer >= motor2_pulse_delay) {
            // motor2_step_timer ~ motor2_pulse_delay с учетом погрешности таймера timer_freq_us =>
            // импульс1 - готовим шаг
            digitalWrite(motor2_pin_pulse, HIGH);
        } else if(motor2_step_timer < timer_freq_us) {
            // motor2_step_timer ~ 0 с учетом погрешности таймера (timer_freq_us) =>
            // импульс2 (спустя motor2_pulse_delay микросекунд после импульса1) - завершаем шаг
            digitalWrite(motor2_pin_pulse, LOW);
                        
            // посчитаем шаг
            motor2_step_counter--;
            
            // сделали последний шаг
            if(motor2_step_counter == 0) {
                Serial.print("Finished motor2:");
                Serial.println(millis(), DEC);
            }
            
            // переустановим таймер
            motor2_step_timer = motor2_pulse_delay * 2 + motor2_step_delay;
        }
    }
    
    if(motor1_step_counter == 0 && motor2_step_counter == 0) {
        // оба мотора сделали все шаги, цикл завершился, остановим таймер.
        stopTimerISR(TIMER3);
        cycle_running = false;
        
        // выключить моторы
        digitalWrite(motor1_pin_en, HIGH);
        digitalWrite(motor2_pin_en, HIGH);
    }
}

