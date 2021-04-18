import 'reflect-metadata';
import * as cron from 'cron-parser';
import { Config, EventTypeEnum } from './config';

export const validateConfig = (config: Config): string[] => {

    const errors: string[] = [];
    const refConfig = new Config();

    // check required fields
    for (const configKey in refConfig) {
        if (Reflect.getMetadata('config-required', refConfig, configKey)) {
            if (!config[configKey]) {
                errors.push(`Missing required entry: ${configKey}`);
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

    // check events
    if (config.events?.length) {
        for (const event of config.events) {
            if (!event.name) {
                errors.push('All events must specify a name');
            }

            if (!Object.keys(EventTypeEnum).includes(event.type)) {
                errors.push(`Event (${event.name}) has unknown event type: ${event.type}, expected one of ${JSON.stringify(Object.keys(EventTypeEnum))}`);
            }

            if (!event.cron) {
                errors.push(`Event (${event.name}) is missing a cron format`);
            }

            try {
                cron.parseExpression(event.cron);
            } catch (e) {
                errors.push(`Event (${event.name}) has invalid cron format: ${e.message}`);
            }
        }
    }

    return errors;
};
