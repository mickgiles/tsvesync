/**
 * VeSync Outlets
 */

import { VeSyncBaseDevice } from './vesyncBaseDevice';
import { VeSync } from './vesync';
import { Helpers } from './helpers';
import { logger } from './logger';

interface OutletConfig {
    [key: string]: {
        module: string;
        features: string[];
    };
}

// Outlet configuration
export const outletConfig: OutletConfig = {
    'wifi-switch-1.3': {
        module: 'VeSyncOutlet7A',
        features: ['energy']
    },
    'ESW03-USA': {
        module: 'VeSyncOutlet10A',
        features: ['energy']
    },
    'ESW01-EU': {
        module: 'VeSyncOutlet10A',
        features: ['energy']
    },
    'ESW15-USA': {
        module: 'VeSyncOutlet15A',
        features: ['energy', 'nightlight']
    },
    'ESO15-TB': {
        module: 'VeSyncOutdoorPlug',
        features: ['energy']
    }
};

/**
 * VeSync Outlet Base Class
 */
export abstract class VeSyncOutlet extends VeSyncBaseDevice {
    protected energy: Record<string, any>;
    protected details: Record<string, any>;
    protected features: string[];

    constructor(details: Record<string, any>, manager: VeSync) {
        super(details, manager);
        this.energy = {};
        this.details = details;
        this.features = outletConfig[this.deviceType]?.features || [];
    }

    /**
     * Get outlet details
     */
    async getDetails(): Promise<void> {
        logger.debug(`[${this.deviceName}] Getting outlet details`);
        const url = `/v1/${this.deviceType}/${this.deviceType}-${this.cid}/detail`;
        const [response] = await Helpers.callApi(
            url,
            'get',
            null,
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this.details = response.result;
            this.deviceStatus = response.result.deviceStatus;
            logger.debug(`[${this.deviceName}] Successfully retrieved outlet details`);
        } else {
            logger.error(`[${this.deviceName}] Failed to get outlet details: ${JSON.stringify(response)}`);
        }
    }

    /**
     * Update outlet energy data
     */
    async updateEnergy(): Promise<void> {
        if (!this.features.includes('energy')) {
            logger.debug(`[${this.deviceName}] Energy monitoring not supported`);
            return;
        }

        logger.debug(`[${this.deviceName}] Updating energy data`);
        const url = `/v1/${this.deviceType}/${this.deviceType}-${this.cid}/energy/detail`;
        const [response] = await Helpers.callApi(
            url,
            'get',
            null,
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this.energy = response.result;
            logger.debug(`[${this.deviceName}] Successfully updated energy data`);
        } else {
            logger.error(`[${this.deviceName}] Failed to update energy data: ${JSON.stringify(response)}`);
        }
    }

    /**
     * Get outlet energy usage
     */
    async getEnergyUsage(): Promise<Record<string, any>> {
        if (!this.features.includes('energy')) {
            logger.debug(`[${this.deviceName}] Energy monitoring not supported`);
            return {
                power: 'Not supported',
                voltage: 'Not supported',
                energy_today: 'Not supported',
                energy_week: 'Not supported',
                energy_month: 'Not supported',
                energy_year: 'Not supported'
            };
        }

        await this.updateEnergy();
        return {
            power: this.energy.power || 'Not available',
            voltage: this.energy.voltage || 'Not available',
            energy_today: this.energy.energyToday || 'Not available',
            energy_week: this.energy.energyWeek || 'Not available',
            energy_month: this.energy.energyMonth || 'Not available',
            energy_year: this.energy.energyYear || 'Not available'
        };
    }

    /**
     * Get outlet status
     */
    async getStatus(): Promise<string> {
        logger.debug(`[${this.deviceName}] Getting outlet status`);
        await this.getDetails();
        return this.deviceStatus;
    }

    /**
     * Get API prefix based on device type
     */
    private getApiPrefix(): string {
        if (this.deviceType === 'wifi-switch-1.3') {
            return `v1/device/${this.deviceType}-${this.cid}`;
        } else if (this.deviceType.startsWith('ESW15') || this.deviceType.startsWith('ESO15')) {
            return '15a/v1/device';
        } else if (this.deviceType.startsWith('ESW03') || this.deviceType.startsWith('ESW01')) {
            return '10a/v1/device';
        }
        return 'v1/device';
    }

    /**
     * Get weekly energy data
     */
    async getWeeklyEnergy(): Promise<void> {
        if (!this.features.includes('energy')) {
            logger.debug(`[${this.deviceName}] Energy monitoring not supported`);
            return;
        }

        logger.debug(`[${this.deviceName}] Getting weekly energy data`);
        const isLegacyDevice = this.deviceType === 'wifi-switch-1.3';
        const body = isLegacyDevice ? null : {
            ...Helpers.reqBody(this.manager, 'energyweek'),
            uuid: this.uuid
        };

        const [response] = await Helpers.callApi(
            isLegacyDevice ? `/${this.getApiPrefix()}/energy/week` : `/${this.getApiPrefix()}/energyweek`,
            isLegacyDevice ? 'get' : 'post',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this.energy.week = response.result;
            logger.debug(`[${this.deviceName}] Successfully retrieved weekly energy data`);
        } else {
            logger.error(`[${this.deviceName}] Failed to get weekly energy data: ${JSON.stringify(response)}`);
        }
    }

    /**
     * Get monthly energy data
     */
    async getMonthlyEnergy(): Promise<void> {
        if (!this.features.includes('energy')) {
            logger.debug(`[${this.deviceName}] Energy monitoring not supported`);
            return;
        }

        logger.debug(`[${this.deviceName}] Getting monthly energy data`);
        const isLegacyDevice = this.deviceType === 'wifi-switch-1.3';
        const body = isLegacyDevice ? null : {
            ...Helpers.reqBody(this.manager, 'energymonth'),
            uuid: this.uuid
        };

        const [response] = await Helpers.callApi(
            isLegacyDevice ? `/${this.getApiPrefix()}/energy/month` : `/${this.getApiPrefix()}/energymonth`,
            isLegacyDevice ? 'get' : 'post',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this.energy.month = response.result;
            logger.debug(`[${this.deviceName}] Successfully retrieved monthly energy data`);
        } else {
            logger.error(`[${this.deviceName}] Failed to get monthly energy data: ${JSON.stringify(response)}`);
        }
    }

    /**
     * Get yearly energy data
     */
    async getYearlyEnergy(): Promise<void> {
        if (!this.features.includes('energy')) {
            logger.debug(`[${this.deviceName}] Energy monitoring not supported`);
            return;
        }

        logger.debug(`[${this.deviceName}] Getting yearly energy data`);
        const isLegacyDevice = this.deviceType === 'wifi-switch-1.3';
        const body = isLegacyDevice ? null : {
            ...Helpers.reqBody(this.manager, 'energyyear'),
            uuid: this.uuid
        };

        const [response] = await Helpers.callApi(
            isLegacyDevice ? `/${this.getApiPrefix()}/energy/year` : `/${this.getApiPrefix()}/energyyear`,
            isLegacyDevice ? 'get' : 'post',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this.energy.year = response.result;
            logger.debug(`[${this.deviceName}] Successfully retrieved yearly energy data`);
        } else {
            logger.error(`[${this.deviceName}] Failed to get yearly energy data: ${JSON.stringify(response)}`);
        }
    }

    /**
     * Update outlet details and energy info
     */
    async update(): Promise<void> {
        logger.debug(`[${this.deviceName}] Updating outlet information`);
        await this.getDetails();
        if (this.features.includes('energy')) {
            await this.updateEnergy();
        }
        logger.debug(`[${this.deviceName}] Successfully updated outlet information`);
    }

    /**
     * Check if outlet has nightlight feature
     */
    hasNightlight(): boolean {
        return this.features.includes('nightlight');
    }

    /**
     * Turn outlet on
     */
    abstract turnOn(): Promise<boolean>;

    /**
     * Turn outlet off
     */
    abstract turnOff(): Promise<boolean>;
} 