/*
  ArduCAM.h - Arduino library support for CMOS Image Sensor
  Copyright (C)2011-2012 ArduCAM.com. All right reserved
  
  Basic functionality of this library are based on the demo-code provided by
  ArduCAM.com. You can find the latest version of the library at
  http://www.ArduCAM.com

  Now supported controllers:
		-	OV7670
		-	MT9D111
		-	OV7675
		-	OV2640
		-	OV3640
		-	OV5642
	We will add support for many other sensors in next release.


  If you make any modifications or improvements to the code, I would appreciate
  that you share the code with me so that I might include it in the next release.
  I can be contacted through http://www.ArduCAM.com

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

/*------------------------------------
	Revision History:
	2012/09/20 	V1.0.0	by Lee	first release 
	2012/10/23  V1.0.1  by Lee  Resolved some timing issue for the Read/Write Register	
	2012/11/29	V1.1.0	by Lee  Add support for MT9D111 sensor
	2012/12/13	V1.2.0	by Lee	Add support for OV7675 sensor
	2012/12/28  V1.3.0	by Lee	Add support for OV2640,OV3640,OV5642 sensors
--------------------------------------*/


#ifndef ArduCAM_H
#define ArduCAM_H

#include "Arduino.h"

#define OV7670	0	
#define MT9D111	1
#define OV7675	2
#define OV5642	3
#define OV3640  4
#define OV2640  5

#define I2C_ADDR_8BIT 0
#define I2C_ADDR_16BIT 1
#define I2C_REG_8BIT 0
#define I2C_REG_16BIT 1
#define I2C_DAT_8BIT 0
#define I2C_DAT_16BIT 1

/* Register initialization tables for SENSORs */
/* Terminating list entry for reg */
#define SENSOR_REG_TERM_8BIT                0xFF
#define SENSOR_REG_TERM_16BIT                0xFFFF
/* Terminating list entry for val */
#define SENSOR_VAL_TERM_8BIT                0xFF
#define SENSOR_VAL_TERM_16BIT                0xFFFF

#include "Arduino.h"

#define cbi(reg, bitmask) *reg &= ~bitmask
#define sbi(reg, bitmask) *reg |= bitmask
#define pulse_high(reg, bitmask) sbi(reg, bitmask); cbi(reg, bitmask);
#define pulse_low(reg, bitmask) cbi(reg, bitmask); sbi(reg, bitmask);

/* define a structure for sensor register initialization values */
struct sensor_reg {
       unsigned int reg;
       unsigned int val;
};


class ArduCAM
{
	public:
		ArduCAM();
		ArduCAM(byte model, int RS, int WR, int RD, int CS);
		void InitCAM();
		uint8_t read_reg(uint8_t addr);
		void write_reg(uint8_t addr, uint8_t data);	
		int wrSensorRegs(const struct sensor_reg*);
		int wrSensorRegs8_8(const struct sensor_reg*);
		int wrSensorRegs8_16(const struct sensor_reg*);
		
		int wrSensorRegs16_8(const struct sensor_reg*);
		int wrSensorRegs16_16(const struct sensor_reg*);
		
		byte wrSensorReg(int regID, int regDat);
		byte wrSensorReg8_8(int regID, int regDat);
		byte wrSensorReg8_16(int regID, int regDat);
		byte wrSensorReg16_8(int regID, int regDat);
		byte wrSensorReg16_16(int regID, int regDat);
		
		byte rdSensorReg8_8(uint8_t regID, uint8_t* regDat);
		byte rdSensorReg16_8(uint16_t regID, uint8_t* regDat);
			
	protected:
		volatile uint8_t *P_RS, *P_WR, *P_RD, *P_CS;
  	uint8_t B_RS, B_WR, B_RD, B_CS;
  
		byte sensor_model;
		byte sensor_addr;

};

#endif