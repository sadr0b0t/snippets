#include"timer_handler.h"

int m1_pin_pulse = 26;//3;
int m1_pin_dir = 27;//5;
int m1_pin_en = 28;//6;

void setup() {
    Serial.begin(9600);
    Serial.println("Stepper motor tester start");
    
    pinMode(m1_pin_pulse, OUTPUT);
    pinMode(m1_pin_dir, OUTPUT);
    pinMode(m1_pin_en, OUTPUT);
    
    // включить мотор
    digitalWrite(m1_pin_en, LOW);
    
    // задать нужное направление
//    digitalWrite(m1_pin_dir, HIGH); // туда
    digitalWrite(m1_pin_dir, LOW); // обратно

    // Передать информацию о подключенном моторе
    init_motor1(m1_pin_pulse, m1_pin_dir, m1_pin_en, 500);
    
    // Подготовить цикл:
    // пройдем 20000 шагов с максимальной скоростью
//    prepare_motor1_steps(20000, 0);
    // по шагу в секунду:
    prepare_motor1_steps(20000, 1000000);
    // проверим неровные числа - таймер должен все равно шагать
    // с определенной погрешностью:
//    prepare_motor1_steps(20000, 13);
    
    // Запускаем мотор шагать
    Serial.println("Start stepper cycle...");
    start_stepper_cycle();
}

void loop() {  
    if(is_cycle_running()) {
        // Цикл запущен - выводим текущую информацию
        Serial.print("Step count: ");
        Serial.println(get_motor1_step_count(), DEC);
    }
    delay(1000);
}

