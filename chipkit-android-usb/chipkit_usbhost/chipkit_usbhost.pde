#include <chipKITUSBHost.h>

// Anroid accessory protocol commands
// http://source.android.com/accessories/aoa.html#wait-for-and-detect-connected-devices
#define ANDROID_ACCESSORY_GET_PROTOCOL              51
#define ANDROID_ACCESSORY_SEND_STRING               52
#define ANDROID_ACCESSORY_START                     53
#define ANDROID_ACCESSORY_REGISTER_HID              54
#define ANDROID_ACCESSORY_UNREGISTER_HID            55
#define ANDROID_ACCESSORY_SET_HID_REPORT_DESC       56
#define ANDROID_ACCESSORY_SEND_HID_EVENT            57
#define ANDROID_ACCESSORY_SET_AUDIO_MODE            58

#define DATA_PACKET_LENGTH  8

typedef union DATA_PACKET
{
    uint8_t _byte[DATA_PACKET_LENGTH];  //For byte access
    WORD _word[DATA_PACKET_LENGTH/2]; //For word access(DATA_PACKET_LENGTH must be even)
    struct
    {
        uint8_t CMD;
        uint8_t len;
    };
} DATA_PACKET;


// Application States
typedef enum
{
    DEMO_INITIALIZE = 0,                // Initialize the app when a device is attached
    DEMO_STATE_IDLE,                    // Inactive State


    DEMO_STATE_GET_DEV_VERSION,         // New device attached, send Get-Dev-FW-Version command
    DEMO_STATE_WAITING_VER_REQ,         // Waiting for Get Version command to complete
    DEMO_STATE_READ_DEV_VERSION,        // Start reading Dev FW version data
    DEMO_STATE_WAITING_READ_VER,        // Waiting for read of version data to complete
    DEMO_STATE_VERIFY_DEV_FW_VER,       // Dev FW Ver received, verify & display it
    
    DEMO_STATE_READ_CMD,


    DEMO_STATE_ERROR                    // An error has occured

} DEMO_STATE;

/* PICDEM FS USB Demo Version */
#define DEMO_FW_MINOR_VERSION   0x00    //Demo Version 1.00
#define DEMO_FW_MAJOR_VERSION   0x01

/* Commands */
#define READ_VERSION     0x00


BOOL deviceAttached = FALSE;
uint8_t deviceAddress;  // Address of the device on the USB
DATA_PACKET DataPacket;     // Data to send to the device
DEMO_STATE  DemoState;      // Current state of the demo application


BOOL USBHostDriverInitialize( uint8_t address, DWORD flags ) {
    Serial.print("USB HOST Initialize: ");
    Serial.print("address=");
    Serial.print((int)address);
    Serial.print("; flags=");
    Serial.println((int)flags);
    // This handler supports one attached device.
    if (deviceAddress != 0) {
        Serial.println("Driver error: Can't connect more than 1 devices");
        return FALSE; // We cannot support this device.
    }
    deviceAddress = address;
    
    // Follow Android USB Accessory protocol specs http://source.android.com/accessories/aoa.html
    
    // Get detailed device info
    USB_DEVICE_DESCRIPTOR *deviceDescriptor = NULL;
    USB_CONFIGURATION_DESCRIPTOR *configurationDescriptor = NULL;
    USB_INTERFACE_DESCRIPTOR *interfaceDescriptor = NULL;
    USB_ENDPOINT_DESCRIPTOR *endpointDescriptor = NULL;
        
    deviceDescriptor = (USB_DEVICE_DESCRIPTOR*)USBHostGetDeviceDescriptor(address);
    printUSBDeviceDescriptor(deviceDescriptor);
    
    configurationDescriptor = (USB_CONFIGURATION_DESCRIPTOR*)USBHostGetCurrentConfigurationDescriptor(address);   
    printUSBConfigurationDescriptor(configurationDescriptor);
    
    // pointer to current config descriptor item
    uint8_t *descriptorPtr = (uint8_t*)configurationDescriptor;
    // points to the end of the configurations memory area
    uint8_t * descriptorEnd = descriptorPtr + configurationDescriptor->wTotalLength;
        
    // Loop through all configuration descriptors playing with pointers
    descriptorPtr += configurationDescriptor->bLength;
    while(descriptorPtr < descriptorEnd) {
        uint8_t bLength = descriptorPtr[0];
        uint8_t bDescriptorType = descriptorPtr[1];
        
        if(bDescriptorType == USB_DESCRIPTOR_INTERFACE) {
            interfaceDescriptor = (USB_INTERFACE_DESCRIPTOR*)descriptorPtr;
            
            printUSBInterfaceDescriptor(interfaceDescriptor);
        } else if(bDescriptorType == USB_DESCRIPTOR_ENDPOINT) {
            endpointDescriptor = (USB_ENDPOINT_DESCRIPTOR*)descriptorPtr;
          
            printUSBEndpointDescriptor(endpointDescriptor);
        } else {
            // should not come here with correct usb device
        }
        descriptorPtr += bLength;
    }
    
    // For accessory mode vendor ID should match Google's ID (0x18D1) 
    // and the product ID should be 0x2D00
    if(deviceDescriptor->idVendor == 0x18D1 && deviceDescriptor->idProduct) {
        Serial.println("Device is Google Android accessory (idVendor=0x18D1, idProduct=0x2D00)");
    } else {
        Serial.println("Device is not recognized as Google Android accessory (idVendor should be 0x18D1, idProduct should be 0x2D00), ");
        Serial.println("Try to determine if accessory mode is supported...");
        
//        error = USBHostWrite( address, EP1, buffer, sizeof(buffer) );
//        if (error) {
//            // There was a problem
//        } else {
//            while (!USBHostTransferIsComplete( device, EP1, &error, &count )) {
//                USBHostTasks();
//            }
//            if (error) {
//                // There was a problem
//            } else {
//                // The data was transferred successfully
//            }
//        }

      
        Serial.println("Driver error: Device is not Google Android accessory (idVendor should be 0x18D1, idProduct should be 0x2D00)");
        return FALSE;
    }
    
    return TRUE; // Device successfully initialized
}

BOOL USBHostDriverEventHandler ( uint8_t address, USB_EVENT event, void *data, DWORD size ) {
  Serial.print("USB event Driver: ");
  printUSBEvent(address, event, data, size);
  Serial.println();
  
    // Handle specific events.
    switch ( (INT)event ) {
        case EVENT_DETACH:
            deviceAddress = 0;
            return TRUE;
        default:
            break;
    }

    return FALSE;

} // USBHostDriverEventHandler

BOOL USBHostApplicationEventHandler ( uint8_t address, USB_EVENT event, void *data, DWORD size ) {
    Serial.print("USB event Application: ");
    printUSBEvent(address, event, data, size);
    Serial.println();
  
    BOOL fRet = FALSE;

    // call the default handler for common host controller stuff
    fRet = USBHost.DefaultEventHandler(address, event, data, size);
  
    // Handle specific events.
    switch ( (INT)event ) {
        case EVENT_VBUS_REQUEST_POWER:
            return TRUE;
            break;
        case EVENT_VBUS_RELEASE_POWER:
            return TRUE;
            break;
    }
    return fRet;
} // USBHostApplicationEventHandler

// *****************************************************************************
/* Print USB Device Descriptor Structure
This struct defines the structure of a USB Device Descriptor.  Note that this
structure may need to be packed, or even accessed as bytes, to properly access
the correct fields when used on some device architectures.
*/
void printUSBDeviceDescriptor(USB_DEVICE_DESCRIPTOR* descriptor) {
    // See typedef struct fields in usb_ch9.h
    Serial.print("bLength=");
    Serial.print(descriptor->bLength, DEC);               // Length of this descriptor.
    Serial.print(", bDescriptorType=");
    Serial.print(descriptor->bDescriptorType, DEC);       // DEVICE descriptor type (USB_DESCRIPTOR_DEVICE).
    Serial.print(", bcdUSB=");
    Serial.print(descriptor->bcdUSB, DEC);                // USB Spec Release Number (BCD).
    Serial.print(", bDeviceClass=");
    Serial.print(descriptor->bDeviceClass, DEC);          // Class code (assigned by the USB-IF). 0xFF-Vendor specific.
    Serial.print(", bDeviceSubClass=");
    Serial.print(descriptor->bDeviceSubClass, DEC);       // Subclass code (assigned by the USB-IF).
    Serial.print(", bDeviceProtocol=");
    Serial.print(descriptor->bDeviceProtocol, DEC);       // Protocol code (assigned by the USB-IF). 0xFF-Vendor specific.
    Serial.print(", bMaxPacketSize0=");
    Serial.print(descriptor->bMaxPacketSize0, DEC);       // Maximum packet size for endpoint 0.
    Serial.print(", idVendor=0x");
    Serial.print(descriptor->idVendor, HEX);              // Vendor ID (assigned by the USB-IF).
    Serial.print(", idProduct=0x");
    Serial.print(descriptor->idProduct, HEX);             // Product ID (assigned by the manufacturer).
    Serial.print(", bcdDevice=");
    Serial.print(descriptor->bcdDevice, DEC);             // Device release number (BCD).
    Serial.print(", iManufacturer=");
    Serial.print(descriptor->iManufacturer, DEC);         // Index of String Descriptor describing the manufacturer.
    Serial.print(", iProduct=");
    Serial.print(descriptor->iProduct, DEC);              // Index of String Descriptor describing the product.
    Serial.print(", iSerialNumber=");
    Serial.print(descriptor->iSerialNumber, DEC);         // Index of String Descriptor with the device's serial number.
    Serial.print(", bNumConfigurations=");
    Serial.print(descriptor->bNumConfigurations, DEC);    // Number of possible configurations.
    Serial.println();
}

// *****************************************************************************
/* Print USB Configuration Descriptor Structure
This struct defines the structure of a USB Configuration Descriptor.  Note that this
structure may need to be packed, or even accessed as bytes, to properly access
the correct fields when used on some device architectures.
*/
void printUSBConfigurationDescriptor(USB_CONFIGURATION_DESCRIPTOR* descriptor) {
    // See typedef struct fields in usb_ch9.h
    Serial.print("bLength=");
    Serial.print(descriptor->bLength, DEC);               // Length of this descriptor.
    Serial.print(", bDescriptorType=");
    Serial.print(descriptor->bDescriptorType, DEC);       // CONFIGURATION descriptor type (USB_DESCRIPTOR_CONFIGURATION).
    Serial.print(", wTotalLength=");
    Serial.print(descriptor->wTotalLength, DEC);          // Total length of all descriptors for this configuration.
    Serial.print(", bNumInterfaces=");
    Serial.print(descriptor->bNumInterfaces, DEC);        // Number of interfaces in this configuration.
    Serial.print(", bConfigurationValue=");
    Serial.print(descriptor->bConfigurationValue, DEC);   // Value of this configuration (1 based).
    Serial.print(", iConfiguration=");
    Serial.print(descriptor->iConfiguration, DEC);        // Index of String Descriptor describing the configuration.
    Serial.print(", bmAttributes=");
    Serial.print(descriptor->bmAttributes, DEC);          // Configuration characteristics.
    Serial.print(", bMaxPower=");
    Serial.print(descriptor->bMaxPower, DEC);             // Maximum power consumed by this configuration.
    Serial.println();
}

// *****************************************************************************
/* Print USB Interface Descriptor Structure
This struct defines the structure of a USB Interface Descriptor.  Note that this
structure may need to be packed, or even accessed as bytes, to properly access
the correct fields when used on some device architectures.
*/
void printUSBInterfaceDescriptor(USB_INTERFACE_DESCRIPTOR* descriptor) {
    // See typedef struct fields in usb_ch9.h
    Serial.print("bLength=");
    Serial.print(descriptor->bLength, DEC);               // Length of this descriptor.
    Serial.print(", bDescriptorType=");
    Serial.print(descriptor->bDescriptorType, DEC);       // INTERFACE descriptor type (USB_DESCRIPTOR_INTERFACE).
    Serial.print(", bInterfaceNumber=");
    Serial.print(descriptor->bInterfaceNumber, DEC);      // Number of this interface (0 based).
    Serial.print(", bAlternateSetting=");
    Serial.print(descriptor->bAlternateSetting, DEC);     // Value of this alternate interface setting.
    Serial.print(", bNumEndpoints=");
    Serial.print(descriptor->bNumEndpoints, DEC);         // Number of endpoints in this interface.
    Serial.print(", bInterfaceClass=");
    Serial.print(descriptor->bInterfaceClass, DEC);       // Class code (assigned by the USB-IF).  0xFF-Vendor specific.
    Serial.print(", bInterfaceSubClass=");
    Serial.print(descriptor->bInterfaceSubClass, DEC);    // Subclass code (assigned by the USB-IF).
    Serial.print(", bInterfaceProtocol=");
    Serial.print(descriptor->bInterfaceProtocol, DEC);    // Protocol code (assigned by the USB-IF).  0xFF-Vendor specific.
    Serial.print(", iInterface=");
    Serial.print(descriptor->iInterface, DEC);            // Index of String Descriptor describing the interface.
    Serial.println();
}

// *****************************************************************************
/* Print USB Endpoint Descriptor Structure
This struct defines the structure of a USB Endpoint Descriptor.  Note that this
structure may need to be packed, or even accessed as bytes, to properly access
the correct fields when used on some device architectures.
*/
void printUSBEndpointDescriptor(USB_ENDPOINT_DESCRIPTOR* descriptor) {
    // See typedef struct fields in usb_ch9.h
    Serial.print("bLength=");
    Serial.print(descriptor->bLength, DEC);               // Length of this descriptor.
    Serial.print(", bDescriptorType=");
    Serial.print(descriptor->bDescriptorType, DEC);       // ENDPOINT descriptor type (USB_DESCRIPTOR_ENDPOINT).
    Serial.print(", bEndpointAddress=");
    Serial.print(descriptor->bEndpointAddress, DEC);      // Endpoint address. Bit 7 indicates direction (0=OUT, 1=IN).
    Serial.print(", bmAttributes=");
    Serial.print(descriptor->bmAttributes, DEC);          // Endpoint transfer type.
    Serial.print(", wMaxPacketSize=");
    Serial.print(descriptor->wMaxPacketSize, DEC);        // Maximum packet size.
    Serial.print(", bInterval=");
    Serial.print(descriptor->bInterval, DEC);             // Polling interval in frames.
    Serial.println();
}

void printUSBEvent ( uint8_t address, USB_EVENT event, void *data, DWORD size ) {
    // Print specific events info.
    switch ( (INT)event ) {
        case EVENT_NONE:
            Serial.print( "NONE" );
            break;
        case EVENT_DEVICE_STACK_BASE:
            Serial.print( "DEVICE STACK BASE" );
            break;
        case EVENT_HOST_STACK_BASE:
            Serial.print( "HOST STACK BASE" );
            break;
        case EVENT_HUB_ATTACH:
            Serial.print( "HUB ATTACH" );
            break;
        case EVENT_STALL:
            Serial.print( "STALL" );
            break;
        case EVENT_VBUS_SES_REQUEST:
            Serial.print( "SES REQUEST" );
            break;
        case EVENT_VBUS_OVERCURRENT:
            Serial.print( "VBUS OVERCURRENT" );
            break;
        case EVENT_VBUS_REQUEST_POWER:
            Serial.print( "VBUS REQUEST POWER" );
            break;
        case EVENT_VBUS_RELEASE_POWER:
            Serial.print( "VBUS RELEASE POWER" );
            break;
        case EVENT_VBUS_POWER_AVAILABLE:
            Serial.print( "VBUS POWER AVAILABLE" );
            break;
        case EVENT_UNSUPPORTED_DEVICE:
            Serial.print( "UNSUPPORTED DEVICE" );
            break;
        case EVENT_CANNOT_ENUMERATE:
            Serial.print( "ENUMERATE" );
            break;
        case EVENT_CLIENT_INIT_ERROR:
            Serial.print( "INIT ERROR" );
            break;
        case EVENT_OUT_OF_MEMORY:
            Serial.print( "OUT OF MEMORY" );
            break;
        case EVENT_UNSPECIFIED_ERROR:
            Serial.print( "UNSPECIFIED ERROR" );
            break;
        case EVENT_DETACH:
            Serial.print( "DETACH" );
            break;
        case EVENT_TRANSFER:
            Serial.print( "TRANSFER" );
            break;
        case EVENT_SOF:
            Serial.print( "SOF" );
            break;
        case EVENT_RESUME:
            Serial.print( "RESUME" );
            break;
        case EVENT_SUSPEND:
            Serial.print( "SUSPEND" );
            break;
        case EVENT_RESET:
            Serial.print( "RESET" );
            break;
        case EVENT_DATA_ISOC_READ:
            Serial.print( "DATA ISOC READ" );
            break;
        case EVENT_DATA_ISOC_WRITE:
            Serial.print( "DATA ISOC WRITE" );
            break;
//        case EVENT_OVERRIDE_CLIENT_DRIVER_SELECTION:
//            // In Host mode, this event gives the application layer the option to reject
//            // a client driver that was selected by the stack.  This is needed when multiple
//            // devices are supported by class level support, but one configuration and client
//            // driver is preferred over another.  Since configuration number is not guaranteed,
//            // the stack cannot do this automatically.  This event is issued only when
//            // looking through configuration descriptors; the driver selected at the device
//            // level cannot be overridden, since there shouldn't be any other options to
//            // choose from.
//            Serial.print( "OVERRIDE CLIENT DRIVER SELECTION" );
//            break;
//        case EVENT_1MS:
//            Serial.print( "1MS" );
//            break;
        case EVENT_GENERIC_BASE:
            Serial.print( "GENERIC BASE" );
            break;
        case EVENT_MSD_BASE:
            Serial.print( "MSD BASE" );
            break;
        case EVENT_HID_BASE:
            Serial.print( "HID BASE" );
            break;
        case EVENT_PRINTER_BASE:
            Serial.print( "PRINTER BASE" );
            break;
        case EVENT_CDC_BASE:
            Serial.print( "CDC BASE" );
            break;
        case EVENT_CHARGER_BASE:
            Serial.print( "CHARGER BASE" );
            break;
        case EVENT_AUDIO_BASE:
            Serial.print( "AUDIO BASE" );
            break;
        case EVENT_USER_BASE:
            Serial.print( "USER BASE" );
            break;
        case EVENT_BUS_ERROR:
            Serial.print( "BUS ERROR" );
            break;
        default:
            Serial.print( "UNKNOWN; code=" );
            Serial.print( (int)event );
            break;
    }
}

/****************************************************************************
  Function:
    void RunUSBTasks(void)

  Description:
    Runs periodic tasks to keep the USB stack alive and well

  Precondition:
    None

  Parameters:
    None
  Return Values:
    None

  Remarks:
    Call this at least once through the loop, or when we want the 
    USB Host controller to update itself internally

***************************************************************************/
void RunUSBTasks(void) {
    USBHost.Tasks();
}

void setup() {
  // Open serial communications:
    Serial.begin(9600);
    Serial.println("Start program");
    
    // initialize the USB HOST controller
    USBHost.Begin(USBHostApplicationEventHandler);
}

void processState() {
  uint8_t RetVal;

    switch (DemoState)
    {
    case DEMO_INITIALIZE:
        DemoState = DEMO_STATE_IDLE;
        break;

    /** Idle State:  Loops here until attach **/
    case DEMO_STATE_IDLE:
        break;

    case DEMO_STATE_READ_CMD:
        break;
    }
}

void loop()
{
    RunUSBTasks();

    //processState();
    //delay(1); // 1ms delay
}

