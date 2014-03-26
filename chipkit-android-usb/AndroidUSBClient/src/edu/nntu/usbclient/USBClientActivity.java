package edu.nntu.usbclient;

import java.io.BufferedReader;
import java.io.FileDescriptor;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.hardware.usb.UsbAccessory;
import android.hardware.usb.UsbManager;
import android.os.Bundle;
import android.os.ParcelFileDescriptor;
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
	private static final String ACTION_USB_PERMISSION = "com.google.android.DemoKit.action.USB_PERMISSION";

	public static final String CMD_LEDON = "ledon";
	public static final String CMD_LEDOFF = "ledoff";

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
	private boolean accessForbidden = false;

	private final BroadcastReceiver usbReceiver = new BroadcastReceiver() {
		@Override
		public void onReceive(Context context, Intent intent) {
			String action = intent.getAction();
			if (ACTION_USB_PERMISSION.equals(action)) {
				final UsbAccessory accessory = (UsbAccessory) intent
						.getParcelableExtra(UsbManager.EXTRA_ACCESSORY);
				if (intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED,
						false)) {
					debug("Accessory permission granted");

					openAccessory(accessory);
					updateViews();
				} else {
					debug("Permission denied for accessory");

					// user has forbidden access explicitly
					accessForbidden = true;
				}
				requestingPermission = false;
			} else if (UsbManager.ACTION_USB_ACCESSORY_ATTACHED.equals(action)) {
				final UsbAccessory accessory = (UsbAccessory) intent
						.getParcelableExtra(UsbManager.EXTRA_ACCESSORY);
				if (accessory != null) {
					debug("Accessory attached");

					connectToAccessory(accessory);
					updateViews();
				}
			} else if (UsbManager.ACTION_USB_ACCESSORY_DETACHED.equals(action)) {
				final UsbAccessory accessory = (UsbAccessory) intent
						.getParcelableExtra(UsbManager.EXTRA_ACCESSORY);
				if (accessory != null && accessory.equals(usbAccessory)) {
					// debug("Accessory detached");

					disconnectFromAccessory();
					accessForbidden = false;
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
				debug("connectToAccessory: has permission >openAccessory");
				openAccessory(accessory);
			} else {
				if (!requestingPermission && !accessForbidden) {
					debug("connectToAccessory: no permission > requestPermission");
					// No permission to open accessory, but the user did not
					// forbid it yet - try to request it
					requestingPermission = true;
					usbManager.requestPermission(accessory, permissionIntent);
				} else {
					debug("connectToAccessory: no permission "
							+ "> accessForbidden=" + accessForbidden
							+ ", requestingPermission=" + requestingPermission);
				}
			}
		} else {
			debug("connectToAccessory: No accessories found");
		}
	}

	private void debug(final String msg) {
		txtDebug.append(msg + "\n");
	}

	/**
	 * Close communication channel with accessory.
	 */
	private void disconnectFromAccessory() {
		try {
			if (fileDescriptor != null) {
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

		usbManager = (UsbManager) getSystemService(Context.USB_SERVICE);

		permissionIntent = PendingIntent.getBroadcast(this, 0, new Intent(
				ACTION_USB_PERMISSION), 0);

		final IntentFilter filter = new IntentFilter(ACTION_USB_PERMISSION);
		filter.addAction(UsbManager.ACTION_USB_ACCESSORY_DETACHED);
		filter.addAction(UsbManager.ACTION_USB_ACCESSORY_ATTACHED);
		registerReceiver(usbReceiver, filter);

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
	public void onDestroy() {
		unregisterReceiver(usbReceiver);
		super.onDestroy();
	}

	@Override
	public void onPause() {
		disconnectFromAccessory();
		super.onPause();
	}

	@Override
	public void onResume() {
		super.onResume();
		debug("onResume: has accessory=" + (usbAccessory != null));

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
			FileDescriptor fd = fileDescriptor.getFileDescriptor();

			accessoryInput = new FileInputStream(fd);
			accessoryOutput = new FileOutputStream(fd);
			Thread inputThread = new Thread(new Runnable() {

				@Override
				public void run() {
					BufferedReader reader = new BufferedReader(
							new InputStreamReader(accessoryInput));
					try {
						while (reader.ready()) {
							final String line = reader.readLine();

							Toast.makeText(USBClientActivity.this,
									"in: " + line, Toast.LENGTH_SHORT).show();
						}
					} catch (Exception e) {
						e.printStackTrace();

						Toast.makeText(USBClientActivity.this,
								"Accessory read error: " + e.getMessage(),
								Toast.LENGTH_SHORT).show();
					}
				}
			});
			inputThread.start();

			debug("openAccessory: Connected accessory: manufacturer="
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
				accessoryOutput.write(command.getBytes());
				accessoryOutput.flush();
			} catch (IOException e) {
				e.printStackTrace();
			}
		}
	}

	private void updateViews() {
		final boolean accessoryConnected = usbAccessory != null;
		if (accessoryConnected) {
			txtStatus.setText("Connected to accessory:\n"
					+ "    manufacturer: " + usbAccessory.getManufacturer()
					+ "\n" + "    model: " + usbAccessory.getModel() + "\n"
					+ "    description: " + usbAccessory.getDescription()
					+ "\n" + "    version: " + usbAccessory.getVersion() + "\n"
					+ "    serial: " + usbAccessory.getSerial() + "\n"
					+ "    uri: " + usbAccessory.getUri());
			btnCmdLedOn.setEnabled(true);
			btnCmdLedOff.setEnabled(true);
		} else {
			txtStatus.setText("No accessory");
			btnCmdLedOn.setEnabled(false);
			btnCmdLedOff.setEnabled(false);
		}
	}
}
