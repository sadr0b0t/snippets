https://github.com/sadr0b0t/snippets/issues/3

редактировать клиента, скомпилировать клиентские страницы
cd webapp-client
npm run build

скомпилированные страницы клиента со всеми зависимостями попадают в каталог webapp-client/build,
на сервере на него ссылается символьная ссылка webapp-server/client-build

запустить сервер
cd webapp-server
node webapp-server.js

открыть по адресу http://localhost:3000

