#include <chipKITUSBHost.h>
#include <chipKITUSBGenericHost.h>

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


BOOL USB_ApplicationEventHandler1 ( uint8_t address, USB_EVENT event, void *data, DWORD size )
{
    #ifdef USB_GENERIC_SUPPORT_SERIAL_NUMBERS
        uint8_t i;
    #endif

    // Handle specific events.
    switch ( (INT)event )
    {
        case EVENT_GENERIC_ATTACH:
            Serial.println( "\r\n***** USB Generic device attach *****\r\n" );
            if (size == sizeof(GENERIC_DEVICE_ID))
            {
                deviceAddress   = ((GENERIC_DEVICE_ID *)data)->deviceAddress;
                DemoState = DEMO_STATE_GET_DEV_VERSION;
                Serial.print( "Generic demo device attached - event, deviceAddress=" );
                Serial.println( deviceAddress );
                #ifdef USB_GENERIC_SUPPORT_SERIAL_NUMBERS
                    for (i=1; i<((GENERIC_DEVICE_ID *)data)->serialNumberLength; i++)
                    {
                        Serial.print( ((GENERIC_DEVICE_ID *)data)->serialNumber[i] );
                    }
                #endif
                Serial.println( "\r\n" );
                return TRUE;
            }
            break;

        case EVENT_GENERIC_DETACH:
            deviceAddress   = 0;
            DemoState = DEMO_INITIALIZE;
            Serial.println( "Generic demo device detach event\r\n" );
            return TRUE;

        case EVENT_GENERIC_TX_DONE:           // The main state machine will poll the driver.
        case EVENT_GENERIC_RX_DONE:
            Serial.println( "\r\n***** USB Generic TX/RX done *****\r\n" );
            return TRUE;

        case EVENT_VBUS_REQUEST_POWER:
            Serial.println( "\r\n***** VBUS request power *****\r\n" );
            // We'll let anything attach.
            return TRUE;

        case EVENT_VBUS_RELEASE_POWER:
            Serial.println( "\r\n***** VBUS release power *****\r\n" );
            // We aren't keeping track of power.
            return TRUE;

        case EVENT_HUB_ATTACH:
            Serial.println( "\r\n***** USB Error - hubs are not supported *****\r\n" );
            return TRUE;
            break;

        case EVENT_UNSUPPORTED_DEVICE:
            Serial.println( "\r\n***** USB Error - device is not supported *****\r\n" );
            return TRUE;
            break;

        case EVENT_CANNOT_ENUMERATE:
            Serial.println( "\r\n***** USB Error - cannot enumerate device *****\r\n" );
            return TRUE;
            break;

        case EVENT_CLIENT_INIT_ERROR:
            Serial.println( "\r\n***** USB Error - client driver initialization error *****\r\n" );
            return TRUE;
            break;

        case EVENT_OUT_OF_MEMORY:
            Serial.println( "\r\n***** USB Error - out of heap memory *****\r\n" );
            return TRUE;
            break;

        case EVENT_UNSPECIFIED_ERROR:   // This should never be generated.
            Serial.println( "\r\n***** USB Error - unspecified *****\r\n" );
            return TRUE;
            break;

        case EVENT_SUSPEND:
        case EVENT_DETACH:
        case EVENT_RESUME:
        case EVENT_BUS_ERROR:
            Serial.println( "\r\n***** USB Event: suspend/detach/resume/bus error *****\r\n" );
            return TRUE;
            break;

        default:
            Serial.println( "\r\n***** USB Event unspecified *****\r\n" );
            break;
    }

    //return FALSE;
    return TRUE;

} // USB_ApplicationEventHandler

/*************************************************************************
 * Function:        CheckForNewAttach
 *
 * Preconditions:   None
 *
 * Input:           None
 *
 * Output:          deviceAddress (global)
 *                  Updates the device address when an attach is found.
 *
 * Returns:         TRUE if a new device has been attached.  FALSE,
 *                  otherwise.
 *
 * Side Effects:    Prints attach message
 *
 * Overview:        This routine checks to see if a new device has been
 *                  attached.  If it has, it records the address.
 *************************************************************************/
BOOL CheckForNewAttach ( void )
{
    // Try to get the device address, if we don't have one.
    if (deviceAddress == 0)
    {
        GENERIC_DEVICE_ID DevID;
        // for phillips tablet
        DevID.vid   = 0x0471;//0x04D8;
        DevID.pid   = 0x2149;//0x000C;
        #ifdef USB_GENERIC_SUPPORT_SERIAL_NUMBERS
            DevID.serialNumberLength = 0;
            DevID.serialNumber = NULL;
        #endif

        if (USBHostGenericGetDeviceAddress(&DevID))
        {
            deviceAddress = DevID.deviceAddress;
            //UART2PrintString( "Generic demo device attached - polled, deviceAddress=" );
            //UART2PutDec( deviceAddress );
            //UART2PrintString( "\r\n" );
            Serial.print("Generic demo device attached - polled, deviceAddress=");
            Serial.print(deviceAddress);
            Serial.println();
            return TRUE;
        }
    }
    return FALSE;
} // CheckForNewAttach

/*************************************************************************
 * Function:        ValidateAndDisplayDeviceFwVersion
 *
 * Preconditions:   Assumes the device FW Version response packet has been
 *                  received.
 *
 * Input:           None
 *
 * Output:          None
 *
 * Returns:         TRUE if the Device FW data is valid, FALSE if not.
 *
 * Side Effects:    The LCD display and message strings have been modified.
 *                  Also displays a message on the serial port.
 *
 * Overview:        Validates data in the packet buffer against expected
 *                  device firmware version and displays it on the LCD and
 *                  serial port.
 *************************************************************************/

BOOL ValidateAndDisplayDeviceFwVersion ( void )
{
    if ( USBHostGenericGetRxLength(deviceAddress) == 4             &&
         DataPacket.CMD                   == READ_VERSION          &&
         DataPacket._byte[3]              >= DEMO_FW_MAJOR_VERSION    )
    {

        // Display device FW version on terminal
        Serial.println("Device firmware version ");
//        UART2PrintString( "Device firmware version " );
//        UART2PutDec( DataPacket._byte[3] );
//        UART2PrintString( "." );
//        UART2PutDec( DataPacket._byte[4] );
//        UART2PrintString( "\r\n" );

        return TRUE;
    }
    else
    {
//        UART2PrintString( "Device Firmware Version Error!\r\n" );
        return FALSE;
    }

} // ValidateAndDisplayDeviceFwVersion

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
void RunUSBTasks(void)
{
    USBHost.Tasks();
    //USBGenericHost.Tasks();
}

void setup() {
    // initialize the USB HOST controller
    USBHost.Begin(USB_ApplicationEventHandler1);
    
    // Open serial communications:
    Serial.begin(9600);
}

void processState() {
  uint8_t RetVal;

// Watch for device detaching
    if (USBHostGenericDeviceDetached(deviceAddress) && deviceAddress != 0)
    {
//        UART2PrintString( "Generic demo device detached - polled\r\n" );
        Serial.println( "Generic demo device detached - polled\r\n" );
        DemoState = DEMO_INITIALIZE;
        deviceAddress   = 0;
    }

    switch (DemoState)
    {
    case DEMO_INITIALIZE:
        DemoState = DEMO_STATE_IDLE;
        break;

    /** Idle State:  Loops here until attach **/
    case DEMO_STATE_IDLE:
        if (CheckForNewAttach())
        {
            DemoState = DEMO_STATE_GET_DEV_VERSION;
        }
        break;

    /** Sequence: Read Dev FW Version **/
    case DEMO_STATE_GET_DEV_VERSION:
        // Send the Read Version command
        DataPacket.CMD = READ_VERSION;
        DataPacket.len = 2;
        if (!USBHostGenericTxIsBusy(deviceAddress))
        {
            if ( (RetVal=USBHostGenericWrite(deviceAddress, &DataPacket, 2)) == USB_SUCCESS )
            {
                DemoState = DEMO_STATE_WAITING_VER_REQ;
            }
            else
            {
              Serial.println( "1 Device Write Error 0x" + RetVal );
//                UART2PrintString( "1 Device Write Error 0x" );
//                UART2PutHex(RetVal);
//                UART2PrintString( "\r\n" );
            }
        }
        break;

    case DEMO_STATE_WAITING_VER_REQ:
        if (!USBHostGenericTxIsBusy(deviceAddress) )
            DemoState = DEMO_STATE_READ_DEV_VERSION;
        break;

    case DEMO_STATE_READ_DEV_VERSION:
        if (!USBHostGenericRxIsBusy(deviceAddress))
        {
            if ( (RetVal=USBHostGenericRead(deviceAddress, &DataPacket, 4)) == USB_SUCCESS )
            {
                DemoState = DEMO_STATE_WAITING_READ_VER;
            }
            else
            {
              Serial.println( "1 Device Read Error 0x" + RetVal);
//                UART2PrintString( "1 Device Read Error 0x" );
//                UART2PutHex(RetVal);
//                UART2PrintString( "\r\n" );
            }
        }
        break;

    case DEMO_STATE_WAITING_READ_VER:
        if (!USBHostGenericRxIsBusy(deviceAddress))
            DemoState = DEMO_STATE_VERIFY_DEV_FW_VER;
        break;

    case DEMO_STATE_VERIFY_DEV_FW_VER:
        if (ValidateAndDisplayDeviceFwVersion())
            DemoState = DEMO_STATE_READ_CMD;
        else
            DemoState = DEMO_STATE_ERROR;
        break;
        
    case DEMO_STATE_READ_CMD:
        break;
    }
}

void loop()
{
    RunUSBTasks();

    //processState();
    delay(1); // 1ms delay
}

