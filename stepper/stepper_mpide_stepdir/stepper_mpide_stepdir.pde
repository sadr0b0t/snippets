// Step-dir драйвер шагового мотора использует 3 пина:
// Подача периодического импульса HIGH/LOW будет вращать мотор
int motor1_pin_step = 0;
// Направление (1 - в одну сторону, 0 - в другую)
int motor1_pin_dir = 1;
// Вкл (1)/выкл (0) мотор
int motor1_pin_en = 3;


void setup() {
    pinMode(motor1_pin_step, OUTPUT);
    pinMode(motor1_pin_dir, OUTPUT);
    pinMode(motor1_pin_en, OUTPUT);    
}

void loop() {
    // включить мотор
    digitalWrite(motor1_pin_en, HIGH);
  
    // задать направление
    digitalWrite(motor1_pin_dir, HIGH);
    
    // шагаем мотором - подаём периодический импульс 
    // (оптимальная частота импульса подбирается экспериментально 
    // в зависимости от драйвера и шагового мотора;
    // 500 мкс - 2000мкс для драйвера stb57+шаговик ок.)
    while(true) {
        digitalWrite(motor1_pin_step, HIGH);
        delayMicroseconds(500);
        digitalWrite(motor1_pin_step, LOW);
        delayMicroseconds(500);
    }
}

