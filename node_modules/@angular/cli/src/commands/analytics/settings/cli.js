"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsPromptModule = exports.AnalyticsEnableModule = exports.AnalyticsDisableModule = void 0;
const analytics_1 = require("../../../analytics/analytics");
const command_module_1 = require("../../../command-builder/command-module");
class AnalyticsSettingModule extends command_module_1.CommandModule {
    builder(localYargs) {
        return localYargs
            .option('global', {
            description: `Configure analytics gathering and reporting globally in the caller's home directory.`,
            alias: ['g'],
            type: 'boolean',
            default: false,
        })
            .strict();
    }
}
class AnalyticsDisableModule extends AnalyticsSettingModule {
    constructor() {
        super(...arguments);
        this.command = 'disable';
        this.aliases = 'off';
        this.describe = 'Disables analytics gathering and reporting for the user.';
    }
    async run({ global }) {
        await (0, analytics_1.setAnalyticsConfig)(global, false);
        process.stderr.write(await (0, analytics_1.getAnalyticsInfoString)(this.context));
    }
}
exports.AnalyticsDisableModule = AnalyticsDisableModule;
class AnalyticsEnableModule extends AnalyticsSettingModule {
    constructor() {
        super(...arguments);
        this.command = 'enable';
        this.aliases = 'on';
        this.describe = 'Enables analytics gathering and reporting for the user.';
    }
    async run({ global }) {
        await (0, analytics_1.setAnalyticsConfig)(global, true);
        process.stderr.write(await (0, analytics_1.getAnalyticsInfoString)(this.context));
    }
}
exports.AnalyticsEnableModule = AnalyticsEnableModule;
class AnalyticsPromptModule extends AnalyticsSettingModule {
    constructor() {
        super(...arguments);
        this.command = 'prompt';
        this.describe = 'Prompts the user to set the analytics gathering status interactively.';
    }
    async run({ global }) {
        await (0, analytics_1.promptAnalytics)(this.context, global, true);
    }
}
exports.AnalyticsPromptModule = AnalyticsPromptModule;
