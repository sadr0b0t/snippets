// *** Hardwarespecific functions ***
void UTFT::LCD_Writ_Bus(char VH,char VL, byte mode)
{   
	switch (mode)
	{
	case 1:
		
		break;
	case 8:
#if defined(__AVR_ATmega1280__) || defined(__AVR_ATmega2560__)
		PORTA = VH;
		pulse_low(P_WR, B_WR);
		PORTA = VL;
		pulse_low(P_WR, B_WR);
#else
		PORTD = VH;
		pulse_low(P_WR, B_WR);
		PORTD = VL;
		pulse_low(P_WR, B_WR);
#endif
		break;
	case 16:
#if defined(__AVR_ATmega1280__) || defined(__AVR_ATmega2560__)
		PORTA = VH;
		PORTC = VL;
#else
		PORTD = VH;
		cport(PORTC, 0xFC);
		sport(PORTC, (VL>>6) & 0x03);
		PORTB =  VL & 0x3F;
#endif
		pulse_low(P_WR, B_WR);
		break;
	}
}

//Add 20120902
void UTFT::LCD_Read_Bus(char* VH, char* VL)
{   
	*P_RS |= B_RS;
	*P_WR |= B_WR;	//Disable the Write signal
	
	*P_RD &= ~B_RD;
	//*P_RD &= ~B_RD;
	//*P_RD &= ~B_RD;
	*VH = PIND;
	*VH = PIND;
	//*P_RD |= B_RD;
	*P_RD |= B_RD;
	
	*P_RD &= ~B_RD;
	//*P_RD &= ~B_RD;
	//*P_RD &= ~B_RD;
	*VL = PIND;
	*VL = PIND;
	//*P_RD |= B_RD;
	*P_RD |= B_RD;

}

void UTFT::_set_direction_registers(byte mode)
{
#if defined(__AVR_ATmega1280__) || defined(__AVR_ATmega2560__)
	DDRA = 0xFF;
	if (mode==16)
		DDRC = 0xFF;
#else
	DDRD = 0xFF;
	if (mode==16)
	{
		DDRB |= 0x3F;
		DDRC |= 0x03;
	}
#endif

}
