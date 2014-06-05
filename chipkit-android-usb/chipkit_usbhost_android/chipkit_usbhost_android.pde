#include <chipKITUSBHost.h>
#include <chipKITUSBAndroidHost.h>

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
static char* CMD_LEDON = "ledon";
static char* CMD_LEDOFF = "ledoff";
static char* CMD_LETMEGO = "letmego";

// Ответы для Android-устройства
static char* REPLY_OK = "ok";
static char* REPLY_GETOUT = "getout";
static char* REPLY_UNKNOWN_CMD = "dontunderstand";

// Пин для тестовой лампочки
#define LED_PIN 13

// Локальные переменные
BOOL deviceAttached = FALSE;
void* deviceHandle = NULL;

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
 * Обработать входные данные - разобрать строку, выполнить команду.
 * @return размер ответа в байтах (0, чтобы не отправлять ответ).
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
        replySize = strlen(reply_buffer);
    } else if (strcmp(buffer, CMD_LEDOFF) == 0) {
        Serial.println("Command 'ledoff': turn light off");
        
        // Выполнить команду
        digitalWrite(LED_PIN, LOW);
        
        // Подготовить ответ
        strcpy(reply_buffer, REPLY_OK);
        replySize = strlen(reply_buffer);
    } else if (strcmp(buffer, CMD_LETMEGO) == 0) {
        Serial.println("Command 'letmego': send 'getout' reply");
        
        // Подготовить ответ
        strcpy(reply_buffer, REPLY_GETOUT);
        replySize = strlen(reply_buffer);
    } else {      
        Serial.print("Unknown command: ");
        Serial.println(buffer);
        
        // Подготовить ответ
        strcpy(reply_buffer, REPLY_UNKNOWN_CMD);
        replySize = strlen(reply_buffer);
    }
    
    return replySize;
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
                Serial.println(errorCode, HEX);
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
            } else {
                Serial.print("Error trying to complete read: errorCode=");
                Serial.println(errorCode, HEX);
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
                Serial.print("Error trying to write: errorCode=");
                Serial.println(errorCode, HEX);
                
                write_size = 0;
            }
        }
        
        if(writeInProgress) {
            // Проверим, завершена ли запись
            if(USBAndroidHost.AppIsWriteComplete(deviceHandle, &errorCode, &writeSize)) {
                writeInProgress = FALSE;
                write_size = 0;
    
                if(errorCode != USB_SUCCESS) {
                    Serial.print("Error trying to complete write: errorCode=");
                    Serial.println(errorCode, HEX);
                }
            }
        }
    }
}

