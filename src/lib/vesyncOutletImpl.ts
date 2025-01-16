/**
 * VeSync Outlet Implementations
 */

import { VeSyncOutlet } from './vesyncOutlet';
import { VeSync } from './vesync';
import { Helpers } from './helpers';
import { logger } from './logger';

/**
 * VeSync 7A Outlet
 */
export class VeSyncOutlet7A extends VeSyncOutlet {
    constructor(details: Record<string, any>, manager: VeSync) {
        super(details, manager);
    }

    /**
     * Turn outlet on
     */
    async turnOn(): Promise<boolean> {
        logger.debug(`[${this.deviceName}] Turning outlet on`);
        const url = `/v1/wifi-switch-1.3/${this.cid}/status/on`;
        const [response, statusCode] = await this.callApi(
            url,
            'put',
            {},
            Helpers.reqHeaders(this.manager)
        );

        if (statusCode === 200) {
            this.deviceStatus = 'on';
            logger.info(`[${this.deviceName}] Successfully turned outlet on`);
            return true;
        }
        logger.error(`[${this.deviceName}] Failed to turn outlet on: ${JSON.stringify(response)}`);
        return false;
    }

    /**
     * Turn outlet off
     */
    async turnOff(): Promise<boolean> {
        logger.debug(`[${this.deviceName}] Turning outlet off`);
        const url = `/v1/wifi-switch-1.3/${this.cid}/status/off`;
        const [response, statusCode] = await this.callApi(
            url,
            'put',
            {},
            Helpers.reqHeaders(this.manager)
        );

        if (statusCode === 200) {
            this.deviceStatus = 'off';
            logger.info(`[${this.deviceName}] Successfully turned outlet off`);
            return true;
        }
        logger.error(`[${this.deviceName}] Failed to turn outlet off: ${JSON.stringify(response)}`);
        return false;
    }
}

/**
 * VeSync 10A Outlet
 */
export class VeSyncOutlet10A extends VeSyncOutlet {
    constructor(details: Record<string, any>, manager: VeSync) {
        super(details, manager);
    }

    /**
     * Turn outlet on
     */
    async turnOn(): Promise<boolean> {
        logger.debug(`[${this.deviceName}] Turning outlet on`);
        const body = {
            ...Helpers.reqBody(this.manager, 'devicestatus'),
            uuid: this.uuid,
            status: 'on'
        };

        const [response] = await this.callApi(
            '/10a/v1/device/devicestatus',
            'put',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this.deviceStatus = 'on';
            logger.info(`[${this.deviceName}] Successfully turned outlet on`);
            return true;
        }
        logger.error(`[${this.deviceName}] Failed to turn outlet on: ${JSON.stringify(response)}`);
        return false;
    }

    /**
     * Turn outlet off
     */
    async turnOff(): Promise<boolean> {
        logger.debug(`[${this.deviceName}] Turning outlet off`);
        const body = {
            ...Helpers.reqBody(this.manager, 'devicestatus'),
            uuid: this.uuid,
            status: 'off'
        };

        const [response] = await this.callApi(
            '/10a/v1/device/devicestatus',
            'put',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this.deviceStatus = 'off';
            logger.info(`[${this.deviceName}] Successfully turned outlet off`);
            return true;
        }
        logger.error(`[${this.deviceName}] Failed to turn outlet off: ${JSON.stringify(response)}`);
        return false;
    }
}

/**
 * VeSync 15A Outlet
 */
export class VeSyncOutlet15A extends VeSyncOutlet {
    constructor(details: Record<string, any>, manager: VeSync) {
        super(details, manager);
    }

    /**
     * Turn outlet on
     */
    async turnOn(): Promise<boolean> {
        logger.debug(`[${this.deviceName}] Turning outlet on`);
        const body = {
            ...Helpers.reqBody(this.manager, 'devicestatus'),
            uuid: this.uuid,
            status: 'on'
        };

        const [response] = await this.callApi(
            '/15a/v1/device/devicestatus',
            'put',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this.deviceStatus = 'on';
            logger.info(`[${this.deviceName}] Successfully turned outlet on`);
            return true;
        }
        logger.error(`[${this.deviceName}] Failed to turn outlet on: ${JSON.stringify(response)}`);
        return false;
    }

    /**
     * Turn outlet off
     */
    async turnOff(): Promise<boolean> {
        logger.debug(`[${this.deviceName}] Turning outlet off`);
        const body = {
            ...Helpers.reqBody(this.manager, 'devicestatus'),
            uuid: this.uuid,
            status: 'off'
        };

        const [response] = await this.callApi(
            '/15a/v1/device/devicestatus',
            'put',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this.deviceStatus = 'off';
            logger.info(`[${this.deviceName}] Successfully turned outlet off`);
            return true;
        }
        logger.error(`[${this.deviceName}] Failed to turn outlet off: ${JSON.stringify(response)}`);
        return false;
    }

    /**
     * Turn on nightlight
     */
    async turnOnNightlight(): Promise<boolean> {
        if (!this.hasNightlight()) {
            logger.error(`[${this.deviceName}] Nightlight feature not supported`);
            return false;
        }

        logger.debug(`[${this.deviceName}] Turning nightlight on`);
        const body = {
            ...Helpers.reqBody(this.manager, 'devicestatus'),
            uuid: this.uuid,
            mode: 'auto'
        };

        const [response] = await this.callApi(
            '/15a/v1/device/nightlightstatus',
            'put',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this.details.nightLightStatus = 'on';
            logger.info(`[${this.deviceName}] Successfully turned nightlight on`);
            return true;
        }
        logger.error(`[${this.deviceName}] Failed to turn nightlight on: ${JSON.stringify(response)}`);
        return false;
    }

    /**
     * Turn off nightlight
     */
    async turnOffNightlight(): Promise<boolean> {
        if (!this.hasNightlight()) {
            logger.error(`[${this.deviceName}] Nightlight feature not supported`);
            return false;
        }

        logger.debug(`[${this.deviceName}] Turning nightlight off`);
        const body = {
            ...Helpers.reqBody(this.manager, 'devicestatus'),
            uuid: this.uuid,
            mode: 'manual'
        };

        const [response] = await this.callApi(
            '/15a/v1/device/nightlightstatus',
            'put',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this.details.nightLightStatus = 'off';
            logger.info(`[${this.deviceName}] Successfully turned nightlight off`);
            return true;
        }
        logger.error(`[${this.deviceName}] Failed to turn nightlight off: ${JSON.stringify(response)}`);
        return false;
    }
}

/**
 * VeSync Outdoor Plug
 */
export class VeSyncOutdoorPlug extends VeSyncOutlet {
    public subDeviceNo?: number;
    public isSubDevice: boolean;

    constructor(details: Record<string, any>, manager: VeSync) {
        super(details, manager);
        this.isSubDevice = details.isSubDevice || false;
        this.subDeviceNo = details.subDeviceNo;
    }

    /**
     * Turn outlet on
     */
    async turnOn(): Promise<boolean> {
        logger.debug(`[${this.deviceName}] Turning outlet on`);
        const body = {
            ...Helpers.reqBody(this.manager, 'devicestatus'),
            uuid: this.uuid,
            status: 'on',
            switchNo: this.subDeviceNo
        };

        const [response] = await this.callApi(
            '/outdoorsocket15a/v1/device/devicestatus',
            'put',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this.deviceStatus = 'on';
            logger.info(`[${this.deviceName}] Successfully turned outlet on`);
            return true;
        }
        logger.error(`[${this.deviceName}] Failed to turn outlet on: ${JSON.stringify(response)}`);
        return false;
    }

    /**
     * Turn outlet off
     */
    async turnOff(): Promise<boolean> {
        logger.debug(`[${this.deviceName}] Turning outlet off`);
        const body = {
            ...Helpers.reqBody(this.manager, 'devicestatus'),
            uuid: this.uuid,
            status: 'off',
            switchNo: this.subDeviceNo
        };

        const [response] = await this.callApi(
            '/outdoorsocket15a/v1/device/devicestatus',
            'put',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this.deviceStatus = 'off';
            logger.info(`[${this.deviceName}] Successfully turned outlet off`);
            return true;
        }
        logger.error(`[${this.deviceName}] Failed to turn outlet off: ${JSON.stringify(response)}`);
        return false;
    }
}

// Export outlet modules dictionary
export const outletModules: Record<string, new (details: Record<string, any>, manager: VeSync) => VeSyncOutlet> = {
    'wifi-switch-1.3': VeSyncOutlet7A,
    'ESW03-USA': VeSyncOutlet10A,
    'ESW01-EU': VeSyncOutlet10A,
    'ESW10-USA': VeSyncOutlet10A,
    'ESW15-USA': VeSyncOutlet15A,
    'ESO15-TB': VeSyncOutdoorPlug
}; 