#include <WiFiShieldOrPmodWiFi_G.h>

#include <DNETcK.h>
#include <DWIFIcK.h>

// Значения для подключений

// Точка доступа ВайФай
boolean USE_SECURITY_OPEN = false;
const char* wifi_ssid = "lasto4ka";
const char* wifi_wpa2_passphrase = "robotguest";

boolean USE_STATIC_ADDRESS = true;
// статический IP-адрес для текущего хоста - если включен режим
// USE_STATIC_ADDRESS = true, то попросим у точки Wifi дать его нам
IPv4 host_ip = {192,168,43,117};

// Подключение к WiFi
int connectionId = DWIFIcK::INVALID_CONNECTION_ID;


// Пин для лампочки статуса WiFi
#define WIFI_STATUS_PIN 13

/**
 * Вывести произвольный IP-адрес
 */
void printIPAddress(IPv4 *ipAddress) {
    Serial.print(ipAddress->rgbIP[0], DEC);
    Serial.print(".");
    Serial.print(ipAddress->rgbIP[1], DEC);
    Serial.print(".");
    Serial.print(ipAddress->rgbIP[2], DEC);
    Serial.print(".");
    Serial.print(ipAddress->rgbIP[3], DEC);
}

/**
 * Вывести текущий статус сетевого подключения.
 */
void printNetworkStatus() {
    IPv4 ipAddress;
    
    if( DNETcK::getMyIP(&ipAddress) ) { 
        Serial.print("IPv4 Address: ");
        printIPAddress(&ipAddress);
        Serial.println();
    } else {
        Serial.println("IP not assigned");
    }
    
    if( DNETcK::getDns1(&ipAddress) ) { 
        Serial.print("DNS1: ");
        printIPAddress(&ipAddress);
        Serial.println();
    } else {
        Serial.println("DNS1 not assigned");
    }
    
    if( DNETcK::getDns2(&ipAddress) ) { 
        Serial.print("DNS2: ");
        printIPAddress(&ipAddress);
        Serial.println();
    } else {
        Serial.println("DNS2 not assigned");
    }
    
    if( DNETcK::getGateway(&ipAddress) ) { 
        Serial.print("Gateway: ");
        printIPAddress(&ipAddress);
        Serial.println();
    } else {
        Serial.println("Gateway not assigned");
    }
        
    if( DNETcK::getSubnetMask(&ipAddress) ) { 
        Serial.print("Subnet mask: ");
        printIPAddress(&ipAddress);
        Serial.println();
    } else {
        Serial.println("Subnet mask not assigned");
    }
}

/**
 * Вывести значение статуса сетевой операции.
 */
void printDNETcKStatus(DNETcK::STATUS status) {
    switch(status) {
        case DNETcK::None:                           // = 0,
            Serial.print("None");
            break;
        case DNETcK::Success:                        // = 1,
            Serial.print("Success");
            break;
        case DNETcK::UDPCacheToSmall:                // = 2,
            Serial.print("UDPCacheToSmall");
            break;
        // Initialization status
        case DNETcK::NetworkNotInitialized:          // = 10,
            Serial.print("NetworkNotInitialized");
            break;
        case DNETcK::NetworkInitialized:             // = 11,
            Serial.print("NetworkInitialized");
            break;
        case DNETcK::DHCPNotBound:                   // = 12,
            Serial.print("DHCPNotBound");
            break;
        // Epoch status
        case DNETcK::TimeSincePowerUp:               // = 20,
            Serial.print("TimeSincePowerUp");
            break;
        case DNETcK::TimeSinceEpoch:                 // = 21,
            Serial.print("TimeSinceEpoch");
            break;
        // DNS status
        case DNETcK::DNSIsBusy:                      // = 30,
            Serial.print("DNSIsBusy");
            break;
        case DNETcK::DNSResolving:                   // = 31,
            Serial.print("DNSResolving");
            break;
        case DNETcK::DNSLookupSuccess:               // = 32,
            Serial.print("DNSLookupSuccess");
            break;
        case DNETcK::DNSUninitialized:               // = 33,
            Serial.print("DNSUninitialized");
            break;
        case DNETcK::DNSResolutionFailed:            // = 34,
            Serial.print("DNSResolutionFailed");
            break;
        case DNETcK::DNSHostNameIsNULL:              // = 35,
            Serial.print("DNSHostNameIsNULL");
            break;
        case DNETcK::DNSRecursiveExit:               // = 36,
            Serial.print("DNSRecursiveExit");
            break;
        // TCP connect state machine states
        case DNETcK::NotConnected:                   // = 40,
            Serial.print("NotConnected");
            break;
        case DNETcK::WaitingConnect:                 // = 41,
            Serial.print("WaitingConnect");
            break;
        case DNETcK::WaitingReConnect:               // = 42,
            Serial.print("WaitingReConnect");
            break;
        case DNETcK::Connected:                      // = 43,
            Serial.print("Connected");
            break;
        // other connection status
        case DNETcK::LostConnect:                    // = 50,
            Serial.print("LostConnect");
            break;
        case DNETcK::ConnectionAlreadyDefined:       // = 51,
            Serial.print("ConnectionAlreadyDefined");
            break;
        case DNETcK::SocketError:                    // = 52,
            Serial.print("SocketError");
            break;
        case DNETcK::WaitingMACLinkage:              // = 53,
            Serial.print("WaitingMACLinkage");
            break;
        case DNETcK::LostMACLinkage:                 // = 54,
            Serial.print("LostMACLinkage");
            break;
        // write status
        case DNETcK::WriteTimeout:                   // = 60,
            Serial.print("WriteTimeout");
            break;
        // read status
        case DNETcK::NoDataToRead:                   // = 70,
            Serial.print("NoDataToRead");
            break;
        // Listening status
        case DNETcK::NeedToCallStartListening:       // = 80,
            Serial.print("NeedToCallStartListening");
            break;
        case DNETcK::NeedToResumeListening:          // = 81,
            Serial.print("NeedToResumeListening");
            break;
        case DNETcK::AlreadyStarted:                 // = 82,
            Serial.print("AlreadyStarted");
            break;
        case DNETcK::AlreadyListening:               // = 83,
            Serial.print("AlreadyListening");
            break;
        case DNETcK::Listening:                      // = 84,
            Serial.print("Listening");
            break;
        case DNETcK::ExceededMaxPendingAllowed:      // = 85,
            Serial.print("ExceededMaxPendingAllowed");
            break;
        case DNETcK::MoreCurrentlyPendingThanAllowed: // = 86,
            Serial.print("MoreCurrentlyPendingThanAllowed");
            break;
        case DNETcK::ClientPointerIsNULL:            // = 87,
            Serial.print("ClientPointerIsNULL");
            break;
        case DNETcK::SocketAlreadyAssignedToClient:  // = 88,
            Serial.print("SocketAlreadyAssignedToClient");
            break;
        case DNETcK::NoPendingClients:               // = 89,
            Serial.print("NoPendingClients");
            break;
        case DNETcK::IndexOutOfBounds:               // = 90,
            Serial.print("IndexOutOfBounds");
            break;
        // UDP endpoint resolve state machine
        case DNETcK::EndPointNotSet:                 // = 100,
            Serial.print("EndPointNotSet");
            break;
        // DNSResolving
        case DNETcK::ARPResolving:                   // = 110,
            Serial.print("ARPResolving");
            break;
        case DNETcK::AcquiringSocket:                // = 111,
            Serial.print("AcquiringSocket");
            break;
        case DNETcK::Finalizing:                     // = 112,
            Serial.print("Finalizing");
            break;
        case DNETcK::EndPointResolved:               // = 113,
            Serial.print("EndPointResolved");
            break;
        // DNSResolutionFailed
        case DNETcK::ARPResolutionFailed:            // = 120,
            Serial.print("ARPResolutionFailed");
            break;
        // SocketError
        // WiFi Stuff below here
        case DNETcK::WFStillScanning:                // = 130,
            Serial.print("WFStillScanning");
            break;
        case DNETcK::WFUnableToGetConnectionID:      // = 131,
            Serial.print("WFUnableToGetConnectionID");
            break;
        case DNETcK::WFInvalideConnectionID:         // = 132,
            Serial.print("WFInvalideConnectionID");
            break;
        case DNETcK::WFAssertHit:                    // = 133,
            Serial.print("WFAssertHit");
            break;
        default:
            Serial.print("Status unknown");
            break;
    }
}

void setup() {
    Serial.begin(9600);
    Serial.println("Start wifi network connection demo");

    pinMode(WIFI_STATUS_PIN, OUTPUT);
}
    
void loop() {
    DNETcK::STATUS networkStatus;
    
    // Держим Tcp-стек в живом состоянии
    DNETcK::periodicTasks();
        
    if(!DWIFIcK::isConnected(connectionId)) {
        // Не подключены к WiFi - выключим лампочку
        digitalWrite(WIFI_STATUS_PIN, LOW);
        
        bool connectedToWifi = false;
      
        // Подключимся к сети Wifi        
        Serial.println("Connecting wifi...");
                
        // Сначала получим доступ к оборудованию:
        // выбрать способ подключения (открытый или с паролем)
        if(USE_SECURITY_OPEN) {
            // Подключиться к открытой сети WiFi.
            Serial.print("SSID: ");
            Serial.println(wifi_ssid);
            
            connectionId = DWIFIcK::connect(wifi_ssid, &networkStatus);
        } else {
            // Подключиться к сети WiFi, защищенной WPA2 с паролем.
            Serial.print("SSID: ");
            Serial.print(wifi_ssid);
            Serial.print(", WPA2 passphrase: ");
            Serial.println(wifi_wpa2_passphrase);
          
            connectionId = DWIFIcK::connect(wifi_ssid, wifi_wpa2_passphrase, &networkStatus);
        }
  
        if(connectionId != DWIFIcK::INVALID_CONNECTION_ID) {
            // На этом этапе подключение будет создано, даже если указанная 
            // сеть Wifi недоступна или для нее задан неправильный пароль
            Serial.print("Connection created, connection id=");
            Serial.println(connectionId, DEC);


            // Теперь попробуем подключиться к самой точке доступа - инициализируем Ip-стек
            Serial.print("Initializing IP stack...");
            
            if(USE_STATIC_ADDRESS) {
                // подключимся со статическим ip-адресом
                DNETcK::begin(host_ip);
            } else {
                // подключиться с динамическим ip-адресом
                DNETcK::begin();
            }
            
            // К открытой сети может подключиться с первой попытки, к сети с паролем
            // может потребоваться несколько циклов (если пароль для сети неправильный,
            // то ошибка вылезет тоже на этом этапе).
            bool initializing = true;
            while(initializing) {
                Serial.print(".");
                // Вызов isInitialized заблокируется до тех пор, пока стек не будет 
                // инициализирован или не истечет время ожидания (по умолчанию 15 секунд). 
                // Если сеть не подключится до истечения таймаута и при этом не произойдет
                // ошибка, isInitialized просто вернет FALSE без кода ошибки, при необходимости
                // можно вызвать его повторно до успеха или ошибки.
                if(DNETcK::isInitialized(&networkStatus)) {
                    // Стек IP инициализирован
                    connectedToWifi = true;
                    
                    initializing = false;
                } else if(DNETcK::isStatusAnError(networkStatus)) {
                    // Стек IP не инициализирован из-за ошибки,
                    // в этом месте больше не пробуем                  
                    initializing = false;
                }
            }
            Serial.println();
        }
        
        if(connectedToWifi) {
            // Подключились к Wifi
            Serial.println("Connected to wifi");
            printNetworkStatus();
            
            // включим лампочку
            digitalWrite(WIFI_STATUS_PIN, HIGH);
        } else {
            // Так и не получилось подключиться
            Serial.print("Failed to connect wifi, status: ");
            printDNETcKStatus(networkStatus);
            Serial.println();
            
            // Нужно корректно завершить весь стек IP и Wifi, чтобы
            // иметь возможность переподключиться на следующей итерации
            DNETcK::end();
            DWIFIcK::disconnect(connectionId);
            connectionId = DWIFIcK::INVALID_CONNECTION_ID;
            
            // Немного подождем и попробуем переподключиться на следующей итерации
            Serial.println("Retry after 4 seconds...");
            delay(4000);
        }
    } else {
        // Подключены к WiFi - здесь можно делать любые операции, для которых необходима сеть
        Serial.println("WiFi is ON, do something with network");
        delay(5000);
    }
}

