"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheInfoCommandModule = void 0;
const core_1 = require("@angular-devkit/core");
const fs_1 = require("fs");
const path_1 = require("path");
const command_module_1 = require("../../../command-builder/command-module");
const environment_options_1 = require("../../../utilities/environment-options");
const utilities_1 = require("../utilities");
class CacheInfoCommandModule extends command_module_1.CommandModule {
    constructor() {
        super(...arguments);
        this.command = 'info';
        this.describe = 'Prints persistent disk cache configuration and statistics in the console.';
        this.scope = command_module_1.CommandScope.In;
    }
    builder(localYargs) {
        return localYargs.strict();
    }
    async run() {
        const { path, environment, enabled } = (0, utilities_1.getCacheConfig)(this.context.workspace);
        this.context.logger.info(core_1.tags.stripIndents `
      Enabled: ${enabled ? 'yes' : 'no'}
      Environment: ${environment}
      Path: ${path}
      Size on disk: ${await this.getSizeOfDirectory(path)}
      Effective status on current machine: ${this.effectiveEnabledStatus() ? 'enabled' : 'disabled'}
    `);
    }
    async getSizeOfDirectory(path) {
        const directoriesStack = [path];
        let size = 0;
        while (directoriesStack.length) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const dirPath = directoriesStack.pop();
            let entries = [];
            try {
                entries = await fs_1.promises.readdir(dirPath);
            }
            catch { }
            for (const entry of entries) {
                const entryPath = (0, path_1.join)(dirPath, entry);
                const stats = await fs_1.promises.stat(entryPath);
                if (stats.isDirectory()) {
                    directoriesStack.push(entryPath);
                }
                size += stats.size;
            }
        }
        return this.formatSize(size);
    }
    formatSize(size) {
        if (size <= 0) {
            return '0 bytes';
        }
        const abbreviations = ['bytes', 'kB', 'MB', 'GB'];
        const index = Math.floor(Math.log(size) / Math.log(1024));
        const roundedSize = size / Math.pow(1024, index);
        // bytes don't have a fraction
        const fractionDigits = index === 0 ? 0 : 2;
        return `${roundedSize.toFixed(fractionDigits)} ${abbreviations[index]}`;
    }
    effectiveEnabledStatus() {
        const { enabled, environment } = (0, utilities_1.getCacheConfig)(this.context.workspace);
        if (enabled) {
            switch (environment) {
                case 'ci':
                    return environment_options_1.isCI;
                case 'local':
                    return !environment_options_1.isCI;
            }
        }
        return enabled;
    }
}
exports.CacheInfoCommandModule = CacheInfoCommandModule;
