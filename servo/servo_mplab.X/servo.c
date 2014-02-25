/*
 * File:   servo.c
 * Author: benderamp
 *
 * Created on 20 Январь 2014 г., 1:12
 */

#include <p32xxxx.h>
#include <plib.h>


#define SYSCLK 80000000L // Give the system’s clock frequency


//	Function Prototypes
int main(void);

int SERVO1_PIN = 6;


void setServoValues() {

}

void setup1() {
    SYSTEMConfigPerformance(SYSCLK);

    // включить таймер
    //T1CON = 0x8030;

    //OpenTimer2( T2_ON | T2_SOURCE_INT | T2_PS_1_8, 0x0008);
    //OpenTimer2( T2_ON | T2_SOURCE_INT | T2_PS_1_256, 0xFFFF);
    // This statement says: turn on timer2 | have it use an internal clock source | have it
    // use a prescaler of 1:256, and use a period of 0xFFFF or 2^16 cycles

    // Timer2 as configured would trigger an interrupt at a frequency of (80MHZ/256/65535), or 4.77
    // times a second.

    //ConfigIntTimer2( T2_INT_ON | T2_INT_PRIOR_2);
    // This statement configured the timer to produce an interrupt with a priority of 2

    //INTEnableSystemMultiVectoredInt();
    // Use multi-vectored interrupts

    OpenTimer2(T2_ON | T2_PS_1_8, 0);
    OpenOC4( OC_ON | OC_TIMER_MODE32 | OC_TIMER2_SRC | OC_CONTINUE_PULSE | OC_LOW_HIGH , 0, 0 );
}

// http://umassamherstm5.org/tech-tutorials/pic32-tutorials/ubw32-tutorials/3-interrupts

// Timer2 Interrupt Service Routine
void __ISR(_TIMER_2_VECTOR, ipl2) handlesTimer2Ints(void){
    // **make sure iplx matches the timer’s interrupt priority level

    //LATDINV = 0x0200;
    // This statement looks at pin RD9, and latches RD9 the inverse of the current state.
    // In other words, it toggles the LED that is attached to RD9
    setServoValues();

    // Clears the interrupt flag so that the program returns to the main loop
    mT2ClearIntFlag();
} // END Timer2 ISR


void setup() {
    // режим вывода для ножки RD10 - установить бит PORTD[10] в 0
    TRISDCLR = 1 << 10;

    // включить таймер
    T1CON = 0x8030;
}

/**
* Запуск бесконечного цикла с миганием.
*/
void blink() {
    while(1) {
        // установить значение - включить лампочку
        PORTDSET = 1 << 10;

        // подождать
        TMR1 = 0;
        while(TMR1 < 0x0fff) {
        }

        // очистить значение - выключить лампочку
        PORTDCLR = 1 << 10;

        // подождать
        TMR1 = 0;
        while(TMR1 < 0x0fff) {
        }
    }
}


int main() {
    setup();

    blink();
}


int main1(void) {
    setup();
    while (1);
}



