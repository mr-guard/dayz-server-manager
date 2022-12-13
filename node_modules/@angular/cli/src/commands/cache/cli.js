"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheCommandModule = void 0;
const path_1 = require("path");
const command_module_1 = require("../../command-builder/command-module");
const command_1 = require("../../command-builder/utilities/command");
const cli_1 = require("./clean/cli");
const cli_2 = require("./info/cli");
const cli_3 = require("./settings/cli");
class CacheCommandModule extends command_module_1.CommandModule {
    constructor() {
        super(...arguments);
        this.command = 'cache';
        this.describe = 'Configure persistent disk cache and retrieve cache statistics.';
        this.longDescriptionPath = (0, path_1.join)(__dirname, 'long-description.md');
        this.scope = command_module_1.CommandScope.In;
    }
    builder(localYargs) {
        const subcommands = [
            cli_3.CacheEnableModule,
            cli_3.CacheDisableModule,
            cli_1.CacheCleanModule,
            cli_2.CacheInfoCommandModule,
        ].sort();
        for (const module of subcommands) {
            localYargs = (0, command_1.addCommandModuleToYargs)(localYargs, module, this.context);
        }
        return localYargs.demandCommand(1, command_1.demandCommandFailureMessage).strict();
    }
    run(_options) { }
}
exports.CacheCommandModule = CacheCommandModule;
