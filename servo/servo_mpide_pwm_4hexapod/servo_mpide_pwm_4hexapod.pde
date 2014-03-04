int servo1_pin = 0;
int servo2_pin = 1;
int servo3_pin = 2;
int servo4_pin = 3;
int servo5_pin = 4;
int servo6_pin = 5;
int servo7_pin = 6;
int servo8_pin = 7;
int servo9_pin = 8;
int servo10_pin = 9;
int servo11_pin = 10;
int servo12_pin = 11;
int servo13_pin = 12;
int servo14_pin = 13;
int servo15_pin = 27;
int servo16_pin = 28;
int servo17_pin = 29;
int servo18_pin = 30;

void setup() 
{
    pinMode(servo1_pin, OUTPUT);
    pinMode(servo2_pin, OUTPUT);
    pinMode(servo3_pin, OUTPUT);
    pinMode(servo4_pin, OUTPUT);
    pinMode(servo5_pin, OUTPUT);
    pinMode(servo6_pin, OUTPUT);
    pinMode(servo7_pin, OUTPUT);
    pinMode(servo8_pin, OUTPUT);
    pinMode(servo9_pin, OUTPUT);
    pinMode(servo10_pin, OUTPUT);
    pinMode(servo11_pin, OUTPUT);
    pinMode(servo12_pin, OUTPUT);
    pinMode(servo13_pin, OUTPUT);
    pinMode(servo14_pin, OUTPUT);
    pinMode(servo15_pin, OUTPUT);
    pinMode(servo16_pin, OUTPUT);
    pinMode(servo17_pin, OUTPUT);
    pinMode(servo18_pin, OUTPUT);
}

void writeAllServos(int val) {
    digitalWrite(servo1_pin, val);
    digitalWrite(servo2_pin, val);
    digitalWrite(servo3_pin, val);
    digitalWrite(servo4_pin, val);
    digitalWrite(servo5_pin, val);
    digitalWrite(servo6_pin, val);
    digitalWrite(servo7_pin, val);
    digitalWrite(servo8_pin, val);
    digitalWrite(servo9_pin, val);
    digitalWrite(servo10_pin, val);
    digitalWrite(servo11_pin, val);
    digitalWrite(servo12_pin, val);
    digitalWrite(servo13_pin, val);
    digitalWrite(servo14_pin, val);
    digitalWrite(servo15_pin, val);
    digitalWrite(servo16_pin, val);
    digitalWrite(servo17_pin, val);
    digitalWrite(servo18_pin, val);
}

/**
 * Крепления к телу.
 */
void writeServos1(int val) {
    digitalWrite(servo1_pin, val);
    digitalWrite(servo2_pin, val);
    digitalWrite(servo3_pin, val);
    digitalWrite(servo4_pin, val);
    digitalWrite(servo5_pin, val);
    digitalWrite(servo6_pin, val);
    digitalWrite(servo7_pin, val);
    digitalWrite(servo8_pin, val);
    digitalWrite(servo9_pin, val);
    digitalWrite(servo10_pin, val);
    digitalWrite(servo11_pin, val);
    digitalWrite(servo12_pin, val);
    digitalWrite(servo13_pin, val);
    digitalWrite(servo14_pin, val);
    digitalWrite(servo15_pin, val);
    digitalWrite(servo16_pin, val);
    digitalWrite(servo17_pin, val);
    digitalWrite(servo18_pin, val);
}

/**
 * Средние суставы.
 */
void writeServos2(int val) {
    digitalWrite(servo9_pin, val);
    digitalWrite(servo10_pin, val);
    digitalWrite(servo11_pin, val);
    digitalWrite(servo12_pin, val);
    digitalWrite(servo13_pin, val);
    digitalWrite(servo14_pin, val);
    digitalWrite(servo15_pin, val);
    digitalWrite(servo16_pin, val);
    digitalWrite(servo17_pin, val);
    digitalWrite(servo18_pin, val);
}

/**
 * Конечности.
 */
void writeServos3(int val) {
    digitalWrite(servo1_pin, val);
    digitalWrite(servo2_pin, val);
    digitalWrite(servo3_pin, val);
    digitalWrite(servo4_pin, val);
    digitalWrite(servo5_pin, val);
    digitalWrite(servo6_pin, val);
    digitalWrite(servo7_pin, val);
    digitalWrite(servo8_pin, val);
}
 
void loop() 
{
    // http://www.aviafly.com.ua/stati-i-obzoryi/elektronika/sozdaem-servotester-na-baze-mikrokontrollera-atmega.html
    // генериуем управляющий сигнал в виде прямоугольного импульса,
    // 1 импульс каждые 20 мс (миллисикунд) = 50Гц - частота сигнала (ШИМ):
    // ширина импульса 0,9...1 мс - крайнее левое положение (0 градусов)
    // ширина импульса 2 мс - срединное положение (90 градусов)
    // ширина импульса 3...3,1 мс - крайнее правое положение (180 градусов)
    // все остальные значения - промежуточные микросекунды (мкс - например 1,5 мс = 1500 мкс - 45 градусов).
    
    // Сгененируем импульсы нужной длины и частоты при помощи простых вызовов digitalWrite и delay.
    // Т.к. функция delay оперирует только миллисекундами (мс - 1/1000 секунды), 
    // промежуточные значения в микросекундах (мкс - 1/1000000 секунды) этим способом задавать не сможем - 
    // только крайние левое (1 мс), среднее (2 мс) и крайнее правое (3 мс) положения.
    
    // 400 итераций по 20 мс = 2000 мс = 8 секунд
    for(int i = 0; i < 400; i++) {
        // Для средних суставов положение ~0 градусов
        writeServos2(1);
        delay(1);
        writeServos2(0);
        delay(9);
        
        // Для конечностей положение ~90 градусов
        writeServos3(1);
        delay(2);
        writeServos3(0);
        delay(8);
    }
    
    // 100 итераций по 20 мс = 2000 мс = 2 секунды
    for(int i = 0; i < 100; i++) {
        // положение ~180 градусов
        writeAllServos(1);
        delay(3);
        writeAllServos(0);
        delay(17);
    }
    
    // 100 итераций по 20 мс = 2000 мс = 2 секунды
    for(int i = 0; i < 100; i++) {
        // положение ~90 градусов
        writeAllServos(1);
        delay(2);
        writeAllServos(0);
        delay(18);
    }
}

