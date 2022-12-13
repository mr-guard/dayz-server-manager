"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsCommandModule = void 0;
const node_path_1 = require("node:path");
const command_module_1 = require("../../command-builder/command-module");
const command_1 = require("../../command-builder/utilities/command");
const cli_1 = require("./info/cli");
const cli_2 = require("./settings/cli");
class AnalyticsCommandModule extends command_module_1.CommandModule {
    constructor() {
        super(...arguments);
        this.command = 'analytics';
        this.describe = 'Configures the gathering of Angular CLI usage metrics.';
        this.longDescriptionPath = (0, node_path_1.join)(__dirname, 'long-description.md');
    }
    builder(localYargs) {
        const subcommands = [
            cli_1.AnalyticsInfoCommandModule,
            cli_2.AnalyticsDisableModule,
            cli_2.AnalyticsEnableModule,
            cli_2.AnalyticsPromptModule,
        ].sort(); // sort by class name.
        for (const module of subcommands) {
            localYargs = (0, command_1.addCommandModuleToYargs)(localYargs, module, this.context);
        }
        return localYargs.demandCommand(1, command_1.demandCommandFailureMessage).strict();
    }
    run(_options) { }
}
exports.AnalyticsCommandModule = AnalyticsCommandModule;
