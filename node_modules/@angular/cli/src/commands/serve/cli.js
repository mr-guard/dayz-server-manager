"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServeCommandModule = void 0;
const architect_command_module_1 = require("../../command-builder/architect-command-module");
class ServeCommandModule extends architect_command_module_1.ArchitectCommandModule {
    constructor() {
        super(...arguments);
        this.multiTarget = false;
        this.command = 'serve [project]';
        this.aliases = ['s'];
        this.describe = 'Builds and serves your application, rebuilding on file changes.';
    }
}
exports.ServeCommandModule = ServeCommandModule;
