#include <WiFiShieldOrPmodWiFi_G.h>

#include <DNETcK.h>
#include <DWIFIcK.h>

typedef enum {
    NONE = 0,
    INITIALIZE,
    LISTEN,
    ISLISTENING,
    AVAILABLECLIENT,
    ACCEPTCLIENT,
    READ,
    WRITE,
    CLOSE,
    EXIT,
    DONE
} STATE;

STATE state = INITIALIZE;

// Команды, принимаемые от Android-устройства
#define CMD_LEDON "ledon"
#define CMD_LEDOFF "ledoff"
#define CMD_LETMEGO "letmego"

// Ответы для Android-устройства
#define REPLY_OK "ok"
#define REPLY_GETOUT "getout"
#define REPLY_UNKNOWN_CMD "dontunderstand"

// Пин для тестовой лампочки
#define LED_PIN 13

#define ROBOT_SERVER_HOST "robotc.lasto4ka.su"
#define ROBOT_SERVER_PORT 1117

const char * wifi_ssid = "lasto4ka";
const char * wifi_wp2_passphrase = "roboguest";

DNETcK::STATUS networkStatus;
TcpClient tcpClient;

unsigned tStart = 0;
unsigned tWait = 10000;


static char read_buffer[128];
static char write_buffer[128];

int read_size;
int write_size;

int cbRead = 0;
int count = 0;

void printIP(void) {
  Serial.print("IP Address assigned: ");
  Serial.print(ipServer.rgbIP[0], DEC);
  Serial.print(".");
  Serial.print(ipServer.rgbIP[1], DEC);
  Serial.print(".");
  Serial.print(ipServer.rgbIP[2], DEC);
  Serial.print(".");
  Serial.println(ipServer.rgbIP[3], DEC);
}

int connectWifiOpen(char* ssid, DNETcK::STATUS *netStatus) {
    DWIFIcK::connect(wifi_ssid, netStatus)    
}

int connectWifiWPA2Passphrase(char* ssid, char* passphrase, DNETcK::STATUS *netStatus) {
    DWIFIcK::connect(ssid, passphrase, netStatus)
}

int connectWifi(DNETcK::STATUS *netStatus) {
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
    } else if (strcmp(buffer, CMD_LETMEGO) == 0) {
        Serial.println("Command 'letmego': send 'getout' reply");
        
        // Подготовить ответ
        strcpy(reply_buffer, REPLY_GETOUT);
        replySize = strlen(write_buffer) + 1;
    } else {      
        Serial.print("Unknown command: ");
        Serial.println(buffer);
        
        // Подготовить ответ
        strcpy(reply_buffer, REPLY_UNKNOWN_CMD);
        replySize = strlen(write_buffer) + 1;
    }
    
    return replySize;
}

void setup() {
    Serial.begin(9600);
    Serial.println("Start wifi network client demo");

    pinMode(LED_PIN, OUTPUT);    

    int conID = connectWifiOpen(&networkStatus);

    if(conID != DWIFIcK::INVALID_CONNECTION_ID) {
        Serial.print("Connection Created, ConID = ");
        Serial.println(conID, DEC);
        printIP();
        state = INITIALIZE;
    } else {
        Serial.print("Unable to connect, status: ");
        Serial.println(networkStatus, DEC);
        state = EXIT;
    }

    DNETcK::begin(ipServer);
      
}

void loop() {
  
    switch(state) {

        case INITIALIZE:
            if(DNETcK::isInitialized(&status)) {
                Serial.println("IP Stack Initialized");
                state = LISTEN;
            } else if(DNETcK::isStatusAnError(status)) {
                Serial.print("Error in initializing, status: ");
                Serial.println(status, DEC);
                state = EXIT;
            }
            break;
    
        case LISTEN:
            if(tcpServer.startListening(portServer)) {
                Serial.println("Started Listening");
                state = ISLISTENING;   
                
            } else {
                state = EXIT;
            }
            break;
    
        case ISLISTENING:
            if(tcpServer.isListening(&status)) {  
                Serial.print("Listening on port: ");
                Serial.print(portServer, DEC);
                Serial.println("");
                
                state = AVAILABLECLIENT;
            } else if(DNETcK::isStatusAnError(status)) {
                state = EXIT;
            }
            break;
    
        case AVAILABLECLIENT:
            if((count = tcpServer.availableClients()) > 0) {
                Serial.print("Got ");
                Serial.print(count, DEC);
                Serial.println(" clients pending");
                state = ACCEPTCLIENT;
            }
            break;
    
        case ACCEPTCLIENT:
            
            tcpClient.close(); 
    
            if(tcpServer.acceptClient(&tcpClient)) {
                Serial.println("Got a Connection");
                state = READ;
                tStart = (unsigned) millis();
            } else {
                state = CLOSE;
            }
            break;
    
        case READ:
    
            if((cbRead = tcpClient.available()) > 0) {
                cbRead = cbRead < sizeof(rgbRead) ? cbRead : sizeof(rgbRead);
                cbRead = tcpClient.readStream(rgbRead, cbRead);
    
                Serial.print("Got ");
                Serial.print(cbRead, DEC);
                Serial.println(" bytes");
        
    	        handleInput(read_buffer, cbRead, write_buffer);
               
                state = WRITE;
            } else if( (((unsigned) millis()) - tStart) > tWait ) {
              Serial.print("Close connection on timeout");
                state = CLOSE;
            }
            break;
    
        case WRITE:
            if(tcpClient.isConnected()) {               
                Serial.println("Writing: ");  
                for(int i=0; i < cbRead; i++) {
                    Serial.print(rgbRead[i], BYTE);
                }
                Serial.println("");  
    
                tcpClient.writeStream(rgbRead, cbRead);
                state = READ;
                tStart = (unsigned) millis();
            } else {
                Serial.println("Unable to write back.");  
                state = CLOSE;
            }
            break;
            
        case CLOSE:
            tcpClient.close();
            Serial.println("Closing TcpClient");
            Serial.println("");
            stopMotors();
            state = ISLISTENING;
            break;
    
        case EXIT:
            tcpClient.close();
            tcpServer.close();
            Serial.println("Something went wrong, sketch is done.");  
            stopMotors();
            state = DONE;
            break;
    
        case DONE:
        default:
            break;
    }
    
    DNETcK::periodicTasks(); 
}
