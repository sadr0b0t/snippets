#include"timer_handler.h"

int m1_pin_pulse = 13;
int m1_pin_dir = 1;
int m1_pin_en = 2;

int m2_pin_pulse = 3;
int m2_pin_dir = 4;
int m2_pin_en = 5;

void setup() {
    Serial.begin(9600);
    Serial.println("Stepper motor tester start");
    
    pinMode(m1_pin_pulse, OUTPUT);
    pinMode(m1_pin_dir, OUTPUT);
    pinMode(m1_pin_en, OUTPUT);
    
    pinMode(m2_pin_pulse, OUTPUT);
    pinMode(m2_pin_dir, OUTPUT);
    pinMode(m2_pin_en, OUTPUT);
    
    // включить моторы
    digitalWrite(m1_pin_en, HIGH);
    digitalWrite(m2_pin_en, HIGH);
    
    // задать нужное направление
    digitalWrite(m1_pin_dir, HIGH); // туда
//    digitalWrite(m1_pin_dir, LOW); // обратно

    digitalWrite(m2_pin_dir, HIGH); // туда
//    digitalWrite(m2_pin_dir, LOW); // обратно

    // Передать информацию о подключенных моторах
    init_motor1(m1_pin_pulse, m1_pin_dir, m1_pin_en, 500);
    init_motor2(m2_pin_pulse, m2_pin_dir, m2_pin_en, 500);
    
    // Подготовить цикл:

    // пройдем 20000 шагов с максимальной скоростью
//    prepare_motor1_steps(20000, 0);
//    prepare_motor2_steps(20000, 0);

    // по шагу в секунду:
//    prepare_motor1_steps(20000, 1000000);
//    prepare_motor2_steps(20000, 1000000);

    // проверим неровные числа - таймер должен все равно шагать
    // с определенной погрешностью:
    prepare_motor1_steps(20000, 13);
    prepare_motor2_steps(20000, 13);
    
    // Запускаем мотор шагать
    Serial.println("Start stepper cycle...");
    start_stepper_cycle();
}

void loop() {
    if(is_cycle_running()) {
        // Цикл запущен - выводим текущую информацию о моторах
        Serial.print("Motor1 step count: ");
        Serial.println(get_motor1_step_count(), DEC);
        
        Serial.print("Motor2 step count: ");
        Serial.println(get_motor2_step_count(), DEC);
    }
    delay(1000);
}

