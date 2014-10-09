#include <chipKITUSBHost.h>
#include <chipKITUSBAndroidHost.h>

// Current accessory device info
static char manufacturer[] = "NNTU";
static char model[] = "Android accessory basic demo";
static char description[] = "Android accessory basic demo: accepts 'ledon' and 'ledoff' commands, sends back 'ok' as reply";
static char version[] = "1.0";
static char uri[] = "https://github.com/1i7/snippets";
static char serial[] = "N/A";

ANDROID_ACCESSORY_INFORMATION myDeviceInfo = {
    manufacturer, sizeof(manufacturer),
    model, sizeof(model),
    description, sizeof(description),
    version, sizeof(version),
    uri, sizeof(uri),
    serial, sizeof(serial)
};

// Commands from Android device
const char* CMD_LEDON = "ledon";
const char* CMD_LEDOFF = "ledoff";
const char* CMD_LETMEGO = "letmego";

// Replyes for Android device
const char* REPLY_OK = "ok";
const char* REPLY_GETOUT = "getout";
const char* REPLY_UNKNOWN_CMD = "dontunderstand";

// Test LED pin
#define LED_PIN 13

// Local variables
BOOL deviceAttached = FALSE;
void* deviceHandle = NULL;

BOOL readInProgress = FALSE;
BOOL writeInProgress = FALSE;

char read_buffer[128];
char write_buffer[128];
int write_size;

void printUSBErrorCode(uint8_t errorCode) {
    switch(errorCode) {
        case USB_SUCCESS:                                 // Transfer successful
            Serial.print("USB_SUCCESS");
            break;
        case USB_INVALID_STATE:                           // Operation cannot be performed in current state.
            Serial.print("USB_INVALID_STATE");
            break;
        case USB_UNKNOWN_DEVICE:                          // Device not attached
            Serial.print("USB_UNKNOWN_DEVICE");
            break;
            
        case USB_ENDPOINT_BUSY:                           // Endpoint is currently processing a transaction.
            Serial.print("USB_ENDPOINT_BUSY");
            break;
        case USB_ENDPOINT_STALLED:                        // Endpoint is currently stalled. User must clear the condition.
            Serial.print("USB_ENDPOINT_STALLED");
            break;
        case USB_ENDPOINT_ERROR:                          // Will need more than this eventually
            Serial.print("USB_ENDPOINT_ERROR");
            break;
        case USB_ENDPOINT_ERROR_ILLEGAL_PID:              // Illegal PID received.
            Serial.print("USB_ENDPOINT_ERROR_ILLEGAL_PID");
            break;
        case USB_ENDPOINT_NOT_FOUND:                      // Requested endpoint does not exist on device.
            Serial.print("USB_ENDPOINT_NOT_FOUND");
            break;
        case USB_ENDPOINT_ILLEGAL_DIRECTION:              // Reads must be performe on IN endpoints, writes on OUT endpoints.
            Serial.print("USB_ENDPOINT_ILLEGAL_DIRECTION");
            break;
//        case USB_ENDPOINT_TRANSACTION_IN_PROGRESS:
//            Serial.print("USB_ENDPOINT_TRANSACTION_IN_PROGRESS");
//            break;
        case USB_ENDPOINT_NAK_TIMEOUT:                    // Too many NAK's occurred while waiting for the current transaction.
            Serial.print("USB_ENDPOINT_NAK_TIMEOUT");
            break;
        case USB_ENDPOINT_ILLEGAL_TYPE:                   // Transfer type must match endpoint description.
            Serial.print("USB_ENDPOINT_ILLEGAL_TYPE");
            break;
        case USB_ENDPOINT_UNRESOLVED_STATE:               // Endpoint is in an unknown state after completing a transaction.
            Serial.print("USB_ENDPOINT_UNRESOLVED_STATE");
            break;
        case USB_ENDPOINT_ERROR_BIT_STUFF:                // USB Module - Bit stuff error.
            Serial.print("USB_ENDPOINT_ERROR_BIT_STUFF");
            break;
        case USB_ENDPOINT_ERROR_DMA:                      // USB Module - DMA error.
            Serial.print("USB_ENDPOINT_ERROR_DMA");
            break;
        case USB_ENDPOINT_ERROR_TIMEOUT:                  // USB Module - Bus timeout.
            Serial.print("USB_ENDPOINT_ERROR_TIMEOUT");
            break;
        case USB_ENDPOINT_ERROR_DATA_FIELD:               // USB Module - Data field size error.
            Serial.print("USB_ENDPOINT_ERROR_DATA_FIELD");
            break;
        case USB_ENDPOINT_ERROR_CRC16:                    // USB Module - CRC16 failure.
            Serial.print("USB_ENDPOINT_ERROR_CRC16");
            break;
        case USB_ENDPOINT_ERROR_END_OF_FRAME:             // USB Module - End of Frame error.
            Serial.print("USB_ENDPOINT_ERROR_END_OF_FRAME");
            break;
        case USB_ENDPOINT_ERROR_PID_CHECK:                // USB Module - Illegal PID received.
            Serial.print("USB_ENDPOINT_ERROR_PID_CHECK");
            break;
        case USB_ENDPOINT_ERROR_BMX:                      // USB Module - Bus Matrix error.
            Serial.print("USB_ENDPOINT_ERROR_BMX");
            break;
        case USB_ERROR_INSUFFICIENT_POWER:                // Too much power was requested
            Serial.print("USB_INSUFFICIENT_POWER");
            break;            
        default:
            Serial.print("Unknown error code");
            break;
      }
}

BOOL USBEventHandlerApplication( uint8_t address, USB_EVENT event, void *data, DWORD size ) {
    BOOL fRet = FALSE;

    // Call event handler from base host controller
    // (this is important to be done, because it also turns on and off power on microcontroller
    // pins on events EVENT_VBUS_REQUEST_POWER и EVENT_VBUS_RELEASE_POWER)
    fRet = USBHost.DefaultEventHandler(address, event, data, size);
  
    switch( event ) {
        // Android driver events
        case EVENT_ANDROID_DETACH:
            Serial.println("Device NOT attached");
            deviceAttached = FALSE;
            return TRUE;
            break;

        case EVENT_ANDROID_ATTACH:
            Serial.println("Device attached");
            deviceAttached = TRUE;
            deviceHandle = data;
            return TRUE;

        default :
            break;
    }
    return fRet;
}


/**
* Process input - parse string, execute command.
* @return size of reply in bytes (0 for no reply).
*/
int handleInput(char* buffer, int buffer_size, char* reply_buffer) {
    // make input buffer valid zero-terminated string
    buffer[buffer_size] = 0;
    
    // reply
    int replySize = 0;
    reply_buffer[0] = 0;
    // Turn led on on command "ledon", turn off on command "ledoff"
    if(strcmp(buffer, CMD_LEDON) == 0) {
        Serial.println("Command 'ledon': turn light on");
        
        // Execute command
        digitalWrite(LED_PIN, HIGH);
        
        // Prepare reply
        strcpy(reply_buffer, REPLY_OK);
        replySize = strlen(reply_buffer);
    } else if (strcmp(buffer, CMD_LEDOFF) == 0) {
        Serial.println("Command 'ledoff': turn light off");
        
        // Execute command
        digitalWrite(LED_PIN, LOW);
        
        // Prepare reply
        strcpy(reply_buffer, REPLY_OK);
        replySize = strlen(reply_buffer);
    } else if (strcmp(buffer, CMD_LETMEGO) == 0) {
        Serial.println("Command 'letmego': send 'getout' reply");
        
        // Prepare reply
        strcpy(reply_buffer, REPLY_GETOUT);
        replySize = strlen(reply_buffer);
    } else {
        Serial.print("Unknown command: ");
        Serial.println(buffer);
        
        // Prepare reply
        strcpy(reply_buffer, REPLY_UNKNOWN_CMD);
        replySize = strlen(reply_buffer);
    }
    
    return replySize;
}

void setup() {
    // Debug messages on serial port:
    Serial.begin(9600);
    Serial.println("Start android accessory demo");
  
    // Init USB Host controller:
    // Pass the instance for event handler
    USBHost.Begin(USBEventHandlerApplication);
    // Send info about device to Android driver
    USBAndroidHost.AppStart(&myDeviceInfo);

    // Pin for tests
    pinMode(LED_PIN, OUTPUT);
}

void loop() {
    DWORD readSize;
    DWORD writeSize;
    uint8_t errorCode;
    
    // Run periodic tasks to keep USB stack alive and healthy.
    // Run at least once per cycle or when you need to update inner state of USB host controller.
    USBTasks();

    if(deviceAttached) {
        // Read data from Android device - wait for a command
        if(!readInProgress) {
            // Call is not blocked - will check if read is complete with AndroidAppIsReadComplete
            errorCode = USBAndroidHost.AppRead(deviceHandle, (uint8_t*)&read_buffer, (DWORD)sizeof(read_buffer));
            if(errorCode == USB_SUCCESS) {
                // Received command - will not read the next one until all data is received,
                // will check for that in next loop iterations.
                readInProgress = TRUE;
            } else {
                Serial.print("Error trying to read: errorCode=");
                printUSBErrorCode(errorCode);
                Serial.println();
            }
        }

        // Let's check if read is complete
        if(USBAndroidHost.AppIsReadComplete(deviceHandle, &errorCode, &readSize)) {
            // Allow to read the next command
            readInProgress = FALSE;
            
            if(errorCode == USB_SUCCESS) {
                // Data portion is read
                Serial.print("Read: ");
                Serial.println(read_buffer);
                
                // and we can execute the command now, reply will go to write_buffer
                writeSize = handleInput(read_buffer, readSize, write_buffer);
                
                // If writeSize is not 0, send back reply - init write procedure
                // for the next loop iteration (data is already inside write_buffer)
                write_size = writeSize;
            } else {
                Serial.print("Error trying to complete read: ");
                printUSBErrorCode(errorCode);
                Serial.println();
            }
        }
        
        // Send data to Android device
        if(write_size > 0 && !writeInProgress) {
            Serial.print("Write: ");
            Serial.print(write_buffer);
            Serial.println();
          
            writeSize = write_size;
            // Require command is already in the buffer to be sent.
            // Call is not blocked - will check if write is complete with AndroidAppIsWriteComplete
            errorCode = USBAndroidHost.AppWrite(deviceHandle, (uint8_t*)&write_buffer, writeSize);
                        
            if(errorCode == USB_SUCCESS) {
                writeInProgress = TRUE;
            } else {
                Serial.print("Error trying to write: ");
                printUSBErrorCode(errorCode);
                Serial.println();
                
                write_size = 0;
            }
        }
        
        if(writeInProgress) {
            // Let's check if write is complete
            if(USBAndroidHost.AppIsWriteComplete(deviceHandle, &errorCode, &writeSize)) {
                writeInProgress = FALSE;
                write_size = 0;
    
                if(errorCode != USB_SUCCESS) {
                    Serial.print("Error trying to complete write: ");
                    printUSBErrorCode(errorCode);
                    Serial.println();
                }
            }
        }
    }
}

