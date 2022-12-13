"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtractI18nCommandModule = void 0;
const architect_command_module_1 = require("../../command-builder/architect-command-module");
class ExtractI18nCommandModule extends architect_command_module_1.ArchitectCommandModule {
    constructor() {
        super(...arguments);
        this.multiTarget = false;
        this.command = 'extract-i18n [project]';
        this.describe = 'Extracts i18n messages from source code.';
    }
}
exports.ExtractI18nCommandModule = ExtractI18nCommandModule;
