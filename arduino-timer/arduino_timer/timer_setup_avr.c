// based on
// https://github.com/arduino/Arduino/blob/ide-1.5.x/libraries/Servo/src/avr/Servo.cpp
// https://github.com/arduino/Arduino/blob/ide-1.5.x/libraries/Servo/src/avr/ServoTimers.h

// see also
// http://www.robotshop.com/letsmakerobots/arduino-101-timers-and-interrupts
// http://playground.arduino.cc/Code/Timer1

#ifdef ARDUINO_ARCH_AVR


/*
  Servo.h - Interrupt driven Servo library for Arduino using 16 bit timers- Version 2
  Copyright (c) 2009 Michael Margolis.  All right reserved.

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

/*
 * Defines for 16 bit timers used with  Servo library
 *
 * If _useTimerX is defined then TimerX is a 16 bit timer on the current board
 * timer16_Sequence_t enumerates the sequence that the timers should be allocated
 * _Nbr_16timers indicates how many 16 bit timers are available.
 */



#include "timer_setup.h"

#include <avr/interrupt.h>


/**
 * AVR Only definitions
 * --------------------
 */

// Say which 16 bit timers can be used and in what order
#if defined(__AVR_ATmega1280__) || defined(__AVR_ATmega2560__)
#define _useTimer5
#define _useTimer1
#define _useTimer3
#define _useTimer4
typedef enum { _timer5, _timer1, _timer3, _timer4, _Nbr_16timers } timer16_Sequence_t;

const int TIMER1 = _timer1;
const int TIMER3 = _timer3;
const int TIMER4 = _timer4;
const int TIMER5 = _timer5;

#elif defined(__AVR_ATmega32U4__)
#define _useTimer1
typedef enum { _timer1, _Nbr_16timers } timer16_Sequence_t;

const int TIMER1 = _timer1;
const int TIMER3 = -1;
const int TIMER4 = -1;
const int TIMER5 = -1;

#elif defined(__AVR_AT90USB646__) || defined(__AVR_AT90USB1286__)
#define _useTimer3
#define _useTimer1
typedef enum { _timer3, _timer1, _Nbr_16timers } timer16_Sequence_t;

const int TIMER1 = _timer1;
const int TIMER3 = _timer3;
const int TIMER4 = -1;
const int TIMER5 = -1;

#elif defined(__AVR_ATmega128__) || defined(__AVR_ATmega1281__) || defined(__AVR_ATmega1284__) || defined(__AVR_ATmega1284P__) || defined(__AVR_ATmega2561__)
#define _useTimer3
#define _useTimer1
typedef enum { _timer3, _timer1, _Nbr_16timers } timer16_Sequence_t;

const int TIMER1 = _timer1;
const int TIMER3 = _timer3;
const int TIMER4 = -1;
const int TIMER5 = -1;

#else  // everything else
#define _useTimer1
typedef enum { _timer1, _Nbr_16timers } timer16_Sequence_t;

const int TIMER1 = _timer1;
const int TIMER3 = -1;
const int TIMER4 = -1;
const int TIMER5 = -1;

#endif


#ifndef WIRING // Wiring pre-defines signal handlers so don't define any if compiling for the Wiring platform
// Interrupt handlers for Arduino
#if defined(_useTimer1)
SIGNAL (TIMER1_COMPA_vect)
{
  handle_interrupts(_timer1);
}
#endif

#if defined(_useTimer3)
SIGNAL (TIMER3_COMPA_vect)
{
  handle_interrupts(_timer3);
}
#endif

#if defined(_useTimer4)
SIGNAL (TIMER4_COMPA_vect)
{
  handle_interrupts(_timer4);
}
#endif

#if defined(_useTimer5)
SIGNAL (TIMER5_COMPA_vect)
{
  handle_interrupts(_timer5);
}
#endif

#elif defined WIRING
// Interrupt handlers for Wiring
#if defined(_useTimer1)
void Timer1Service()
{
  handle_interrupts(_timer1);
}
#endif
#if defined(_useTimer3)
void Timer3Service()
{
  handle_interrupts(_timer3);
}
#endif
#endif


void initTimerISR(int timer, int prescaler, int adjustment)
{
#if defined (_useTimer1)
  if(timer == _timer1) {
    // CS12 CS11 CS10
    // 1/1:    001
    // 1/8:    010
    // 1/64:   011
    // 1/256:  100
    // 1/1024: 101
    unsigned char prescalerBits = 0;
    switch(prescaler) {
        case TIMER_PRESCALER_1_1:
            prescalerBits = _BV(CS10);
            break;
        case TIMER_PRESCALER_1_8:
            prescalerBits = _BV(CS11);
            break;
        case TIMER_PRESCALER_1_64:
            prescalerBits = _BV(CS11) | _BV(CS10);
            break;
        case TIMER_PRESCALER_1_256:
            prescalerBits = _BV(CS12);
            break;
        case TIMER_PRESCALER_1_1024:
            prescalerBits = _BV(CS12) | _BV(CS10);
            break;
        default:
            // let it be no prescaler by default:
            prescalerBits = _BV(CS10);
    }
    
    TCCR1A = 0;             // normal counting mode
    TCCR1B = 0;             // timer mode:
    TCCR1B |= _BV(WGM12);   // CTC mode
    TCCR1B |= prescalerBits;// set prescaler
    OCR1A = adjustment;     // compare match register
    TCNT1 = 0;              // clear the timer count
#if defined(__AVR_ATmega8__)|| defined(__AVR_ATmega128__)
    TIFR |= _BV(OCF1A);      // clear any pending interrupts
    TIMSK |= _BV(OCIE1A);    // enable the output compare interrupt
#else
    // here if not ATmega8 or ATmega128
    TIFR1 |= _BV(OCF1A);     // clear any pending interrupts
    TIMSK1 |= _BV(OCIE1A);   // enable the output compare interrupt
#endif
#if defined(WIRING)
    timerAttach(TIMER1OUTCOMPAREA_INT, Timer1Service);
#endif
  }
#endif

#if defined (_useTimer3)
  if(timer == _timer3) {
    // CS32 CS31 CS30
    // 1/1:    001
    // 1/8:    010
    // 1/64:   011
    // 1/256:  100
    // 1/1024: 101
    unsigned char prescalerBits = 0;
    switch(prescaler) {
        case TIMER_PRESCALER_1_1:
            prescalerBits = _BV(CS30);
            break;
        case TIMER_PRESCALER_1_8:
            prescalerBits = _BV(CS31);
            break;
        case TIMER_PRESCALER_1_64:
            prescalerBits = _BV(CS31) | _BV(CS30);
            break;
        case TIMER_PRESCALER_1_256:
            prescalerBits = _BV(CS32);
            break;
        case TIMER_PRESCALER_1_1024:
            prescalerBits = _BV(CS32) | _BV(CS30);
            break;
        default:
            // let it be no prescaler by default:
            prescalerBits = _BV(CS30);
    }
    
    TCCR3A = 0;             // normal counting mode
    TCCR3B = 0;             // timer mode:
    TCCR3B |= _BV(WGM32);   // CTC mode
    TCCR3B |= prescalerBits;// set prescaler
    OCR3A = adjustment;     // compare match register
    TCNT3 = 0;              // clear the timer count
#if defined(__AVR_ATmega128__)
    TIFR |= _BV(OCF3A);     // clear any pending interrupts
    ETIMSK |= _BV(OCIE3A);  // enable the output compare interrupt
#else
    TIFR3 |= _BV(OCF3A);    // clear any pending interrupts
    TIMSK3 |= _BV(OCIE3A);  // enable the output compare interrupt
#endif
#if defined(WIRING)
    timerAttach(TIMER3OUTCOMPAREA_INT, Timer3Service);  // for Wiring platform only
#endif
  }
#endif

#if defined (_useTimer4)
  if(timer == _timer4) {
    // CS42 CS41 CS40
    // 1/1:    001
    // 1/8:    010
    // 1/64:   011
    // 1/256:  100
    // 1/1024: 101
    unsigned char prescalerBits = 0;
    switch(prescaler) {
        case TIMER_PRESCALER_1_1:
            prescalerBits = _BV(CS40);
            break;
        case TIMER_PRESCALER_1_8:
            prescalerBits = _BV(CS41);
            break;
        case TIMER_PRESCALER_1_64:
            prescalerBits = _BV(CS41) | _BV(CS40);
            break;
        case TIMER_PRESCALER_1_256:
            prescalerBits = _BV(CS42);
            break;
        case TIMER_PRESCALER_1_1024:
            prescalerBits = _BV(CS42) | _BV(CS40);
            break;
        default:
            // let it be no prescaler by default:
            prescalerBits = _BV(CS40);
    }
    
    TCCR4A = 0;             // normal counting mode
    TCCR4B = 0;             // timer mode:
    TCCR4B |= _BV(WGM42);   // CTC mode
    TCCR4B |= prescalerBits;// set prescaler
    OCR4A = adjustment;     // compare match register
    TCNT4 = 0;              // clear the timer count
    TIFR4 |= _BV(OCF4A);    // clear any pending interrupts
    TIMSK4 |= _BV(OCIE4A);  // enable the output compare interrupt
  }
#endif

#if defined (_useTimer5)
  if(timer == _timer5) {
    // CS52 CS51 CS50
    // 1/1:    001
    // 1/8:    010
    // 1/64:   011
    // 1/256:  100
    // 1/1024: 101
    unsigned char prescalerBits = 0;
    switch(prescaler) {
        case TIMER_PRESCALER_1_1:
            prescalerBits = _BV(CS50);
            break;
        case TIMER_PRESCALER_1_8:
            prescalerBits = _BV(CS51);
            break;
        case TIMER_PRESCALER_1_64:
            prescalerBits = _BV(CS51) | _BV(CS50);
            break;
        case TIMER_PRESCALER_1_256:
            prescalerBits = _BV(CS52);
            break;
        case TIMER_PRESCALER_1_1024:
            prescalerBits = _BV(CS52) | _BV(CS50);
            break;
        default:
            // let it be no prescaler by default:
            prescalerBits = _BV(CS50);
    }
    
    TCCR5A = 0;             // normal counting mode
    TCCR5B = 0;             // timer mode:
    TCCR5B |= _BV(WGM52);   // CTC mode
    TCCR5B |= prescalerBits;// set prescaler
    OCR5A = adjustment;     // compare match register
    TCNT5 = 0;              // clear the timer count
    TIFR5 |= _BV(OCF5A);    // clear any pending interrupts
    TIMSK5 |= _BV(OCIE5A);  // enable the output compare interrupt
  }
#endif
}

void stopTimerISR(int timer)
{
    //disable use of the given timer
#if defined WIRING   // Wiring
  if(timer == _timer1) {
    #if defined(__AVR_ATmega1281__)||defined(__AVR_ATmega2561__)
    TIMSK1 &= ~_BV(OCIE1A);  // disable timer 1 output compare interrupt
    #else
    TIMSK &= ~_BV(OCIE1A);  // disable timer 1 output compare interrupt
    #endif
    timerDetach(TIMER1OUTCOMPAREA_INT);
  }
  else if(timer == _timer3) {
    #if defined(__AVR_ATmega1281__)||defined(__AVR_ATmega2561__)
    TIMSK3 &= ~_BV(OCIE3A);    // disable the timer3 output compare A interrupt
    #else
    ETIMSK &= ~_BV(OCIE3A);    // disable the timer3 output compare A interrupt
    #endif
    timerDetach(TIMER3OUTCOMPAREA_INT);
  }
#else
    // Tested only on Arduino Leonardo
    
#if defined (_useTimer1)
    if(timer == _timer1) {
#if defined(__AVR_ATmega8__)|| defined(__AVR_ATmega128__)
        TIMSK &= ~_BV(OCIE1A); // disable output compare interrupt
#else
        // here if not ATmega8 or ATmega128
        TIMSK1 &= ~_BV(OCIE1A); // disable output compare interrupt
#endif
    }
#endif

#if defined (_useTimer3)
    if(timer == _timer3) {
#if defined(__AVR_ATmega128__)
        ETIMSK &= ~_BV(OCIE3A); // disable output compare interrupt
#else
        TIMSK3 &= ~_BV(OCIE3A); // disable output compare interrupt
#endif
    }
#endif

#if defined (_useTimer4)
    if(timer == _timer4) {
        TIMSK4 &= ~_BV(OCIE4A); // disable output compare interrupt
    }
#endif

#if defined (_useTimer5)
    if(timer == _timer5) {
        TIMSK5 &= ~_BV(OCIE5A); // disable output compare interrupt
    }
#endif

#endif
}

#endif // ARDUINO_ARCH_AVR

