/************************************************************************/
/*																		*/
/*	int.h	--	Handles timer interrupts for PIC32      				*/
/*																		*/
/************************************************************************/
/*	Author:		Michelle Yu                                             */
/*                          											*/
/*	Copyright 2011, Digilent Inc.										*/
/*  This library is free software; you can redistribute it and/or       */
/*  modify it under the terms of the GNU Lesser General Public          */
/*  License as published by the Free Software Foundation; either        */
/*  version 2.1 of the License, or (at your option) any later version.  */
/*                                                                      */
/*  This library is distributed in the hope that it will be useful,     */
/*  but WITHOUT ANY WARRANTY; without even the implied warranty of      */
/*  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU   */
/*  Lesser General Public License for more details.                     */
/*                                                                      */
/*  You should have received a copy of the GNU Lesser General Public    */
/*  License along with this library; if not, write to the Free Software */
/*  Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA           */
/*  02110-1301 USA                                                      */
/************************************************************************/
/*  File Description:													*/
/*	This file declares functions that handle timer interrupts for       */
/*  chipKIT PIC32 boards.												*/
/************************************************************************/
//************************************************************************
//*	Edit History
//************************************************************************
//*	Aug 18,	2011	<MichelleY> file header comment block reformatted
//*	Sep  5,	2011	<GeneA> moved include of p32xxxx.h and plib.h from here
//************************************************************************

#ifndef TIMER_SETUP_H
#define TIMER_SETUP_H

// define timer ids
extern const int TIMER1;
extern const int TIMER3;
extern const int TIMER4;
extern const int TIMER5;

//#define TIMER1 0
//#define TIMER3 1
//#define TIMER4 2
//#define TIMER5 3


// Define timer prescaler options:
// CS12 CS11 CS10
#define TIMER_PRESCALER_1_1    1 // 001
#define TIMER_PRESCALER_1_8    2 // 010
#define TIMER_PRESCALER_1_64   3 // 011
#define TIMER_PRESCALER_1_256  4 // 100
#define TIMER_PRESCALER_1_1024 5 // 101


void initTimerISR(int timer, int prescaler, int period);
void stopTimerISR(int timer);
void handle_interrupts(int timer);

#endif


