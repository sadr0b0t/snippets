/*****************************************************************************
** Function name:	I2CInit
**
** Descriptions:	Initialize I2C controller
**
** parameters:		I2c mode is either MASTER or SLAVE
** Returned value:	true or false, return false if the I2C
**					interrupt handler was not installed correctly
**
*****************************************************************************/
//uint32_t I2CInit( uint32_t I2cMode )
//{
//        /* 0.19 SDA1 */
//	LPC_PINCON->PINSEL1 |= (0x3 << 6);
//        /* 0.20 SCL1 */
//	LPC_PINCON->PINSEL1 |= (0x3 << 8);
//
//        /* 0.19 turn off pullup/pulldown */
//	LPC_PINCON->PINMODE1 &= ~(0x1 << 6);
//	LPC_PINCON->PINMODE1 |= (0x1 << 7);
//
//        /* 0.20 turn off pullup/pulldown */
//	LPC_PINCON->PINMODE1 &= ~(0x1 << 8);
//	LPC_PINCON->PINMODE1 |= (0x1 << 9);
//
//        /* 0.19 & 0.20 open drain */
//	LPC_PINCON->PINMODE_OD0 |= (0x3 << 19);
//
//	LPC_SC->PCLKSEL1 |= (0x3 << 6);  // cclk/8
//
//	/*--- Clear flags ---*/
//	LPC_I2C1->I2CONCLR = I2CONCLR_AAC | I2CONCLR_SIC | I2CONCLR_STAC | I2CONCLR_I2ENC;
//
//	/*--- Reset registers ---*/
//#if FAST_MODE_PLUS
//	LPC_I2C1->I2SCLL   = I2SCLL_HS_SCLL;
//	LPC_I2C1->I2SCLH   = I2SCLH_HS_SCLH;
//#else
//	//LPC_I2C1->I2SCLL   = 16;  // i2c freq = (100,000,000/8)/ (32) = 390.63khz
//	//LPC_I2C1->I2SCLH   = 16;
//
//	LPC_I2C1->I2SCLL   = 900;
//	LPC_I2C1->I2SCLH   = 900;
//#endif
//
//	if ( I2cMode == I2CSLAVE )
//	{
//		LPC_I2C1->I2ADR0 = PCF8594_ADDR;
//	}
//
//	/* Enable the I2C Interrupt */
//	NVIC_EnableIRQ(I2C1_IRQn);
//
//	LPC_I2C1->I2CONSET = I2CONSET_I2EN;
//	return( 1 );
//}
