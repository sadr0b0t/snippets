#include"timer_handler.h"

int m1_pin_pulse = 3;
int m1_pin_dir = 5;
int m1_pin_en = 6;

int m2_pin_pulse = 26;
int m2_pin_dir = 27;
int m2_pin_en = 28;

int current_line = 0;

void prepare_line1() {
    // пройдем 20000 шагов с максимальной скоростью
    prepare_motor1_steps(-2000, 0);
    prepare_motor2_steps(-2000, 0);
}

void prepare_line2() {
    // по шагу в секунду:
    prepare_motor1_steps(10, 1000000);
    prepare_motor2_steps(10, 1000000);
}

void prepare_line3() {
    // проверим неровные числа - таймер должен все равно шагать
    // с определенной погрешностью:
    prepare_motor1_steps(2000, 13);
    prepare_motor2_steps(2000, 13);
}

void prepare_line4() {
    // time=(1000+1000)*1000=2000
    prepare_motor1_steps(-1000, 1000);
    // 2000*1000=2000
    prepare_motor2_steps(-2000, 0);
}

void setup() {
    Serial.begin(9600);
    Serial.println("Stepper motor tester start");
    
    // Передать информацию о подключенных моторах
    init_motor1(m1_pin_pulse, m1_pin_dir, m1_pin_en, 500);
    init_motor2(m2_pin_pulse, m2_pin_dir, m2_pin_en, 500);
}

void loop() {
    if(is_cycle_running()) {
        // Цикл запущен - выводим текущую информацию о моторах
        Serial.print("Motor1 step count: ");
        Serial.println(get_motor1_step_count(), DEC);
        
        Serial.print("Motor2 step count: ");
        Serial.println(get_motor2_step_count(), DEC);
    } else {
        // цикл не запущен - подготовим нужуную линию
        if(current_line == 4) {
            current_line = 1;
        } else {
            current_line++;
        }
        
        if(current_line == 1) {
            Serial.println("Prepare stepper cycle 1...");
            prepare_line1();
        } else if(current_line == 2) {
            Serial.println("Prepare stepper cycle 2...");
            prepare_line2();
        } else if(current_line == 3) {
            Serial.println("Prepare stepper cycle 3...");
            prepare_line3();
        } else if(current_line == 4) {
            Serial.println("Prepare stepper cycle 4...");
            prepare_line4();
        }
        
        // и запускаем мотор шагать
        Serial.println("Start stepper cycle...");
        start_stepper_cycle();
    }
    delay(1000);
}

