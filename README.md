# TSVeSync

A TypeScript library for interacting with VeSync smart home devices. This library provides a modern, type-safe interface for controlling VeSync devices including air purifiers, outlets, and switches.

## 🆕 Recent Updates

- **ESWD16 State Parity (v1.3.12)**: Bypass calls now reuse pyvesync-style trace IDs and mark the dimmer on after backlight tweaks, eliminating the lingering “off” state in HomeKit.
- **ESWD16 Bypass Compatibility (v1.3.11)**: Migrated the dimmer switch to the modern bypass-v1 API so power, brightness, and indicator updates stay in sync with pyvesync.
- **ESL Bulb API Parity (v1.3.10)**: ESL100/ESL100CW/ESL100MC now mirror pyvesync `/SmartBulb/v1` and `/cloud/v2` payloads for brightness and colour control.
- **Enhanced Authentication**: Now supports the new VeSync authentication flow (pyvesync PR #340) with automatic fallback to legacy authentication
- **Regional API Support**: Automatic detection and routing for US (`smartapi.vesync.com`) and EU (`smartapi.vesync.eu`) endpoints
- **International Account Support**: Full support for accounts worldwide including Australia, New Zealand, Japan, and all European countries
- **Country Code Configuration**: Specify your country code for proper authentication with international accounts
- **Improved Error Handling**: Better recovery from API changes and authentication errors with helpful guidance
- **Cross-Region Support**: Automatic handling of cross-region authentication errors

## Features

- Full TypeScript support with type definitions
- Support for multiple device types:
  - Air Purifiers (Core200S, Core300S, Core400S, Core600S, LV-PUR131S, Vital100S, Vital200S, EverestAir)
  - Humidifiers (Classic300S, Classic200S, Dual200S, LV600S, OasisMist series, Superior6000S)
  - Smart Bulbs (ESL100, ESL100CW, ESL100MC, XYD0001)
  - Outlets (15A, 10A, 7A models)
  - Smart Tower Fans (LTF-F422S series)
- Real-time device status and control
- Energy monitoring for supported devices
- Air quality monitoring for supported purifiers
- Humidity control for supported humidifiers
- RGB and color temperature control for smart bulbs
- Fan speed and mode control
- Comprehensive error handling
- Modern async/await API

## Supported Devices

### Air Purifiers
- Core200S
  - Features: Sleep mode, Manual mode, Filter life monitoring
  - Fan speeds: 1-3
- Core300S
  - Features: Auto mode, Sleep mode, Manual mode, Air quality monitoring
  - Fan speeds: 1-4
- Core400S
  - Features: Auto mode, Sleep mode, Manual mode, Air quality monitoring
  - Fan speeds: 1-4
- Core600S
  - Features: Auto mode, Sleep mode, Manual mode, Air quality monitoring
  - Fan speeds: 1-4
- LV-PUR131S
  - Features: Air quality monitoring
- Vital100S
  - Features: Air quality monitoring, Pet mode
  - Modes: Manual, Auto, Sleep, Pet
  - Fan speeds: 1-4
- Vital200S
  - Features: Air quality monitoring, Pet mode
  - Modes: Manual, Auto, Sleep, Pet
  - Fan speeds: 1-4
- EverestAir
  - Features: Air quality monitoring, Fan rotation, Turbo mode
  - Modes: Manual, Auto, Sleep, Turbo
  - Fan speeds: 1-3

### Humidifiers
- Classic300S
  - Features: Nightlight
  - Modes: Auto, Sleep, Manual
  - Mist levels: 1-9
- Classic200S
  - Modes: Auto, Manual
  - Mist levels: 1-9
- Dual200S
  - Modes: Auto, Manual
  - Mist levels: 1-2
- LV600S
  - Features: Warm mist, Nightlight
  - Modes: Humidity, Sleep, Manual
  - Mist levels: 1-9
  - Warm mist levels: 0-3
- OasisMist (EU)
  - Features: Warm mist, Nightlight
  - Modes: Auto, Manual
  - Mist levels: 1-9
  - Warm mist levels: 0-3
- OasisMist (US)
  - Features: Warm mist
  - Modes: Auto, Humidity, Sleep, Manual
  - Mist levels: 1-9
  - Warm mist levels: 0-3
- OasisMist1000S
  - Modes: Auto, Sleep, Manual
  - Mist levels: 1-9
- Superior6000S
  - Modes: Auto, Humidity, Sleep, Manual
  - Mist levels: 1-9

### Smart Bulbs
- ESL100
  - Features: Basic white light
  - Brightness control
- ESL100CW
  - Features: Tunable white light
  - Brightness control
  - Color temperature control (warm to cool white)
- ESL100MC
  - Features: Full RGB color
  - White and color modes
  - Brightness control
  - RGB color control
- XYD0001
  - Features: Full RGB color with HSV control
  - White and color modes
  - Brightness control
  - Color temperature control
  - HSV (Hue, Saturation, Value) color control

### Outlets
- 15A Outlet (ESO15-TB)
  - Power monitoring
  - Energy usage tracking (daily/weekly/monthly/yearly)
  - Voltage monitoring
  - Outdoor rated
- 15A Outlet (ESW15-USA)
  - Power monitoring
  - Energy usage tracking (daily/weekly/monthly/yearly)
  - Voltage monitoring
- 10A Outlet (ESW03-USA)
  - Power monitoring
  - Energy usage tracking (daily/weekly/monthly/yearly)
  - Voltage monitoring
- 10A Outlet (ESW01-EU)
  - Power monitoring
  - Energy usage tracking (daily/weekly/monthly/yearly)
  - Voltage monitoring
- 10A Outlet (ESW10-USA)
  - Power monitoring
  - Energy usage tracking (daily/weekly/monthly/yearly)
  - Voltage monitoring
- 7A Outlet (wifi-switch-1.3)
  - Energy usage tracking (daily/weekly/monthly/yearly)

### Smart Tower Fan
- LTF-F422S Series
  - Features: Fan speed control
  - Modes: Normal, Auto, Advanced Sleep, Turbo
  - Fan speeds: 1-12

### Wall Switches
- ESWL01
  - Basic on/off control
  - Status monitoring
- ESWL03
  - Basic on/off control
  - Status monitoring
- ESWD16
  - Dimming control
  - RGB indicator light control
  - Status monitoring
  
## Installation

```bash
npm install tsvesync
```

## Usage

### Basic Setup

```typescript
import { VeSync } from 'tsvesync';

// Create a VeSync manager instance
const manager = new VeSync(username, password);

// Login
await manager.login();

// Get all devices
await manager.getDevices();
```

### International Account Support

For accounts created outside the United States, you may need to specify your country code:

```typescript
import { VeSync } from 'tsvesync';

// For Australian users
const manager = new VeSync(username, password, 'America/Sydney', {
    countryCode: 'AU'
});

// For German users
const manager = new VeSync(username, password, 'Europe/Berlin', {
    countryCode: 'DE'
});

// For UK users
const manager = new VeSync(username, password, 'Europe/London', {
    countryCode: 'GB'
});

await manager.login();
```

#### Supported Country Codes

The library supports all country codes. Common ones include:

**Americas:**
- `US` - United States (default)
- `CA` - Canada
- `MX` - Mexico

**Europe:** (uses EU endpoint)
- `GB` - United Kingdom
- `DE` - Germany
- `FR` - France
- `IT` - Italy
- `ES` - Spain
- `NL` - Netherlands
- `SE` - Sweden
- `NO` - Norway
- `DK` - Denmark
- `FI` - Finland
- `PL` - Poland
- And all other European countries

**Asia-Pacific:** (uses US endpoint)
- `AU` - Australia
- `NZ` - New Zealand
- `JP` - Japan
- `SG` - Singapore
- `CN` - China
- `KR` - South Korea

**Important Notes:**
- If you get an authentication error about "country code mismatch" or "cross-region error", you need to set your country code
- The country code should match the country where your VeSync account was created
- European countries automatically use the EU endpoint (`smartapi.vesync.eu`)
- All other countries use the US endpoint (`smartapi.vesync.com`)

### Working with Devices

```typescript
// Get device status
for (const device of manager.devices) {
    await device.update();
    console.log(`${device.deviceName}: ${device.deviceStatus}`);
}

// Control an air purifier
const fan = manager.devices.find(d => d.deviceType === 'Core300S');
if (fan) {
    await fan.setMode('auto');  // Available modes: auto, sleep, manual
    await fan.changeFanSpeed(2);      // Speed range depends on model
}

// Control an outlet
const outlet = manager.devices.find(d => d.deviceType === 'ESO15-TB');
if (outlet) {
    await outlet.turnOn();
    const energy = await outlet.getEnergyUsage();
    console.log('Current power usage:', energy.power, 'W');
}
```

## Environment Variables

The library supports configuration through environment variables:

```env
VESYNC_USERNAME=your_email@example.com
VESYNC_PASSWORD=your_password
VESYNC_API_URL=https://smartapi.vesync.com  # Optional, defaults to standard API URL
```

## Testing

The project includes a comprehensive test suite:

```bash
# Run the standard test suite
npm test

# Run the special device test (requires .env configuration)
npx ts-node test/testSpecial.ts
```

## Development

### Building

```bash
npm run build
```

### Linting

```bash
npm run lint
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Acknowledgments

This project is inspired by the PyVeSync Python library and aims to provide similar functionality for TypeScript/JavaScript developers.
