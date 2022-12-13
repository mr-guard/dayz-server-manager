"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscribeToWorkflow = void 0;
const core_1 = require("@angular-devkit/core");
const color_1 = require("../../utilities/color");
function subscribeToWorkflow(workflow, logger) {
    const files = new Set();
    let error = false;
    let logs = [];
    const reporterSubscription = workflow.reporter.subscribe((event) => {
        // Strip leading slash to prevent confusion.
        const eventPath = event.path.charAt(0) === '/' ? event.path.substring(1) : event.path;
        switch (event.kind) {
            case 'error':
                error = true;
                const desc = event.description == 'alreadyExist' ? 'already exists' : 'does not exist';
                logger.error(`ERROR! ${eventPath} ${desc}.`);
                break;
            case 'update':
                logs.push(core_1.tags.oneLine `
              ${color_1.colors.cyan('UPDATE')} ${eventPath} (${event.content.length} bytes)
            `);
                files.add(eventPath);
                break;
            case 'create':
                logs.push(core_1.tags.oneLine `
              ${color_1.colors.green('CREATE')} ${eventPath} (${event.content.length} bytes)
            `);
                files.add(eventPath);
                break;
            case 'delete':
                logs.push(`${color_1.colors.yellow('DELETE')} ${eventPath}`);
                files.add(eventPath);
                break;
            case 'rename':
                const eventToPath = event.to.charAt(0) === '/' ? event.to.substring(1) : event.to;
                logs.push(`${color_1.colors.blue('RENAME')} ${eventPath} => ${eventToPath}`);
                files.add(eventPath);
                break;
        }
    });
    const lifecycleSubscription = workflow.lifeCycle.subscribe((event) => {
        if (event.kind == 'end' || event.kind == 'post-tasks-start') {
            if (!error) {
                // Output the logging queue, no error happened.
                logs.forEach((log) => logger.info(log));
            }
            logs = [];
            error = false;
        }
    });
    return {
        files,
        error,
        unsubscribe: () => {
            reporterSubscription.unsubscribe();
            lifecycleSubscription.unsubscribe();
        },
    };
}
exports.subscribeToWorkflow = subscribeToWorkflow;
