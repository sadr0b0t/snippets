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


void initTimerISR(int timer, int prescaler, int adjustment);
void stopTimerISR(int timer);
void handle_interrupts(int timer);

#endif

