#include <WiFiShieldOrPmodWiFi_G.h>

#include <DNETcK.h>
#include <DWIFIcK.h>

// Протокол общения с Robot Server (Сервер Роботов)

// Команды, принимаемые от Сервера Роботов
#define CMD_LEDON "ledon"
#define CMD_LEDOFF "ledoff"

// Ответы для Сервера Роботов
#define REPLY_OK "ok"
#define REPLY_DONTUNDERSTAND "dontunderstand"

// Пин для тестовой лампочки
#define LED_PIN 13

// Значения для подключений

// Пины статуса подключений
#define STATUS_WIFI_PIN 6
#define STATUS_ROBOT_SERVER_PIN 7

// Сервер Роботов
const char* robot_server_host = "robotc.lasto4ka.su";
const int robot_server_port = 1117;

// Точка доступа ВайФай
const char* wifi_ssid = "lasto4ka";
const char* wifi_wp2_passphrase = "robotguest";

DNETcK::STATUS networkStatus;
TcpClient tcpClient;

static char read_buffer[128];
static char write_buffer[128];
int read_size;
int write_size;

void printIP() {
    IPv4 currentIP;
    if( DNETcK::getMyIP(&currentIP) ) { 
        Serial.print("IP Address assigned: ");
        Serial.print(currentIP.rgbIP[0], DEC);
        Serial.print(".");
        Serial.print(currentIP.rgbIP[1], DEC);
        Serial.print(".");
        Serial.print(currentIP.rgbIP[2], DEC);
        Serial.print(".");
        Serial.println(currentIP.rgbIP[3], DEC);
    } else {
        Serial.println("IP not assigned");
    }
}

int connectWifiOpen(const char* ssid, DNETcK::STATUS *netStatus) {
    Serial.print("SSID: ");
    Serial.println("ssid");
  
    DWIFIcK::connect(wifi_ssid, netStatus);   
}

int connectWifiWPA2Passphrase(const char* ssid, const char* passphrase, DNETcK::STATUS *netStatus) {
    Serial.print("SSID: ");
    Serial.print("ssid");
    Serial.print(", WPA2 passphrase: ");
    Serial.println(passphrase);
    
    DWIFIcK::connect(ssid, passphrase, netStatus);
}

int connectWifi(DNETcK::STATUS *netStatus) {
    Serial.println("Connecting to WiFi...");
    int conId = DWIFIcK::INVALID_CONNECTION_ID;    
    conId = connectWifiOpen(wifi_ssid, &networkStatus);
//    conId = connectWifiWPA2Passphrase(wifi_ssid, wifi_wpa2_passphrase, &networkStatus);
    return conId;
}


/**
 * Обработать входные данные - разобрать строку, выполнить команду.
 * @return размер ответа в байтах (0, чтобы не отправлять ответ).
 */
int handleInput(char* buffer, int size, char* reply_buffer) {
    int replySize = 0;
    reply_buffer[0] = 0;
    Serial.print("Read: ");
    Serial.println(buffer);
    // Включить лампочку по команде "ledon", выключить по команде "ledoff"
    if(strcmp(buffer, CMD_LEDON) == 0) {
        Serial.println("Command 'ledon': turn light on");
        
        // Выполнить команду
        digitalWrite(LED_PIN, HIGH);
        
        // Подготовить ответ
        strcpy(reply_buffer, REPLY_OK);
        replySize = strlen(write_buffer) + 1;
    } else if (strcmp(buffer, CMD_LEDOFF) == 0) {
        Serial.println("Command 'ledoff': turn light off");
        
        // Выполнить команду
        digitalWrite(LED_PIN, LOW);
        
        // Подготовить ответ
        strcpy(reply_buffer, REPLY_OK);
        replySize = strlen(write_buffer) + 1;
    } else {      
        Serial.print("Unknown command: ");
        Serial.println(buffer);
        
        // Подготовить ответ
        strcpy(reply_buffer, REPLY_DONTUNDERSTAND);
        replySize = strlen(write_buffer) + 1;
    }
    
    return replySize;
}

void setup() {
    Serial.begin(9600);
    Serial.println("Start wifi network client demo");

    pinMode(LED_PIN, OUTPUT);
}

bool connectedToWifi = false;
bool connectedToServer = false;
    
void loop() {
    int readSize;
    int writeSize;
    
    if(!connectedToWifi) {
        int conID = connectWifi(&networkStatus);
  
        if(conID != DWIFIcK::INVALID_CONNECTION_ID) {
            Serial.print("Connection created, ConID = ");
            Serial.println(conID, DEC);
            
            // use DHCP to get our IP and network addresses
            DNETcK::begin();
            
            connectedToWifi = true;
        } else {
            Serial.print("Unable to connect, status: ");
            Serial.print(networkStatus, DEC);
            Serial.println(", retry after 2 seconds...");
            delay(2000);
        }
    } else if(!connectedToServer) {
        // Подключиться к Серверу Роботов
        tcpClient.connect(robot_server_host, robot_server_port);
        connectedToServer = true;
    } else {
        // Подключены к серверу - читаем команды, отправляем ответы
        
        // see if we got anything to read
        if((readSize = tcpClient.available()) > 0) {
            readSize = readSize < sizeof(read_buffer) ? readSize : sizeof(read_buffer);
            readSize = tcpClient.readStream((byte*)read_buffer, readSize);
 
            // и можно выполнить команду, ответ попадет в write_buffer
            writeSize = handleInput(read_buffer, read_size, write_buffer);
            write_size = writeSize;
        }
            
        if(write_size > 0) {
            tcpClient.writeStream((const byte*)write_buffer, write_size);
        }
    }
}

