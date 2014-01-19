/* 
 * File:   uart_util.h
 * Author: 1i7
 *
 * Created on 2 Апрель 2013 г., 21:51
 */

#ifndef UART_UTIL_H
#define	UART_UTIL_H

#ifdef	__cplusplus
extern "C" {
#endif

#include <plib.h>

void UARTInit(UINT32 dataRate);

UINT32 UARTGetCurrentDataRate();

void UARTSendDataBuffer(const char *buffer, UINT32 size);

UINT32 UARTGetDataBuffer(char *buffer, UINT32 max_size);

#ifdef	__cplusplus
}
#endif

#endif	/* UART_UTIL_H */

