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
    'ESW10-USA': {
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
    async getDetails(): Promise<Boolean> {
        logger.debug(`[${this.deviceName}] Getting outlet details`);
        
        const body = {
            ...Helpers.reqBody(this.manager, 'devicedetail'),
            uuid: this.uuid
        };

        let url: string;
        if (this.deviceType === 'wifi-switch-1.3') {
            url = '/v1/device/' + this.cid + '/detail';
        } else if (this.deviceType.startsWith('ESO15')) {
            url = '/outdoorsocket15a/v1/device/devicedetail';
        } else if (this.deviceType.startsWith('ESW15')) {
            url = '/15a/v1/device/devicedetail';
        } else if (this.deviceType.startsWith('ESW03') || this.deviceType.startsWith('ESW01') || this.deviceType.startsWith('ESW10')) {
            url = '/10a/v1/device/devicedetail';
        } else {
            url = '/v1/device/devicedetail';
        }

        const [response, statusCode] = await this.callApi(
            url,
            this.deviceType === 'wifi-switch-1.3' ? 'get' : 'post',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (!response) {
            logger.debug(`[${this.deviceName}] No response received from API`);
            return false;
        }

        // Handle error responses
        if (response.error) {
            logger.error(`[${this.deviceName}] Failed to get outlet details for ${url}: ${JSON.stringify(response)}`);
            return false;
        }

        // Handle successful responses
        if (response.code === 0) {
            this.details = response;

            // Handle outdoor plugs with subdevices
            if (response.subDevices) {
                const subDevice = response.subDevices.find((dev: any) => {
                    // Match by name (primary identifier)
                    if (dev.subDeviceName === this.deviceName) {
                        return true;
                    }

                    // Match by subDeviceNo if available
                    if ('subDeviceNo' in this && (this as any).subDeviceNo === dev.subDeviceNo) {
                        return true;
                    }

                    // Match by cid/uuid if available (cid might be in format parentCid_subDeviceNo)
                    if (this.cid && this.cid.includes('_')) {
                        const [_, subId] = this.cid.split('_');
                        if (subId && dev.subDeviceNo === parseInt(subId)) {
                            return true;
                        }
                    }

                    return false;
                });

                if (subDevice) {
                    this.deviceStatus = subDevice.subDeviceStatus;
                    logger.debug(`[${this.deviceName}] Successfully retrieved sub-device status: ${this.deviceStatus}`);
                    return true;
                }
            }

            // Handle regular devices
            if (response.deviceStatus !== undefined) {
                this.deviceStatus = response.deviceStatus;
            } else if (response.status !== undefined) {
                this.deviceStatus = response.status;
            } else if (response.power !== undefined) {
                this.deviceStatus = response.power === 'on' ? 'on' : 'off';
            } else {
                logger.debug(`[${this.deviceName}] Device status not found in response: ${JSON.stringify(response)}`);
                return false;
            }
            logger.debug(`[${this.deviceName}] Successfully retrieved outlet details`);
            return true;
        } else {
            logger.debug(`[${this.deviceName}] Failed to get outlet details: ${JSON.stringify(response)}`);
            return false;
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
        
        // Different endpoints for different device types
        let url: string;
        if (this.deviceType === 'wifi-switch-1.3') {
            url = `/v1/device/${this.deviceType}-${this.cid}/energy/detail`;
        } else if (this.deviceType.startsWith('ESO15')) {
            url = '/outdoorsocket15a/v1/device/energy';
        } else if (this.deviceType.startsWith('ESW15')) {
            url = '/15a/v1/device/energy';
        } else if (this.deviceType.startsWith('ESW03') || this.deviceType.startsWith('ESW01') || this.deviceType.startsWith('ESW10')) {
            url = '/10a/v1/device/energy';
        } else {
            url = '/v1/device/energy';
        }

        const body = this.deviceType === 'wifi-switch-1.3' ? null : {
            ...Helpers.reqBody(this.manager, 'energy'),
            uuid: this.uuid
        };

        const [response] = await this.callApi(
            url,
            this.deviceType === 'wifi-switch-1.3' ? 'get' : 'post',
            body,
            Helpers.reqHeaders(this.manager)
        );

        // Handle different response formats
        if (response?.code === 0 && response.result) {
            this.energy = response.result;
            logger.info(`[${this.deviceName}] Successfully updated energy data`);
        } else if (response?.code === 0) {
            // Some devices return data directly in response
            this.energy = {
                power: response.power || '0',
                voltage: response.voltage || '0',
                energy: response.energy || '0',
                energyToday: response.energy || '0',
                energyWeek: response.energy || '0',
                energyMonth: response.energy || '0',
                energyYear: response.energy || '0'
            };
            logger.info(`[${this.deviceName}] Successfully updated energy data`);
        } else {
            // For error responses, set defaults but don't log as error
            this.energy = {
                power: '0',
                voltage: '0',
                energy: '0',
                energyToday: '0',
                energyWeek: '0',
                energyMonth: '0',
                energyYear: '0'
            };
            logger.debug(`[${this.deviceName}] Failed to update energy data: ${JSON.stringify(response)}`);
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
            power: this.energy.power || '0',
            voltage: this.energy.voltage || '0',
            energy_today: this.energy.energyToday || '0',
            energy_week: this.energy.energyWeek || '0',
            energy_month: this.energy.energyMonth || '0',
            energy_year: this.energy.energyYear || '0'
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
        } else if (this.deviceType.startsWith('ESW03') || this.deviceType.startsWith('ESW01') || this.deviceType.startsWith('ESW10')) {
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

        const [response] = await this.callApi(
            isLegacyDevice ? `/${this.getApiPrefix()}/energy/week` : `/${this.getApiPrefix()}/energyweek`,
            isLegacyDevice ? 'get' : 'post',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this.energy.week = response.result || response.energyWeek || '0';
            logger.debug(`[${this.deviceName}] Successfully retrieved weekly energy data`);
        } else {
            this.energy.week = '0';
            logger.debug(`[${this.deviceName}] Failed to get weekly energy data: ${JSON.stringify(response)}`);
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

        const [response] = await this.callApi(
            isLegacyDevice ? `/${this.getApiPrefix()}/energy/month` : `/${this.getApiPrefix()}/energymonth`,
            isLegacyDevice ? 'get' : 'post',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this.energy.month = response.result || response.energyMonth || '0';
            logger.debug(`[${this.deviceName}] Successfully retrieved monthly energy data`);
        } else {
            this.energy.month = '0';
            logger.debug(`[${this.deviceName}] Failed to get monthly energy data: ${JSON.stringify(response)}`);
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

        const [response] = await this.callApi(
            isLegacyDevice ? `/${this.getApiPrefix()}/energy/year` : `/${this.getApiPrefix()}/energyyear`,
            isLegacyDevice ? 'get' : 'post',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this.energy.year = response.result || response.energyYear || '0';
            logger.debug(`[${this.deviceName}] Successfully retrieved yearly energy data`);
        } else {
            this.energy.year = '0';
            logger.debug(`[${this.deviceName}] Failed to get yearly energy data: ${JSON.stringify(response)}`);
        }
    }

    /**
     * Update outlet details and energy info
     */
    async update(): Promise<Boolean> {
        logger.debug(`[${this.deviceName}] Updating outlet information`);
        const success = await this.getDetails();
        if (success && this.features.includes('energy')) {
            await this.updateEnergy();
        }
        logger.info(`[${this.deviceName}] Successfully updated outlet information`);
        return success;
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