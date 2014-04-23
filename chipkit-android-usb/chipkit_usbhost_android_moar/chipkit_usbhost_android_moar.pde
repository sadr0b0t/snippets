#include <chipKITUSBHost.h>
#include <chipKITUSBAndroidHost.h>

// from usb_host_android.c
typedef enum {
    //NO_DEVICE needs to be 0 so that the memset in the init function
    //  clears this to the right value
    NO_DEVICE = 0,
    DEVICE_ATTACHED,
    SEND_GET_PROTOCOL,
    WAIT_FOR_PROTOCOL,
    SEND_MANUFACTUER_STRING,
    SEND_MODEL_STRING,
    SEND_DESCRIPTION_STRING,
    SEND_VERSION_STRING,
    SEND_URI_STRING,
    SEND_SERIAL_STRING,
    SEND_AUDIO_MODE,
    START_ACCESSORY,
    ACCESSORY_STARTING,
    WAITING_FOR_ACCESSORY_RETURN,
    RETURN_OF_THE_ACCESSORY,

    //States before this point aren't able to use the APIs yet.
    //States below this point can all use all of the APIs
    READY,
    REGISTERING_HID,
    SENDING_HID_REPORT_DESCRIPTOR,
    HID_REPORT_DESCRIPTORS_COMPLETE,

} ANDROID_DEVICE_STATUS;

typedef struct {
    uint8_t address;
    uint8_t clientDriverID;
    uint8_t OUTEndpointNum;
    WORD OUTEndpointSize;
    uint8_t INEndpointNum;
    WORD INEndpointSize;
    ANDROID_DEVICE_STATUS state;
    WORD countDown;
    WORD protocol;

    struct {
        uint8_t TXBusy :1;
        uint8_t RXBusy :1;
        uint8_t EP0TransferPending :1;
    } status;

    struct {
        uint8_t* data;
        uint8_t  length;
        uint8_t  offset;
        uint8_t  id;
        uint8_t  HIDEventSent      :1;
    } hid;

} ANDROID_DEVICE_DATA;


// From usb_host_local.h
//#include<usb_host_local.h>
typedef struct _USB_ENDPOINT_INFO
{
    struct _USB_ENDPOINT_INFO   *next;                  // Pointer to the next node in the list.

    volatile union
    {
        struct
        {
            uint8_t        bfErrorCount            : 5;    // Not used for isochronous.
            uint8_t        bfStalled               : 1;    // Received a STALL.  Requires host interaction to clear.
            uint8_t        bfError                 : 1;    // Error count excessive. Must be cleared by the application.
            uint8_t        bfUserAbort             : 1;    // User terminated transfer.
            uint8_t        bfTransferSuccessful    : 1;    // Received an ACK.
            uint8_t        bfTransferComplete      : 1;    // Transfer done, status obtained.
            uint8_t        bfUseDTS                : 1;    // Use DTS error checking.
            uint8_t        bfNextDATA01            : 1;    // The value of DTS for the next transfer.
            uint8_t        bfLastTransferNAKd      : 1;    // The last transfer attempted NAK'd.
            uint8_t        bfNAKTimeoutEnabled     : 1;    // Endpoint will time out if too many NAKs are received.
        };
        WORD            val;
    }                           status;
    WORD                        wInterval;                      // Polling interval for interrupt and isochronous endpoints.
    volatile WORD               wIntervalCount;                 // Current interval count.
    WORD                        wMaxPacketSize;                 // Endpoint packet size.
    DWORD                       dataCountMax;                   // Amount of data to transfer during the transfer. Not used for isochronous transfers.
    WORD                        dataCountMaxSETUP;              // Amount of data in the SETUP packet (if applicable).
    volatile DWORD              dataCount;                      // Count of bytes transferred.
    uint8_t                        *pUserDataSETUP;                // Pointer to data for the SETUP packet (if applicable).
    uint8_t                        *pUserData;                     // Pointer to data for the transfer.
    volatile uint8_t               transferState;                  // State of endpoint tranfer.
    uint8_t                        clientDriver;                   // Client driver index for events
    uint8_t                        bEndpointAddress;               // Endpoint address
    TRANSFER_ATTRIBUTES         bmAttributes;                   // Endpoint attributes, including transfer type.
    volatile uint8_t               bErrorCode;                     // If bfError is set, this indicates the reason
    volatile WORD               countNAKs;                      // Count of NAK's of current transaction.
    WORD                        timeoutNAKs;                    // Count of NAK's for a timeout, if bfNAKTimeoutEnabled.
} USB_ENDPOINT_INFO;

// Информация о текущем устройстве
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

// Команды, принимаемые от Android-устройства
const char* CMD_LEDON = "ledon";
const char* CMD_LEDOFF = "ledoff";
const char* CMD_LETMEGO = "letmego";

// Ответы для Android-устройства
const char* REPLY_OK = "ok";
const char* REPLY_GETOUT = "getout";
const char* REPLY_UNKNOWN_CMD = "dontunderstand";

// Пин для тестовой лампочки
#define LED_PIN 13

// Локальные переменные
BOOL deviceAttached = FALSE;
static void* deviceHandle = NULL;

BOOL readInProgress = FALSE;
BOOL writeInProgress = FALSE;

static char read_buffer[128];
static char write_buffer[128];
int write_size;


BOOL USBEventHandlerApplication( uint8_t address, USB_EVENT event, void *data, DWORD size ) {
    BOOL fRet = FALSE;

    // Вызываем обработчик событий для базового хост-контроллера
    // (это важно сделать, т.к. он также включает и выключает питание на ножках контроллера
    // по событиям EVENT_VBUS_REQUEST_POWER и EVENT_VBUS_RELEASE_POWER)
    fRet = USBHost.DefaultEventHandler(address, event, data, size);
  
    switch( event ) {
        // События от драйвера Android
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
 * Process input - parse string, execute command, 
 * @return size of reply in bytes (0 for no reply).
 */
int handleInput(char* buffer, int size, char* reply_buffer) {
    int replySize = 0;
    reply_buffer[0] = 0;
    
    // Включить лампочку по команде "ledon", выключить по команде "ledoff"
    if(strcmp(buffer, CMD_LEDON) == 0) {
        Serial.println("Command 'ledon': turn light on");
        
        // Выполнить команду
        digitalWrite(LED_PIN, HIGH);
        
        // Подготовить ответ
        strcpy(reply_buffer, REPLY_OK);
        replySize = strlen(reply_buffer) + 1;
    } else if (strcmp(buffer, CMD_LEDOFF) == 0) {
        Serial.println("Command 'ledoff': turn light off");
        
        // Выполнить команду
        digitalWrite(LED_PIN, LOW);
        
        // Подготовить ответ
        strcpy(reply_buffer, REPLY_OK);
        replySize = strlen(reply_buffer) + 1;
    } else if (strcmp(buffer, CMD_LETMEGO) == 0) {
        Serial.println("Command 'letmego': send 'getout' reply");
        
        // Подготовить ответ
        strcpy(reply_buffer, REPLY_GETOUT);
        replySize = strlen(reply_buffer) + 1;
    } else {      
        Serial.print("Unknown command: ");
        Serial.println(buffer);
        
        // Подготовить ответ
        strcpy(reply_buffer, REPLY_UNKNOWN_CMD);
        replySize = strlen(reply_buffer) + 1;
    }
    
    return replySize;
}

void printErrorCode(uint8_t errorCode) {
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

void printDeviceInfo(void* device_handle) {
    ANDROID_DEVICE_DATA* device = (ANDROID_DEVICE_DATA*)device_handle;
    USB_ENDPOINT_INFO* ep;
    
    Serial.print("Device address=");
    Serial.println(device->address, DEC);
    Serial.print("device.status.RXBusy=");
    Serial.print(device->status.RXBusy, DEC);
    Serial.print(",device.status.TXBusy=");
    Serial.println(device->status.TXBusy, DEC);
    Serial.print("in endpoint=");
    Serial.print(device->INEndpointNum, DEC);
    Serial.print(", out endpoint=");
    Serial.println(device->OUTEndpointNum, DEC);
}

static char write_buf_test[] = "ok, get me out of here";
void USBHostSimpleWrite(void* device_handle) {
    DWORD writeSize;
    BOOL writeComplete;
  
    ANDROID_DEVICE_DATA* device = (ANDROID_DEVICE_DATA*)device_handle;
    uint8_t errorCode = USBHostWrite( device->address, device->OUTEndpointNum,
                                          (uint8_t*)write_buf_test, sizeof(write_buf_test) );
                                          
    Serial.print("USBHostWrite: ");
    printErrorCode(errorCode);
    Serial.println();
    
    writeComplete = FALSE;
    
    while(!writeComplete) {
        USBTasks();
        writeComplete = USBHostTransferIsComplete(device->address, device->OUTEndpointNum, &errorCode, &writeSize);
        Serial.print("USBHostTransferIsComplete: ");
        Serial.print(writeComplete, DEC);
        Serial.print(", writeSize=");
        Serial.print(writeSize, DEC);
        Serial.print(", errorCode=");
        printErrorCode(errorCode);
        Serial.println();
    }
}

void USBHostAndroidSimpleWrite(void* device_handle) {
    DWORD writeSize;
    BOOL writeComplete;
  
    ANDROID_DEVICE_DATA* device = (ANDROID_DEVICE_DATA*)device_handle;
    uint8_t errorCode = USBAndroidHost.AppWrite(device_handle, (uint8_t*)&write_buf_test, sizeof(write_buf_test));
                                          
    Serial.print("USBAndroidHost.AppWrite: ");
    printErrorCode(errorCode);
    Serial.println();
    
    writeComplete = FALSE;
    
    while(!writeComplete) {
        USBTasks();
        //writeComplete = USBHostTransferIsComplete(device->address, device->OUTEndpointNum, &errorCode, &writeSize);
        writeComplete = USBAndroidHost.AppIsWriteComplete(device_handle, &errorCode, &writeSize);
        Serial.print("USBAndroidHost.AppIsWriteComplete: ");
        Serial.print(writeComplete, DEC);
        Serial.print(", writeSize=");
        Serial.print(writeSize, DEC);
        Serial.print(", errorCode=");
        printErrorCode(errorCode);
        Serial.println();
    }
}

void setup() {
    // Отладочные сообщения через последовательный порт:
    Serial.begin(9600);
    Serial.println("Start android accessory demo");
  
    // Инициализируем контроллер USB HOST:
    // Передаем ссылку на обработчик событий
    USBHost.Begin(USBEventHandlerApplication);
    // Передаем информацию об устройстве драйверу Android
    USBAndroidHost.AppStart(&myDeviceInfo);

    // Лампочка для тестов
    pinMode(LED_PIN, OUTPUT);
}

void loop() {
    DWORD readSize;
    DWORD writeSize;
    uint8_t errorCode;
    
    // Запускаем периодические задачи для поддержания стека USB в живом и корректном состоянии.
    // Следует выполнять их хотябы один раз внутри цикла или в момент, когда нужно
    // обновить внутреннее состояние контроллера USB хоста.
    USBTasks();

    if(deviceAttached) {      
        // Чтение данных с устройства Android - ждем команду
        if(!readInProgress) {
            // Вызов не блокируется - проверка завершения чтения через AndroidAppIsReadComplete
            errorCode = USBAndroidHost.AppRead(deviceHandle, (uint8_t*)&read_buffer, (DWORD)sizeof(read_buffer));
            if(errorCode == USB_SUCCESS) {
                // Дождались команду - новую читать не будем, пока не придут все данные,
                // проверять завершение операции будем в следующих итерациях цикла
                readInProgress = TRUE;
            } else {
                Serial.print("Error trying to read: errorCode=");
                printErrorCode(errorCode);
                Serial.println();
            }
        }

        // Проверим, завершилось ли чтение
        if(USBAndroidHost.AppIsReadComplete(deviceHandle, &errorCode, &readSize)) {
            // Разрешим читать следующую команду
            readInProgress = FALSE;
                
            if(errorCode == USB_SUCCESS) {
                // Считали порцию данных - добавим завершающий ноль
                read_buffer[readSize] = 0;
                
                Serial.print("Read: ");
                Serial.println(read_buffer);
                
                // и можно выполнить команду, ответ попадет в write_buffer
                writeSize = handleInput(read_buffer, readSize, write_buffer);
                                
                // Если writeSize не 0, отправим назад ответ - инициируем 
                // процедуру записи для следующей итерации цикла (данные уже внутри write_buffer)
                write_size = writeSize;
                
                //printDeviceInfo(deviceHandle);
                //USBHostSimpleWrite(deviceHandle);
                //USBHostAndroidSimpleWrite(deviceHandle);
                //printDeviceInfo(deviceHandle);
            } else {
                Serial.print("Error trying to complete read: ");
                printErrorCode(errorCode);
                Serial.println();
            }
        }
        
        // Отправка данных на устройство Android
        if(write_size > 0 && !writeInProgress) {
            Serial.print("Write: ");
            Serial.print(write_buffer);
            Serial.println();
          
            writeSize = write_size;
            // Нужная команда уже в буфере для отправки
            // Вызов не блокируется - проверка завершения чтения через AndroidAppIsWriteComplete
            errorCode = USBAndroidHost.AppWrite(deviceHandle, (uint8_t*)&write_buffer, writeSize);
                        
            if(errorCode == USB_SUCCESS) {
                writeInProgress = TRUE;
            } else {
                Serial.print("Error trying to write: ");
                printErrorCode(errorCode);
                Serial.println();
                
                write_size = 0;
            }
        }
        
        if(writeInProgress) {
            // Проверим, завершена ли запись
            if(USBAndroidHost.AppIsWriteComplete(deviceHandle, &errorCode, &writeSize)) {
                writeInProgress = FALSE;
                write_size = 0;
    
                if(errorCode != USB_SUCCESS) {
                    Serial.print("Error trying to complete write: ");
                    printErrorCode(errorCode);
                    Serial.println();
                }
            }
        }
    }
}

