"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const workspace_1 = require("../../utility/workspace");
const workspace_models_1 = require("../../utility/workspace-models");
function default_1() {
    return (0, workspace_1.updateWorkspace)((workspace) => {
        var _a;
        for (const project of workspace.projects.values()) {
            for (const target of project.targets.values()) {
                if (target.builder !== workspace_models_1.Builders.Server) {
                    continue;
                }
                for (const [name, options] of (0, workspace_1.allTargetOptions)(target)) {
                    delete options.bundleDependencies;
                    if (name === 'development') {
                        (_a = options.vendorChunk) !== null && _a !== void 0 ? _a : (options.vendorChunk = true);
                    }
                }
            }
        }
    });
}
exports.default = default_1;
