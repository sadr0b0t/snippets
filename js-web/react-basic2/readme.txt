https://github.com/sadr0b0t/snippets/issues/3

установить create-react-app

глобально
sudo npm install -g create-react-app
или локально
npm install create-react-app

создать проект

с глобальным create-react-app
create-react-app react-basic2

с локальным
./node_modules/.bin/create-react-app react-basic2

cd react-basic2
npm start

веб-приложение будет в http://localhost:3000/

или собрать проект для оптимизированного деплоя
npm run build

проект со всеми зависимостями появится в каталоге build, его можно
загрузить в корень сервера и открыть файл
build/index.html

чтобы приложение запустилось локально с файловой системы, добавить в package.json
  "homepage": ".",

