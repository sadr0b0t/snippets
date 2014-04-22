#include"timer_handler.h"

int m1_pin_pulse = 3;
int m1_pin_dir = 5;
int m1_pin_en = 6;

/**
 * Задержка между двумя импульсами, микросекунды
 */
int m1_pulse_delay = 500;
/**
 * Расстояние, которое проходит координата за один шаг мотора,
 * микрометры.
 */
float m1_distance_per_step = 7.5;

int m2_pin_pulse = 26;
int m2_pin_dir = 27;
int m2_pin_en = 28;

int m2_pulse_delay = 500;
float m2_distance_per_step = 7.5;

int current_line = 0;

/**
 * @param dx - сдвиг по x, мм
 * @param dy - сдвиг по y, мм
 * @param dt - время на перемещение, секунды.
 * 
 */
void prepare_line(float dx, float dy, float dt) {
    Serial.print("prepare line:");
    Serial.print(" dx=");
    Serial.print(dx, DEC);
    Serial.print(", dy=");
    Serial.print(dy, DEC);
    Serial.print(", dt=");
    Serial.print(dt, DEC);
    Serial.println();
    
    int steps_x;
    int steps_y;
    int mod_steps_x;
    int mod_steps_y;
    int step_delay_x;
    int step_delay_y;
    
    steps_x = dx * 1000 / m1_distance_per_step;
    steps_y = dy * 1000 / m2_distance_per_step;
    
    mod_steps_x = steps_x >= 0 ? steps_x : -steps_x;
    mod_steps_y = steps_y >= 0 ? steps_y : -steps_y;
    
    Serial.print("steps_x=");
    Serial.print(steps_x, DEC);
    Serial.print(", steps_y=");
    Serial.print(steps_y, DEC);
    Serial.println();
    
    step_delay_x = dt * 1000000 / mod_steps_x - m1_pulse_delay;    
    step_delay_y = dt * 1000000 / mod_steps_y - m2_pulse_delay;
    
    Serial.print("step_delay_x(1)=");
    Serial.print(step_delay_x, DEC);
    Serial.print(", step_delay_y(1)=");
    Serial.print(step_delay_y, DEC);
    Serial.println();

    step_delay_x = step_delay_x > 0 ? step_delay_x : 0;
    step_delay_y = step_delay_y > 0 ? step_delay_y : 0;
    
    Serial.print("step_delay_x=");
    Serial.print(step_delay_x, DEC);
    Serial.print(", step_delay_y=");
    Serial.print(step_delay_y, DEC);
    Serial.println();
    
    prepare_motor1_steps(steps_x, step_delay_x);
    prepare_motor2_steps(steps_y, step_delay_y);
}

void prepare_line1() {
      prepare_line(-100, 0, 0);
//    prepare_line(0, 50, 0);
    
    prepare_line(-30, 20, 8);
}

void prepare_line2() {
//    prepare_line(50, 0, 0);

    prepare_line(30, 20, 8);
}

void prepare_line3() {
//    prepare_line(-50, -25, 10);

    prepare_line(30, -20, 8);
}

void prepare_line4() {
//    prepare_line(0, -25, 10);

    prepare_line(-30, -20, 8);
}

void setup() {
    Serial.begin(9600);
    Serial.println("Stepper motor tester start");
    
    // Передать информацию о подключенных моторах
    init_motor1(m1_pin_pulse, m1_pin_dir, m1_pin_en, m1_pulse_delay, 1);
    init_motor2(m2_pin_pulse, m2_pin_dir, m2_pin_en, m2_pulse_delay, -1);
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

