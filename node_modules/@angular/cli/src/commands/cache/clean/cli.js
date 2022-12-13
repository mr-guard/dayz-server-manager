"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheCleanModule = void 0;
const fs_1 = require("fs");
const command_module_1 = require("../../../command-builder/command-module");
const utilities_1 = require("../utilities");
class CacheCleanModule extends command_module_1.CommandModule {
    constructor() {
        super(...arguments);
        this.command = 'clean';
        this.describe = 'Deletes persistent disk cache from disk.';
        this.scope = command_module_1.CommandScope.In;
    }
    builder(localYargs) {
        return localYargs.strict();
    }
    run() {
        const { path } = (0, utilities_1.getCacheConfig)(this.context.workspace);
        return fs_1.promises.rm(path, {
            force: true,
            recursive: true,
            maxRetries: 3,
        });
    }
}
exports.CacheCleanModule = CacheCleanModule;
