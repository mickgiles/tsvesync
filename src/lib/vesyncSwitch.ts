/**
 * VeSync Switch Classes
 */

import { VeSyncBaseDevice } from './vesyncBaseDevice';
import { VeSync } from './vesync';
import { logger } from './logger';

interface SwitchConfig {
    [key: string]: {
        module: string;
        features: string[];
    };
}

// Switch configuration
export const switchConfig: SwitchConfig = {
    'ESWL01': {
        module: 'VeSyncWallSwitch',
        features: []
    },
    'ESWD16': {
        module: 'VeSyncDimmerSwitch',
        features: ['dimmable']
    },
    'ESWL03': {
        module: 'VeSyncWallSwitch',
        features: []
    }
};

/**
 * Base class for VeSync Switches
 */
export abstract class VeSyncSwitch extends VeSyncBaseDevice {
    protected details: Record<string, any> = {};
    protected features: string[] = [];

    constructor(details: Record<string, any>, manager: VeSync) {
        super(details, manager);
        this.details = details;
        this.features = switchConfig[this.deviceType]?.features || [];
    }

    /**
     * Get active time of switch
     */
    get activeTime(): number {
        return this.details.active_time ?? 0;
    }

    /**
     * Return true if switch is dimmable
     */
    isDimmable(): boolean {
        return this.features.includes('dimmable');
    }

    /**
     * Return formatted device info to stdout
     */
    display(): void {
        super.display();
        const info = [
            ['Active Time:', this.activeTime]
        ];

        for (const [key, value] of info) {
            logger.info(`${key.toString().padEnd(30, '.')} ${value}`);
        }
    }

    /**
     * Return JSON details for switch
     */
    displayJSON(): string {
        const baseInfo = JSON.parse(super.displayJSON());
        return JSON.stringify({
            ...baseInfo,
            'Active Time': this.activeTime
        }, null, 4);
    }

    abstract getDetails(): Promise<void>;
    abstract getConfig(): Promise<void>;
    abstract turnOn(): Promise<boolean>;
    abstract turnOff(): Promise<boolean>;

    /**
     * Update device details
     */
    async update(): Promise<void> {
        await this.getDetails();
    }
} 