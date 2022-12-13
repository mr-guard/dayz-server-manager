"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompletionCommandModule = void 0;
const path_1 = require("path");
const yargs_1 = __importDefault(require("yargs"));
const command_module_1 = require("../../command-builder/command-module");
const command_1 = require("../../command-builder/utilities/command");
const color_1 = require("../../utilities/color");
const completion_1 = require("../../utilities/completion");
const error_1 = require("../../utilities/error");
class CompletionCommandModule extends command_module_1.CommandModule {
    constructor() {
        super(...arguments);
        this.command = 'completion';
        this.describe = 'Set up Angular CLI autocompletion for your terminal.';
        this.longDescriptionPath = (0, path_1.join)(__dirname, 'long-description.md');
    }
    builder(localYargs) {
        return (0, command_1.addCommandModuleToYargs)(localYargs, CompletionScriptCommandModule, this.context);
    }
    async run() {
        let rcFile;
        try {
            rcFile = await (0, completion_1.initializeAutocomplete)();
        }
        catch (err) {
            (0, error_1.assertIsError)(err);
            this.context.logger.error(err.message);
            return 1;
        }
        this.context.logger.info(`
Appended \`source <(ng completion script)\` to \`${rcFile}\`. Restart your terminal or run the following to autocomplete \`ng\` commands:

    ${color_1.colors.yellow('source <(ng completion script)')}
      `.trim());
        if ((await (0, completion_1.hasGlobalCliInstall)()) === false) {
            this.context.logger.warn('Setup completed successfully, but there does not seem to be a global install of the' +
                ' Angular CLI. For autocompletion to work, the CLI will need to be on your `$PATH`, which' +
                ' is typically done with the `-g` flag in `npm install -g @angular/cli`.' +
                '\n\n' +
                'For more information, see https://angular.io/cli/completion#global-install');
        }
        return 0;
    }
}
exports.CompletionCommandModule = CompletionCommandModule;
class CompletionScriptCommandModule extends command_module_1.CommandModule {
    constructor() {
        super(...arguments);
        this.command = 'script';
        this.describe = 'Generate a bash and zsh real-time type-ahead autocompletion script.';
        this.longDescriptionPath = undefined;
    }
    builder(localYargs) {
        return localYargs;
    }
    run() {
        yargs_1.default.showCompletionScript();
    }
}
