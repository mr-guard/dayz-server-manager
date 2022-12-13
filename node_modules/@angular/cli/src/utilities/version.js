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
const fs_1 = require("fs");
const path_1 = require("path");
// Same structure as used in framework packages
class Version {
    constructor(full) {
        this.full = full;
        const [major, minor, patch] = full.split('-', 1)[0].split('.', 3);
        this.major = major;
        this.minor = minor;
        this.patch = patch;
    }
}
// TODO: Convert this to use build-time version stamping after flipping the build script to use bazel
// export const VERSION = new Version('0.0.0-PLACEHOLDER');
exports.VERSION = new Version(JSON.parse((0, fs_1.readFileSync)((0, path_1.resolve)(__dirname, '../../package.json'), 'utf-8')).version);
