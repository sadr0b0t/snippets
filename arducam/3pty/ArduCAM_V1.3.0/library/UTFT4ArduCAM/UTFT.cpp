/*
  UTFT.cpp - Arduino/chipKit library support for Color TFT LCD Boards
  Copyright (C)2010-2012 Henning Karlsen. All right reserved
  
  This library is the continuation of my ITDB02_Graph, ITDB02_Graph16
  and RGB_GLCD libraries for Arduino and chipKit. As the number of 
  supported display modules and controllers started to increase I felt 
  it was time to make a single, universal library as it will be much 
  easier to maintain in the future.

  Basic functionality of this library was origianlly based on the 
  demo-code provided by ITead studio (for the ITDB02 modules) and 
  NKC Electronics (for the RGB GLCD module/shield).

  This library supports a number of 8bit, 16bit and serial graphic 
  displays, and will work with both Arduino and chipKit boards. For a 
  full list of tested display modules and controllers, see the 
  document UTFT_Supported_display_modules_&_controllers.pdf.

  When using 8bit and 16bit display modules there are some 
  requirements you must adhere to. These requirements can be found 
  in the document UTFT_Requirements.pdf.
  There are no special requirements when using serial displays.

  You can always find the latest version of the library at 
  http://electronics.henningkarlsen.com/

  If you make any modifications or improvements to the code, I would 
  appreciate that you share the code with me so that I might include 
  it in the next release. I can be contacted through 
  http://electronics.henningkarlsen.com/contact.php.

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

#include "UTFT.h"
#include <pins_arduino.h>
#if defined(__AVR__)
	#include <avr/pgmspace.h>
	#include "HW_AVR.h" 
#else
	#include "HW_PIC32.h"
#endif
#include "memorysaver.h"

UTFT::UTFT()
{
}

UTFT::UTFT(byte model, int RS, int WR, int RD, int CS)
{ 
	switch (model)
	{

		case SSD1289:
			disp_x_size=239;
			disp_y_size=319;
			display_transfer_mode=8;
			break;


	}
	display_model=model;

	if (display_transfer_mode!=1)
	{
		_set_direction_registers(display_transfer_mode);
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

	}
	else
	{

	}
}

void UTFT::LCD_Write_COM(char VL)  
{   
	if (display_transfer_mode!=1)
	{
		cbi(P_RS, B_RS);
		LCD_Writ_Bus(0x00,VL,display_transfer_mode);
	}
	else
		LCD_Writ_Bus(0x00,VL,display_transfer_mode);
}

void UTFT::LCD_Write_DATA(char VH,char VL)
{
	if (display_transfer_mode!=1)
	{
		sbi(P_RS, B_RS);
		sbi(P_RD, B_RD);
		LCD_Writ_Bus(VH,VL,display_transfer_mode);
	}
	else
	{
		LCD_Writ_Bus(0x01,VH,display_transfer_mode);
		LCD_Writ_Bus(0x01,VL,display_transfer_mode);
	}
}

void UTFT::LCD_Write_DATA(char VL)
{
	if (display_transfer_mode!=1)
	{
		sbi(P_RS, B_RS);
		LCD_Writ_Bus(0x00,VL,display_transfer_mode);
	}
	else
		LCD_Writ_Bus(0x01,VL,display_transfer_mode);
}

void UTFT::LCD_Write_COM_DATA(char com1,int dat1)
{
     LCD_Write_COM(com1);
     LCD_Write_DATA(dat1>>8,dat1);
}

void UTFT::InitLCD(byte orientation)
{
	orient=orientation;

	sbi(P_RST, B_RST);
	delay(5); 
	cbi(P_RST, B_RST);
	delay(15);
	sbi(P_RST, B_RST);
	delay(15);

	cbi(P_CS, B_CS);

	switch(display_model)
	{

#ifndef DISABLE_SSD1289
	case SSD1289:
		LCD_Write_COM_DATA(0x00,0x0001);
		LCD_Write_COM_DATA(0x03,0xA8A4);
		LCD_Write_COM_DATA(0x0C,0x0000);
		LCD_Write_COM_DATA(0x0D,0x080C);
		LCD_Write_COM_DATA(0x0E,0x2B00);
		LCD_Write_COM_DATA(0x1E,0x00B7);
		LCD_Write_COM_DATA(0x01,0x693F);//693f
		LCD_Write_COM_DATA(0x02,0x0600);
		LCD_Write_COM_DATA(0x10,0x0000);
		LCD_Write_COM_DATA(0x11,0x6078);//6078
		LCD_Write_COM_DATA(0x05,0x0000);
		LCD_Write_COM_DATA(0x06,0x0000);
		LCD_Write_COM_DATA(0x16,0xEF1C);
		LCD_Write_COM_DATA(0x17,0x0003);
		LCD_Write_COM_DATA(0x07,0x0233);
		LCD_Write_COM_DATA(0x0B,0x0000);
		LCD_Write_COM_DATA(0x0F,0x0000);
		LCD_Write_COM_DATA(0x41,0x0000);
		LCD_Write_COM_DATA(0x42,0x0000);
		LCD_Write_COM_DATA(0x48,0x0000);
		LCD_Write_COM_DATA(0x49,0x013F);
		LCD_Write_COM_DATA(0x4A,0x0000);
		LCD_Write_COM_DATA(0x4B,0x0000);
		LCD_Write_COM_DATA(0x44,0xEF00);
		LCD_Write_COM_DATA(0x45,0x0000);
		LCD_Write_COM_DATA(0x46,0x013F);
		LCD_Write_COM_DATA(0x30,0x0707);
		LCD_Write_COM_DATA(0x31,0x0204);
		LCD_Write_COM_DATA(0x32,0x0204);
		LCD_Write_COM_DATA(0x33,0x0502);
		LCD_Write_COM_DATA(0x34,0x0507);
		LCD_Write_COM_DATA(0x35,0x0204);
		LCD_Write_COM_DATA(0x36,0x0204);
		LCD_Write_COM_DATA(0x37,0x0502);
		LCD_Write_COM_DATA(0x3A,0x0302);
		LCD_Write_COM_DATA(0x3B,0x0302);
		LCD_Write_COM_DATA(0x23,0x0000);
		LCD_Write_COM_DATA(0x24,0x0000);
		LCD_Write_COM_DATA(0x25,0x8000);
		LCD_Write_COM_DATA(0x4f,0x0000);
		LCD_Write_COM_DATA(0x4e,0x0000);
		LCD_Write_COM(0x22);   
		break;
#endif

	}

	sbi (P_CS, B_CS); 

	//setColor(255, 255, 255);
	//setBackColor(0, 0, 0);
	cfont.font=0;
	clrScr();
}

void UTFT::setXY(word x1, word y1, word x2, word y2)
{
	int tmp;

	if (orient==LANDSCAPE)
	{
		swap(word, x1, y1);
		swap(word, x2, y2)
		y1=disp_y_size-y1;
		y2=disp_y_size-y2;
		swap(word, y1, y2)
	}

	switch(display_model)
	{
#if !defined(DISABLE_SSD1289)
	case SSD1289:
		LCD_Write_COM_DATA(0x44,(x2<<8)+x1);
		LCD_Write_COM_DATA(0x45,y1);
		LCD_Write_COM_DATA(0x46,y2);
		LCD_Write_COM_DATA(0x4e,x1);
		LCD_Write_COM_DATA(0x4f,y1);
		LCD_Write_COM(0x22); 
		break;
#endif

	}
}

void UTFT::clrXY()
{
	//cbi(P_CS, B_CS);
	if (orient==PORTRAIT)
		setXY(0,0,disp_x_size,disp_y_size);
	else
		setXY(0,0,disp_y_size,disp_x_size);
	//sbi(P_CS, B_CS);
}





void UTFT::resetXY()
{
	cbi(P_CS, B_CS);
	clrXY();
	sbi(P_CS, B_CS);
}
	
void UTFT::clrScr()
{
	long i;
	
	cbi(P_CS, B_CS);
	clrXY();
	if (display_transfer_mode!=1)
		sbi(P_RS, B_RS);
	for (i=0; i<((disp_x_size+1)*(disp_y_size+1)); i++)
	{
		if (display_transfer_mode!=1)
			LCD_Writ_Bus(0,0,display_transfer_mode);
		else
		{
			LCD_Writ_Bus(1,0,display_transfer_mode);
			LCD_Writ_Bus(1,0,display_transfer_mode);
			//LCD_Writ_Bus(00,0x55,display_transfer_mode);
		}
	}
	sbi(P_CS, B_CS);
}















void UTFT::setFont(uint8_t* font)
{
	cfont.font=font;
	cfont.x_size=fontbyte(0);
	cfont.y_size=fontbyte(1);
	cfont.offset=fontbyte(2);
	cfont.numchars=fontbyte(3);
}





void UTFT::lcdOff()
{
	cbi(P_CS, B_CS);
	switch (display_model)
	{
	case PCF8833:
		LCD_Write_COM(0x28);
		break;
	}
	sbi(P_CS, B_CS);
}

void UTFT::lcdOn()
{
	cbi(P_CS, B_CS);
	switch (display_model)
	{
	case PCF8833:
		LCD_Write_COM(0x29);
		break;
	}
	sbi(P_CS, B_CS);
}

void UTFT::LCD_Disp_Filp()
{
	cbi(P_CS, B_CS);
	LCD_Write_COM_DATA(0x11,0x6068);//6078
	LCD_Write_COM(0x22);  
	sbi(P_CS, B_CS);
}

void UTFT::LCD_Disp_Normal()
{
	cbi(P_CS, B_CS);
	LCD_Write_COM_DATA(0x11,0x6078);//6078
	LCD_Write_COM(0x22);  
	sbi(P_CS, B_CS);
}
