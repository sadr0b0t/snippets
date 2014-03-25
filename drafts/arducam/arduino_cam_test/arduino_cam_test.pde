#define SYSCLK 80000000L // Give the system’s clock frequency
 
#include <p32xxxx.h> // Include PIC32 specifics header file
#include <plib.h> // Include the PIC32 Peripheral Library

int PIN_VSYNC = 10;
int PIN_HREF = 11;
int PIN_PCLK = 8;
int PIN_XCLK = 9;

int PIN_D0 = 0;
int PIN_D1 = 27;
int PIN_D2 = 2;
int PIN_D3 = 3;
int PIN_D4 = 4;
int PIN_D5 = 5;
int PIN_D6 = 6;
int PIN_D7 = 7;

void setup(void)
{
    SYSTEMConfigPerformance(SYSCLK);
    // Start the UART
    Serial.begin(9600) ;

    pinMode(13, OUTPUT);

    pinMode(PIN_VSYNC, INPUT);
    pinMode(PIN_HREF, INPUT);
    pinMode(PIN_PCLK, INPUT);
    pinMode(PIN_XCLK, OUTPUT);

    pinMode(PIN_D0, INPUT);
    pinMode(PIN_D1, INPUT);
    pinMode(PIN_D2, INPUT);
    pinMode(PIN_D3, INPUT);
    pinMode(PIN_D4, INPUT);
    pinMode(PIN_D5, INPUT);
    pinMode(PIN_D6, INPUT);
    pinMode(PIN_D7, INPUT);
  
    // setup timer
    //Configure the I/O – To flash the LED on PORT B pin 8, RB8
    PORTSetPinsDigitalOut(IOPORT_B, BIT_8);
    PORTClearBits(IOPORT_B, BIT_8);//From the Table derived earlier and Equation 1 we set the period to 62500

    unsigned int gui_TimerCount = 0;
    //Open Timer 1 and configure it
    OpenTimer1(T1_ON | T1_PS_1_8 | T1_SOURCE_INT,  1);
    ConfigIntTimer1( T1_INT_ON | T1_INT_PRIOR_2);
}

boolean xclk_val = 0;

int read_delay = 0;

void read_data() {
  // read data byte
    char data = 0;

  /*data |= digitalRead(PIN_D0) << 0;
   data |= digitalRead(PIN_D1) << 1;
   data |= digitalRead(PIN_D2) << 2;
   data |= digitalRead(PIN_D3) << 3;
   data |= digitalRead(PIN_D4) << 4;
   data |= digitalRead(PIN_D5) << 5;
   data |= digitalRead(PIN_D6) << 6;
   data |= digitalRead(PIN_D7) << 7;
   
   Serial.print("read data: ");
   Serial.print((int)data);
   Serial.print("\n");
   */
   
    

    Serial.print("read data: ");
    Serial.print(digitalRead(PIN_D0));
    Serial.print(digitalRead(PIN_D1));
    Serial.print(digitalRead(PIN_D2));
    Serial.print(digitalRead(PIN_D3));
    Serial.print(digitalRead(PIN_D4));
    Serial.print(digitalRead(PIN_D5));
    Serial.print(digitalRead(PIN_D6));
    Serial.print(digitalRead(PIN_D7));
    Serial.print("\n");
}

void loop() {
    /*if(mT1GetIntFlag()) {
        //invert the PIN_XCLK state
        xclk_val = !xclk_val;
        digitalWrite(PIN_XCLK, xclk_val);

        mT1ClearIntFlag();
    }*/

    //if(read_delay >= 800000) {
    if(digitalRead(PIN_PCLK)) {
        //read_data();
        if(read_delay >= 10000) {
            read_delay = 0;
            digitalWrite(13, 1);
        }
        
        read_delay++;
    } else {
      digitalWrite(13, 0);
    }

    //delay(1);
}

// Timer2 Interrupt Service Routine
void __ISR(_TIMER_1_VECTOR, ipl1) handlesTimer1Ints(void){
        // **make sure iplx matches the timer’s interrupt priority level
 
        //LATDINV = 0x0200;
        // This statement looks at pin RD9, and latches RD9 the inverse of the current state.
        // In other words, it toggles the LED that is attached to RD9
        xclk_val = !xclk_val;
        digitalWrite(PIN_XCLK, xclk_val);
 
        mT1ClearIntFlag();
        // Clears the interrupt flag so that the program returns to the main loop
} // END Timer1 ISR

