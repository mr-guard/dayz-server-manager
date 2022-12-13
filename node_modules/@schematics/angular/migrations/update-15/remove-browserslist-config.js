"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_BROWSERS = void 0;
const core_1 = require("@angular-devkit/core");
const validBrowserslistConfigFilenames = new Set(['browserslist', '.browserslistrc']);
exports.DEFAULT_BROWSERS = [
    'last 1 Chrome version',
    'last 1 Firefox version',
    'last 2 Edge major versions',
    'last 2 Safari major versions',
    'last 2 iOS major versions',
    'Firefox ESR',
];
function* visit(directory) {
    for (const path of directory.subfiles) {
        if (validBrowserslistConfigFilenames.has(path)) {
            yield (0, core_1.join)(directory.path, path);
        }
    }
    for (const path of directory.subdirs) {
        if (path === 'node_modules') {
            continue;
        }
        yield* visit(directory.dir(path));
    }
}
function default_1() {
    return async (tree, { logger }) => {
        let browserslist;
        try {
            browserslist = (await Promise.resolve().then(() => __importStar(require('browserslist')))).default;
        }
        catch {
            logger.warn('Skipping migration because the "browserslist" package could not be loaded.');
            return;
        }
        // Set the defaults to match the defaults in build-angular.
        browserslist.defaults = exports.DEFAULT_BROWSERS;
        const defaultSupportedBrowsers = new Set(browserslist(exports.DEFAULT_BROWSERS));
        const es5Browsers = new Set(browserslist(['supports es6-module']));
        for (const path of visit(tree.root)) {
            const { defaults: browsersListConfig, ...otherConfigs } = browserslist.parseConfig(tree.readText(path));
            if (Object.keys(otherConfigs).length) {
                // The config contains additional sections.
                continue;
            }
            const browserslistInProject = browserslist(
            // Exclude from the list ES5 browsers which are not supported.
            browsersListConfig.map((s) => `${s} and supports es6-module`), {
                ignoreUnknownVersions: true,
            });
            if (defaultSupportedBrowsers.size !== browserslistInProject.length) {
                continue;
            }
            const shouldDelete = browserslistInProject.every((browser) => defaultSupportedBrowsers.has(browser));
            if (shouldDelete) {
                // All browsers are the same as the default config.
                // Delete file as it's redundant.
                tree.delete(path);
            }
        }
    };
}
exports.default = default_1;
