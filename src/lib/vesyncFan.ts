/**
 * VeSync Fan Classes
 */

import { VeSyncBaseDevice } from './vesyncBaseDevice';
import { VeSync } from './vesync';
import { logger } from './logger';

interface FanConfig {
    [key: string]: {
        module: 'VeSyncAirBypass' | 'VeSyncHumidifier' | 'VeSyncWarmHumidifier' | 'VeSyncTowerFan' | 'VeSyncAirBaseV2';
        features: string[];
        levels?: number[];
    };
}

// Fan configuration
export const fanConfig: FanConfig = {
    // Core Series
    'Core200S': {
        module: 'VeSyncAirBypass',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer', 'fan_speed', 'auto_mode'],
        levels: [1, 2, 3]
    },
    'Core300S': {
        module: 'VeSyncAirBypass',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer'],
        levels: [1, 2, 3, 4]
    },
    'Core400S': {
        module: 'VeSyncAirBypass',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer'],
        levels: [1, 2, 3, 4]
    },
    'Core600S': {
        module: 'VeSyncAirBypass',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer'],
        levels: [1, 2, 3, 4]
    },
    
    // LAP Series
    'LAP-C201S-AUSR': {
        module: 'VeSyncAirBypass',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer'],
        levels: [1, 2, 3]
    },
    'LAP-C202S-WUSR': {
        module: 'VeSyncAirBypass',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer'],
        levels: [1, 2, 3]
    },
    'LAP-C301S-WJP': {
        module: 'VeSyncAirBypass',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer'],
        levels: [1, 2, 3, 4]
    },
    'LAP-C302S-WUSB': {
        module: 'VeSyncAirBypass',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer'],
        levels: [1, 2, 3, 4]
    },
    'LAP-C301S-WAAA': {
        module: 'VeSyncAirBypass',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer'],
        levels: [1, 2, 3, 4]
    },
    'LAP-C401S-WJP': {
        module: 'VeSyncAirBypass',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer'],
        levels: [1, 2, 3, 4]
    },
    'LAP-C401S-WUSR': {
        module: 'VeSyncAirBypass',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer'],
        levels: [1, 2, 3, 4]
    },
    'LAP-C401S-WAAA': {
        module: 'VeSyncAirBypass',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer'],
        levels: [1, 2, 3, 4]
    },
    'LAP-C601S-WUS': {
        module: 'VeSyncAirBypass',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer'],
        levels: [1, 2, 3, 4]
    },
    'LAP-C601S-WUSR': {
        module: 'VeSyncAirBypass',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer'],
        levels: [1, 2, 3, 4]
    },
    'LAP-C601S-WEU': {
        module: 'VeSyncAirBypass',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer'],
        levels: [1, 2, 3, 4]
    },
    'LAP-V102S-AASR': {
        module: 'VeSyncAirBaseV2',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer'],
        levels: [1, 2, 3, 4]
    },
    'LAP-V102S-WUS': {
        module: 'VeSyncAirBaseV2',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer'],
        levels: [1, 2, 3, 4]
    },
    'LAP-V102S-WEU': {
        module: 'VeSyncAirBaseV2',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer'],
        levels: [1, 2, 3, 4]
    },
    'LAP-V102S-AUSR': {
        module: 'VeSyncAirBaseV2',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer'],
        levels: [1, 2, 3, 4]
    },
    'LAP-V102S-WJP': {
        module: 'VeSyncAirBaseV2',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer'],
        levels: [1, 2, 3, 4]
    },
    'LAP-V201S-AASR': {
        module: 'VeSyncAirBaseV2',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer', 'light_detection'],
        levels: [1, 2, 3, 4]
    },
    'LAP-V201S-WJP': {
        module: 'VeSyncAirBaseV2',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer', 'light_detection'],
        levels: [1, 2, 3, 4]
    },
    'LAP-V201S-WEU': {
        module: 'VeSyncAirBaseV2',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer', 'light_detection'],
        levels: [1, 2, 3, 4]
    },
    'LAP-V201S-WUS': {
        module: 'VeSyncAirBaseV2',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer', 'light_detection'],
        levels: [1, 2, 3, 4]
    },
    'LAP-V201-AUSR': {
        module: 'VeSyncAirBaseV2',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer', 'light_detection'],
        levels: [1, 2, 3, 4]
    },
    'LAP-V201S-AUSR': {
        module: 'VeSyncAirBaseV2',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer', 'light_detection'],
        levels: [1, 2, 3, 4]
    },
    'LAP-V201S-AEUR': {
        module: 'VeSyncAirBaseV2',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer', 'light_detection'],
        levels: [1, 2, 3, 4]
    },
    'LAP-EL551S-AUS': {
        module: 'VeSyncAirBaseV2',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer', 'fan_rotate'],
        levels: [1, 2, 3]
    },
    'LAP-EL551S-AEUR': {
        module: 'VeSyncAirBaseV2',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer', 'fan_rotate'],
        levels: [1, 2, 3]
    },
    'LAP-EL551S-WEU': {
        module: 'VeSyncAirBaseV2',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer', 'fan_rotate'],
        levels: [1, 2, 3]
    },
    'LAP-EL551S-WUS': {
        module: 'VeSyncAirBaseV2',
        features: ['display', 'child_lock', 'night_light', 'air_quality', 'timer', 'fan_rotate'],
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
        module: 'VeSyncHumidifier',
        features: ['display', 'humidity', 'mist', 'timer', 'auto_mode']
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
        module: 'VeSyncWarmHumidifier',
        features: ['display', 'humidity', 'mist', 'warm', 'timer', 'auto_mode']
    },
    'LUH-M101S-WEUR': {
        module: 'VeSyncWarmHumidifier',
        features: ['display', 'humidity', 'mist', 'warm', 'timer', 'auto_mode']
    },
    
    // LEH Series
    'LEH-S601S-WUS': {
        module: 'VeSyncWarmHumidifier',
        features: ['display', 'humidity', 'mist', 'warm', 'timer', 'auto_mode', 'drying']
    },
    'LEH-S601S-WUSR': {
        module: 'VeSyncWarmHumidifier',
        features: ['display', 'humidity', 'mist', 'warm', 'timer', 'auto_mode', 'drying']
    },
    
    // LV Series
    'LV-PUR131S': {
        module: 'VeSyncAirBypass',
        features: ['air_quality', 'display', 'child_lock', 'night_light', 'timer'],
        levels: [1, 2, 3]
    },
    'LV-RH131S': {
        module: 'VeSyncAirBypass',
        features: ['display', 'child_lock', 'night_light', 'timer'],
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
        filter_life?: number;
        screen_status?: 'on' | 'off';
        child_lock?: boolean;
        air_quality?: string;
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
        module: 'VeSyncAirBypass' | 'VeSyncHumidifier' | 'VeSyncWarmHumidifier' | 'VeSyncTowerFan' | 'VeSyncAirBaseV2';
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
        return this.details.filter_life ?? 0;
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
     * Get air quality (if supported)
     */
    get airQuality(): string {
        return this.details.air_quality ?? '';
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
            info.push(['Air Quality: ', this.airQuality]);
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
            details['Air Quality'] = this.airQuality;
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
