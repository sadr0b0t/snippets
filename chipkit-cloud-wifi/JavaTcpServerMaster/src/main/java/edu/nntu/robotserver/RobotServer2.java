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
public class RobotServer2 {

    // Локальные команды для сервера
    public static final String SCMD_KICK = "kick";

    // Ответы от сервера управляющему интерфейсу
    public static final String SREPLY_OK = "ok";
    public static final String SREPLY_DISCONNECTED = "disconnected";

    public static final int DEFAULT_SERVER_PORT = 1116;
    public static final int DEFAULT_FRONTEND_PORT = 1117;
    /**
     * Таймаут для чтения ответа на команды - клиент должет прислать ответ за 5
     * секунд, иначе он будет считаться отключенным.
     */
    private static final int CLIENT_SO_TIMEOUT = 5000;

    // Сокет для подключение роботов
    private int serverPort;
    private ServerSocket serverSocket;

    private InputStream clientIn;
    private OutputStream clientOut;

    private boolean robotIsConnected = false;

    // Сокет для подключения управляющего интерфейса
    private int frontendPort;
    private ServerSocket frontendSocket;

    public RobotServer2() {
        this(DEFAULT_SERVER_PORT, DEFAULT_FRONTEND_PORT);
    }

    public RobotServer2(int serverPort, int frontendPort) {
        this.serverPort = serverPort;
        this.frontendPort = frontendPort;
    }

    /**
     * Запускает сервер слушать входящие подключения от роботов на указанном
     * порте serverPort.
     *
     * Простой однопоточный сервер - ждет ввод от пользователя, отправляет
     * введенную команду клиенту, ждет ответ и дальше по кругу.
     *
     * Сбросить подключенного клиента - ввести локальную команду 'kick'.
     *
     * @throws java.io.IOException
     */
    public void startServer() throws IOException {
        System.out.println("Starting Robot Server on port " + serverPort + "...");
        // Открыли сокет
        serverSocket = new ServerSocket(serverPort);

        Socket clientSocket = null;
        while (true) {
            try {
                System.out.println("Waiting for robot...");
                // Ждём подключения клиента (робота)
                clientSocket = serverSocket.accept();
                System.out.println("Robot accepted: " + clientSocket.getInetAddress().getHostAddress());

                // Клиент подключился:
                // Установим таймаут для чтения ответа на команды - 
                // клиент должет прислать ответ за 5 секунд, иначе он будет
                // считаться отключенным (в нашем случае это позволит предотвратить
                // вероятные зависания на блокирующем read, когда например клиент
                // отключился до того, как прислал ответ и сокет не распрознал это
                // как разрыв связи с выбросом IOException)
                clientSocket.setSoTimeout(CLIENT_SO_TIMEOUT);

                // Получаем доступ к потокам ввода/вывода сокета для общения 
                // с подключившимся клиентом (роботом)
                clientIn = clientSocket.getInputStream();
                clientOut = clientSocket.getOutputStream();

                // робот подключен
                robotIsConnected = true;

                // Висим здесь все время, пока подключен робот
                while (robotIsConnected) {
                    try {
                        Thread.sleep(100);
                    } catch (InterruptedException ex) {
                        Logger.getLogger(RobotServer2.class.getName()).log(Level.SEVERE, null, ex);
                    }
                }
            } catch (IOException ex2) {
                // Попадём сюда только после того, как клиент отключится и сервер
                // попробует отправить ему любую команду 
                // (в более правильной реализации можно добавить в протокол 
                // команду проверки статуса клиента 'isalive' и отправлять её 
                // клиенту с некоторой периодичностью).
                System.out.println("Robot disconnected: " + ex2.getMessage());
            } finally {
                // закрыть неактуальный сокет
                if (clientIn != null) {
                    clientIn.close();
                }
                if (clientOut != null) {
                    clientOut.close();
                }
                if (clientSocket != null) {
                    clientSocket.close();
                }
            }
        }
    }

    public void startFrontendInterface() throws IOException {
        System.out.println("Starting frontend interface on port " + frontendPort + "...");
        // Открыли сокет
        frontendSocket = new ServerSocket(frontendPort);

        Socket frontendClientSocket = null;
        InputStream frontendIn = null;
        OutputStream frontendOut = null;
        while (true) {
            try {
                System.out.println("Waiting for frontend...");
                // Ждём подключения управляющего интерфейса
                frontendClientSocket = frontendSocket.accept();
                System.out.println("Frontend accepted: " + frontendClientSocket.getInetAddress().getHostAddress());

                frontendClientSocket.setSoTimeout(CLIENT_SO_TIMEOUT);

                // Получаем доступ к потокам ввода/вывода сокета для общения 
                // с подключившимся управляющим интерфейсом
                frontendIn = frontendClientSocket.getInputStream();
                frontendOut = frontendClientSocket.getOutputStream();

                // Команда от управляющего интерфейса
                final byte[] readBuffer = new byte[256];
                int readSize;
                String inputLine;

                // Команды от управляющего интерфейса              
                while ((readSize = frontendIn.read(readBuffer)) != -1) {
                    // Ответ управляющему интерфейсу
                    String reply = "";

                    // Превратим байты в строку
                    inputLine = new String(readBuffer, 0, readSize);
                    System.out.println("Frontend read: " + inputLine);

                    if (robotIsConnected) {
                        // Робот подключен - выполняем команду
                        
                        if (SCMD_KICK.equals(inputLine)) {
                            // Локальная команда - отключить робота
                            robotIsConnected = false;
                            reply = SREPLY_DISCONNECTED;

                            System.out.println("Robot disconnected: KICK");
                        } else if (inputLine.length() > 0) {
                            // отправим команду роботу
                            try {
                                System.out.println("Robot write: " + inputLine);
                                clientOut.write((inputLine).getBytes());
                                clientOut.flush();

                                // и сразу прочитаем ответ
                                final byte[] robotReadBuffer = new byte[256];
                                final int robotReadSize = clientIn.read(robotReadBuffer);
                                if (robotReadSize != -1) {
                                    // ответ от робота
                                    reply = new String(robotReadBuffer, 0, robotReadSize);
                                    System.out.println("Robot read: " + reply);
                                } else {
                                    // Соединение разорвано.
                                    // Такая ситуация проявляется например при связи
                                    // Server:OpenJDK - Client:Android - клиент отключается,
                                    // но сервер это не распознаёт: запись write завершается
                                    // без исключений, чтение read возвращается не дожидаясь
                                    // таймаута без исключения, но при этом возвращает -1.
                                    throw new IOException("End of stream");
                                }
                            } catch (IOException e) {
                            // в процессе обмена данными с роботом что-то пошло не так,
                                // будем ждать следующего робота
                                robotIsConnected = false;
                                reply = SREPLY_DISCONNECTED;
                            }
                        }
                    } else {
                        // робот не подключен
                        reply = SREPLY_DISCONNECTED;
                    }

                    // ответ управляющему интерфейсу
                    frontendOut.write(reply.getBytes());
                    frontendOut.flush();
                    System.out.println("Frontend write: " + reply);
                }
            } catch (SocketTimeoutException ex1) {
                System.out.println("Frontend disconnected: " + ex1.getMessage());
            } catch (IOException ex2) {
                System.out.println("Frontend disconnected: " + ex2.getMessage());
            } finally {
                // закрыть неактуальный сокет
                if (frontendIn != null) {
                    frontendIn.close();
                }
                if (frontendOut != null) {
                    frontendOut.close();
                }
                if (frontendClientSocket != null) {
                    frontendClientSocket.close();
                }
            }
        }
    }

    public static void main(String args[]) {
        final RobotServer2 server = new RobotServer2();
        new Thread() {
            @Override
            public void run() {
                try {
                    server.startServer();
                } catch (IOException ex) {
                    Logger.getLogger(RobotServer2.class.getName()).log(Level.SEVERE, null, ex);
                }
            }
        }.start();
        new Thread() {
            @Override
            public void run() {
                try {
                    server.startFrontendInterface();
                } catch (IOException ex) {
                    Logger.getLogger(RobotServer2.class.getName()).log(Level.SEVERE, null, ex);
                }
            }
        }.start();
    }
}
