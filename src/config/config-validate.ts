import 'reflect-metadata';
import * as cron from 'cron-parser';
import { Config, EventTypeEnum } from './config';

export const parseConfigFileContent = (fileContent: string): any => {

    if (fileContent) {

        // remove comments
        const stripped = fileContent
            .replace(/(\/\*\*(.|\n)*?\*\/)|(\/\/(.*))/g, '');

        try {
            return JSON.parse(stripped);
        } catch (e) {
            throw new Error(`Parsing config failed: ${e.message}`);
        }

    }
    throw new Error('Config file is empty');
};

export const validateConfig = (config: Config): string[] => {

    const errors: string[] = [];
    const refConfig = new Config();

    // check required fields
    for (const configKey in refConfig) {
        if (Reflect.getMetadata('config-required', refConfig, configKey)) {
            if (config[configKey] === null || config[configKey] === undefined) {
                errors.push(`Missing required entry: ${configKey}`);
            }
        }
    }

    // check required serverCfg fields
    if (config.serverCfg) {
        for (const configKey in refConfig.serverCfg) {
            if (Reflect.getMetadata('config-required', refConfig.serverCfg, configKey)) {
                if (config.serverCfg[configKey] === null || config.serverCfg[configKey] === undefined) {
                    errors.push(`Missing required entry in serverCfg: ${configKey}`);
                }
            }
        }
    }

    // check types
    for (const configKey in config) {
        if (typeof config[configKey] !== typeof refConfig[configKey]) {
            errors.push(`Wrong config type: ${configKey}, allowed ${typeof refConfig[configKey]}`);
        } else if (typeof config[configKey] === 'number') {
            const range: [number, number] | undefined = Reflect.getMetadata('config-range', refConfig, configKey);
            if (range && (config[configKey] < range[0] || config[configKey] > range[1])) {
                errors.push(`Config out of range: ${configKey}, allowed [${range[0]},${range[1]}]`);
            }
        }
    }

    // check types for severCfg
    if (config.serverCfg) {
        for (const configKey in config.serverCfg) {
            if (typeof config.serverCfg[configKey] !== typeof refConfig.serverCfg[configKey]) {
                errors.push(`Wrong config type: serverCfg.${configKey}, allowed ${typeof refConfig.serverCfg[configKey]}`);
            } else if (typeof config.serverCfg[configKey] === 'number') {
                const range: [number, number] | undefined = Reflect.getMetadata('config-range', refConfig.serverCfg, configKey);
                if (range && (config[configKey] < range[0] || config[configKey] > range[1])) {
                    errors.push(`Config out of range: serverCfg.${configKey}, allowed [${range[0]},${range[1]}]`);
                }
            }
        }
    }

    // check events
    if (config.events?.length) {
        for (const event of config.events) {
            if (!event.name) {
                errors.push('All events must specify a name');
            }

            if (!Object.keys(EventTypeEnum).includes(event.type)) {
                errors.push(`Event (${event.name}) has unknown event type: ${event.type}, expected one of ${JSON.stringify(Object.keys(EventTypeEnum))}`);
            }

            if (event.cron) {
                try {
                    if (!cron.parseExpression(event.cron).hasNext()) {
                        errors.push(`Event (${event.name}) has no upcoming invocation`);
                    }
                } catch (e) {
                    errors.push(`Event (${event.name}) has invalid cron format: ${e.message}`);
                }
            } else {
                errors.push(`Event (${event.name}) is missing a cron format`);
            }

        }
    }

    return errors;
};
