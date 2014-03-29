package edu.nntu.usbclient;

import java.io.FileDescriptor;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.hardware.usb.UsbAccessory;
import android.hardware.usb.UsbManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.ParcelFileDescriptor;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

/**
 * 
 * @author Anton Moiseev
 * 
 */
public class USBClientActivity extends Activity {
	// Yes, this system action name by some reason is not defined
	// as string constant in UsbManager class by android developers,
	// so let's do this here for them.
	private static final String ACTION_USB_PERMISSION = "com.google.android.DemoKit.action.USB_PERMISSION";
	private final static int READ_BUFFER_SIZE = 128;

	public static final String CMD_LEDON = "ledon";
	public static final String CMD_LEDOFF = "ledoff";
	public static final String CMD_LETMEGO = "letmego";

	public static final String REPLY_GETOUT = "getout";

	private UsbManager usbManager;
	private UsbAccessory usbAccessory;
	private ParcelFileDescriptor fileDescriptor;
	private FileInputStream accessoryInput;
	private FileOutputStream accessoryOutput;

	private PendingIntent permissionIntent;

	private TextView txtStatus;
	private Button btnCmdLedOn;
	private Button btnCmdLedOff;
	private TextView txtDebug;

	private boolean requestingPermission = false;

	private final Handler handler = new Handler();

	private final BroadcastReceiver usbReceiver = new BroadcastReceiver() {
		@Override
		public void onReceive(Context context, Intent intent) {
			String action = intent.getAction();
			if (ACTION_USB_PERMISSION.equals(action)) {
				final UsbAccessory accessory = (UsbAccessory) intent
						.getParcelableExtra(UsbManager.EXTRA_ACCESSORY);
				if (intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED,
						false)) {
					debug("Broadcast: accessory permission granted");

					openAccessory(accessory);
				} else {
					debug("Broadcast: permission denied for accessory");
				}
				requestingPermission = false;
				updateViews();
			} else if (UsbManager.ACTION_USB_ACCESSORY_DETACHED.equals(action)) {
				final UsbAccessory accessory = (UsbAccessory) intent
						.getParcelableExtra(UsbManager.EXTRA_ACCESSORY);
				if (accessory != null && accessory.equals(usbAccessory)) {
					debug("Broadcast: accessory detached");

					disconnectFromAccessory();
					updateViews();
				}
			}
		}
	};

	/**
	 * Try to connect to provided accessory. Opens communication channel if all
	 * ok, asks permission if required.
	 * 
	 * @param accessory
	 *            accessory to connect to
	 */
	private void connectToAccessory(UsbAccessory accessory) {
		if (accessory != null) {
			if (usbManager.hasPermission(accessory)) {
				debug("connectToAccessory: has permission => openAccessory");
				openAccessory(accessory);
			} else {
				if (!requestingPermission) {
					debug("connectToAccessory: no permission => requestPermission");
					// No permission to open accessory, but the user did not
					// forbid it yet - try to request it
					requestingPermission = true;
					usbManager.requestPermission(accessory, permissionIntent);
				} else {
					debug("connectToAccessory: requesting permission => skip");
				}
			}
		} else {
			debug("connectToAccessory: no accessories found");
		}
	}

	/**
	 * Debug messages.
	 * 
	 * @param msg
	 */
	private void debug(final String msg) {
		txtDebug.append(msg + "\n");
		System.out.println(msg);
	}

	/**
	 * Close communication channel with accessory.
	 */
	private void disconnectFromAccessory() {
		try {
			if (fileDescriptor != null) {
				// ask accessory to disconnect (have to do this
				// to correctly finish input reader thread)
				sendCommand(CMD_LETMEGO);

				fileDescriptor.close();

				debug("Disconnected from accessory");
			}
		} catch (IOException e) {
		} finally {
			usbAccessory = null;
			fileDescriptor = null;
			accessoryInput = null;
			accessoryOutput = null;
		}
	}

	@Override
	protected void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		setContentView(R.layout.activity_usbclient);

		// Setup some system staff
		usbManager = (UsbManager) getSystemService(Context.USB_SERVICE);
		permissionIntent = PendingIntent.getBroadcast(this, 0, new Intent(
				ACTION_USB_PERMISSION), 0);

		final IntentFilter filter = new IntentFilter(ACTION_USB_PERMISSION);
		filter.addAction(UsbManager.ACTION_USB_ACCESSORY_DETACHED);
		// It seems that Android does not allow to receive notifications
		// about ACTION_USB_ACCESSORY_ATTACHED event in this way,
		// so we will have to use "Connect accessory" menu option instead
		// which looks quite ugly, but this how its done. Another way would be
		// just to exit this activity each time accessory is disconnected and
		// reopen it after accessory is again connected.
		// filter.addAction(UsbManager.ACTION_USB_ACCESSORY_ATTACHED);
		registerReceiver(usbReceiver, filter);

		// Init ui
		txtStatus = (TextView) findViewById(R.id.txt_status);
		txtDebug = (TextView) findViewById(R.id.txt_debug);

		btnCmdLedOn = (Button) findViewById(R.id.btn_cmd_on);
		btnCmdLedOn.setOnClickListener(new View.OnClickListener() {

			@Override
			public void onClick(View v) {
				sendCommand(CMD_LEDON);
			}
		});
		btnCmdLedOff = (Button) findViewById(R.id.btn_cmd_off);
		btnCmdLedOff.setOnClickListener(new View.OnClickListener() {

			@Override
			public void onClick(View v) {
				sendCommand(CMD_LEDOFF);
			}
		});
	}

	@Override
	public boolean onCreateOptionsMenu(Menu menu) {
		// Inflate the menu; this adds items to the action bar if it is present.
		getMenuInflater().inflate(R.menu.menu_usbclient, menu);

		return super.onCreateOptionsMenu(menu);
	}

	@Override
	public void onDestroy() {
		unregisterReceiver(usbReceiver);
		super.onDestroy();
	}

	@Override
	public boolean onOptionsItemSelected(MenuItem item) {
		// Handle item selection
		switch (item.getItemId()) {
		case R.id.action_connect_to_accessory:

			// first, disconnect from current accessory if connected
			disconnectFromAccessory();

			// Try to connect to available accessory if it is attached.
			// Get list of all available accessories from system.
			final UsbAccessory[] accessories = usbManager.getAccessoryList();
			// Maximum number or connected accessories with current OS
			// implementation is 1, so taking 1st element if it exists is
			// ok.
			final UsbAccessory accessory = (accessories == null ? null
					: accessories[0]);
			connectToAccessory(accessory);
			updateViews();

			return true;
		case R.id.action_disconnect_from_accessory:

			// disconnect from current accessory if connected
			disconnectFromAccessory();
			updateViews();

			return true;
		default:
			return super.onOptionsItemSelected(item);
		}
	}

	@Override
	public void onPause() {
		disconnectFromAccessory();
		super.onPause();
	}

	@Override
	public void onResume() {
		super.onResume();

		// Try to connect to available accessory if it is attached.
		if (usbAccessory == null) {
			// Get list of all available accessories from system.
			final UsbAccessory[] accessories = usbManager.getAccessoryList();
			// Maximum number or connected accessories with current OS
			// implementation is 1, so taking 1st element if it exists is ok.
			final UsbAccessory accessory = (accessories == null ? null
					: accessories[0]);
			connectToAccessory(accessory);
		}

		updateViews();
	}

	/**
	 * Open communication channel with provided accessory.
	 * 
	 * @param accessory
	 *            accessory to open
	 */
	private void openAccessory(UsbAccessory accessory) {
		fileDescriptor = usbManager.openAccessory(accessory);
		if (fileDescriptor != null) {
			this.usbAccessory = accessory;
			final FileDescriptor fd = fileDescriptor.getFileDescriptor();

			accessoryInput = new FileInputStream(fd);
			accessoryOutput = new FileOutputStream(fd);
			final Thread inputThread = new Thread(new Runnable() {

				@Override
				public void run() {
					byte[] buffer = new byte[READ_BUFFER_SIZE];
					int readBytes = 0;
					while (readBytes >= 0) {
						try {
							handler.post(new Runnable() {
								@Override
								public void run() {
									debug("read bytes...");
								}
							});
							// This will unblock only when accessory will send
							// some bytes or will be disconnected physically;
							// closing IntputStream, FileDescriptor, Accessory
							// or whatever anything else from Java will not help
							// (see discussion here:
							// http://code.google.com/p/android/issues/detail?id=20545
							// ).
							readBytes = accessoryInput.read(buffer);
							final String reply = new String(buffer);

							final String postMessage = "Read: " + "num bytes="
									+ readBytes + ", value="
									+ new String(buffer);

							handler.post(new Runnable() {
								@Override
								public void run() {
									debug(postMessage);

									Toast.makeText(USBClientActivity.this,
											postMessage, Toast.LENGTH_SHORT)
											.show();
								}
							});

							// So we need a special "letmego" command with
							// "getout" reply from accessory to exit this
							// thread.
							if (REPLY_GETOUT.equals(reply)) {
								break;
							}
						} catch (final Exception e) {
							handler.post(new Runnable() {
								@Override
								public void run() {
									debug("Accessory read error: "
											+ e.getMessage());
								}
							});
							e.printStackTrace();
							break;
						}
					}
					handler.post(new Runnable() {
						@Override
						public void run() {
							debug("Input reader thread finish");

							updateViews();
						}
					});
				}
			});
			inputThread.start();

			debug("openAccessory: connected accessory: manufacturer="
					+ usbAccessory.getManufacturer() + ", model="
					+ usbAccessory.getModel());
		} else {
			debug("openAccessory: Failed to open accessory");
		}
	}

	/**
	 * Send command to connected accessory.
	 * 
	 * @param command
	 *            command to send
	 */
	public void sendCommand(String command) {
		if (accessoryOutput != null) {
			try {
				debug("Write: " + command);

				accessoryOutput.write(command.getBytes());
				accessoryOutput.flush();
			} catch (IOException e) {
				debug("Write error: " + e.getMessage());
				e.printStackTrace();
			}
		}
	}

	/**
	 * Update views depending on current application state.
	 */
	private void updateViews() {
		final boolean accessoryConnected = usbAccessory != null;
		if (accessoryConnected) {
			txtStatus.setText(getString(R.string.connected_to_accessory)
					+ ":\n" + "    manufacturer: "
					+ usbAccessory.getManufacturer() + "\n" + "    model: "
					+ usbAccessory.getModel() + "\n" + "    description: "
					+ usbAccessory.getDescription() + "\n" + "    version: "
					+ usbAccessory.getVersion() + "\n" + "    serial: "
					+ usbAccessory.getSerial() + "\n" + "    uri: "
					+ usbAccessory.getUri());
			btnCmdLedOn.setEnabled(true);
			btnCmdLedOff.setEnabled(true);
		} else {
			txtStatus.setText(getString(R.string.no_accessory));
			btnCmdLedOn.setEnabled(false);
			btnCmdLedOff.setEnabled(false);
		}
	}
}
