#include "WProgram.h"

extern "C"{
    void handle_usb_interrupts();
}

// put this call inside _USB1Interrupt( void ) in chipKITUSBHost/utility/usb_host.c to see
// if usb interrupts are generated
void handle_usb_interrupts() {
    Serial.println("Interrupt from USB");
}

