#!/usr/bin/env ts-node

/**
 * VeSync CLI Tool
 * A menu-driven CLI for controlling VeSync devices
 */

import inquirer from 'inquirer';
import * as dotenv from 'dotenv';
import { VeSync } from '../src/lib/vesync';
import { VeSyncBaseDevice } from '../src/lib/vesyncBaseDevice';
import { VeSyncFan } from '../src/lib/vesyncFan';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  
  fg: {
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    crimson: '\x1b[38m'
  },
  
  bg: {
    black: '\x1b[40m',
    red: '\x1b[41m',
    green: '\x1b[42m',
    yellow: '\x1b[43m',
    blue: '\x1b[44m',
    magenta: '\x1b[45m',
    cyan: '\x1b[46m',
    white: '\x1b[47m',
    crimson: '\x1b[48m'
  }
};

// VeSync manager instance
let manager: VeSync;

/**
 * Main function
 */
async function main() {
  console.clear();
  printHeader();
  
  // Check for credentials in .env file
  const username = process.env.VESYNC_USERNAME;
  const password = process.env.VESYNC_PASSWORD;
  
  if (username && password) {
    // Use credentials from .env
    await loginWithCredentials(username, password);
  } else {
    // Prompt for credentials
    await promptForCredentials();
  }
  
  // Main menu loop
  while (true) {
    const action = await showMainMenu();
    
    if (action === 'exit') {
      console.log(`\n${colors.fg.green}Goodbye!${colors.reset}`);
      process.exit(0);
    } else if (action === 'refresh') {
      await refreshDevices();
    } else if (action === 'device') {
      await selectAndControlDevice();
    }
  }
}

/**
 * Print header
 */
function printHeader() {
  console.log(`\n${colors.fg.cyan}${colors.bright}==============================${colors.reset}`);
  console.log(`${colors.fg.cyan}${colors.bright}       VeSync CLI Tool       ${colors.reset}`);
  console.log(`${colors.fg.cyan}${colors.bright}==============================${colors.reset}\n`);
}

/**
 * Prompt for credentials
 */
async function promptForCredentials() {
  const credentials = await inquirer.prompt([
    {
      type: 'input',
      name: 'username',
      message: 'Enter your VeSync username (email):',
      validate: (input) => input.includes('@') ? true : 'Please enter a valid email address'
    },
    {
      type: 'password',
      name: 'password',
      message: 'Enter your VeSync password:',
      mask: '*'
    },
    {
      type: 'confirm',
      name: 'saveCredentials',
      message: 'Save credentials for future use?',
      default: false
    }
  ]);
  
  if (credentials.saveCredentials) {
    saveCredentials(credentials.username, credentials.password);
  }
  
  await loginWithCredentials(credentials.username, credentials.password);
}

/**
 * Save credentials to .env file
 */
function saveCredentials(username: string, password: string) {
  try {
    const envPath = path.join(process.cwd(), '.env');
    const envContent = `VESYNC_USERNAME=${username}\nVESYNC_PASSWORD=${password}\n`;
    
    fs.writeFileSync(envPath, envContent);
    console.log(`${colors.fg.green}Credentials saved to .env file${colors.reset}`);
  } catch (error) {
    console.error(`${colors.fg.red}Failed to save credentials:${colors.reset}`, error);
  }
}

/**
 * Login with credentials
 */
async function loginWithCredentials(username: string, password: string) {
  console.log(`\n${colors.fg.yellow}Logging in to VeSync...${colors.reset}`);
  
  try {
    manager = new VeSync(username, password, 'America/New_York', false, true);
    const success = await manager.login();
    
    if (success) {
      console.log(`${colors.fg.green}Login successful!${colors.reset}`);
      await refreshDevices();
    } else {
      console.log(`${colors.fg.red}Login failed. Please check your credentials.${colors.reset}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`${colors.fg.red}Error during login:${colors.reset}`, error);
    process.exit(1);
  }
}

/**
 * Refresh devices
 */
async function refreshDevices() {
  console.log(`\n${colors.fg.yellow}Refreshing devices...${colors.reset}`);
  
  try {
    const success = await manager.getDevices();
    
    if (success && manager.devices && manager.devices.length > 0) {
      console.log(`${colors.fg.green}Found ${manager.devices.length} devices:${colors.reset}`);
      
      // Group devices by category
      const devicesByCategory: Record<string, VeSyncBaseDevice[]> = {
        fans: manager.fans,
        outlets: manager.outlets,
        switches: manager.switches,
        bulbs: manager.bulbs
      };
      
      // Print devices by category
      for (const [category, devices] of Object.entries(devicesByCategory)) {
        if (devices.length > 0) {
          console.log(`\n${colors.fg.cyan}${category.toUpperCase()}:${colors.reset}`);
          devices.forEach((device, index) => {
            console.log(`  ${index + 1}. ${device.deviceName} (${device.deviceType}) - ${colors.fg.green}${device.deviceStatus}${colors.reset}`);
          });
        }
      }
    } else {
      console.log(`${colors.fg.red}No devices found.${colors.reset}`);
    }
  } catch (error) {
    console.error(`${colors.fg.red}Error refreshing devices:${colors.reset}`, error);
  }
}

/**
 * Show main menu
 */
async function showMainMenu() {
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: 'Control a device', value: 'device' },
        { name: 'Refresh devices', value: 'refresh' },
        { name: 'Exit', value: 'exit' }
      ]
    }
  ]);
  
  return action;
}

/**
 * Select and control a device
 */
async function selectAndControlDevice() {
  if (!manager.devices || manager.devices.length === 0) {
    console.log(`${colors.fg.red}No devices available. Please refresh devices first.${colors.reset}`);
    return;
  }
  
  // Create device choices
  const deviceChoices = manager.devices.map((device, index) => ({
    name: `${device.deviceName} (${device.deviceType}) - ${device.deviceStatus}`,
    value: index
  }));
  
  // Add back and quit options
  deviceChoices.push({ name: 'Back to main menu', value: -1 });
  deviceChoices.push({ name: 'Quit', value: -2 });
  
  // Prompt for device selection
  const { deviceIndex } = await inquirer.prompt([
    {
      type: 'list',
      name: 'deviceIndex',
      message: 'Select a device to control:',
      choices: deviceChoices
    }
  ]);
  
  if (deviceIndex === -1) {
    return;
  } else if (deviceIndex === -2) {
    console.log(`\n${colors.fg.green}Goodbye!${colors.reset}`);
    process.exit(0);
  }
  
  const selectedDevice = manager.devices[deviceIndex];
  await controlDevice(selectedDevice);
}

/**
 * Control a device
 */
async function controlDevice(device: VeSyncBaseDevice) {
  // Get latest device details
  await device.getDetails();
  
  console.log(`\n${colors.fg.cyan}${colors.bright}Device: ${device.deviceName}${colors.reset}`);
  console.log(`${colors.fg.cyan}Type: ${device.deviceType}${colors.reset}`);
  console.log(`${colors.fg.cyan}Status: ${device.deviceStatus}${colors.reset}\n`);
  
  // Determine device category
  const deviceCategory = getDeviceCategory(device);
  
  // Get actions based on device category
  const actions = getDeviceActions(device, deviceCategory);
  
  // Add back and quit options
  actions.push({ name: 'Back to device selection', value: 'back' });
  actions.push({ name: 'Quit', value: 'quit' });
  
  // Prompt for action
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Select an action:',
      choices: actions
    }
  ]);
  
  if (action === 'back') {
    return;
  } else if (action === 'quit') {
    console.log(`\n${colors.fg.green}Goodbye!${colors.reset}`);
    process.exit(0);
  }
  
  // Execute action
  await executeAction(device, action, deviceCategory);
  
  // Show device control menu again
  await controlDevice(device);
}

/**
 * Get device category
 */
function getDeviceCategory(device: VeSyncBaseDevice): string {
  if (manager.fans.includes(device)) {
    return 'fan';
  } else if (manager.outlets.includes(device)) {
    return 'outlet';
  } else if (manager.switches.includes(device)) {
    return 'switch';
  } else if (manager.bulbs.includes(device)) {
    return 'bulb';
  }
  
  // Try to determine from device type
  const deviceType = device.deviceType.toLowerCase();
  if (deviceType.includes('core') || deviceType.includes('lap') || deviceType.includes('luh') || deviceType.includes('leh')) {
    return 'fan';
  } else if (deviceType.includes('esw') || deviceType.includes('wifi-switch')) {
    return 'outlet';
  } else if (deviceType.includes('eswl') || deviceType.includes('eswd')) {
    return 'switch';
  } else if (deviceType.includes('esl') || deviceType.includes('xyd')) {
    return 'bulb';
  }
  
  return 'unknown';
}

/**
 * Get device actions based on category
 */
function getDeviceActions(device: VeSyncBaseDevice, category: string): { name: string; value: string }[] {
  const actions: { name: string; value: string }[] = [
    { name: 'Turn On', value: 'turnOn' },
    { name: 'Turn Off', value: 'turnOff' },
    { name: 'Get Details', value: 'getDetails' }
  ];
  
  // Add category-specific actions
  if (category === 'fan') {
    const fan = device as VeSyncFan;
    
    // Add mode control if available
    actions.push({ name: 'Set Mode', value: 'setMode' });
    
    // Add fan speed control if available
    if (fan.hasFeature && fan.hasFeature('fan_speed')) {
      actions.push({ name: 'Change Fan Speed', value: 'changeFanSpeed' });
    }
    
    // Add display control if available
    if (fan.hasFeature && fan.hasFeature('display')) {
      actions.push({ name: 'Set Display', value: 'setDisplay' });
    }
    
    // Add child lock control if available
    if (fan.hasFeature && fan.hasFeature('child_lock')) {
      actions.push({ name: 'Set Child Lock', value: 'setChildLock' });
    }
    
    // Add timer control if available
    if (fan.hasFeature && fan.hasFeature('timer')) {
      actions.push({ name: 'Set Timer', value: 'setTimer' });
      actions.push({ name: 'Clear Timer', value: 'clearTimer' });
    }
  } else if (category === 'outlet') {
    // Add outlet-specific actions
    actions.push({ name: 'Toggle', value: 'toggle' });
    actions.push({ name: 'Get Energy Usage', value: 'getEnergy' });
    actions.push({ name: 'Get Energy Usage Today', value: 'getEnergyToday' });
    actions.push({ name: 'Get Energy Usage Week', value: 'getEnergyWeek' });
    actions.push({ name: 'Get Energy Usage Month', value: 'getEnergyMonth' });
    actions.push({ name: 'Get Energy Usage Year', value: 'getEnergyYear' });
  } else if (category === 'switch') {
    // Add switch-specific actions
    actions.push({ name: 'Toggle', value: 'toggle' });
  } else if (category === 'bulb') {
    // Add bulb-specific actions
    actions.push({ name: 'Set Brightness', value: 'setBrightness' });
    actions.push({ name: 'Set Color Temperature', value: 'setColorTemp' });
    actions.push({ name: 'Set Color', value: 'setColor' });
  }
  
  return actions;
}

/**
 * Execute action on device
 */
async function executeAction(device: VeSyncBaseDevice, action: string, category: string) {
  console.log(`\n${colors.fg.yellow}Executing ${action}...${colors.reset}`);
  
  try {
    switch (action) {
      case 'turnOn':
        if (typeof (device as any).turnOn === 'function') {
          await (device as any).turnOn();
          console.log(`${colors.fg.green}Device turned on.${colors.reset}`);
        } else {
          console.log(`${colors.fg.red}Turn on not supported for this device.${colors.reset}`);
        }
        break;
        
      case 'turnOff':
        if (typeof (device as any).turnOff === 'function') {
          await (device as any).turnOff();
          console.log(`${colors.fg.green}Device turned off.${colors.reset}`);
        } else {
          console.log(`${colors.fg.red}Turn off not supported for this device.${colors.reset}`);
        }
        break;
        
      case 'getDetails':
        await device.getDetails();
        displayDeviceDetails(device, category);
        break;
        
      case 'setMode':
        await handleSetMode(device as VeSyncFan);
        break;
        
      case 'changeFanSpeed':
        await handleChangeFanSpeed(device as VeSyncFan);
        break;
        
      case 'setDisplay':
        await handleSetDisplay(device as VeSyncFan);
        break;
        
      case 'setChildLock':
        await handleSetChildLock(device as VeSyncFan);
        break;
        
      case 'setTimer':
        await handleSetTimer(device as VeSyncFan);
        break;
        
      case 'clearTimer':
        if (typeof (device as any).clearTimer === 'function') {
          await (device as any).clearTimer();
          console.log(`${colors.fg.green}Timer cleared.${colors.reset}`);
        } else {
          console.log(`${colors.fg.red}Clear timer not supported for this device.${colors.reset}`);
        }
        break;
        
      case 'toggle':
        if (typeof (device as any).toggle === 'function') {
          await (device as any).toggle();
          console.log(`${colors.fg.green}Device toggled.${colors.reset}`);
        } else {
          console.log(`${colors.fg.red}Toggle not supported for this device.${colors.reset}`);
        }
        break;
        
      case 'getEnergy':
        if (typeof (device as any).getEnergy === 'function') {
          const energy = await (device as any).getEnergy();
          console.log(`${colors.fg.green}Energy usage: ${energy} kWh${colors.reset}`);
        } else {
          console.log(`${colors.fg.red}Energy monitoring not supported for this device.${colors.reset}`);
        }
        break;
        
      case 'getEnergyToday':
        if (typeof (device as any).getEnergyToday === 'function') {
          const energy = await (device as any).getEnergyToday();
          console.log(`${colors.fg.green}Energy usage today: ${energy} kWh${colors.reset}`);
        } else {
          console.log(`${colors.fg.red}Energy monitoring not supported for this device.${colors.reset}`);
        }
        break;
        
      case 'getEnergyWeek':
        if (typeof (device as any).getEnergyWeek === 'function') {
          const energy = await (device as any).getEnergyWeek();
          console.log(`${colors.fg.green}Energy usage this week: ${energy} kWh${colors.reset}`);
        } else {
          console.log(`${colors.fg.red}Energy monitoring not supported for this device.${colors.reset}`);
        }
        break;
        
      case 'getEnergyMonth':
        if (typeof (device as any).getEnergyMonth === 'function') {
          const energy = await (device as any).getEnergyMonth();
          console.log(`${colors.fg.green}Energy usage this month: ${energy} kWh${colors.reset}`);
        } else {
          console.log(`${colors.fg.red}Energy monitoring not supported for this device.${colors.reset}`);
        }
        break;
        
      case 'getEnergyYear':
        if (typeof (device as any).getEnergyYear === 'function') {
          const energy = await (device as any).getEnergyYear();
          console.log(`${colors.fg.green}Energy usage this year: ${energy} kWh${colors.reset}`);
        } else {
          console.log(`${colors.fg.red}Energy monitoring not supported for this device.${colors.reset}`);
        }
        break;
        
      case 'setBrightness':
        await handleSetBrightness(device);
        break;
        
      case 'setColorTemp':
        await handleSetColorTemp(device);
        break;
        
      case 'setColor':
        await handleSetColor(device);
        break;
        
      default:
        console.log(`${colors.fg.red}Action not implemented: ${action}${colors.reset}`);
    }
  } catch (error) {
    console.error(`${colors.fg.red}Error executing action:${colors.reset}`, error);
  }
  
  // Wait for user to press enter
  await inquirer.prompt([
    {
      type: 'input',
      name: 'continue',
      message: 'Press Enter to continue...'
    }
  ]);
}

/**
 * Display device details
 */
function displayDeviceDetails(device: VeSyncBaseDevice, category: string) {
  console.log(`\n${colors.fg.cyan}${colors.bright}Device Details:${colors.reset}`);
  console.log(`${colors.fg.cyan}Name: ${device.deviceName}${colors.reset}`);
  console.log(`${colors.fg.cyan}Type: ${device.deviceType}${colors.reset}`);
  console.log(`${colors.fg.cyan}Status: ${device.deviceStatus}${colors.reset}`);
  console.log(`${colors.fg.cyan}CID: ${device.cid}${colors.reset}`);
  console.log(`${colors.fg.cyan}UUID: ${device.uuid}${colors.reset}`);
  
  // Display category-specific details
  if (category === 'fan') {
    const fan = device as VeSyncFan;
    console.log(`${colors.fg.cyan}Mode: ${fan.mode}${colors.reset}`);
    console.log(`${colors.fg.cyan}Speed: ${fan.speed}${colors.reset}`);
    console.log(`${colors.fg.cyan}Display: ${fan.screenStatus}${colors.reset}`);
    
    // Display filter life if available
    if (typeof fan.filterLife === 'number') {
      console.log(`${colors.fg.cyan}Filter Life: ${fan.filterLife}%${colors.reset}`);
    }
    
    // Display available features
    if (fan.hasFeature) {
      console.log(`\n${colors.fg.cyan}${colors.bright}Available Features:${colors.reset}`);
      console.log(`${colors.fg.cyan}Display Control: ${fan.hasFeature('display')}${colors.reset}`);
      console.log(`${colors.fg.cyan}Fan Speed Control: ${fan.hasFeature('fan_speed')}${colors.reset}`);
      console.log(`${colors.fg.cyan}Child Lock: ${fan.hasFeature('child_lock')}${colors.reset}`);
      console.log(`${colors.fg.cyan}Timer: ${fan.hasFeature('timer')}${colors.reset}`);
      console.log(`${colors.fg.cyan}Auto Mode: ${fan.hasFeature('auto_mode')}${colors.reset}`);
      console.log(`${colors.fg.cyan}Sleep Mode: ${fan.hasFeature('sleep_mode')}${colors.reset}`);
      console.log(`${colors.fg.cyan}Air Quality Detection: ${fan.hasFeature('air_quality')}${colors.reset}`);
    }
    
    // Display features supported in current mode
    if (fan.isFeatureSupportedInCurrentMode) {
      console.log(`\n${colors.fg.cyan}${colors.bright}Features Supported in Current Mode:${colors.reset}`);
      console.log(`${colors.fg.cyan}Display Control: ${fan.isFeatureSupportedInCurrentMode('display')}${colors.reset}`);
      console.log(`${colors.fg.cyan}Fan Speed Control: ${fan.isFeatureSupportedInCurrentMode('fan_speed')}${colors.reset}`);
      console.log(`${colors.fg.cyan}Child Lock: ${fan.isFeatureSupportedInCurrentMode('child_lock')}${colors.reset}`);
      console.log(`${colors.fg.cyan}Timer: ${fan.isFeatureSupportedInCurrentMode('timer')}${colors.reset}`);
      console.log(`${colors.fg.cyan}Auto Mode: ${fan.isFeatureSupportedInCurrentMode('auto_mode')}${colors.reset}`);
      console.log(`${colors.fg.cyan}Sleep Mode: ${fan.isFeatureSupportedInCurrentMode('sleep_mode')}${colors.reset}`);
      console.log(`${colors.fg.cyan}Air Quality Detection: ${fan.isFeatureSupportedInCurrentMode('air_quality')}${colors.reset}`);
    }
  }
  
  // Display raw device details
  if (typeof device.displayJSON === 'function') {
    console.log(`\n${colors.fg.cyan}${colors.bright}Raw Device Details:${colors.reset}`);
    console.log(device.displayJSON());
  }
}

/**
 * Handle set mode action
 */
async function handleSetMode(device: VeSyncFan) {
  // Get available modes
  const modeChoices = [
    { name: 'Manual', value: 'manual' },
    { name: 'Auto', value: 'auto' },
    { name: 'Sleep', value: 'sleep' },
    { name: 'Back', value: 'back' },
    { name: 'Quit', value: 'quit' }
  ];
  
  // Prompt for mode
  const { mode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: 'Select a mode:',
      choices: modeChoices
    }
  ]);
  
  // Handle back or quit
  if (mode === 'back') {
    return;
  } else if (mode === 'quit') {
    console.log(`\n${colors.fg.green}Goodbye!${colors.reset}`);
    process.exit(0);
  }
  
  // Set mode
  await device.setMode(mode);
  console.log(`${colors.fg.green}Mode set to ${mode}.${colors.reset}`);
}

/**
 * Handle change fan speed action
 */
async function handleChangeFanSpeed(device: VeSyncFan) {
  // Get max fan speed
  const maxSpeed = device.getMaxFanSpeed ? device.getMaxFanSpeed() : 3;
  
  // For Core air purifiers, we know they support specific levels
  let supportedLevels: number[] = [];
  
  // Check device type to determine supported levels
  if (device.deviceType.includes('Core') || 
      device.deviceType.includes('LV-PUR131S') || 
      device.deviceType.includes('LV-RH131S')) {
    // All Core air devices and LV series support levels 1, 2, 3
    supportedLevels = [1, 2, 3];
  } else if (device.deviceType.includes('LAP-C')) {
    // LAP-C series support levels 1, 2, 3, 4
    supportedLevels = [1, 2, 3, 4];
  } else {
    // Default: create array from 1 to maxSpeed
    supportedLevels = Array.from({ length: maxSpeed }, (_, i) => i + 1);
  }
  
  // Create speed choices from supported levels
  const speedChoices = supportedLevels.map(level => ({
    name: `Speed ${level}`,
    value: level
  }));
  
  // Add back and quit options
  speedChoices.push({ name: 'Back', value: -1 });
  speedChoices.push({ name: 'Quit', value: -2 });
  
  // Prompt for speed
  const { speed } = await inquirer.prompt([
    {
      type: 'list',
      name: 'speed',
      message: 'Select a fan speed:',
      choices: speedChoices
    }
  ]);
  
  // Handle back or quit
  if (speed === -1) {
    return;
  } else if (speed === -2) {
    console.log(`\n${colors.fg.green}Goodbye!${colors.reset}`);
    process.exit(0);
  }
  
  // Set fan speed
  await device.changeFanSpeed(speed);
  console.log(`${colors.fg.green}Fan speed set to ${speed}.${colors.reset}`);
}

/**
 * Handle set display action
 */
async function handleSetDisplay(device: VeSyncFan) {
  // Prompt for display state
  const { state } = await inquirer.prompt([
    {
      type: 'list',
      name: 'state',
      message: 'Select display state:',
      choices: [
        { name: 'On', value: 'on' },
        { name: 'Off', value: 'off' },
        { name: 'Back', value: 'back' },
        { name: 'Quit', value: 'quit' }
      ]
    }
  ]);
  
  // Handle back or quit
  if (state === 'back') {
    return;
  } else if (state === 'quit') {
    console.log(`\n${colors.fg.green}Goodbye!${colors.reset}`);
    process.exit(0);
  }
  
  // Convert string to boolean
  const displayState = state === 'on';
  
  // Set display
  if (typeof (device as any).setDisplay === 'function') {
    await (device as any).setDisplay(displayState);
    console.log(`${colors.fg.green}Display set to ${displayState ? 'on' : 'off'}.${colors.reset}`);
  } else {
    console.log(`${colors.fg.red}Display control not supported for this device.${colors.reset}`);
  }
}

/**
 * Handle set child lock action
 */
async function handleSetChildLock(device: VeSyncFan) {
  // Prompt for child lock state
  const { state } = await inquirer.prompt([
    {
      type: 'list',
      name: 'state',
      message: 'Select child lock state:',
      choices: [
        { name: 'On', value: 'on' },
        { name: 'Off', value: 'off' },
        { name: 'Back', value: 'back' },
        { name: 'Quit', value: 'quit' }
      ]
    }
  ]);
  
  // Handle back or quit
  if (state === 'back') {
    return;
  } else if (state === 'quit') {
    console.log(`\n${colors.fg.green}Goodbye!${colors.reset}`);
    process.exit(0);
  }
  
  // Convert string to boolean
  const childLockState = state === 'on';
  
  // Set child lock
  if (typeof (device as any).setChildLock === 'function') {
    await (device as any).setChildLock(childLockState);
    console.log(`${colors.fg.green}Child lock set to ${childLockState ? 'on' : 'off'}.${colors.reset}`);
  } else {
    console.log(`${colors.fg.red}Child lock not supported for this device.${colors.reset}`);
  }
}

/**
 * Handle set timer action
 */
async function handleSetTimer(device: VeSyncFan) {
  // Prompt for timer action
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Timer options:',
      choices: [
        { name: 'Set Timer', value: 'set' },
        { name: 'Back', value: 'back' },
        { name: 'Quit', value: 'quit' }
      ]
    }
  ]);
  
  // Handle back or quit
  if (action === 'back') {
    return;
  } else if (action === 'quit') {
    console.log(`\n${colors.fg.green}Goodbye!${colors.reset}`);
    process.exit(0);
  }
  
  // Prompt for timer hours
  const { hours } = await inquirer.prompt([
    {
      type: 'number',
      name: 'hours',
      message: 'Enter timer duration in hours:',
      validate: (input) => (input !== undefined && input > 0) ? true : 'Please enter a positive number'
    }
  ]);
  
  // Set timer
  if (typeof (device as any).setTimer === 'function') {
    await (device as any).setTimer(hours);
    console.log(`${colors.fg.green}Timer set for ${hours} hours.${colors.reset}`);
  } else {
    console.log(`${colors.fg.red}Timer not supported for this device.${colors.reset}`);
  }
}

/**
 * Handle set brightness action
 */
async function handleSetBrightness(device: VeSyncBaseDevice) {
  // Prompt for brightness
  const { brightness } = await inquirer.prompt([
    {
      type: 'number',
      name: 'brightness',
      message: 'Enter brightness (1-100):',
      validate: (input) => (input !== undefined && input >= 1 && input <= 100) ? true : 'Please enter a number between 1 and 100'
    }
  ]);
  
  // Set brightness
  if (typeof (device as any).setBrightness === 'function') {
    await (device as any).setBrightness(brightness);
    console.log(`${colors.fg.green}Brightness set to ${brightness}.${colors.reset}`);
  } else {
    console.log(`${colors.fg.red}Brightness control not supported for this device.${colors.reset}`);
  }
}

/**
 * Handle set color temperature action
 */
async function handleSetColorTemp(device: VeSyncBaseDevice) {
  // Prompt for color temperature
  const { colorTemp } = await inquirer.prompt([
    {
      type: 'number',
      name: 'colorTemp',
      message: 'Enter color temperature (2700-6500K):',
      validate: (input) => (input !== undefined && input >= 2700 && input <= 6500) ? true : 'Please enter a number between 2700 and 6500'
    }
  ]);
  
  // Set color temperature
  if (typeof (device as any).setColorTemp === 'function') {
    await (device as any).setColorTemp(colorTemp);
    console.log(`${colors.fg.green}Color temperature set to ${colorTemp}K.${colors.reset}`);
  } else {
    console.log(`${colors.fg.red}Color temperature control not supported for this device.${colors.reset}`);
  }
}

/**
 * Handle set color action
 */
async function handleSetColor(device: VeSyncBaseDevice) {
  // Prompt for color (RGB)
  const { r, g, b } = await inquirer.prompt([
    {
      type: 'number',
      name: 'r',
      message: 'Enter red value (0-255):',
      validate: (input) => (input !== undefined && input >= 0 && input <= 255) ? true : 'Please enter a number between 0 and 255'
    },
    {
      type: 'number',
      name: 'g',
      message: 'Enter green value (0-255):',
      validate: (input) => (input !== undefined && input >= 0 && input <= 255) ? true : 'Please enter a number between 0 and 255'
    },
    {
      type: 'number',
      name: 'b',
      message: 'Enter blue value (0-255):',
      validate: (input) => (input !== undefined && input >= 0 && input <= 255) ? true : 'Please enter a number between 0 and 255'
    }
  ]);
  
  // Set color
  if (typeof (device as any).setColor === 'function') {
    await (device as any).setColor(r, g, b);
    console.log(`${colors.fg.green}Color set to RGB(${r}, ${g}, ${b}).${colors.reset}`);
  } else {
    console.log(`${colors.fg.red}Color control not supported for this device.${colors.reset}`);
  }
}

// Run main function
main().catch((error) => {
  console.error(`${colors.fg.red}Error:${colors.reset}`, error);
  process.exit(1);
});
