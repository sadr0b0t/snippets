// https://nodejs.org/api/events.html
// https://www.npmjs.com/package/node-event-emitter

// наследование без ES6
// https://www.npmjs.com/package/inherits

// пример EventEmitter+CommonJS
// http://stackoverflow.com/a/14020832/3466540

// для базовой ноды
//const EventEmitter = require('events');
//var inherits = require('util').inherits

// для браузера - порт без зависимостей
var EventEmitter = require('node-event-emitter');
var inherits = require('inherits');

var MyEmitter = function() {}
inherits(MyEmitter, EventEmitter);

var myEmitter = new MyEmitter();
myEmitter.on('event', () => {
    console.log('an event occurred!');
});
myEmitter.emit('event');

