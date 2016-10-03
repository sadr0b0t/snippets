// https://github.com/EmergingTechnologyAdvisors/node-serialport#usage
var SerialPort = require('serialport');

port = new SerialPort("/dev/ttyUSB0", {
    // скорость
    baudRate: 9600,
    //baudRate: 115200,
    // получать данные по одной строке
    parser: SerialPort.parsers.readline('\n'),
    //parser: SerialPort.parsers.ReadLine,
    // не открывать порт сразу здесь
    autoOpen: false,
    lock: true
});

function writeData() {
    data = "ping";
    console.log("write: " + data);
    port.write(data,
        function(err) {
            if(!err) {
                // данные ушли ок
                console.log("write ok");
            } else {
                // ошибка записи в порт 
                // (например, порт открыт, но не хватает прав на запись)
                console.log("write error: " + err);
            }
        }
    );
    
    // после первого вызова повторять бесконечно в цикле
    //setTimeout(writeData, 1000);
}

// 
// События
// 

// порт открылся
port.on('open', function () {
    console.log("open");
    
    // Weird behaviour when send packets just after port is open 
    // (this is only ChipKIT Uno32 old bootloader specific bug)
    // 
    // http://chipkit.net/forum/viewtopic.php?f=19&t=3731
    
    // Arduino sketch will start to work after the 
    // last writeData is executed
    // Скетч Ардуино начнет работать только после того,
    // как отработает последний вызов writeData
    //writeData();
    /*setTimeout(writeData, 3000);
    setTimeout(writeData, 6000);
    setTimeout(writeData, 9000);
    setTimeout(writeData, 12000);
    */
    
    // Arduino sketch will never start to work this way
    // так скетч Ардуино никогда не загрузится
    setInterval(writeData, 2000);
    
    // the only way to make Arduino sketch to work
    // единственный способ дать прошивке Ардуины загрузиться до конца - 
    // отправлять первое сообщение не раньше, чем через 5 секунд
    // после открытия порта платы (точнее, между двумя отправками сообщения
    // до загрузки скетча должно пройти как минимум 5 секунд)
    //setInterval(writeData, 5000);
});

// пришли данные
port.on('data', function(data) {
    console.log("data: " + data);
});

// отключили устройство (выдернули провод)
port.on('disconnect', function () {
    console.log("disconnect");
});

// 
// Действия
//

// открываем порт
port.open(function(err) {
    if(err) {
        // не получилось открыть порт
        console.log("Error opening: " + err);
    } else {
        console.log("Open OK");
        //setInterval(writeData, 1000);
    }
});

