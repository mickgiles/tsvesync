# VeSync CLI Tool

A command-line interface for controlling VeSync smart home devices.

## Overview

The VeSync CLI Tool provides a convenient way to interact with your VeSync devices directly from the terminal. It offers a menu-driven interface that allows you to:

- Control multiple device types (air purifiers, humidifiers, outlets, switches, bulbs)
- Turn devices on and off
- Change device modes and settings
- View device details and status
- Control device-specific features

## Installation

### Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)
- A VeSync account with registered devices

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/mickgiles/tsvesync.git
   cd tsvesync
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

### Running the CLI Tool

To start the CLI tool, run:

```bash
npx ts-node scripts/cli.ts
```

### First-time Login

When you run the tool for the first time, you'll be prompted to enter your VeSync credentials:

1. Enter your VeSync username (email address)
2. Enter your password
3. Choose whether to save your credentials for future use

If you choose to save your credentials, they will be stored in a `.env` file in the project root directory.

### Main Menu

After logging in, you'll see the main menu with the following options:

- **Control a device**: Select a device to control
- **Refresh devices**: Refresh the list of devices
- **Exit**: Exit the CLI tool

### Device Control

When you select a device to control, you'll see a list of available actions for that device. The actions vary depending on the device type:

#### Air Purifiers (Core Series, LAP Series, LV Series)

- Turn On
- Turn Off
- Get Details
- Set Mode (auto, manual, sleep)
- Change Fan Speed (if supported)
- Set Display (on/off)
- Set Child Lock (on/off)
- Set Timer
- Clear Timer

#### Humidifiers (Classic Series, LUH Series, LEH Series)

- Turn On
- Turn Off
- Get Details
- Set Mode (auto, manual, sleep)
- Set Mist Level
- Set Humidity
- Set Display (on/off)
- Set Child Lock (on/off)
- Set Timer
- Clear Timer

#### Outlets and Switches

- Turn On
- Turn Off
- Get Details
- Toggle
- Get Energy Usage (for outlets with energy monitoring)

#### Bulbs

- Turn On
- Turn Off
- Get Details
- Set Brightness
- Set Color Temperature
- Set Color

## Device-Specific Features

### Air Purifiers

- **Fan Speed Control**: Available for devices with the `fan_speed` feature. Allows changing the fan speed in manual mode.
- **Display Control**: Turn the display on or off.
- **Child Lock**: Enable or disable the child lock feature.
- **Timer**: Set a timer to turn the device off after a specified number of hours.
- **Mode Control**: Switch between auto, manual, and sleep modes.

### Humidifiers

- **Mist Level Control**: Adjust the mist output level.
- **Humidity Control**: Set the target humidity level in auto mode.
- **Display Control**: Turn the display on or off.
- **Child Lock**: Enable or disable the child lock feature.
- **Timer**: Set a timer to turn the device off after a specified number of hours.
- **Mode Control**: Switch between auto, manual, and sleep modes.

### Superior 6000S Humidifier

- **Temperature Display**: View the current temperature.
- **Drying Mode**: Enable or disable drying mode.
- **Filter Life**: View the remaining filter life.

## Feature Availability

Not all features are available on all devices. The CLI tool will only show actions that are supported by the selected device. Some features may also be restricted based on the current mode of the device.

For example:
- Fan speed control is only available in manual mode for some devices
- Display and child lock controls may not be available in sleep mode
- Some devices may have limited fan speed levels

## Troubleshooting

### Common Issues

1. **Login Failure**
   - Verify your VeSync credentials
   - Check your internet connection

2. **No Devices Found**
   - Make sure your devices are set up in the VeSync app
   - Try refreshing the device list

3. **Feature Not Available**
   - Some features are only available in certain modes
   - Not all devices support all features

### Error Messages

The CLI tool provides detailed error messages to help diagnose issues:

- **"Feature not supported"**: The selected feature is not supported by this device
- **"Operation not supported in current mode"**: The operation cannot be performed in the current device mode
- **"API error"**: An error occurred when communicating with the VeSync API

## Advanced Usage

### Environment Variables

You can set the following environment variables in a `.env` file:

- `VESYNC_USERNAME`: Your VeSync username (email)
- `VESYNC_PASSWORD`: Your VeSync password

### Command Line Arguments

Currently, the CLI tool does not support command line arguments. All interactions are through the menu-driven interface.

## Contributing

Contributions to improve the CLI tool are welcome. Please feel free to submit issues or pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
