"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.E2eCommandModule = void 0;
const architect_command_module_1 = require("../../command-builder/architect-command-module");
class E2eCommandModule extends architect_command_module_1.ArchitectCommandModule {
    constructor() {
        super(...arguments);
        this.missingTargetChoices = [
            {
                name: 'Cypress',
                value: '@cypress/schematic',
            },
            {
                name: 'Nightwatch',
                value: '@nightwatch/schematics',
            },
            {
                name: 'WebdriverIO',
                value: '@wdio/schematics',
            },
        ];
        this.multiTarget = true;
        this.command = 'e2e [project]';
        this.aliases = ['e'];
        this.describe = 'Builds and serves an Angular application, then runs end-to-end tests.';
    }
}
exports.E2eCommandModule = E2eCommandModule;
