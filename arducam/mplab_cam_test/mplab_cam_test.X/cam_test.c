#include <p32xxxx.h>
#include "uart_util.h"
#include "ov7670.h"

#include <plib.h>

#define SYSCLK 80000000L // Give the system’s clock frequency

//UINT8   buf[1024];

void setup() {
    SYSTEMConfigPerformance(SYSCLK);

    // Initialize hardware UART2 and establish communication at 9600 bps
    UARTInit(9600);

    // Init i2c
    I2CInit();
//    if (I2CInit((uint32_t) I2CMASTER) == 0) {
//        printf("Fatal error!\n");
//        while (1);
//    }

    ov7670_init();
    

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
    pin_xclk_inv();

    mT2ClearIntFlag();
    // Clears the interrupt flag so that the program returns to the main loop
} // END Timer2 ISR



int main() {
    setup();

    //sprintf(buf, "Actual Baud Rate: %ld\r\n\r\n", UARTGetCurrentDataRate());
    //UARTSendDataBuffer(buf, strlen(buf));

    while(1) {
        int i = 0xff;
        while(i >= 0) {
            i--;
        }

        ov7670_readframe();
    }

    while(1) {}
    //blink();
    //on_off();
}
