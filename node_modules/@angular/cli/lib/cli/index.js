"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VERSION = void 0;
const core_1 = require("@angular-devkit/core");
const util_1 = require("util");
const command_module_1 = require("../../src/command-builder/command-module");
const command_runner_1 = require("../../src/command-builder/command-runner");
const color_1 = require("../../src/utilities/color");
const environment_options_1 = require("../../src/utilities/environment-options");
const log_file_1 = require("../../src/utilities/log-file");
var version_1 = require("../../src/utilities/version");
Object.defineProperty(exports, "VERSION", { enumerable: true, get: function () { return version_1.VERSION; } });
const MIN_NODEJS_VERISON = [14, 15];
/* eslint-disable no-console */
async function default_1(options) {
    // This node version check ensures that the requirements of the project instance of the CLI are met
    const [major, minor] = process.versions.node.split('.').map((part) => Number(part));
    if (major < MIN_NODEJS_VERISON[0] ||
        (major === MIN_NODEJS_VERISON[0] && minor < MIN_NODEJS_VERISON[1])) {
        process.stderr.write(`Node.js version ${process.version} detected.\n` +
            `The Angular CLI requires a minimum of v${MIN_NODEJS_VERISON[0]}.${MIN_NODEJS_VERISON[1]}.\n\n` +
            'Please update your Node.js version or visit https://nodejs.org/ for additional instructions.\n');
        return 3;
    }
    const colorLevels = {
        info: (s) => s,
        debug: (s) => s,
        warn: (s) => color_1.colors.bold.yellow(s),
        error: (s) => color_1.colors.bold.red(s),
        fatal: (s) => color_1.colors.bold.red(s),
    };
    const logger = new core_1.logging.IndentLogger('cli-main-logger');
    const logInfo = console.log;
    const logError = console.error;
    const loggerFinished = logger.forEach((entry) => {
        if (!environment_options_1.ngDebug && entry.level === 'debug') {
            return;
        }
        const color = color_1.colors.enabled ? colorLevels[entry.level] : color_1.removeColor;
        const message = color(entry.message);
        switch (entry.level) {
            case 'warn':
            case 'fatal':
            case 'error':
                logError(message);
                break;
            default:
                logInfo(message);
                break;
        }
    });
    // Redirect console to logger
    console.info = console.log = function (...args) {
        logger.info((0, util_1.format)(...args));
    };
    console.warn = function (...args) {
        logger.warn((0, util_1.format)(...args));
    };
    console.error = function (...args) {
        logger.error((0, util_1.format)(...args));
    };
    try {
        return await (0, command_runner_1.runCommand)(options.cliArgs, logger);
    }
    catch (err) {
        if (err instanceof command_module_1.CommandModuleError) {
            logger.fatal(`Error: ${err.message}`);
        }
        else if (err instanceof Error) {
            try {
                const logPath = (0, log_file_1.writeErrorToLogFile)(err);
                logger.fatal(`An unhandled exception occurred: ${err.message}\n` +
                    `See "${logPath}" for further details.`);
            }
            catch (e) {
                logger.fatal(`An unhandled exception occurred: ${err.message}\n` +
                    `Fatal error writing debug log file: ${e}`);
                if (err.stack) {
                    logger.fatal(err.stack);
                }
            }
            return 127;
        }
        else if (typeof err === 'string') {
            logger.fatal(err);
        }
        else if (typeof err === 'number') {
            // Log nothing.
        }
        else {
            logger.fatal(`An unexpected error occurred: ${err}`);
        }
        return 1;
    }
    finally {
        logger.complete();
        await loggerFinished;
    }
}
exports.default = default_1;
