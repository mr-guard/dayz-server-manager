"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArchitectCommandModule = void 0;
const config_1 = require("../utilities/config");
const memoize_1 = require("../utilities/memoize");
const architect_base_command_module_1 = require("./architect-base-command-module");
const command_module_1 = require("./command-module");
class ArchitectCommandModule extends architect_base_command_module_1.ArchitectBaseCommandModule {
    async builder(argv) {
        const project = this.getArchitectProject();
        const { jsonHelp, getYargsCompletions, help } = this.context.args.options;
        const localYargs = argv
            .positional('project', {
            describe: 'The name of the project to build. Can be an application or a library.',
            type: 'string',
            // Hide choices from JSON help so that we don't display them in AIO.
            choices: jsonHelp ? undefined : this.getProjectChoices(),
        })
            .option('configuration', {
            describe: `One or more named builder configurations as a comma-separated ` +
                `list as specified in the "configurations" section in angular.json.\n` +
                `The builder uses the named configurations to run the given target.\n` +
                `For more information, see https://angular.io/guide/workspace-config#alternate-build-configurations.`,
            alias: 'c',
            type: 'string',
            // Show only in when using --help and auto completion because otherwise comma seperated configuration values will be invalid.
            // Also, hide choices from JSON help so that we don't display them in AIO.
            choices: (getYargsCompletions || help) && !jsonHelp && project
                ? this.getConfigurationChoices(project)
                : undefined,
        })
            .strict();
        if (!project) {
            return localYargs;
        }
        const target = this.getArchitectTarget();
        const schemaOptions = await this.getArchitectTargetOptions({
            project,
            target,
        });
        return this.addSchemaOptionsToCommand(localYargs, schemaOptions);
    }
    async run(options) {
        const target = this.getArchitectTarget();
        const { configuration = '', project, ...architectOptions } = options;
        if (!project) {
            // This runs each target sequentially.
            // Running them in parallel would jumble the log messages.
            let result = 0;
            const projectNames = this.getProjectNamesByTarget(target);
            if (!projectNames) {
                return this.onMissingTarget('Cannot determine project or target for command.');
            }
            for (const project of projectNames) {
                result |= await this.runSingleTarget({ configuration, target, project }, architectOptions);
            }
            return result;
        }
        else {
            return await this.runSingleTarget({ configuration, target, project }, architectOptions);
        }
    }
    getArchitectProject() {
        const { options, positional } = this.context.args;
        const [, projectName] = positional;
        if (projectName) {
            return projectName;
        }
        // Yargs allows positional args to be used as flags.
        if (typeof options['project'] === 'string') {
            return options['project'];
        }
        const target = this.getArchitectTarget();
        const projectFromTarget = this.getProjectNamesByTarget(target);
        return (projectFromTarget === null || projectFromTarget === void 0 ? void 0 : projectFromTarget.length) ? projectFromTarget[0] : undefined;
    }
    getProjectNamesByTarget(target) {
        const workspace = this.getWorkspaceOrThrow();
        const allProjectsForTargetName = [];
        for (const [name, project] of workspace.projects) {
            if (project.targets.has(target)) {
                allProjectsForTargetName.push(name);
            }
        }
        if (allProjectsForTargetName.length === 0) {
            return undefined;
        }
        if (this.multiTarget) {
            // For multi target commands, we always list all projects that have the target.
            return allProjectsForTargetName;
        }
        else {
            if (allProjectsForTargetName.length === 1) {
                return allProjectsForTargetName;
            }
            const maybeProject = (0, config_1.getProjectByCwd)(workspace);
            if (maybeProject) {
                return allProjectsForTargetName.includes(maybeProject) ? [maybeProject] : undefined;
            }
            const { getYargsCompletions, help } = this.context.args.options;
            if (!getYargsCompletions && !help) {
                // Only issue the below error when not in help / completion mode.
                throw new command_module_1.CommandModuleError('Cannot determine project for command.\n' +
                    'This is a multi-project workspace and more than one project supports this command. ' +
                    `Run "ng ${this.command}" to execute the command for a specific project or change the current ` +
                    'working directory to a project directory.\n\n' +
                    `Available projects are:\n${allProjectsForTargetName
                        .sort()
                        .map((p) => `- ${p}`)
                        .join('\n')}`);
            }
        }
        return undefined;
    }
    /** @returns a sorted list of project names to be used for auto completion. */
    getProjectChoices() {
        const { workspace } = this.context;
        return workspace ? [...workspace.projects.keys()].sort() : undefined;
    }
    /** @returns a sorted list of configuration names to be used for auto completion. */
    getConfigurationChoices(project) {
        var _a, _b;
        const projectDefinition = (_a = this.context.workspace) === null || _a === void 0 ? void 0 : _a.projects.get(project);
        if (!projectDefinition) {
            return undefined;
        }
        const target = this.getArchitectTarget();
        const configurations = (_b = projectDefinition.targets.get(target)) === null || _b === void 0 ? void 0 : _b.configurations;
        return configurations ? Object.keys(configurations).sort() : undefined;
    }
}
__decorate([
    memoize_1.memoize
], ArchitectCommandModule.prototype, "getProjectNamesByTarget", null);
exports.ArchitectCommandModule = ArchitectCommandModule;
