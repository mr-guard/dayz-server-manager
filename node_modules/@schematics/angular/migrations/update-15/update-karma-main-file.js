"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const ts = __importStar(require("../../third_party/github.com/Microsoft/TypeScript/lib/typescript"));
const utility_1 = require("../../utility");
const workspace_1 = require("../../utility/workspace");
const workspace_models_1 = require("../../utility/workspace-models");
function default_1() {
    return async (host) => {
        for (const file of await findTestMainFiles(host)) {
            updateTestFile(host, file);
        }
    };
}
exports.default = default_1;
async function findTestMainFiles(host) {
    const testFiles = new Set();
    const workspace = await (0, utility_1.readWorkspace)(host);
    // find all test.ts files.
    for (const project of workspace.projects.values()) {
        for (const target of project.targets.values()) {
            if (target.builder !== workspace_models_1.Builders.Karma) {
                continue;
            }
            for (const [, options] of (0, workspace_1.allTargetOptions)(target)) {
                if (typeof options.main === 'string') {
                    testFiles.add(options.main);
                }
            }
        }
    }
    return testFiles;
}
function updateTestFile(host, file) {
    const content = host.readText(file);
    if (!content.includes('require.context')) {
        return;
    }
    const sourceFile = ts.createSourceFile(file, content.replace(/^\uFEFF/, ''), ts.ScriptTarget.Latest, true);
    const usedVariableNames = new Set();
    const recorder = host.beginUpdate(sourceFile.fileName);
    ts.forEachChild(sourceFile, (node) => {
        var _a, _b;
        if (ts.isVariableStatement(node)) {
            const variableDeclaration = node.declarationList.declarations[0];
            if ((_a = ts.getModifiers(node)) === null || _a === void 0 ? void 0 : _a.some((m) => m.kind === ts.SyntaxKind.DeclareKeyword)) {
                // `declare const require`
                if (variableDeclaration.name.getText() !== 'require') {
                    return;
                }
            }
            else {
                // `const context = require.context('./', true, /\.spec\.ts$/);`
                if (!((_b = variableDeclaration.initializer) === null || _b === void 0 ? void 0 : _b.getText().startsWith('require.context'))) {
                    return;
                }
                // add variable name as used.
                usedVariableNames.add(variableDeclaration.name.getText());
            }
            // Delete node.
            recorder.remove(node.getFullStart(), node.getFullWidth());
        }
        if (usedVariableNames.size &&
            ts.isExpressionStatement(node) && // context.keys().map(context);
            ts.isCallExpression(node.expression) && // context.keys().map(context);
            ts.isPropertyAccessExpression(node.expression.expression) && // context.keys().map
            ts.isCallExpression(node.expression.expression.expression) && // context.keys()
            ts.isPropertyAccessExpression(node.expression.expression.expression.expression) && // context.keys
            ts.isIdentifier(node.expression.expression.expression.expression.expression) && // context
            usedVariableNames.has(node.expression.expression.expression.expression.expression.getText())) {
            // `context.keys().map(context);`
            // `context.keys().forEach(context);`
            recorder.remove(node.getFullStart(), node.getFullWidth());
        }
    });
    host.commitUpdate(recorder);
}
