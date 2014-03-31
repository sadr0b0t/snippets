package edu.nntu.javanetworkserver;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 *
 * @author benderamp
 */
public class RobotServer1 {

    public static final String CMD_LEDON = "ledon";
    public static final String CMD_LEDOFF = "ledoff";

    public static final int DEFAULT_SERVER_PORT = 1117;

    private int serverPort;
    private ServerSocket serverSocket;

    public RobotServer1() {
        this(DEFAULT_SERVER_PORT);
    }

    public RobotServer1(int serverPort) {
        this.serverPort = serverPort;
    }

    /**
     * Запускает сервер слушать входящие подключения на указанном порте.
     *
     * @throws java.io.IOException
     */
    public void startServer() throws IOException {
        System.out.println("Starting server on port " + serverPort + "...");
        serverSocket = new ServerSocket(serverPort);

        System.out.println("Waiting for client...");
        Socket socket = serverSocket.accept();
        System.out.println("Client accepted: " + socket.getInetAddress().getHostAddress());

        // Ввод/вывод сокета для общения с подключившимся клиентом (роботом) 
        final InputStream clientIn = socket.getInputStream();
        final BufferedReader clientInputReader = new BufferedReader(new InputStreamReader(clientIn));
        final OutputStream clientOut = socket.getOutputStream();

        // Ввод команд из консоли пользователем
        final BufferedReader userInputReader = new BufferedReader(new InputStreamReader(System.in));
        String userLine;
        System.out.print("enter command: ");
        while ((userLine = userInputReader.readLine()) != null) {
            System.out.println("Write: " + userLine);
            clientOut.write((userLine + "\n").getBytes());
            clientOut.flush();
            
            final String clientLine = clientInputReader.readLine();
            if(clientLine != null) {
                System.out.println("Read: " + clientLine);
            }
            
            System.out.print("enter command: ");
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
