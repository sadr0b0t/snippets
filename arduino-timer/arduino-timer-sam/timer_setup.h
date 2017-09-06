#ifndef TIMER_SETUP_H
#define TIMER_SETUP_H

// define timer ids
extern const int TIMER1;
extern const int TIMER3;
extern const int TIMER4;
extern const int TIMER5;


// Define timer prescaler options:
#define TIMER_PRESCALER_1_2    1
#define TIMER_PRESCALER_1_8    2
#define TIMER_PRESCALER_1_32   3
#define TIMER_PRESCALER_1_128  4


void initTimerISR(int timer, int prescaler, int adjustment);
void stopTimerISR(int timer);
void handle_interrupts(int timer);

#endif

