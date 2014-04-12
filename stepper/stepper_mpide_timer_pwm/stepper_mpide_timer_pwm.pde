#include"timer_handler.h"

int m1_pin_pulse = 0;
int m1_pin_dir = 1;
int m1_pin_en = 2;

void setup() {
    Serial.begin(9600);
    
    pinMode(m1_pin_pulse, OUTPUT);
    pinMode(m1_pin_dir, OUTPUT);
    pinMode(m1_pin_en, OUTPUT);
    
    // включить мотор
    digitalWrite(m1_pin_en, HIGH);
    
    // задать нужное направление
    digitalWrite(m1_pin_dir, HIGH); // туда
//    digitalWrite(motor1_pin_dir, LOW); // обратно

    // Передать информацию о подключенном моторе
    init_motor1(m1_pin_pulse, m1_pin_dir, m1_pin_en, 500);
    
    // Подготовить цикл - пройдем 500 шагов с максимальной скоростью
    prepare_motor1_steps(500, 0);
    
    // Запускаем мотор шагать
    start_stepper_cycle();
}

void loop() {
}

