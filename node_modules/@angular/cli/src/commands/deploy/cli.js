"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeployCommandModule = void 0;
const path_1 = require("path");
const architect_command_module_1 = require("../../command-builder/architect-command-module");
class DeployCommandModule extends architect_command_module_1.ArchitectCommandModule {
    constructor() {
        super(...arguments);
        // The below choices should be kept in sync with the list in https://angular.io/guide/deployment
        this.missingTargetChoices = [
            {
                name: 'Amazon S3',
                value: '@jefiozie/ngx-aws-deploy',
            },
            {
                name: 'Firebase',
                value: '@angular/fire',
            },
            {
                name: 'Netlify',
                value: '@netlify-builder/deploy',
            },
            {
                name: 'NPM',
                value: 'ngx-deploy-npm',
            },
            {
                name: 'GitHub Pages',
                value: 'angular-cli-ghpages',
            },
        ];
        this.multiTarget = false;
        this.command = 'deploy [project]';
        this.longDescriptionPath = (0, path_1.join)(__dirname, 'long-description.md');
        this.describe = 'Invokes the deploy builder for a specified project or for the default project in the workspace.';
    }
}
exports.DeployCommandModule = DeployCommandModule;
