// https://nodejs.org/api/events.html
// https://www.npmjs.com/package/node-event-emitter

// для базовой ноды
//const EventEmitter = require('events');
// для браузера - порт без зависимостей
const EventEmitter = require('node-event-emitter');

class MyEmitter extends EventEmitter {}

const myEmitter = new MyEmitter();
myEmitter.on('event', () => {
    console.log('an event occurred!');
});
myEmitter.emit('event');

