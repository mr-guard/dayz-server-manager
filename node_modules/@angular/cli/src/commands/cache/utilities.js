"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCacheConfig = exports.updateCacheConfig = void 0;
const core_1 = require("@angular-devkit/core");
const path_1 = require("path");
const workspace_schema_1 = require("../../../lib/config/workspace-schema");
function updateCacheConfig(workspace, key, value) {
    var _a, _b;
    var _c;
    const cli = ((_a = (_c = workspace.extensions)['cli']) !== null && _a !== void 0 ? _a : (_c['cli'] = {}));
    const cache = ((_b = cli['cache']) !== null && _b !== void 0 ? _b : (cli['cache'] = {}));
    cache[key] = value;
    return workspace.save();
}
exports.updateCacheConfig = updateCacheConfig;
function getCacheConfig(workspace) {
    if (!workspace) {
        throw new Error(`Cannot retrieve cache configuration as workspace is not defined.`);
    }
    const defaultSettings = {
        path: (0, path_1.resolve)(workspace.basePath, '.angular/cache'),
        environment: workspace_schema_1.Environment.Local,
        enabled: true,
    };
    const cliSetting = workspace.extensions['cli'];
    if (!cliSetting || !(0, core_1.isJsonObject)(cliSetting)) {
        return defaultSettings;
    }
    const cacheSettings = cliSetting['cache'];
    if (!(0, core_1.isJsonObject)(cacheSettings)) {
        return defaultSettings;
    }
    const { path = defaultSettings.path, environment = defaultSettings.environment, enabled = defaultSettings.enabled,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
     } = cacheSettings;
    return {
        path: (0, path_1.resolve)(workspace.basePath, path),
        environment,
        enabled,
    };
}
exports.getCacheConfig = getCacheConfig;
