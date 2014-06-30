package edu.nntu.robotserver;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.Socket;

import android.app.Activity;
import android.os.Bundle;
import android.os.Handler;
import android.view.View;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.TextView;

public class RobotClientActivity extends Activity {

    private enum ConnectionStatus {
        DISCONNECTED, CONNECTING, CONNECTED, ERROR
    }

    public static final String CMD_LEDON = "ledon";
    public static final String CMD_LEDOFF = "ledoff";
    public static final String REPLY_OK = "ok";
    public static final String REPLY_DONTUNDERSTAND = "dontunderstand";

    public static final String DEFAULT_SERVER_HOST = "robotc.lasto4ka.su";
    public static final int DEFAULT_SERVER_PORT = 1116;

    private TextView txtStatus;
    private TextView txtLed1;
    private ImageView imgLed1;
    private Button btnConnect;
    private TextView txtDebug;

    private final Handler handler = new Handler();

    private Socket socket;
    private OutputStream serverOut;
    private InputStream serverIn;

    private ConnectionStatus connectionStatus = ConnectionStatus.DISCONNECTED;
    private String connectionInfo;
    private String connectionErrorMessage;

    /**
     * Подлключиться к серверу и запустить процесс чтения данных.
     */
    private void connectToServer(final String serverHost, final int serverPort) {
        // Все сетевые операции нужно делать в фоновом потоке, чтобы не
        // блокировать интерфейс
        new Thread() {
            @Override
            public void run() {
                try {
                    debug("Connecting to server: " + serverHost + ":"
                            + serverPort + "...");
                    setConnectionStatus(ConnectionStatus.CONNECTING);

                    socket = new Socket(serverHost, serverPort);
                    serverOut = socket.getOutputStream();
                    serverIn = socket.getInputStream();

                    debug("Connected");
                    connectionInfo = socket.getInetAddress().getHostName()
                            + ":" + socket.getPort();
                    setConnectionStatus(ConnectionStatus.CONNECTED);

                    // Подключились к серверу, запустим второй поток
                    // чтения данных
                    startServerInputReader();
                } catch (final Exception e) {
                    socket = null;
                    serverOut = null;
                    serverIn = null;

                    debug("Error connecting to server: " + e.getMessage());
                    setConnectionStatus(ConnectionStatus.ERROR);
                    connectionErrorMessage = e.getMessage();

                    e.printStackTrace();
                }
            }
        }.start();
    }

    /**
     * Отладочные сообщения.
     * 
     * @param msg
     */
    private void debug(final String msg) {
        handler.post(new Runnable() {
            @Override
            public void run() {
                txtDebug.append(msg + "\n");
            }
        });
        System.out.println(msg);
    }

    /**
     * Отключиться от сервера - закрыть все потоки и сокет, обнулить переменные.
     */
    private void disconnectFromServer() {
        try {
            if (serverIn != null) {
                serverIn.close();
            }
            if (serverOut != null) {
                serverOut.close();
            }
            if (socket != null) {
                socket.close();
            }
        } catch (final IOException e) {
            e.printStackTrace();
        } finally {
            serverIn = null;
            serverOut = null;
            socket = null;

            debug("Disconnected");
            setConnectionStatus(ConnectionStatus.DISCONNECTED);
        }
    }

    /**
     * Отработать входные данные и при необходимости выполнить команду.
     * 
     * @param cmd
     * @return
     */
    private String handleInput(String cmd) {
        final String reply;
        if (CMD_LEDON.equals(cmd)) {
            debug("Command 'ledon': turn light on");

            // Здесь мы могли бы включить лампочку, если бы она была
            handler.post(new Runnable() {
                @Override
                public void run() {
                    setLedStatus(true);
                }
            });

            reply = REPLY_OK;
        } else if (CMD_LEDOFF.equals(cmd)) {
            debug("Command 'ledoff': turn light off");

            // Здесь мы могли бы выключить лампочку, если бы она была
            handler.post(new Runnable() {
                @Override
                public void run() {
                    setLedStatus(false);
                }
            });

            reply = REPLY_OK;
        } else {
            debug("Unknown command: " + cmd);

            reply = REPLY_DONTUNDERSTAND;
        }
        return reply;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_robot_client);

        txtStatus = (TextView) findViewById(R.id.txt_status);
        txtDebug = (TextView) findViewById(R.id.txt_debug);

        txtLed1 = (TextView) findViewById(R.id.txt_led1);
        imgLed1 = (ImageView) findViewById(R.id.img_led1);
        setLedStatus(false);

        btnConnect = (Button) findViewById(R.id.btn_connect);
        btnConnect.setOnClickListener(new View.OnClickListener() {

            @Override
            public void onClick(View v) {
                connectToServer(DEFAULT_SERVER_HOST, DEFAULT_SERVER_PORT);
            }
        });
    }

    @Override
    protected void onPause() {
        super.onPause();

        disconnectFromServer();
    }

    @Override
    protected void onResume() {
        super.onResume();

        connectToServer(DEFAULT_SERVER_HOST, DEFAULT_SERVER_PORT);
    }

    private void setConnectionStatus(final ConnectionStatus status) {
        this.connectionStatus = status;
        handler.post(new Runnable() {
            @Override
            public void run() {
                updateViews();
            }
        });
    }

    /**
     * Включить или выключить светодиод (лампочку). Клипарты светодиодов:
     * http://openclipart.org/search/?query=led+rounded+h
     * http://openclipart.org/detail/28085/led-rounded-h-yellow-by-anonymous
     * http://openclipart.org/detail/28084/led-rounded-h-red-by-anonymous
     * http://openclipart.org/detail/28083/led-rounded-h-purple-by-anonymous
     * http://openclipart.org/detail/28082/led-rounded-h-orange-by-anonymous
     * http://openclipart.org/detail/28081/led-rounded-h-grey-by-anonymous
     * http://openclipart.org/detail/28080/led-rounded-h-green-by-anonymous
     * http://openclipart.org/detail/28079/led-rounded-h-blue-by-anonymous
     * http://openclipart.org/detail/28078/led-rounded-h-black-by-anonymous
     * 
     * @param on
     */
    private void setLedStatus(boolean on) {
        if (on) {
            // зажечь лампочку
            txtLed1.setText("led: ON");
            imgLed1.setImageResource(R.drawable.led1_on);
        } else {
            // потушить лампочку
            txtLed1.setText("led: OFF");
            imgLed1.setImageResource(R.drawable.led1_off);
        }
    }

    /**
     * Фоновый поток чтения данных с сервера - постоянно ждем команду, когда
     * приходит - выполняем, шлем ответ и начинаем ждать следующую команду.
     */
    private void startServerInputReader() {
        new Thread() {
            @Override
            public void run() {
                final byte[] readBuffer = new byte[256];
                int readSize;

                String inputLine;
                String reply;

                try {
                    // Читаем данные
                    while ((readSize = serverIn.read(readBuffer)) != -1) {
                        inputLine = new String(readBuffer, 0, readSize);
                        debug("Read: " + inputLine);
                        reply = handleInput(inputLine);
                        // Пишем ответ
                        if (reply != null && reply.length() > 0) {
                            debug("Write: " + reply);
                            serverOut.write((reply).getBytes());
                            // сбросим данные через сокет прямо сейчас, иначе
                            // они могут быть отправленны позже, когда
                            // реализация OutputStream решит это сделать по
                            // своему усмотрению (заполнится буфер, пройдет
                            // определенный таймаут и т.п.)
                            serverOut.flush();
                        }
                    }
                } catch (final Exception e) {
                    debug("Server read error: " + e.getMessage());
                    e.printStackTrace();
                }
                debug("Server input reader thread finish");
                disconnectFromServer();
            }
        }.start();
    }

    /**
     * Обновить элементы управления в зависимости от текущего состояния.
     */
    private void updateViews() {

        switch (connectionStatus) {
        case DISCONNECTED:
            txtStatus.setText(R.string.status_disconnected);

            btnConnect.setVisibility(View.VISIBLE);
            btnConnect.setEnabled(true);

            break;
        case CONNECTED:
            txtStatus.setText(getString(R.string.status_connected) + ": "
                    + connectionInfo);

            btnConnect.setVisibility(View.GONE);
            btnConnect.setEnabled(false);

            break;
        case CONNECTING:
            txtStatus.setText(R.string.status_connecting);

            btnConnect.setVisibility(View.VISIBLE);
            btnConnect.setEnabled(false);

            break;
        case ERROR:
            txtStatus.setText(getString(R.string.status_error) + ": "
                    + connectionErrorMessage);

            btnConnect.setVisibility(View.VISIBLE);
            btnConnect.setEnabled(true);

            break;
        default:
            break;
        }
    }
}
