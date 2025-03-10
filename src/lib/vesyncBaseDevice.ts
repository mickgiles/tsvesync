/**
 * Base class for VeSync devices
 */

import { VeSync } from './vesync';
import { logger } from './logger';
import { Helpers } from './helpers';

export abstract class VeSyncBaseDevice {
    protected manager: VeSync;
    protected config: Record<string, any> = {};

    cid: string;
    deviceName: string;
    deviceStatus: string;
    deviceType: string;
    deviceRegion: string;
    uuid: string;
    configModule: string;
    macId: string;
    deviceCategory: string;
    connectionStatus: string;

    constructor(details: Record<string, any>, manager: VeSync) {
        this.manager = manager;
        this.cid = details.cid || '';
        this.deviceName = details.deviceName || '';
        this.deviceStatus = details.deviceStatus || 'off';
        this.deviceType = details.deviceType || '';
        this.deviceRegion = details.deviceRegion || '';
        this.uuid = details.uuid || '';
        this.configModule = details.configModule || '';
        this.macId = details.macId || '';
        this.deviceCategory = details.deviceCategory || '';
        this.connectionStatus = details.connectionStatus || 'offline';
    }

    /**
     * Return formatted device info to stdout
     */
    display(): void {
        logger.info(`Device Name: ${this.deviceName}`);
        logger.info(`Status: ${this.deviceStatus}`);
        logger.info(`Device Type: ${this.deviceType}`);
        logger.info(`Connection: ${this.connectionStatus}`);
        logger.info(`Version: ${this.config.current_firmware_version || 'Unknown'}`);
    }

    /**
     * Return JSON details for device
     */
    displayJSON(): string {
        return JSON.stringify({
            'Device Name': this.deviceName,
            'Status': this.deviceStatus,
            'Device Type': this.deviceType,
            'Connection': this.connectionStatus,
            'Version': this.config.current_firmware_version || 'Unknown'
        }, null, 4);
    }

    /**
     * Check API response for errors
     */
    protected checkResponse(response: [any, number], method: string): boolean {
        const [data, status] = response;
        
        // Check HTTP status
        if (status !== 200) {
            this.logError(method, `Invalid HTTP status: ${status}`);
            return false;
        }

        // Check API response
        if (!data) {
            this.logError(method, 'No response data');
            return false;
        }

        // Check error code - code 0 indicates success
        if (data.code === 0) {
            return true;
        }
        
        const msg = data.msg || 'Unknown error';
        this.logError(method, `Error code ${data.code}: ${msg}`);
        return false;
    }

    /**
     * Log error with context
     */
    protected logError(method: string, error: any): void {
        const errorMsg = error?.message || error;
        logger.error(`[${this.deviceName}] ${method}: ${errorMsg}`);
        
        // Log additional error details if available
        if (error?.response?.data) {
            const responseData = error.response.data;
            const msg = responseData.msg || responseData.message || JSON.stringify(responseData);
            logger.error(`Response: ${msg}`);
        }
    }

    /**
     * Get device details
     */
    abstract getDetails(): Promise<Boolean>;

    /**
     * Update device details
     */
    async update(): Promise<Boolean> {
        return await this.getDetails();
    }

    /**
     * Call API with proper headers
     */
    protected async callApi(
        endpoint: string,
        method: string,
        data: any = null,
        headers: Record<string, string> = {}
    ): Promise<[any, number]> {
        return await Helpers.callApi(endpoint, method, data, headers, this.manager);
    }
} 