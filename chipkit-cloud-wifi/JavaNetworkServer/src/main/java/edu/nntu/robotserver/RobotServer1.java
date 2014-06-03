package edu.nntu.robotserver;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.SocketTimeoutException;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 *
 * @author benderamp
 */
public class RobotServer1 {

    // Локальные команды для сервера
    public static final String SCMD_KICK = "kick";

    // Команды для далёкого клиента (робота)
    public static final String CMD_LEDON = "ledon";
    public static final String CMD_LEDOFF = "ledoff";

    public static final int DEFAULT_SERVER_PORT = 1116;

    private int serverPort;
    private ServerSocket serverSocket;

    public RobotServer1() {
        this(DEFAULT_SERVER_PORT);
    }

    public RobotServer1(int serverPort) {
        this.serverPort = serverPort;
    }

    /**
     * Запускает сервер слушать входящие подключения на указанном порте
     * serverPort.
     *
     * Простой однопоточный сервер - ждет ввод от пользователя, отправляет
     * введенную команду клиенту, ждет ответ и дальше по кругу.
     *
     * Сбросить подключенного клиента - ввести локальную команду 'kick'.
     *
     * @throws java.io.IOException
     */
    public void startServer() throws IOException {
        System.out.println("Starting server on port " + serverPort + "...");
        // Открыли сокет
        serverSocket = new ServerSocket(serverPort);

        Socket clientSocket = null;
        while (true) {
            try {
                System.out.println("Waiting for client...");
                // Ждём подключения клиента (робота)
                clientSocket = serverSocket.accept();
                System.out.println("Client accepted: " + clientSocket.getInetAddress().getHostAddress());

                // Клиент подключился:
                // Установим таймаут для чтения ответа на команды - 
                // клиент должет прислать ответ за 5 секунд, иначе он будет
                // считаться отключенным (в нашем случае это позволит предотвратить
                // вероятные зависания на блокирующем read, когда например клиент
                // отключился до того, как прислал ответ и сокет не распрознал это
                // как разрыв связи с выбросом IOException)
                clientSocket.setSoTimeout(5000);

                // Получаем доступ к потокам ввода/вывода сокета для общения 
                // с подключившимся клиентом (роботом)
                final InputStream clientIn = clientSocket.getInputStream();
                final OutputStream clientOut = clientSocket.getOutputStream();

                // Ввод команд из консоли пользователем
                final BufferedReader userInputReader = new BufferedReader(new InputStreamReader(System.in));
                String userLine;
                System.out.print("enter command: ");
                while (!clientSocket.isClosed() && (userLine = userInputReader.readLine()) != null) {
                    if (SCMD_KICK.equals(userLine)) {
                        // отключить клиента
                        clientIn.close();
                        clientOut.close();
                        clientSocket.close();

                        System.out.println("Client disconnected");
                    } else if (userLine.length() > 0) {
                        // отправить команду клиенту
                        System.out.println("Write: " + userLine);
                        clientOut.write((userLine).getBytes());
                        clientOut.flush();

                        final byte[] readBuffer = new byte[256];
                        final int readSize = clientIn.read(readBuffer);
                        if (readSize != -1) {
                            final String clientLine
                                    = new String(readBuffer, 0, readSize);
                            System.out.println("Read: " + clientLine);
                        }

                        // приглашение для ввода следующей команды
                        System.out.print("enter command: ");
                    }
                }
            } catch (SocketTimeoutException ex1) {
                // Попадем сюда, если клиент не отправит ответ во-время 
                // (установленное с clientSocket.setSoTimeout):
                // это не значит, что соединение нарушено (он может просто решил 
                // не отвечать), но все равно отключим такого клиента, чтобы он
                // не блокировал сервер.
                System.out.println("Client reply timeout, disconnect");
                if (clientSocket != null) {
                    clientSocket.close();
                }
            } catch (IOException ex2) {
                // Попадём сюда только после того, как клиент отключится и сервер
                // попробует отправить ему любую команду 
                // (в более правильной реализации можно добавить в протокол 
                // команду проверки статуса клиента 'isalive' и отправлять её 
                // клиенту с некоторой периодичностью).
                System.out.println("Client disconnected");
            }
        }
    }

    public static void main(String args[]) {
        final RobotServer1 server = new RobotServer1();
        try {
            server.startServer();
        } catch (IOException ex) {
            Logger.getLogger(RobotServer1.class.getName()).log(Level.SEVERE, null, ex);
        }
    }
}
