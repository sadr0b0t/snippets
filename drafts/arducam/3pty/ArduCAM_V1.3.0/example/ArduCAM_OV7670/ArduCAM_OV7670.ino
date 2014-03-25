// ArduCAM demo (C)2012 Lee
// web: http://www.ArduCAM.com
// This program is a demo of how to use most of the functions
// of the library with a supported camera modules.
//
// This demo was made for Omnivision OV7670 sensor,
// Capture the image from the LCD and store to Micro SD/TF card.
// This program requires the ArduCAM library.
//

#include <UTFT.h>
#include <SD.h>
#include <Wire.h>
#include <ArduCAM.h>
#include <avr/pgmspace.h>

#define ARDUCHIP_DDR       0x00  //GPIO direction register
#define ARDUCHIP_PORT      0x01  //GPIO output register
#define ARDUCHIP_MODE      0x02  //Mode register
#define ARDUCHIP_TIM       0x03  //Timing register

#define ARDUCHIP_PIN       0x80  //GPIO input register
#define ARDUCHIP_TRIG      0x81  //Trigger source
#define ARDUCHIP_REV       0x82  //CPLD revision

const char bmp_header[54] PROGMEM =
{
      0x42, 0x4D, 0x36, 0x58, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x36, 0x00, 0x00, 0x00, 0x28, 0x00, 
      0x00, 0x00, 0x40, 0x01, 0x00, 0x00, 0xF0, 0x00, 0x00, 0x00, 0x01, 0x00, 0x10, 0x00, 0x00, 0x00, 
      0x00, 0x00, 0x00, 0x58, 0x02, 0x00, 0xC4, 0x0E, 0x00, 0x00, 0xC4, 0x0E, 0x00, 0x00, 0x00, 0x00, 
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00
};
  
#define SD_CS 9 
#define BMPIMAGEOFFSET 54


//UTFT(byte model, int RS, int WR, int RD, int CS)
UTFT myGLCD(ITDB32S,A2,A1,A0,10);   // Remember to change the model parameter to suit your display module!
//ArduCAM(byte model,int RS, int WR, int RD, int CS)
ArduCAM myCAM(OV7670,A2,A1,A0,A3);

void setup()
{
  Wire.begin();   
  myCAM.write_reg(ARDUCHIP_MODE, 0x00);
  
  if (!SD.begin(SD_CS)) 
  {
    //while (1);
  }
  
  myCAM.InitCAM();
  // Setup the LCD
  myGLCD.InitLCD();
  myCAM.write_reg(ARDUCHIP_DDR, 0x01);
}


void GrabImage(char* str)
{
  File outFile;
  char VH,VL;
  int i,j = 0;
  outFile = SD.open(str,FILE_WRITE);
  if (! outFile) 
    return;

  myCAM.write_reg(ARDUCHIP_MODE, 0x00);    //Switch to MCU
  myGLCD.resetXY();				//Reset the access location
  myCAM.write_reg(ARDUCHIP_MODE, 0x02);    //Switch to MCU Read
  
  //Write the BMP header
  for( i = 0; i < 54; i++)
  {
    char ch = pgm_read_byte(&bmp_header[i]);
    outFile.write((uint8_t*)&ch,1);
  }
  //Reverse the BUS direction
  DDRD = 0x00;
  
  digitalWrite(10,LOW);			//Assert the LCD CS
  myGLCD.LCD_Read_Bus(&VH,&VL);
  for(i = 0; i < 320; i++)
  for(j = 0; j < 240; j++)
  {
    myGLCD.LCD_Read_Bus(&VH,&VL);
    VL = (VH << 7) | ((VL & 0xC0) >> 1) | (VL & 0x1f);
    VH = VH >> 1;
    outFile.write(VL);
    outFile.write(VH);
  }
  digitalWrite(10,HIGH);		//Deassert the LCD CS
  
  //myCAM.write_reg(ARDUCHIP_MODE, 0x01);  //Switch to CAM
  outFile.close();
  return;
}

void loop()
{
  char str[8];
  static int k = 0;
  uint8_t temp;
  myCAM.write_reg(ARDUCHIP_MODE, 0x01);		 //Switch to CAM
  
  while(1)
  {
    temp = myCAM.read_reg(ARDUCHIP_TRIG);
    if(!(temp & 0x01))				 //New Frame is coming
    {
       
       myCAM.write_reg(ARDUCHIP_MODE, 0x00);    //Switch to MCU
       myGLCD.resetXY();
       myCAM.write_reg(ARDUCHIP_MODE, 0x01);    //Switch to CAM
       while(!(myCAM.read_reg(ARDUCHIP_TRIG)&0x01)); //Wait for VSYNC is over
       
    }
    else if(temp & 0x02)
    {
       k = k + 1;
       itoa(k, str, 10); 
       strcat(str,".bmp");

       GrabImage(str);
       //while(!(myCAM.read_reg(ARDUCHIP_TRIG)&0x01)); //Wait for VSYNC is over
    }
  }
  return;
  
}



