#include "WProgram.h"

extern "C"{
    #include "usb_setup.h"
}

#include "usb_handler.h"

void init_usb_handler() {
    Serial.println("Init USB subsystem...");
    initUSB();
}

void handle_usb_interrupts() {
    Serial.println("Interrupt from USB");
}

