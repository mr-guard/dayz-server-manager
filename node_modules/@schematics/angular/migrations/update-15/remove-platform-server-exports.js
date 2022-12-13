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
function* visit(directory) {
    for (const path of directory.subfiles) {
        if (path.endsWith('.ts') && !path.endsWith('.d.ts')) {
            const entry = directory.file(path);
            if (entry) {
                const content = entry.content;
                if (content.includes('@angular/platform-server') && content.includes('renderModule')) {
                    const source = ts.createSourceFile(entry.path, content.toString().replace(/^\uFEFF/, ''), ts.ScriptTarget.Latest, true);
                    yield source;
                }
            }
        }
    }
    for (const path of directory.subdirs) {
        if (path === 'node_modules' || path.startsWith('.')) {
            continue;
        }
        yield* visit(directory.dir(path));
    }
}
function default_1() {
    return (tree) => {
        for (const sourceFile of visit(tree.root)) {
            let recorder;
            let printer;
            ts.forEachChild(sourceFile, function analyze(node) {
                if (!(ts.isExportDeclaration(node) &&
                    node.moduleSpecifier &&
                    ts.isStringLiteral(node.moduleSpecifier) &&
                    node.moduleSpecifier.text === '@angular/platform-server' &&
                    node.exportClause &&
                    ts.isNamedExports(node.exportClause))) {
                    // Not a @angular/platform-server named export.
                    return;
                }
                const exportClause = node.exportClause;
                const newElements = [];
                for (const element of exportClause.elements) {
                    if (element.name.text !== 'renderModule') {
                        newElements.push(element);
                    }
                }
                if (newElements.length === exportClause.elements.length) {
                    // No changes
                    return;
                }
                recorder !== null && recorder !== void 0 ? recorder : (recorder = tree.beginUpdate(sourceFile.fileName));
                if (newElements.length) {
                    // Update named exports as there are leftovers.
                    const newExportClause = ts.factory.updateNamedExports(exportClause, newElements);
                    printer !== null && printer !== void 0 ? printer : (printer = ts.createPrinter());
                    const fix = printer.printNode(ts.EmitHint.Unspecified, newExportClause, sourceFile);
                    const index = exportClause.getStart();
                    const length = exportClause.getWidth();
                    recorder.remove(index, length).insertLeft(index, fix);
                }
                else {
                    // Delete export as no exports remain.
                    recorder.remove(node.getStart(), node.getWidth());
                }
                ts.forEachChild(node, analyze);
            });
            if (recorder) {
                tree.commitUpdate(recorder);
            }
        }
    };
}
exports.default = default_1;
