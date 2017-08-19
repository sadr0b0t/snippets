// Step-dir драйвер шагового мотора использует 3 пина:
// Подача периодического импульса HIGH/LOW будет вращать мотор
int motor1_pin_pulse = 26;
// Направление (1 - в одну сторону, 0 - в другую)
int motor1_pin_dir = 27;
// Вкл (0)/выкл (1) мотор
int motor1_pin_en = 28;


void setup() {
    Serial.begin(9600);
    Serial.println("Stepper motor tester start");    
//  
    pinMode(motor1_pin_pulse, OUTPUT);
    pinMode(motor1_pin_dir, OUTPUT);
    pinMode(motor1_pin_en, OUTPUT);  
  
    // включить мотор
    digitalWrite(motor1_pin_en, LOW);  
}

void loop() {
    // задать направление
    digitalWrite(motor1_pin_dir, HIGH);
       
    // шагаем мотором - подаём периодический импульс 
    // (оптимальная частота импульса подбирается экспериментально 
    // в зависимости от драйвера и шагового мотора;
    // 500 мкс - 2000мкс для драйвера stb57+шаговик ST57-H56 ок.)
    Serial.println("line1");
    for(int i = 0; i < 2000; i++) {
        digitalWrite(motor1_pin_pulse, HIGH);
        delayMicroseconds(500);
        digitalWrite(motor1_pin_pulse, LOW);
        delayMicroseconds(500);
    }
    delay(1000);
    
    // задать направление
    digitalWrite(motor1_pin_dir, HIGH);
    
    Serial.println("line2");
    for(int i = 0; i < 10; i++) {
        Serial.println("HIGH");
        digitalWrite(motor1_pin_pulse, HIGH);
        delayMicroseconds(1000000);
        
        Serial.println("LOW");
        digitalWrite(motor1_pin_pulse, LOW);
        delayMicroseconds(1000000);
    }
    
    Serial.println("line3");
    for(int i = 0; i < 10; i++) {
        Serial.println("HIGH");
        digitalWrite(motor1_pin_pulse, HIGH);
//        delayMicroseconds(10);
        
//        Serial.println("LOW");
        digitalWrite(motor1_pin_pulse, LOW);
        delayMicroseconds(1000000);
    }
    delay(1000);
}

