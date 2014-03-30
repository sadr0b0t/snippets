/* 
 * File:   ov7670.h
 * Author: benderamp
 *
 * Created on 3 Апрель 2013 г., 0:55
 */

#ifndef OV7670_H
#define	OV7670_H

#ifdef	__cplusplus
extern "C" {
#endif

#include <p32xxxx.h>

#define OV7670_I2C_BUS     I2C1
#define OV7670_ADDR     0x42

#define QQVGA_HEIGHT    120
#define QQVGA_WIDTH     160

//extern UINT8 qqvgaframe1[QQVGA_HEIGHT * QQVGA_WIDTH];
//extern UINT8 qqvgaframe2[QQVGA_HEIGHT * QQVGA_WIDTH];

#ifdef	__cplusplus
}
#endif

#endif	/* OV7670_H */

