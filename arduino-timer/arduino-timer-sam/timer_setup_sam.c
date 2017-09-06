// based on
// https://github.com/arduino/Arduino/blob/ide-1.5.x/libraries/Servo/src/sam/Servo.cpp
// https://github.com/arduino/Arduino/blob/ide-1.5.x/libraries/Servo/src/sam/ServoTimers.h

// see also
// http://www.atmel.com/Images/Atmel-11057-32-bit-Cortex-M3-Microcontroller-SAM3X-SAM3A_Datasheet.pdf
// https://store.arduino.cc/usa/arduino-due
// https://www.arduino.cc/en/Guide/ArduinoDue

#ifdef ARDUINO_ARCH_SAM


/*
  This library is free software; you can redistribute it and/or
  modify it under the terms of the GNU Lesser General Public
  License as published by the Free Software Foundation; either
  version 2.1 of the License, or (at your option) any later version.

  This library is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
  Lesser General Public License for more details.

  You should have received a copy of the GNU Lesser General Public
  License along with this library; if not, write to the Free Software
  Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
*/


#include "timer_setup.h"
#include <Arduino.h>

/*
 * Defines for 16 bit timers used with  Servo library
 *
 * If _useTimerX is defined then TimerX is a 16 bit timer on the current board
 * timer16_Sequence_t enumerates the sequence that the timers should be allocated
 * _Nbr_16timers indicates how many 16 bit timers are available.
 */

/**
 * SAM Only definitions
 * --------------------
 */

// For SAM3X:
#define _useTimer1
#define _useTimer2
#define _useTimer3
#define _useTimer4
#define _useTimer5

/*
  TC0, chan 0 => TC0_Handler
  TC0, chan 1 => TC1_Handler
  TC0, chan 2 => TC2_Handler
  TC1, chan 0 => TC3_Handler
  TC1, chan 1 => TC4_Handler
  TC1, chan 2 => TC5_Handler
  TC2, chan 0 => TC6_Handler
  TC2, chan 1 => TC7_Handler
  TC2, chan 2 => TC8_Handler
 */

#if defined (_useTimer1)
#define TC_FOR_TIMER1       TC1
#define CHANNEL_FOR_TIMER1  0
#define ID_TC_FOR_TIMER1    ID_TC3
#define IRQn_FOR_TIMER1     TC3_IRQn
#define HANDLER_FOR_TIMER1  TC3_Handler
#endif
#if defined (_useTimer2)
#define TC_FOR_TIMER2       TC1
#define CHANNEL_FOR_TIMER2  1
#define ID_TC_FOR_TIMER2    ID_TC4
#define IRQn_FOR_TIMER2     TC4_IRQn
#define HANDLER_FOR_TIMER2  TC4_Handler
#endif
#if defined (_useTimer3)
#define TC_FOR_TIMER3       TC1
#define CHANNEL_FOR_TIMER3  2
#define ID_TC_FOR_TIMER3    ID_TC5
#define IRQn_FOR_TIMER3     TC5_IRQn
#define HANDLER_FOR_TIMER3  TC5_Handler
#endif
#if defined (_useTimer4)
#define TC_FOR_TIMER4       TC0
#define CHANNEL_FOR_TIMER4  2
#define ID_TC_FOR_TIMER4    ID_TC2
#define IRQn_FOR_TIMER4     TC2_IRQn
#define HANDLER_FOR_TIMER4  TC2_Handler
#endif
#if defined (_useTimer5)
#define TC_FOR_TIMER5       TC0
#define CHANNEL_FOR_TIMER5  0
#define ID_TC_FOR_TIMER5    ID_TC0
#define IRQn_FOR_TIMER5     TC0_IRQn
#define HANDLER_FOR_TIMER5  TC0_Handler
#endif

typedef enum { _timer1, _timer2, _timer3, _timer4, _timer5, _Nbr_16timers } timer16_Sequence_t ;

const int TIMER1 = _timer1;
const int TIMER3 = _timer3;
const int TIMER4 = _timer4;
const int TIMER5 = _timer5;



//------------------------------------------------------------------------------
/// Interrupt handler for the TC0 channel 1.
//------------------------------------------------------------------------------

#if defined (_useTimer1)
void HANDLER_FOR_TIMER1(void) {
    timer16_Sequence_t timer = _timer1;
    Tc *tc = TC_FOR_TIMER1; // TC - timer counter
    uint8_t channel = CHANNEL_FOR_TIMER1;

    // clear interrupt
    tc->TC_CHANNEL[channel].TC_SR;
    tc->TC_CHANNEL[channel].TC_CCR |= TC_CCR_SWTRG; // reset the timer

    handle_interrupts(_timer1);
}
#endif
#if defined (_useTimer2)
void HANDLER_FOR_TIMER2(void) {
    handle_interrupts(_timer2);
}
#endif
#if defined (_useTimer3)
void HANDLER_FOR_TIMER3(void) {
    handle_interrupts(_timer3);
}
#endif
#if defined (_useTimer4)
void HANDLER_FOR_TIMER4(void) {
    handle_interrupts(_timer4);
}
#endif
#if defined (_useTimer5)
void HANDLER_FOR_TIMER5(void) {
    handle_interrupts(_timer5);
}
#endif

static void _initISR(Tc *tc, uint32_t id, uint32_t channel, uint32_t tclock, uint32_t adjustment, IRQn_Type irqn) {
    pmc_enable_periph_clk(id);
    TC_Configure(tc, channel,
        tclock |                     // timer clock (prescaler)
        TC_CMR_WAVE |                // Waveform mode
        TC_CMR_WAVSEL_UP_RC );       // Counter running up and reset when equals to RC

    // timer clock adjustment
    TC_SetRA(tc, channel, adjustment);

    /* Configure and enable interrupt */
    NVIC_EnableIRQ(irqn);
    // TC_IER_CPAS: RA Compare
    tc->TC_CHANNEL[channel].TC_IER = TC_IER_CPAS;

    // Enables the timer clock and performs a software reset to start the counting
    TC_Start(tc, channel);
}

void initTimerISR(int timer, int prescaler, int adjustment) {
//static void initTimerISR(timer16_Sequence_t timer) {

uint32_t tclock;
if(prescaler == TIMER_PRESCALER_1_2) {
    tclock = TC_CMR_TCCLKS_TIMER_CLOCK1; // MCK/32
} else if(prescaler == TIMER_PRESCALER_1_8) {
    tclock = TC_CMR_TCCLKS_TIMER_CLOCK2; // MCK/32
} else if(prescaler == TIMER_PRESCALER_1_32) {
    tclock = TC_CMR_TCCLKS_TIMER_CLOCK3; // MCK/32
} else if(prescaler == TIMER_PRESCALER_1_128) {
    tclock = TC_CMR_TCCLKS_TIMER_CLOCK4; // MCK/32
} else {
    tclock = TC_CMR_TCCLKS_TIMER_CLOCK5;
}

#if defined (_useTimer1)
    if (timer == _timer1)
        _initISR(TC_FOR_TIMER1, ID_TC_FOR_TIMER1, CHANNEL_FOR_TIMER1, tclock, adjustment, IRQn_FOR_TIMER1);
#endif
#if defined (_useTimer2)
    if (timer == _timer2)
        _initISR(TC_FOR_TIMER2, ID_TC_FOR_TIMER2, CHANNEL_FOR_TIMER2, tclock, adjustment, IRQn_FOR_TIMER2);
#endif
#if defined (_useTimer3)
    if (timer == _timer3)
        _initISR(TC_FOR_TIMER3, ID_TC_FOR_TIMER3, CHANNEL_FOR_TIMER3, tclock, adjustment, IRQn_FOR_TIMER3);
#endif
#if defined (_useTimer4)
    if (timer == _timer4)
        _initISR(TC_FOR_TIMER4, ID_TC_FOR_TIMER4, CHANNEL_FOR_TIMER4, tclock, adjustment, IRQn_FOR_TIMER4);
#endif
#if defined (_useTimer5)
    if (timer == _timer5)
        _initISR(TC_FOR_TIMER5, ID_TC_FOR_TIMER5, CHANNEL_FOR_TIMER5, tclock, adjustment, IRQn_FOR_TIMER5);
#endif
}
void stopTimerISR(int timer)
//static void stopTimerISR(timer16_Sequence_t timer)
{
#if defined (_useTimer1)
    TC_Stop(TC_FOR_TIMER1, CHANNEL_FOR_TIMER1);
#endif
#if defined (_useTimer2)
    TC_Stop(TC_FOR_TIMER2, CHANNEL_FOR_TIMER2);
#endif
#if defined (_useTimer3)
    TC_Stop(TC_FOR_TIMER3, CHANNEL_FOR_TIMER3);
#endif
#if defined (_useTimer4)
    TC_Stop(TC_FOR_TIMER4, CHANNEL_FOR_TIMER4);
#endif
#if defined (_useTimer5)
    TC_Stop(TC_FOR_TIMER5, CHANNEL_FOR_TIMER5);
#endif
}

#endif // ARDUINO_ARCH_SAM

