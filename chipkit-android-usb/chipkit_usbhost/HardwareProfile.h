// HardwareProfile.h

#ifndef _HARDWARE_PROFILE_H_
#define _HARDWARE_PROFILE_H_

    #include <p32xxxx.h>
    #include <plib.h>
    
    #include "USB/usb.h"
BOOL USBHostDriverInitialize( uint8_t address, DWORD flags );
BOOL USBHostDriverEventHandler ( uint8_t address, USB_EVENT event, void *data, DWORD size );

#endif
