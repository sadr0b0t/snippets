package edu.nntu.robotserver;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.Socket;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 *
 * @author benderamp
 */
public class RobotClient {

    public static final String CMD_LEDON = "ledon";
    public static final String CMD_LEDOFF = "ledoff";

    public static final String REPLY_OK = "ok";
    public static final String REPLY_DONTUNDERSTAND = "dontunderstand";

    public static final String DEFAULT_SERVER_HOST = "robotc.lasto4ka.su";
//    public static final String DEFAULT_SERVER_HOST = "localhost";
    public static final int DEFAULT_SERVER_PORT = 1116;

    private String serverHost;
    private int serverPort;

    public RobotClient() {
        this(DEFAULT_SERVER_HOST, DEFAULT_SERVER_PORT);
    }

    public RobotClient(final String serverHost, final int serverPort) {
        this.serverHost = serverHost;
        this.serverPort = serverPort;
    }

    private String handleInput(String cmd) {
        final String reply;
        if (CMD_LEDON.equals(cmd)) {
            System.out.println("Command 'ledon': turn light on");

            // Здесь мы могли бы включить лампочку, если бы она была
            System.out.println("*");

            reply = REPLY_OK;
        } else if (CMD_LEDOFF.equals(cmd)) {
            System.out.println("Command 'ledoff': turn light off");

            // Здесь мы могли бы выключить лампочку, если бы она была
            System.out.println("o");

            reply = REPLY_OK;
        } else {
            System.out.println("Unknown command: " + cmd);

            reply = REPLY_DONTUNDERSTAND;
        }
        return reply;
    }

    public void startClient() throws IOException {
        // Открываем сокет
        final Socket socket = new Socket(serverHost, serverPort);
        System.out.println("Connected to server");

        // Получаем доступ к потокам ввода-вывода
        final OutputStream serverOut = socket.getOutputStream();
        final InputStream serverIn = socket.getInputStream();

        final byte[] readBuffer = new byte[256];
        int readSize;

        String inputLine;
        String reply;

        // Запускаем бесконечный цикл ожидания/чтения данных с сервера
        while ((readSize = serverIn.read(readBuffer)) != -1) {
            // Превратим байты в строку
            inputLine = new String(readBuffer, 0, readSize);
            System.out.println("Read: " + inputLine);
            // Попробуем выполнить команду
            reply = handleInput(inputLine);
            // Отправим ответ
            if (reply != null && reply.length() > 0) {
                System.out.println("Write: " + reply);
                serverOut.write((reply).getBytes());
                serverOut.flush();
            }
        }
    }

    public static void main(String args[]) {
        final RobotClient client = new RobotClient();
        try {
            client.startClient();
        } catch (IOException ex) {
            Logger.getLogger(RobotServer1.class.getName()).log(Level.SEVERE, null, ex);
        }
    }
}
