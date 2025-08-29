/**
 * VeSync Fan Classes
 */

import { VeSyncBaseDevice } from './vesyncBaseDevice';
import { VeSync } from './vesync';
import { logger } from './logger';

interface FanConfig {
    [key: string]: {
        module: 'VeSyncAirBypass' | 'VeSyncHumidifier' | 'VeSyncWarmHumidifier' | 'VeSyncTowerFan' | 'VeSyncAirBaseV2' | 'VeSyncSuperior6000S' | 'VeSyncHumid1000S' | 'VeSyncHumid200S' | 'VeSyncAir131';
        features: string[];
        levels?: number[];
    };
}

// Fan configuration
export const fanConfig: FanConfig = {
    // Core Series
    'Core200S': {
        module: 'VeSyncAirBypass',
        features: ['display', 'child_lock', 'night_light', 'timer', 'fan_speed', 'sleep_mode', 'filter_life'],
        levels: [1, 2, 3, 4]  // 4 levels including sleep mode, matching reference plugin
    },
    'Core300S': {
        module: 'VeSyncAirBypass',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer', 'fan_speed', 'auto_mode', 'sleep_mode', 'filter_life'],
        levels: [1, 2, 3, 4]
    },
    'Core400S': {
        module: 'VeSyncAirBypass',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer', 'fan_speed', 'auto_mode', 'sleep_mode', 'filter_life'],
        levels: [1, 2, 3, 4]
    },
    'Core600S': {
        module: 'VeSyncAirBypass',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer', 'fan_speed', 'auto_mode', 'sleep_mode', 'filter_life'],
        levels: [1, 2, 3, 4]
    },
    
    // LAP Series
    'LAP-C201S-AUSR': {
        module: 'VeSyncAirBypass',
        features: ['display', 'child_lock', 'night_light', 'timer', 'fan_speed', 'auto_mode', 'sleep_mode', 'filter_life'],
        levels: [1, 2, 3]
    },
    'LAP-C202S-WUSR': {
        module: 'VeSyncAirBypass',
        features: ['display', 'child_lock', 'night_light', 'timer', 'fan_speed', 'auto_mode', 'sleep_mode', 'filter_life'],
        levels: [1, 2, 3]
    },
    'LAP-C301S-WJP': {
        module: 'VeSyncAirBypass',
        features: ['display', 'child_lock', 'night_light', 'timer', 'fan_speed', 'auto_mode', 'sleep_mode', 'filter_life'],
        levels: [1, 2, 3, 4]
    },
    'LAP-C302S-WUSB': {
        module: 'VeSyncAirBypass',
        features: ['display', 'child_lock', 'night_light', 'timer', 'fan_speed', 'auto_mode', 'sleep_mode', 'filter_life'],
        levels: [1, 2, 3, 4]
    },
    'LAP-C301S-WAAA': {
        module: 'VeSyncAirBypass',
        features: ['display', 'child_lock', 'night_light', 'timer', 'fan_speed', 'auto_mode', 'sleep_mode', 'filter_life'],
        levels: [1, 2, 3, 4]
    },
    'LAP-C401S-WJP': {
        module: 'VeSyncAirBypass',
        features: ['display', 'child_lock', 'night_light', 'timer', 'fan_speed', 'auto_mode', 'sleep_mode', 'filter_life'],
        levels: [1, 2, 3, 4]
    },
    'LAP-C401S-WUSR': {
        module: 'VeSyncAirBypass',
        features: ['display', 'child_lock', 'night_light', 'timer', 'fan_speed', 'auto_mode', 'sleep_mode', 'filter_life'],
        levels: [1, 2, 3, 4]
    },
    'LAP-C401S-WAAA': {
        module: 'VeSyncAirBypass',
        features: ['display', 'child_lock', 'night_light', 'timer', 'fan_speed', 'auto_mode', 'sleep_mode', 'filter_life'],
        levels: [1, 2, 3, 4]
    },
    'LAP-C601S-WUS': {
        module: 'VeSyncAirBypass',
        features: ['display', 'child_lock', 'night_light', 'timer', 'fan_speed', 'auto_mode', 'sleep_mode', 'filter_life'],
        levels: [1, 2, 3, 4]
    },
    'LAP-C601S-WUSR': {
        module: 'VeSyncAirBypass',
        features: ['display', 'child_lock', 'night_light', 'timer', 'fan_speed', 'auto_mode', 'sleep_mode', 'filter_life'],
        levels: [1, 2, 3, 4]
    },
    'LAP-C601S-WEU': {
        module: 'VeSyncAirBypass',
        features: ['display', 'child_lock', 'night_light', 'timer', 'fan_speed', 'auto_mode', 'sleep_mode', 'filter_life'],
        levels: [1, 2, 3, 4]
    },
    'LAP-V102S-AASR': {
        module: 'VeSyncAirBaseV2',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer', 'fan_speed', 'auto_mode', 'filter_life'],
        levels: [1, 2, 3, 4]
    },
    'LAP-V102S-WUS': {
        module: 'VeSyncAirBaseV2',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer', 'fan_speed', 'auto_mode', 'filter_life'],
        levels: [1, 2, 3, 4]
    },
    'LAP-V102S-WEU': {
        module: 'VeSyncAirBaseV2',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer', 'fan_speed', 'auto_mode', 'filter_life'],
        levels: [1, 2, 3, 4]
    },
    'LAP-V102S-AUSR': {
        module: 'VeSyncAirBaseV2',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer', 'fan_speed', 'auto_mode', 'filter_life'],
        levels: [1, 2, 3, 4]
    },
    'LAP-V102S-WJP': {
        module: 'VeSyncAirBaseV2',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer', 'fan_speed', 'auto_mode', 'filter_life'],
        levels: [1, 2, 3, 4]
    },
    'LAP-V201S-AASR': {
        module: 'VeSyncAirBaseV2',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer', 'light_detection', 'fan_speed', 'auto_mode', 'filter_life'],
        levels: [1, 2, 3, 4]
    },
    'LAP-V201S-WJP': {
        module: 'VeSyncAirBaseV2',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer', 'light_detection', 'fan_speed', 'auto_mode', 'filter_life'],
        levels: [1, 2, 3, 4]
    },
    'LAP-V201S-WEU': {
        module: 'VeSyncAirBaseV2',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer', 'light_detection', 'fan_speed', 'auto_mode', 'filter_life'],
        levels: [1, 2, 3, 4]
    },
    'LAP-V201S-WUS': {
        module: 'VeSyncAirBaseV2',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer', 'light_detection', 'fan_speed', 'auto_mode', 'filter_life'],
        levels: [1, 2, 3, 4]
    },
    'LAP-V201-AUSR': {
        module: 'VeSyncAirBaseV2',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer', 'light_detection', 'fan_speed', 'auto_mode', 'filter_life'],
        levels: [1, 2, 3, 4]
    },
    'LAP-V201S-AUSR': {
        module: 'VeSyncAirBaseV2',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer', 'light_detection', 'fan_speed', 'auto_mode', 'filter_life'],
        levels: [1, 2, 3, 4]
    },
    'LAP-V201S-AEUR': {
        module: 'VeSyncAirBaseV2',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer', 'light_detection', 'fan_speed', 'auto_mode', 'filter_life'],
        levels: [1, 2, 3, 4]
    },
    'LAP-EL551S-AUS': {
        module: 'VeSyncAirBaseV2',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer', 'fan_rotate', 'fan_speed', 'auto_mode', 'filter_life'],
        levels: [1, 2, 3]
    },
    'LAP-EL551S-AEUR': {
        module: 'VeSyncAirBaseV2',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer', 'fan_rotate', 'fan_speed', 'auto_mode', 'filter_life'],
        levels: [1, 2, 3]
    },
    'LAP-EL551S-WEU': {
        module: 'VeSyncAirBaseV2',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer', 'fan_rotate', 'fan_speed', 'auto_mode', 'filter_life'],
        levels: [1, 2, 3]
    },
    'LAP-EL551S-WUS': {
        module: 'VeSyncAirBaseV2',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer', 'fan_rotate', 'fan_speed', 'auto_mode', 'filter_life'],
        levels: [1, 2, 3]
    },
    
    // LTF Series
    'LTF-F422S-KEU': {
        module: 'VeSyncTowerFan',
        features: ['display', 'child_lock', 'night_light', 'timer', 'fan_speeds', 'tower_modes'],
        levels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    },
    'LTF-F422S-WUSR': {
        module: 'VeSyncTowerFan',
        features: ['display', 'child_lock', 'night_light', 'timer', 'fan_speeds', 'tower_modes'],
        levels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    },
    'LTF-F422_WJP': {
        module: 'VeSyncTowerFan',
        features: ['display', 'child_lock', 'night_light', 'timer', 'fan_speeds', 'tower_modes'],
        levels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    },
    'LTF-F422S-WUS': {
        module: 'VeSyncTowerFan',
        features: ['display', 'child_lock', 'night_light', 'timer', 'fan_speeds', 'tower_modes'],
        levels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    },
    
    // Classic Series
    'Classic300S': {
        module: 'VeSyncHumidifier',
        features: ['display', 'humidity', 'mist', 'timer', 'auto_mode']
    },
    'Classic200S': {
        module: 'VeSyncHumid200S',
        features: ['display', 'humidity', 'mist', 'timer', 'auto_mode'],
        levels: [1, 2, 3]
    },
    
    // Dual Series
    'Dual200S': {
        module: 'VeSyncHumidifier',
        features: ['display', 'humidity', 'mist', 'timer', 'auto_mode']
    },
    
    // LUH Series
    'LUH-A601S-WUSB': {
        module: 'VeSyncWarmHumidifier',
        features: ['display', 'humidity', 'mist', 'timer', 'auto_mode', 'night_light']
    },
    'LUH-A601S-AUSW': {
        module: 'VeSyncWarmHumidifier',
        features: ['display', 'humidity', 'mist', 'warm', 'timer', 'auto_mode']
    },
    'LUH-D301S-WUSR': {
        module: 'VeSyncWarmHumidifier',
        features: ['display', 'humidity', 'mist', 'warm', 'timer', 'auto_mode']
    },
    'LUH-D301S-WJP': {
        module: 'VeSyncWarmHumidifier',
        features: ['display', 'humidity', 'mist', 'warm', 'timer', 'auto_mode']
    },
    'LUH-D301S-WEU': {
        module: 'VeSyncWarmHumidifier',
        features: ['display', 'humidity', 'mist', 'warm', 'timer', 'auto_mode']
    },
    'LUH-A602S-WUSR': {
        module: 'VeSyncWarmHumidifier',
        features: ['display', 'humidity', 'mist', 'warm', 'timer', 'auto_mode']
    },
    'LUH-A602S-WUS': {
        module: 'VeSyncWarmHumidifier',
        features: ['display', 'humidity', 'mist', 'warm', 'timer', 'auto_mode']
    },
    'LUH-A602S-WEUR': {
        module: 'VeSyncWarmHumidifier',
        features: ['display', 'humidity', 'mist', 'warm', 'timer', 'auto_mode']
    },
    'LUH-A602S-WEU': {
        module: 'VeSyncWarmHumidifier',
        features: ['display', 'humidity', 'mist', 'warm', 'timer', 'auto_mode']
    },
    'LUH-A602S-WJP': {
        module: 'VeSyncWarmHumidifier',
        features: ['display', 'humidity', 'mist', 'warm', 'timer', 'auto_mode']
    },
    'LUH-A602S-WUSC': {
        module: 'VeSyncWarmHumidifier',
        features: ['display', 'humidity', 'mist', 'warm', 'timer', 'auto_mode']
    },
    'LUH-O451S-WEU': {
        module: 'VeSyncWarmHumidifier',
        features: ['display', 'humidity', 'mist', 'warm', 'timer', 'auto_mode']
    },
    'LUH-O451S-WUS': {
        module: 'VeSyncWarmHumidifier',
        features: ['display', 'humidity', 'mist', 'warm', 'timer', 'auto_mode']
    },
    'LUH-O451S-WUSR': {
        module: 'VeSyncWarmHumidifier',
        features: ['display', 'humidity', 'mist', 'warm', 'timer', 'auto_mode']
    },
    'LUH-O601S-WUS': {
        module: 'VeSyncWarmHumidifier',
        features: ['display', 'humidity', 'mist', 'warm', 'timer', 'auto_mode']
    },
    'LUH-O601S-KUS': {
        module: 'VeSyncWarmHumidifier',
        features: ['display', 'humidity', 'mist', 'warm', 'timer', 'auto_mode']
    },
    'LUH-M101S-WUS': {
        module: 'VeSyncHumid1000S',
        features: ['display', 'humidity', 'mist', 'timer', 'auto_mode', 'night_light'],
        levels: [1, 2, 3, 4, 5, 6, 7, 8, 9]
    },
    'LUH-M101S-WEUR': {
        module: 'VeSyncHumid1000S',
        features: ['display', 'humidity', 'mist', 'timer', 'auto_mode', 'night_light'],
        levels: [1, 2, 3, 4, 5, 6, 7, 8, 9]
    },
    
    // LEH Series - Superior 6000S
    'LEH-S601S-WUS': {
        module: 'VeSyncSuperior6000S',
        features: ['display', 'humidity', 'mist', 'timer', 'auto_mode', 'drying', 'temperature'],
        levels: [1, 2, 3, 4, 5, 6, 7, 8, 9]
    },
    'LEH-S601S-WUSR': {
        module: 'VeSyncSuperior6000S',
        features: ['display', 'humidity', 'mist', 'timer', 'auto_mode', 'drying', 'temperature'],
        levels: [1, 2, 3, 4, 5, 6, 7, 8, 9]
    },
    
    // LV Series
    'LV-PUR131S': {
        module: 'VeSyncAir131',
        features: ['air_quality', 'display', 'child_lock', 'night_light', 'timer', 'fan_speed', 'auto_mode', 'filter_life'],
        levels: [1, 2, 3]
    },
    'LV-RH131S': {
        module: 'VeSyncAir131',
        features: ['display', 'child_lock', 'night_light', 'timer', 'fan_speed', 'filter_life'],
        levels: [1, 2, 3]
    }
}; 

/**
 * Base class for VeSync Fans
 */
export abstract class VeSyncFan extends VeSyncBaseDevice {
    protected details: {
        mode?: string;
        speed?: number;
        filter_life?: number | { percent: number };
        screen_status?: 'on' | 'off';
        child_lock?: boolean;
        air_quality?: string | number;
        air_quality_value?: number;
        pm1?: number;
        pm10?: number;
        aq_percent?: number;
        humidity?: number;
        mist_level?: number;
        warm_level?: number;
        warm_enabled?: boolean;
        [key: string]: any;
    } = {};
    protected mode_dict: Record<string, any> = {};
    protected speed_dict: Record<string, any> = {};
    protected _timer: number | { duration: number; action: string } | null = null;
    protected config: {
        module: 'VeSyncAirBypass' | 'VeSyncHumidifier' | 'VeSyncWarmHumidifier' | 'VeSyncTowerFan' | 'VeSyncAirBaseV2' | 'VeSyncSuperior6000S' | 'VeSyncHumid1000S' | 'VeSyncHumid200S' | 'VeSyncAir131';
        features: string[];
        levels?: number[];
    };

    constructor(details: Record<string, any>, manager: VeSync) {
        super(details, manager);
        this.details = details;
        this.config = fanConfig[this.deviceType] || { 
            module: 'VeSyncAirBypass', 
            features: [],
            levels: []
        };
    }

    /**
     * Check if feature is supported
     */
    hasFeature(feature: string): boolean {
        return this.config.features.includes(feature);
    }

    /**
     * Check if feature is supported in current mode
     */
    isFeatureSupportedInCurrentMode(feature: string): boolean {
        // First check if the feature is supported at all
        if (!this.hasFeature(feature)) {
            return false;
        }

        // Check mode-specific restrictions
        const currentMode = this.mode;

        // Some features are not supported in sleep mode
        if (currentMode === 'sleep') {
            // Display and child lock are not supported in sleep mode
            if (feature === 'display' || feature === 'child_lock') {
                return false;
            }
        }

        // Fan speed is only supported in manual mode for some devices
        if (feature === 'fan_speed' && this.deviceType.startsWith('LV-')) {
            return currentMode === 'manual';
        }

        // Auto mode is not supported on Core200S
        if (feature === 'auto_mode' && this.deviceType.includes('Core200S')) {
            return false;
        }

        // Feature is supported in current mode
        return true;
    }

    /**
     * Get maximum fan speed level
     */
    getMaxFanSpeed(): number {
        return this.config.levels ? Math.max(...this.config.levels) : 3;
    }

    /**
     * Get current mode
     */
    get mode(): string {
        return this.details.mode ?? '';
    }

    /**
     * Get current speed
     */
    get speed(): number {
        return this.details.speed ?? 0;
    }

    /**
     * Get filter life percentage
     */
    get filterLife(): number {
        // Handle different filter_life formats from different devices
        const filterLife = this.details.filter_life;
        
        // For Air131 devices, filter_life is an object with percent property
        if (typeof filterLife === 'object' && filterLife !== null && 'percent' in filterLife) {
            return filterLife.percent ?? 0;
        }
        
        // For other devices, filter_life is a direct number
        return typeof filterLife === 'number' ? filterLife : 0;
    }

    /**
     * Get screen status
     */
    get screenStatus(): 'on' | 'off' {
        return this.details.screen_status ?? 'off';
    }

    /**
     * Get child lock status
     */
    get childLock(): boolean {
        return this.details.child_lock ?? false;
    }

    /**
     * Get air quality level (if supported)
     */
    get airQualityLevel(): string | number {
        return this.details.air_quality ?? '';
    }

    /**
     * Get air quality (alias for airQualityLevel for backward compatibility)
     */
    get airQuality(): string | number {
        return this.airQualityLevel;
    }

    /**
     * Get air quality value - PM2.5 in μg/m³ (if supported)
     */
    get airQualityValue(): number {
        return this.details.air_quality_value ?? 0;
    }

    /**
     * Get PM1 value (if supported)
     */
    get pm1(): number {
        return this.details.pm1 ?? 0;
    }

    /**
     * Get PM10 value (if supported)
     */
    get pm10(): number {
        return this.details.pm10 ?? 0;
    }

    /**
     * Get air quality percentage (if supported)
     */
    get aqPercent(): number {
        return this.details.aq_percent ?? 0;
    }

    /**
     * Get humidity level (if supported)
     */
    get humidity(): number {
        return this.details.humidity ?? 0;
    }

    /**
     * Get mist level (if supported)
     */
    get mistLevel(): number {
        return this.details.mist_level ?? 0;
    }

    /**
     * Get warm level (if supported)
     */
    get warmLevel(): number {
        return this.details.warm_level ?? 0;
    }

    /**
     * Get timer status
     */
    get timer(): number | { duration: number; action: string } | null {
        return this._timer;
    }

    set timer(value: number | { duration: number; action: string } | null) {
        this._timer = value;
    }

    /**
     * Return formatted device info to stdout
     */
    display(): void {
        super.display();
        const info = [
            ['Mode: ', this.mode],
            ['Speed: ', this.speed],
            ['Filter Life: ', this.filterLife, '%']
        ];

        if (this.hasFeature('display')) {
            info.push(['Screen Status: ', this.screenStatus]);
        }
        if (this.hasFeature('child_lock')) {
            info.push(['Child Lock: ', this.childLock ? 'Enabled' : 'Disabled']);
        }
        if (this.hasFeature('air_quality')) {
            info.push(['Air Quality Level: ', this.airQualityLevel]);
            if (this.airQualityValue > 0) {
                info.push(['Air Quality Value: ', this.airQualityValue, ' μg/m³']);
            }
            if (this.pm1 > 0) {
                info.push(['PM1: ', this.pm1, ' μg/m³']);
            }
            if (this.pm10 > 0) {
                info.push(['PM10: ', this.pm10, ' μg/m³']);
            }
            if (this.aqPercent > 0) {
                info.push(['AQ Percent: ', this.aqPercent, '%']);
            }
        }
        if (this.hasFeature('humidity')) {
            info.push(['Humidity: ', this.humidity, '%']);
        }
        if (this.hasFeature('mist')) {
            info.push(['Mist Level: ', this.mistLevel]);
        }
        if (this.hasFeature('warm')) {
            info.push(['Warm Level: ', this.warmLevel]);
        }
        if (this.hasFeature('timer') && this.timer) {
            if (typeof this.timer === 'number') {
                info.push(['Timer: ', this.timer, 'hours']);
            } else {
                info.push(['Timer: ', this.timer.duration, 'seconds']);
                info.push(['Timer Action: ', this.timer.action]);
            }
        }

        for (const [key, value, unit = ''] of info) {
            logger.info(`${key.toString().padEnd(30, '.')} ${value}${unit}`);
        }
    }

    /**
     * Return JSON details for fan
     */
    displayJSON(): string {
        const baseInfo = JSON.parse(super.displayJSON());
        const details: Record<string, string> = {
            'Mode': this.mode,
            'Speed': this.speed.toString(),
            'Filter Life': this.filterLife.toString()
        };

        if (this.hasFeature('display')) {
            details['Screen Status'] = this.screenStatus;
        }
        if (this.hasFeature('child_lock')) {
            details['Child Lock'] = this.childLock ? 'Enabled' : 'Disabled';
        }
        if (this.hasFeature('air_quality')) {
            details['Air Quality Level'] = this.airQualityLevel.toString();
            if (this.airQualityValue > 0) {
                details['Air Quality Value'] = this.airQualityValue.toString();
            }
            if (this.pm1 > 0) {
                details['PM1'] = this.pm1.toString();
            }
            if (this.pm10 > 0) {
                details['PM10'] = this.pm10.toString();
            }
            if (this.aqPercent > 0) {
                details['AQ Percent'] = this.aqPercent.toString();
            }
        }
        if (this.hasFeature('humidity')) {
            details['Humidity'] = this.humidity.toString();
        }
        if (this.hasFeature('mist')) {
            details['Mist Level'] = this.mistLevel.toString();
        }
        if (this.hasFeature('warm')) {
            details['Warm Level'] = this.warmLevel.toString();
        }
        if (this.hasFeature('timer') && this.timer) {
            if (typeof this.timer === 'number') {
                details['Timer'] = this.timer.toString();
            } else {
                details['Timer'] = this.timer.duration.toString();
                details['Timer Action'] = this.timer.action;
            }
        }

        return JSON.stringify({
            ...baseInfo,
            ...details
        }, null, 4);
    }

    abstract getDetails(): Promise<Boolean>;
    abstract turnOn(): Promise<boolean>;
    abstract turnOff(): Promise<boolean>;
    abstract changeFanSpeed(speed: number): Promise<boolean>;
    abstract setMode(mode: string): Promise<boolean>;
}
