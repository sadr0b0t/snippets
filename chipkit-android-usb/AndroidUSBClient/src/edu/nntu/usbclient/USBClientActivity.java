package edu.nntu.usbclient;

import java.io.BufferedReader;
import java.io.FileDescriptor;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.hardware.usb.UsbAccessory;
import android.hardware.usb.UsbManager;
import android.os.Bundle;
import android.os.ParcelFileDescriptor;
import android.view.View;
import android.widget.Button;
import android.widget.Toast;

public class USBClientActivity extends Activity {

	public static final String CMD_LEDON = "ledon";
	public static final String CMD_LEDOFF = "ledoff";

	private UsbManager usbManager;
	private FileInputStream accessoryInput;
	private FileOutputStream accessoryOutput;

	private final BroadcastReceiver mUsbReceiver = new BroadcastReceiver() {
		@Override
		public void onReceive(Context context, Intent intent) {
			// String action = intent.getAction();
			// if (ACTION_USB_PERMISSION.equals(action)) {
			//
			// // Start whatever connection you need.
			// // Check to see if permission was granted. If so, open the
			// // Accessory for use.
			// synchronized (this) {
			// UsbAccessory accessory = UsbManager.getAccessory(intent);
			// if (intent.getBooleanExtra(
			// UsbManager.EXTRA_PERMISSION_GRANTED, false)) {
			// openAccessory(accessory);
			// } else {
			// // Log.d(TAG, "permission denied for accessory " +
			// // accessory);
			// }
			// }
			//
			// } else if
			// (UsbManager.ACTION_USB_ACCESSORY_DETACHED.equals(action)) {
			//
			// // Close the Accessory and notify the user if it’s been
			// // detached.
			//
			// }
		}
	};

	@Override
	protected void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		setContentView(R.layout.activity_usbclient);

		// usbManager = UsbManager.getInstance(this);
		usbManager = (UsbManager) getSystemService(Context.USB_SERVICE);

		final Button openBtn = (Button) findViewById(R.id.btn_connect);
		openBtn.setOnClickListener(new View.OnClickListener() {

			@Override
			public void onClick(View v) {
				UsbAccessory[] accessories = usbManager.getAccessoryList();
				UsbAccessory accessory = (accessories == null ? null
						: accessories[0]);

				openAccessory(accessory);
			}
		});
		final Button cmdOnBtn = (Button) findViewById(R.id.btn_cmd_on);
		cmdOnBtn.setOnClickListener(new View.OnClickListener() {

			@Override
			public void onClick(View v) {
				sendCommand(CMD_LEDON);
			}
		});
		final Button cmdOffBtn = (Button) findViewById(R.id.btn_cmd_off);
		cmdOffBtn.setOnClickListener(new View.OnClickListener() {

			@Override
			public void onClick(View v) {
				sendCommand(CMD_LEDOFF);
			}
		});

	}

	private void openAccessory(UsbAccessory usbAccessory) {
		Toast.makeText(
				this,
				"Connected accessory: manufacturer: "
						+ usbAccessory.getManufacturer() + ", model: "
						+ usbAccessory.getModel(), Toast.LENGTH_LONG).show();

		final ParcelFileDescriptor fileDescriptor = usbManager
				.openAccessory(usbAccessory);
		if (fileDescriptor != null) {
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
		}
	}

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
}
