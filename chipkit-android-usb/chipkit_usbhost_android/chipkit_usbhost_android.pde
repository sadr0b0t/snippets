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
    manufacturer,
    sizeof(manufacturer),
    model,
    sizeof(model),
    description,
    sizeof(description),
    version,
    sizeof(version),
    uri,
    sizeof(uri),
    serial,
    sizeof(serial)
};

// Команды, принимаемые от Android-устройства
#define CMD_LEDON "ledon"
#define CMD_LEDOFF "ledoff"

// Ответы для Android-устройства
#define REPLY_NONE 0
#define REPLY_OK 1

// Пин для тестовой лампочки
#define LED_PIN 13

// Локальные переменные
BOOL deviceAttached = FALSE;
static void* deviceHandle = NULL;

int write_cmd;
static char read_buffer[64];
static char write_buffer[64];

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

void processInput(char* buffer, int size) {
    Serial.print("Process input: ");
    Serial.println(buffer);
    // Включить лампочку по команде "ledon", выключить по команде "ledoff"
    if(strcmp(buffer, CMD_LEDON) == 0) {
        Serial.println("Command: ledon - turn light on");
        digitalWrite(LED_PIN, HIGH);
    } else if (strcmp(buffer, CMD_LEDOFF) == 0) {
        Serial.println("Command: ledoff - turn light off");
        digitalWrite(LED_PIN, LOW);
    } else {
        Serial.print("Unknown command: ");
        Serial.println(buffer);
    }
}

void setup() {
    // Инициализируем контроллер USB HOST:
    // Передаем ссылку на обработчик событий
    USBHost.Begin(USBEventHandlerApplication);
    // Передаем информацию об устройстве драйверу Android
    AndroidAppStart(&myDeviceInfo);

    // Отладочные сообщения через последовательный порт:
    Serial.begin(9600);

    // Лампочка для тестов
    pinMode(LED_PIN, OUTPUT);
}

void loop() {
    DWORD readSize;
    BOOL readyToRead = TRUE;
    DWORD writeSize;
    BOOL writeInProgress = FALSE;
    uint8_t errorCode;

    // Запускаем периодические задачи для поддержания стека USB в живом и корректном состоянии.
    // Следует выполнять их хотябы один раз внутри цикла или в момент, когда нужно
    // обновить внутреннее состояние контроллера USB хоста.
    USBTasks();

    if(deviceAttached) {
        // Чтение данных с устройства Android - ждем команду
        if(readyToRead) {
            // Вызов не блокируется - проверка завершения чтения через AndroidAppIsReadComplete
            errorCode = AndroidAppRead(deviceHandle, (uint8_t*)&read_buffer, (DWORD)sizeof(read_buffer));
            if(errorCode == USB_SUCCESS) {
                // Дождались команду - новую читать не будем, пока не придут все данные,
                // проверять будем в следующих итерациях цикла
                readyToRead = FALSE;
            } else {
                Serial.println("Error trying read");
            }
        }

        // Проверим, завершилось ли чтение
        if(AndroidAppIsReadComplete(deviceHandle, &errorCode, &readSize)) {
            if(errorCode == USB_SUCCESS) {
                // Считали порцию данных - добавим завершающий ноль
                read_buffer[readSize] = 0;
                
                // и можно выполнить команду
                processInput(read_buffer, readSize);
                
                // Разрешим читать следующую команду
                readyToRead = TRUE;
                readSize = 0;

                // Отправим назад подтверждение - инициируем процедуру записи
                // для следующей итерации цикла
                write_cmd =  REPLY_OK;
            } else {
                Serial.println("Error trying to complete read");
            }
        }

        // Отправка данных на устройство Android
        if(write_cmd != REPLY_NONE && !writeInProgress) {
            // запишем нужную команду в буфер для отправки
            if(write_cmd == REPLY_OK) {
                write_buffer[0] = 'o';
                write_buffer[1] = 'k';
                write_buffer[2] = '\n';
                write_buffer[3] = 0;
                writeSize = 4;
            }

            // Вызов не блокируется - проверка завершения чтения через AndroidAppIsWriteComplete
            errorCode = AndroidAppWrite(deviceHandle, (uint8_t*)&write_buffer, writeSize);
            if(errorCode == USB_SUCCESS) {
                writeInProgress = TRUE;
            } else {
                Serial.println("Error trying to write");
            }
        }

        if(writeInProgress) {
            // Проверим, завершена ли запись
            if(AndroidAppIsWriteComplete(deviceHandle, &errorCode, &writeSize)) {
                writeInProgress = FALSE;
                write_cmd = REPLY_NONE;
    
                if(errorCode != USB_SUCCESS) {
                    Serial.println("Error trying to complete write");
                }
            }
        }
    }
}

