/*
 * File:   uart_util.c
 * Author: 1i7
 *
 * Created on 2 Апрель 2013 г., 21:50
 */
#include <p32xxxx.h>
#include <plib.h>

// *****************************************************************************
// *****************************************************************************
// Section: System Macros
// *****************************************************************************
// *****************************************************************************
#define	GetSystemClock() 			(80000000ul)
#define	GetPeripheralClock()		(GetSystemClock()/(1 << OSCCONbits.PBDIV))
#define	GetInstructionClock()		(GetSystemClock())

UINT32 UARTGetCurrentDataRate() {
    UARTGetDataRate(UART2, GetPeripheralClock());
}

void UARTInit(UINT32 dataRate) {
    // UART:
    // http://learnpic32.blogspot.ru/2011/12/using-uart.html
    // he demo is called "uart_basic" and is found in the:
    // <install path>\Microchip\MPLAB C32 Suite\examples\plib_examples\uart\uart_basic

    // maybe also from here: http://www.microchip.com/CodeExamplesByFunc.aspx

    // Initialize hardware UART2 and establish communication at dataRate bps
    UARTConfigure(UART2, UART_ENABLE_PINS_TX_RX_ONLY);
    UARTSetFifoMode(UART2, UART_INTERRUPT_ON_TX_NOT_FULL | UART_INTERRUPT_ON_RX_NOT_EMPTY);
    UARTSetLineControl(UART2, UART_DATA_SIZE_8_BITS | UART_PARITY_NONE | UART_STOP_BITS_1);
    UARTSetDataRate(UART2, GetPeripheralClock(), dataRate);
    UARTEnable(UART2, UART_ENABLE_FLAGS(UART_PERIPHERAL | UART_RX | UART_TX));
}

// *****************************************************************************
// void UARTTxBuffer(char *buffer, UINT32 size)
// *****************************************************************************
void UARTSendDataBuffer(const char *buffer, UINT32 size)
{
    while(size)
    {
        while(!UARTTransmitterIsReady(UART2))
            ;

        UARTSendDataByte(UART2, *buffer);

        buffer++;
        size--;
    }

    while(!UARTTransmissionHasCompleted(UART2))
        ;
}

// *****************************************************************************
// UINT32 GetDataBuffer(char *buffer, UINT32 max_size)
// *****************************************************************************
UINT32 UARTGetDataBuffer(char *buffer, UINT32 max_size)
{
    UINT32 num_char;

    num_char = 0;

    while(num_char < max_size)
    {
        UINT8 character;

        while(!UARTReceivedDataIsAvailable(UART2))
            ;

        character = UARTGetDataByte(UART2);

        if(character == '\r')
            break;

        *buffer = character;

        buffer++;
        num_char++;
    }

    return num_char;
}


