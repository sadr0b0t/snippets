// port ov7670 lib driver https://github.com/desaster/ov7670test to pic32
// http://qrfnfgre.wordpress.com/2012/05/07/ov7670-camera-sensor-success/
// http://embeddedprogrammer.blogspot.ru/2012/07/hacking-ov7670-camera-module-sccb-cheat.html

#define SYS_CLOCK 80000000L

#include <p32xxxx.h>
#include <GenericTypeDefs.h>
#include <plib.h>
#include "ov7670.h"
#include "ov7670reg.h"
#include "HardwareProfile.h"



/* due to memory constraints, only read the upper half of the image */
UINT8 qqvgaframe1[QQVGA_HEIGHT / 4 * QQVGA_WIDTH]; /* first rgb565 byte */
UINT8 qqvgaframe2[QQVGA_HEIGHT / 4 * QQVGA_WIDTH]; /* second rgb565 byte */

/*
int ST_VSYNC = 10;
int ST_HREF = 11;
int ST_PCLK = 8;
int ST_XCLK = 9;
 */

#define ST_VSYNC  (PORTD & (1 << 4))
#define ST_HREF   (PORTG & (1 << 8))
#define ST_PCLK   (PORTD & (1 << 10))
#define ST_XCLK   (PORTD & (1 << 3))

int ST_D0 = 26;
int ST_D1 = 27;
int ST_D2 = 28;
int ST_D3 = 29;
int ST_D4 = 30;
int ST_D5 = 31;
int ST_D6 = 32;
int ST_D7 = 33;

/*
 * 26 J6-02 60 PMD0/RE0
 * 27 J6-04 61 PMD1/RE1
 * 28 J6-06 62 PMD2/RE2
 * 29 J6-08 63 PMD3/RE3
 * 30 J6-10 64 PMD4/RE4
 * 31 J6-12 1  PMD5/RE5
 * 32 J6-14 2  PMD6/RE6
 * 33 J6-16 3  PMD7/RE7
 */

/*
 * 0 J6-01 34 U1RX/SDI1/RF2
 * 1 J6-03 33 U1TX/SDO1/RF3
 * 2 J6-05 42 IC1/RTCC/INT1/RD8
 * 3 J6-07 46 OC1/RD0
 * 4 J6-09 59 RF1
 * 5 J6-11 49 OC2/RD1
 * 6 J6-13 50 OC3/RD2
 * 7 J6-15 43 IC2/U1CTS/INT2/RD9
 * 8 J5-01 44 IC3/PMCS2/PMA15/INT3/RD10
 * 9 J5-03 51 OC4/RD3
 * 10 J5-05 52 PMWR/OC5/IC5/CN13/RD4
 * 11 J5-07 6 SDO2/PMA3/CN10/RG8
 */

void pin_xclk_setup() {
    // pin13 - зажечь лампочку для дебага
    TRISGCLR = 1 << 6;
    PORTGSET = 1 << 6;

    // режим вывода для ST_XCLK (=RD3=PORTD[3])
    //TRISDCLR = 1 << 3;

    // ввод для всех остальных клоков
    TRISDSET = 1 << 4;
    TRISGSET = 1 << 8;
    TRISDSET = 1 << 10;

    // I2C
    // Enable the I2C bus
    I2CEnable(OV7670_I2C_BUS, TRUE);
}

void inline pin_xclk_inv() {
    PORTDINV = 1 << 3;
}

/*
 * 26 J6-02 60 PMD0/RE0
 * 27 J6-04 61 PMD1/RE1
 * 28 J6-06 62 PMD2/RE2
 * 29 J6-08 63 PMD3/RE3
 * 30 J6-10 64 PMD4/RE4
 * 31 J6-12 1  PMD5/RE5
 * 32 J6-14 2  PMD6/RE6
 * 33 J6-16 3  PMD7/RE7
 */
void pin_data_setup() {
    // режим ввода для pin0-pin7
    TRISESET = 1 << 0;
    TRISESET = 1 << 1;
    TRISESET = 1 << 2;
    TRISESET = 1 << 3;
    TRISESET = 1 << 4;
    TRISESET = 1 << 5;
    TRISESET = 1 << 6;
    TRISESET = 1 << 7;
}

// ****************************************************************************
// ****************************************************************************
// Local Support Routines
// ****************************************************************************
// ****************************************************************************

void I2CInit() {
    UINT32 actualClock;
    // Initialize debug messages (when supported)
    DBINIT();

    // Set the I2C baudrate
    actualClock = I2CSetFrequency(OV7670_I2C_BUS, GetPeripheralClock(), I2C_CLOCK_FREQ);
    if (abs(actualClock - I2C_CLOCK_FREQ) > I2C_CLOCK_FREQ / 10) {
        DBPRINTF("Error: I2C1 clock frequency (%u) error exceeds 10%%.\n", (unsigned) actualClock);
    }

    // Enable the I2C bus
    I2CEnable(OV7670_I2C_BUS, TRUE);
}

/*******************************************************************************
  Function:
    BOOL StartTransfer( BOOL restart )

  Summary:
    Starts (or restarts) a transfer to/from the EEPROM.

  Description:
    This routine starts (or restarts) a transfer to/from the EEPROM, waiting (in
    a blocking loop) until the start (or re-start) condition has completed.

  Precondition:
    The I2C module must have been initialized.

  Parameters:
    restart - If FALSE, send a "Start" condition
            - If TRUE, send a "Restart" condition

  Returns:
    TRUE    - If successful
    FALSE   - If a collision occured during Start signaling

  Example:
    <code>
    StartTransfer(FALSE);
    </code>

  Remarks:
    This is a blocking routine that waits for the bus to be idle and the Start
    (or Restart) signal to complete.
 *****************************************************************************/

BOOL StartTransfer(BOOL restart) {
    I2C_STATUS status;

    // Send the Start (or Restart) signal
    if (restart) {
        I2CRepeatStart(OV7670_I2C_BUS);
    } else {
        // Wait for the bus to be idle, then start the transfer
        while (!I2CBusIsIdle(OV7670_I2C_BUS));

        if (I2CStart(OV7670_I2C_BUS) != I2C_SUCCESS) {
            DBPRINTF("Error: Bus collision during transfer Start\n");
            return FALSE;
        }
    }

    // Wait for the signal to complete
    do {
        status = I2CGetStatus(OV7670_I2C_BUS);

    } while (!(status & I2C_START));

    return TRUE;
}

/*******************************************************************************
  Function:
    BOOL TransmitOneByte( UINT8 data )

  Summary:
    This transmits one byte to the EEPROM.

  Description:
    This transmits one byte to the EEPROM, and reports errors for any bus
    collisions.

  Precondition:
    The transfer must have been previously started.

  Parameters:
    data    - Data byte to transmit

  Returns:
    TRUE    - Data was sent successfully
    FALSE   - A bus collision occured

  Example:
    <code>
    TransmitOneByte(0xAA);
    </code>

  Remarks:
    This is a blocking routine that waits for the transmission to complete.
 *****************************************************************************/

BOOL TransmitOneByte(UINT8 data) {
    // Wait for the transmitter to be ready
    while (!I2CTransmitterIsReady(OV7670_I2C_BUS));

    // Transmit the byte
    if (I2CSendByte(OV7670_I2C_BUS, data) == I2C_MASTER_BUS_COLLISION) {
        DBPRINTF("Error: I2C Master Bus Collision\n");
        return FALSE;
    }

    // Wait for the transmission to finish
    while (!I2CTransmissionHasCompleted(OV7670_I2C_BUS));

    return TRUE;
}

/*******************************************************************************
  Function:
    void StopTransfer( void )

  Summary:
    Stops a transfer to/from the EEPROM.

  Description:
    This routine Stops a transfer to/from the EEPROM, waiting (in a
    blocking loop) until the Stop condition has completed.

  Precondition:
    The I2C module must have been initialized & a transfer started.

  Parameters:
    None.

  Returns:
    None.

  Example:
    <code>
    StopTransfer();
    </code>

  Remarks:
    This is a blocking routine that waits for the Stop signal to complete.
 *****************************************************************************/

void StopTransfer(void) {
    I2C_STATUS status;

    // Send the Stop signal
    I2CStop(OV7670_I2C_BUS);

    // Wait for the signal to complete
    do {
        status = I2CGetStatus(OV7670_I2C_BUS);

    } while (!(status & I2C_STOP));
}

UINT32 ov7670_set(UINT8 addr, UINT8 val) {
    //i2c_clearbuffers();

    //    I2CWriteLength = 3;
    //    I2CReadLength = 0;
    //    I2CMasterBuffer[0] = OV7670_ADDR;   /* i2c address */
    //    I2CMasterBuffer[1] = addr;          /* key */
    //    I2CMasterBuffer[2] = val;           /* value */
    //
    //    return I2CEngine();

    UINT8 i2cData[10];
    I2C_7_BIT_ADDRESS SlaveAddress;
    int Index;
    int DataSz;
    UINT32 actualClock;
    BOOL Acknowledged;
    BOOL Success = TRUE;
    UINT8 i2cbyte;

    //
    // Send the data to EEPROM to program one location
    //

    // Initialize the data buffer
    I2C_FORMAT_7_BIT_ADDRESS(SlaveAddress, OV7670_ADDR, I2C_WRITE);
    i2cData[0] = SlaveAddress.byte; /* 7670_ADDR, I2C_WRITE);
    i2cData[0] = SlaveAddress.byte; /* i2c address */
    i2cData[1] = addr; /* key */
    i2cData[2] = val; /* value */
    DataSz = 3;

    // Start the transfer to write data to the EEPROM
    if (!StartTransfer(FALSE)) {
        while (1);
    }

    // Transmit all data
    Index = 0;
    while (Success && (Index < DataSz)) {
        // Transmit a byte
        if (TransmitOneByte(i2cData[Index])) {
            // Advance to the next byte
            Index++;

            // Verify that the byte was acknowledged
            if (!I2CByteWasAcknowledged(OV7670_I2C_BUS)) {
                DBPRINTF("Error: Sent byte was not acknowledged\n");
                Success = FALSE;
            }
        } else {
            Success = FALSE;
        }
    }

    // End the transfer (hang here if an error occured)
    StopTransfer();
    if (!Success) {
        while (1);
    }

}

UINT8 ov7670_get(UINT8 addr) {
    //    i2c_clearbuffers();
    //    I2CWriteLength = 2;
    //    I2CReadLength = 0;
    //    I2CMasterBuffer[0] = OV7670_ADDR;   /* i2c address */
    //    I2CMasterBuffer[1] = addr;          /* key */
    //
    //    I2CEngine();
    //
    //    delay(1);
    //
    //    i2c_clearbuffers();
    //    I2CWriteLength = 0;
    //    I2CReadLength = 1;
    //    I2CMasterBuffer[0] = OV7670_ADDR | RD_BIT;
    //
    //    while (I2CEngine() == I2CSTATE_SLA_NACK);
    //
    //    return I2CSlaveBuffer[0];

    UINT8 i2cData[10];
    I2C_7_BIT_ADDRESS SlaveAddress;
    int Index;
    int DataSz;
    UINT32 actualClock;
    BOOL Acknowledged;
    BOOL Success = TRUE;
    UINT8 i2cbyte;

    //
    // Send the data to EEPROM to program one location
    //

    // Initialize the data buffer
    I2C_FORMAT_7_BIT_ADDRESS(SlaveAddress, OV7670_ADDR, I2C_WRITE);
    i2cData[0] = SlaveAddress.byte; /* i2c address */
    i2cData[1] = addr; /* key */
    DataSz = 2;

    // Start the transfer to write data to the EEPROM
    if (!StartTransfer(FALSE)) {
        while (1);
    }

    // Transmit all data
    Index = 0;
    while (Success && (Index < DataSz)) {
        // Transmit a byte
        if (TransmitOneByte(i2cData[Index])) {
            // Advance to the next byte
            Index++;

            // Verify that the byte was acknowledged
            if (!I2CByteWasAcknowledged(OV7670_I2C_BUS)) {
                DBPRINTF("Error: Sent byte was not acknowledged\n");
                Success = FALSE;
            }
        } else {
            Success = FALSE;
        }
    }

    // End the transfer (hang here if an error occured)
    StopTransfer();
    if (!Success) {
        while (1);
    }

    // Restart and send the "OV7670's internal address to switch to a read transfer
    if (Success) {
        // Send a Repeated Started condition
        if (!StartTransfer(TRUE)) {
            while (1);
        }

        // Transmit the address with the READ bit set
        I2C_FORMAT_7_BIT_ADDRESS(SlaveAddress, OV7670_ADDR, I2C_READ);
        if (TransmitOneByte(SlaveAddress.byte)) {
            // Verify that the byte was acknowledged
            if (!I2CByteWasAcknowledged(OV7670_I2C_BUS)) {
                DBPRINTF("Error: Sent byte was not acknowledged\n");
                Success = FALSE;
            }
        } else {
            Success = FALSE;
        }
    }


    // Read the data from the desired address
    if (Success) {
        if (I2CReceiverEnable(OV7670_I2C_BUS, TRUE) == I2C_RECEIVE_OVERFLOW) {
            DBPRINTF("Error: I2C Receive Overflow\n");
            Success = FALSE;
        } else {
            while (!I2CReceivedDataIsAvailable(OV7670_I2C_BUS));
            i2cbyte = I2CGetByte(OV7670_I2C_BUS);
        }

    }

    // End the transfer (stop here if an error occured)
    StopTransfer();
    if (!Success) {
        while (1);
    }
    return i2cbyte;
}

void ov7670_init(void) {
    printf("Initializing ov7670");

    pin_xclk_setup();

    pin_data_setup();

    //    /* 0.22 used to reset the camera */
    //    LPC_PINCON->PINSEL1 &= ~(3 << 12); /* set as gpio */
    //    LPC_GPIO0->FIODIR |= (1 << 22); /* set as output */
    //    LPC_PINCON->PINMODE1 &= ~(1 << 12); /* no pulldown/up */
    //    LPC_PINCON->PINMODE1 |= (1 << 13); /* no pulldown/up */
    //
    //    /* ports D0..D7 go to P2.0..P2.7 */
    //    LPC_PINCON->PINSEL4 &= ~(0xffff); /* function = gpio */
    //    LPC_GPIO2->FIODIR &= ~(0xff); /* direction = input */
    //
    //    /* port 2.8 vsync */
    //    LPC_PINCON->PINSEL4 &= ~(3 << 16); /* function = gpio */
    //    LPC_GPIO2->FIODIR &= ~(1 << 8); /* direction = input */
    //
    //    /* port 2.11 href */
    //    LPC_PINCON->PINSEL4 &= ~(3 << 22); /* function = gpio */
    //    LPC_GPIO2->FIODIR &= ~(1 << 11); /* direction = input */
    //
    //    /* port 2.12 pclk */
    //    LPC_PINCON->PINSEL4 &= ~(3 << 24); /* function = gpio */
    //    LPC_GPIO2->FIODIR &= ~(1 << 12); /* direction = input */
    //
    //    printf("...reset");
    //    LPC_GPIO0->FIOCLR |= (1 << 22); /* low */
    //    delay(100);
    //    LPC_GPIO0->FIOSET |= (1 << 22); /* high */
    //    delay(100);
}

void i2cSonfig() {
    //printf("...settings");
    if (ov7670_get(REG_PID) != 0x76) {
        printf("PANIC! REG_PID != 0x76!\n");
        while (1);
    }
    ov7670_set(REG_COM7, 0x80); /* reset to default values */
    ov7670_set(REG_CLKRC, 0x80);
    ov7670_set(REG_COM11, 0x0A);
    ov7670_set(REG_TSLB, 0x04);
    ov7670_set(REG_TSLB, 0x04);
    ov7670_set(REG_COM7, 0x04); /* output format: rgb */

    ov7670_set(REG_RGB444, 0x00); /* disable RGB444 */
    ov7670_set(REG_COM15, 0xD0); /* set RGB565 */

    /* not even sure what all these do, gonna check the oscilloscope and go
     * from there... */
    ov7670_set(REG_HSTART, 0x16);
    ov7670_set(REG_HSTOP, 0x04);
    ov7670_set(REG_HREF, 0x24);
    ov7670_set(REG_VSTART, 0x02);
    ov7670_set(REG_VSTOP, 0x7a);
    ov7670_set(REG_VREF, 0x0a);
    ov7670_set(REG_COM10, 0x02);
    ov7670_set(REG_COM3, 0x04);
    ov7670_set(REG_COM14, 0x1a); // divide by 4
    //ov7670_set(REG_COM14, 0x1b); // divide by 8
    ov7670_set(REG_MVFP, 0x27);
    ov7670_set(0x72, 0x22); // downsample by 4
    //ov7670_set(0x72, 0x33); // downsample by 8
    ov7670_set(0x73, 0xf2); // divide by 4
    //ov7670_set(0x73, 0xf3); // divide by 8

    // test pattern
    //ov7670_set(0x70, 1 << 7);
    //ov7670_set(0x70, 0x0);

    // COLOR SETTING
    ov7670_set(0x4f, 0x80);
    ov7670_set(0x50, 0x80);
    ov7670_set(0x51, 0x00);
    ov7670_set(0x52, 0x22);
    ov7670_set(0x53, 0x5e);
    ov7670_set(0x54, 0x80);
    ov7670_set(0x56, 0x40);
    ov7670_set(0x58, 0x9e);
    ov7670_set(0x59, 0x88);
    ov7670_set(0x5a, 0x88);
    ov7670_set(0x5b, 0x44);
    ov7670_set(0x5c, 0x67);
    ov7670_set(0x5d, 0x49);
    ov7670_set(0x5e, 0x0e);
    ov7670_set(0x69, 0x00);
    ov7670_set(0x6a, 0x40);
    ov7670_set(0x6b, 0x0a);
    ov7670_set(0x6c, 0x0a);
    ov7670_set(0x6d, 0x55);
    ov7670_set(0x6e, 0x11);
    ov7670_set(0x6f, 0x9f);

    ov7670_set(0xb0, 0x84);

    printf("...done.\n");
}

UINT8 inline pin_data_read() {
    UINT8 data = 0;

    data |= (PORTF & (1 << 2) ? 1 : 0) << 0;
    data |= (PORTF & (1 << 3) ? 1 : 0) << 1;
    data |= (PORTD & (1 << 8) ? 1 : 0) << 2;
    data |= (PORTD & (1 << 0) ? 1 : 0) << 3;
    data |= (PORTF & (1 << 1) ? 1 : 0) << 4;
    data |= (PORTD & (1 << 1) ? 1 : 0) << 5;
    data |= (PORTD & (1 << 2) ? 1 : 0) << 6;
    data |= (PORTD & (1 << 9) ? 1 : 0) << 7;

    return data;
}

void ov7670_readframe(void) {
    UINT32 i = 0;

//    while (1) {
//        while (ST_HREF);
//        while (!ST_HREF);
//
//        int i = 0xffff;
//        while (i >= 0) {
//            i--;
//        }
//    }
    PORTGINV = 1 << 6;
    while (ST_VSYNC); /* wait for the old frame to end */
    while (!ST_VSYNC); /* wait for a new frame to start */

    while (ST_VSYNC) {
        //if (y >= (QQVGA_HEIGHT / 2)) break;
        while (ST_VSYNC && !ST_HREF); /* wait for a line to start */
        if (!ST_VSYNC) break; /* line didn't start, but frame ended */
        while (ST_HREF) { /* wait for a line to end */
            /* first byte */
            while (!ST_PCLK); /* wait for clock to go high */
            /* no time to do anything fancy here! */
            /* this grabs the first 8 bits, rest gets chopped off */
            qqvgaframe1[i] = pin_data_read();
            while (ST_PCLK); /* wait for clock to go back low */

            /* second byte */
            while (!ST_PCLK); /* wait for clock to go high */
            qqvgaframe2[i] = pin_data_read();
            while (ST_PCLK); /* wait for clock to go back low */
            i++;
        }
    }
}



