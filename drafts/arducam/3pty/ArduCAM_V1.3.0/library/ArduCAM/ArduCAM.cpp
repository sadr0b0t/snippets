/*
  ArduCAM.cpp - Arduino library support for CMOS Image Sensor
  Copyright (C)2011-2012 ArduCAM.com. All right reserved
  
  Basic functionality of this library are based on the demo-code provided by
  ArduCAM.com. You can find the latest version of the library at
  http://www.ArduCAM.com

  Now supported controllers:
			-	OV7670
			-	MT9D11
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

#include "Arduino.h"
#include "ArduCAM.h"
#include <wire.h>
#include "ov7670_regs.h"
#include "ov7675_regs.h"
#include "ov5642_regs.h"
#include "ov3640_regs.h"
#include "ov2640_regs.h"
#include "mt9d111_regs.h"
#include <avr/pgmspace.h>
#include <pins_arduino.h>


ArduCAM::ArduCAM()
{
	sensor_model = OV7670;
	sensor_addr = 0x42;
}

ArduCAM::ArduCAM(byte model,int RS, int WR, int RD, int CS)
{ 
	P_RS	= portOutputRegister(digitalPinToPort(RS));
	B_RS	= digitalPinToBitMask(RS);
	P_WR	= portOutputRegister(digitalPinToPort(WR));
	B_WR	= digitalPinToBitMask(WR);
	P_RD	= portOutputRegister(digitalPinToPort(RD));
	B_RD	= digitalPinToBitMask(RD);
	P_CS	= portOutputRegister(digitalPinToPort(CS));
	B_CS	= digitalPinToBitMask(CS);
	  
	pinMode(RS,OUTPUT);
	pinMode(WR,OUTPUT);
	pinMode(RD,OUTPUT);
	pinMode(CS,OUTPUT);
	//Must initialize the Bus default status
	sbi(P_RS, B_RS);
	sbi(P_WR, B_WR);
	sbi(P_RD, B_RD);
	sbi(P_CS, B_CS);
	
	sensor_model=model;
	switch(sensor_model)
	{
		case OV7670:
		case OV7675:
			sensor_addr = 0x42;
			break;
			
		case MT9D111:
			sensor_addr = 0xba;
			break;
		case OV3640:
		case OV5642:
			sensor_addr = 0x78;
			break;
		case OV2640:
			sensor_addr = 0x60;
			break;
		default:
			sensor_addr = 0x42;
			break;
	}
}

uint8_t ArduCAM::read_reg(uint8_t addr)
{
	uint8_t data;
	
	//Write register address
	cbi(P_CS, B_CS);
	DDRD = 0xFF;
	PORTD = addr;
	sbi(P_RS, B_RS);
	pulse_low(P_WR, B_WR);
	//Read register address
	cbi(P_RS, B_RS);
	DDRD = 0x00;
	*P_RD &= ~B_RD;
	data = PIND;		//fix me
	data = PIND;
	data = PIND;
	data = PIND;
	data = PIND;
	data = PIND;
	data = PIND;
	*P_RD |= B_RD;
	sbi(P_CS, B_CS);
	return data;
}

void ArduCAM::write_reg(uint8_t addr, uint8_t data)
{
	sbi(P_RD, B_RD);	//Disable RD when write register
	cbi(P_CS, B_CS);
	DDRD = 0xff;
	PORTD = addr;
	sbi(P_RS, B_RS);
	pulse_low(P_WR, B_WR);
	PORTD = data;
	cbi(P_RS, B_RS);
	pulse_low(P_WR, B_WR);
	sbi(P_CS, B_CS);
}

byte ArduCAM::wrSensorReg8_8(int regID, int regDat)
{

	//Serial.println("enter wrSensorReg");
	Wire.beginTransmission(sensor_addr >> 1);
	Wire.write(regID & 0x00FF); 	
	
	Wire.write(regDat & 0x00FF); 	
	
	
	if(Wire.endTransmission())
	{
		return 0; 
	}
	//Serial.println("leave wrSensorReg");
	delay(1);
  	return(1);
}

byte ArduCAM::rdSensorReg8_8(uint8_t regID, uint8_t* regDat)
{

	//Serial.println("enter wrSensorReg");
	Wire.beginTransmission(sensor_addr >> 1);
	Wire.write(regID & 0x00FF); 	
	Wire.endTransmission();
	
	Wire.requestFrom((sensor_addr >> 1),1);
	if(Wire.available())
		*regDat = Wire.read(); 	

	delay(1);
  	return(1);
}

byte ArduCAM::wrSensorReg8_16(int regID, int regDat)
{

	//Serial.println("enter wrSensorReg");
	Wire.beginTransmission(sensor_addr >> 1);
	Wire.write(regID & 0x00FF); 	

	Wire.write(regDat >> 8);            // sends data byte, MSB first
  	Wire.write(regDat & 0x00FF);  	
	
	if(Wire.endTransmission())
	{
		return 0; 
	}
	//Serial.println("leave wrSensorReg");
	delay(1);
  	return(1);
}

byte ArduCAM::wrSensorReg16_8(int regID, int regDat)
{

	Wire.beginTransmission(sensor_addr >> 1);
	Wire.write(regID >> 8);            // sends instruction byte, MSB first
  	Wire.write(regID & 0x00FF); 	
  	Wire.write(regDat & 0x00FF);  	

	if(Wire.endTransmission())
	{
		return 0; 
	}
	//Serial.println("leave wrSensorReg");
	delay(1);
  	return(1);
}


byte ArduCAM::rdSensorReg16_8(uint16_t regID, uint8_t* regDat)
{
	Wire.beginTransmission(sensor_addr >> 1);
	Wire.write(regID >> 8);
	Wire.write(regID & 0x00FF); 	
	Wire.endTransmission();
	
	Wire.requestFrom((sensor_addr >> 1),1);
	if(Wire.available())
		*regDat = Wire.read(); 	

	delay(1);
  	return(1);
}

byte ArduCAM::wrSensorReg16_16(int regID, int regDat)
{

	//Serial.println("enter wrSensorReg");
	Wire.beginTransmission(sensor_addr >> 1);
	
	Wire.write(regID >> 8);            // sends instruction byte, MSB first
  	Wire.write(regID & 0x00FF); 	

  	Wire.write(regDat >> 8);            // sends data byte, MSB first
  	Wire.write(regDat & 0x00FF);  	

	if(Wire.endTransmission())
	{
		return 0; 
	}
	//Serial.println("leave wrSensorReg");
	delay(1);
  	return(1);
}


int ArduCAM::wrSensorRegs8_8(const struct sensor_reg reglist[])
{
	int err = 0;
	unsigned int reg_addr,reg_val;
	const struct sensor_reg *next = reglist;
	
	while ((reg_addr != 0xff) | (reg_val != 0xff))
	{		
		reg_addr = pgm_read_word(&next->reg);
		reg_val = pgm_read_word(&next->val);
		err = wrSensorReg8_8(reg_addr, reg_val);
		if (!err)
			return err;
	   	next++;
	} 
	
	return 1;
}


int ArduCAM::wrSensorRegs8_16(const struct sensor_reg reglist[])
{
	int err = 0;
	
	unsigned int reg_addr,reg_val;
	const struct sensor_reg *next = reglist;
	
	while ((reg_addr != 0xff) | (reg_val != 0xffff))
	{		
		reg_addr = pgm_read_word(&next->reg);
		reg_val = pgm_read_word(&next->val);
		err = wrSensorReg8_16(reg_addr, reg_val);
			if (!err)
	   	return err;
	   	next++;
	}  
	
	return 1;
}

int ArduCAM::wrSensorRegs16_8(const struct sensor_reg reglist[])
{
	int err = 0;
	
	unsigned int reg_addr;
	unsigned char reg_val;
	const struct sensor_reg *next = reglist;
	
	while ((reg_addr != 0xffff) | (reg_val != 0xff))
	{		
		reg_addr = pgm_read_word(&next->reg);
		reg_val = pgm_read_word(&next->val);
		err = wrSensorReg16_8(reg_addr, reg_val);
		if (!err)
	   	return err;
	   next++;
	} 
	
	return 1;
}

int ArduCAM::wrSensorRegs16_16(const struct sensor_reg reglist[])
{
	int err = 0;
	
	unsigned int reg_addr,reg_val;
	const struct sensor_reg *next = reglist;
	
	while ((reg_addr != 0xffff) | (reg_val != 0xffff))
	{		
		reg_addr = pgm_read_word(&next->reg);
		reg_val = pgm_read_word(&next->val);
		err = wrSensorReg16_16(reg_addr, reg_val);
		if (!err)
	       return err;
	   next++;
	} 
	
	return 1;
}

void ArduCAM::InitCAM()
{
	byte rtn = 0;
	byte reg_val;
	switch(sensor_model)
	{
		case OV7670:
		{
			wrSensorReg8_8(0x12, 0x80);
			delay(100);
			rtn = wrSensorRegs8_8(OV7670_QVGA);
			break;
		}
		case OV7675:
		{
			wrSensorReg8_8(0x12, 0x80);
			delay(100);
			rtn = wrSensorRegs8_8(OV7675_QVGA);
			break;
		}
		case MT9D111:
		{
	
			rtn = wrSensorRegs8_16(MT9D111_QVGA_3fps);
			delay(3000);
			wrSensorReg8_16(0x97, 0x0020);
			break;

		}  
		case OV5642:
		{
			rtn = wrSensorRegs16_8(OV5642_QVGA);
			rdSensorReg16_8(0x3818,&reg_val);
			wrSensorReg16_8(0x3818, (reg_val | 0x60) & 0xff);
			rdSensorReg16_8(0x3621,&reg_val);
			wrSensorReg16_8(0x3621, reg_val & 0xdf);
			break;
		}
		case OV3640:
		{
			rtn = wrSensorRegs16_8(OV3640_QVGA);
			break;
		}
		case OV2640:
		{
			rtn = wrSensorRegs8_8(OV2640_QVGA);
			break;
		}
		default:
			
			break;	
	}
}


