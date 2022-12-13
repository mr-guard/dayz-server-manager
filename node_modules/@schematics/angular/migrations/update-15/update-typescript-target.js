"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const json_file_1 = require("../../utility/json-file");
const workspace_1 = require("../../utility/workspace");
const workspace_models_1 = require("../../utility/workspace-models");
function default_1() {
    return async (host, context) => {
        // Workspace level tsconfig
        updateTarget(host, 'tsconfig.json');
        const workspace = await (0, workspace_1.getWorkspace)(host);
        // Find all tsconfig which are refereces used by builders
        for (const [, project] of workspace.projects) {
            for (const [targetName, target] of project.targets) {
                // Update all other known CLI builders that use a tsconfig
                const tsConfigs = [target.options || {}, ...Object.values(target.configurations || {})]
                    .filter((opt) => typeof (opt === null || opt === void 0 ? void 0 : opt.tsConfig) === 'string')
                    .map((opt) => opt.tsConfig);
                const uniqueTsConfigs = new Set(tsConfigs);
                for (const tsConfig of uniqueTsConfigs) {
                    if (host.exists(tsConfig)) {
                        continue;
                    }
                    uniqueTsConfigs.delete(tsConfig);
                    context.logger.warn(`'${tsConfig}' referenced in the '${targetName}' target does not exist.`);
                }
                if (!uniqueTsConfigs.size) {
                    continue;
                }
                switch (target.builder) {
                    case workspace_models_1.Builders.Server:
                    case workspace_models_1.Builders.Karma:
                    case workspace_models_1.Builders.Browser:
                    case workspace_models_1.Builders.NgPackagr:
                        for (const tsConfig of uniqueTsConfigs) {
                            removeOrUpdateTarget(host, tsConfig);
                        }
                        break;
                }
            }
        }
    };
}
exports.default = default_1;
function removeOrUpdateTarget(host, tsConfigPath) {
    const json = new json_file_1.JSONFile(host, tsConfigPath);
    if (typeof json.get(['extends']) === 'string') {
        json.remove(['compilerOptions', 'target']);
    }
    else {
        updateTarget(host, tsConfigPath);
    }
}
const ESNEXT_ES2022_REGEXP = /^es(?:next|2022)$/i;
function updateTarget(host, tsConfigPath) {
    const json = new json_file_1.JSONFile(host, tsConfigPath);
    const jsonPath = ['compilerOptions'];
    const compilerOptions = json.get(jsonPath);
    if (compilerOptions && typeof compilerOptions === 'object') {
        const { target } = compilerOptions;
        if (typeof target === 'string' && !ESNEXT_ES2022_REGEXP.test(target)) {
            json.modify(jsonPath, {
                ...compilerOptions,
                'target': 'ES2022',
                'useDefineForClassFields': false,
            });
        }
    }
}
