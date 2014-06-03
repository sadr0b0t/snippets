
#define OPT_SYSTEM_INTERNAL
#define OPT_BOARD_INTERNAL
#include <p32xxxx.h>
#include <sys/attribs.h>
#include <pins_arduino.h>

#include"usb_host_local.h"

#include "usb_setup.h"

#if (USB_PING_PONG_MODE == USB_PING_PONG__NO_PING_PONG) || (USB_PING_PONG_MODE == USB_PING_PONG__ALL_BUT_EP0)
    #if !defined(USB_SUPPORT_OTG) && !defined(USB_SUPPORT_DEVICE)
    static BDT_ENTRY __attribute__ ((aligned(512)))    BDT[2];
    #endif
    #define BDT_IN                                  (&BDT[0])           // EP0 IN Buffer Descriptor
    #define BDT_OUT                                 (&BDT[1])           // EP0 OUT Buffer Descriptor
#elif (USB_PING_PONG_MODE == USB_PING_PONG__EP0_OUT_ONLY)
    #if !defined(USB_SUPPORT_OTG) && !defined(USB_SUPPORT_DEVICE)
    static BDT_ENTRY __attribute__ ((aligned(512)))    BDT[3];
    #endif
    #define BDT_IN                                  (&BDT[0])           // EP0 IN Buffer Descriptor
    #define BDT_OUT                                 (&BDT[1])           // EP0 OUT Even Buffer Descriptor
    #define BDT_OUT_ODD                             (&BDT[2])           // EP0 OUT Odd Buffer Descriptor
#elif (USB_PING_PONG_MODE == USB_PING_PONG__FULL_PING_PONG)
    #if !defined(USB_SUPPORT_OTG) && !defined(USB_SUPPORT_DEVICE)
    static BDT_ENTRY __attribute__ ((aligned(512)))    BDT[4];
    #endif
    #define BDT_IN                                  (&BDT[0])           // EP0 IN Even Buffer Descriptor
    #define BDT_IN_ODD                              (&BDT[1])           // EP0 IN Odd Buffer Descriptor
    #define BDT_OUT                                 (&BDT[2])           // EP0 OUT Even Buffer Descriptor
    #define BDT_OUT_ODD                             (&BDT[3])           // EP0 OUT Odd Buffer Descriptor
#endif

#if defined(USB_SUPPORT_OTG) || defined(USB_SUPPORT_DEVICE)
    extern BDT_ENTRY BDT[] __attribute__ ((aligned (512)));
#endif


// *****************************************************************************
// *****************************************************************************
// Section: Interrupt Handlers
// *****************************************************************************
// *****************************************************************************

/****************************************************************************
  Function:
    void _USB1Interrupt( void )

  Summary:
    This is the interrupt service routine for the USB interrupt.

  Description:
    This is the interrupt service routine for the USB interrupt.  The
    following cases are serviced:
         * Device Attach
         * Device Detach
         * One millisecond Timer
         * Start of Frame
         * Transfer Done
         * USB Error

  Precondition:
    In TRNIF handling, pCurrentEndpoint is still pointing to the last
    endpoint to which a token was sent.

  Parameters:
    None - None

  Returns:
    None

  Remarks:
    None
  ***************************************************************************/
#define U1STAT_TX_MASK                      0x08    // U1STAT bit mask for Tx/Rx indication
#define U1STAT_ODD_MASK                     0x04    // U1STAT bit mask for even/odd buffer bank




//void __attribute__((__interrupt__, no_auto_psv)) _USB1Interrupt( void ) {
//    IFS1CLR = _IFS1_USBIF_MASK;
//    handle_usb_interrupts();
//}

void __ISR(_USB_1_VECTOR, ipl4) _USB1Interrupt(void) {
    IFS1CLR = _IFS1_USBIF_MASK;
    handle_usb_interrupts();
}

void initUSB() {
    // set the vector up
//    setIntVector(_USB_1_VECTOR, _USB1Interrupt);
    
  
    // Enable USB hardware
    // Power on the module
//    U1PWRC = USB_NORMAL_OPERATION | USB_ENABLED;
    U1PWRCbits.USBPWR = 1;
    
    
    U1OTGCONbits.OTGEN = 1;
    U1CONbits.HOSTEN  = 1;
    U1IEbits.ATTACHIE = 1;
    
    
    // From ChipKITUSBHost::Begin
    
//    // turn power on to the USB Host connector
//    TRISBbits.TRISB5=0;
//
//    // LATBbits.LATB5 = TRUE;
//    LATBbits.LATB5 = false;  // turn it off as we will read the VBUS REQUEST EVENT.
//    
//    // Initialize USB layers (defined in usb_host.c)
//    // Инициализирует только внутренние переменные стека,
//    // не трогает железо
////    USBHostInit(0);
//    
//    // Из USBHostTasks( void ):
//    // Set up the hardware.
//                    U1IE                = 0;        // Clear and turn off interrupts.
//                    U1IR                = 0xFF;
//                    U1OTGIE             &= 0x8C;
//                    U1OTGIR             = 0x7D;
//                    U1EIE               = 0;
//                    U1EIR               = 0xFF;
//                    
//
//                    // Initialize the Buffer Descriptor Table pointer.
////                    #if defined(__C30__) || defined __XC16__
////                       U1BDTP1 = (WORD)(&BDT) >> 8;
////                    #elif defined(__PIC32MX__)
//                       U1BDTP1 = ((DWORD)KVA_TO_PA(&BDT) & 0x0000FF00) >> 8;
//                       U1BDTP2 = ((DWORD)KVA_TO_PA(&BDT) & 0x00FF0000) >> 16;
//                       U1BDTP3 = ((DWORD)KVA_TO_PA(&BDT) & 0xFF000000) >> 24;
////                    #else
////                        #error Cannot set up the Buffer Descriptor Table pointer.
////                    #endif
//
//                    // Configure the module
//                    U1CON               = USB_HOST_MODE_ENABLE | USB_SOF_DISABLE;                       // Turn of SOF's to cut down noise
//                    U1CON               = USB_HOST_MODE_ENABLE | USB_PINGPONG_RESET | USB_SOF_DISABLE;  // Reset the ping-pong buffers
//                    U1CON               = USB_HOST_MODE_ENABLE | USB_SOF_DISABLE;                       // Release the ping-pong buffers
//                    #ifdef  USB_SUPPORT_OTG
//                        U1OTGCON            |= USB_DPLUS_PULLDOWN_ENABLE | USB_DMINUS_PULLDOWN_ENABLE | USB_OTG_ENABLE; // Pull down D+ and D-
//                    #else
//                        U1OTGCON            = USB_DPLUS_PULLDOWN_ENABLE | USB_DMINUS_PULLDOWN_ENABLE; // Pull down D+ and D-
//                    #endif
//
//                    #if defined(__PIC32MX__)
//                        U1OTGCON |= USB_VBUS_ON;
//                    #endif
//
//                    U1CNFG1             = USB_PING_PONG_MODE;
//                    #if defined(__C30__) || defined __XC16__
//                        U1CNFG2         = USB_VBUS_BOOST_ENABLE | USB_VBUS_COMPARE_ENABLE | USB_ONCHIP_ENABLE;
//                    #endif
//                    U1ADDR              = 0;                        // Set default address and LSPDEN to 0
//                    U1EP0bits.LSPD      = 0;
//                    U1SOF               = USB_SOF_THRESHOLD_64;     // Maximum EP0 packet size
//                    
//                    
//                    
////                    U1IEbits.ATTACHIE = 1;
//                        U1IE = 0xFFFF;
    
}

