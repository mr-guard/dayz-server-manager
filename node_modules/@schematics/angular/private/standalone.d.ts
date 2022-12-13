/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Tree } from '@angular-devkit/schematics';
import ts from '../third_party/github.com/Microsoft/TypeScript/lib/typescript';
/**
 * Checks whether the providers from a module are being imported in a `bootstrapApplication` call.
 * @param tree File tree of the project.
 * @param filePath Path of the file in which to check.
 * @param className Class name of the module to search for.
 */
export declare function importsProvidersFrom(tree: Tree, filePath: string, className: string): boolean;
/**
 * Adds an `importProvidersFrom` call to the `bootstrapApplication` call.
 * @param tree File tree of the project.
 * @param filePath Path to the file that should be updated.
 * @param moduleName Name of the module that should be imported.
 * @param modulePath Path from which to import the module.
 */
export declare function addModuleImportToStandaloneBootstrap(tree: Tree, filePath: string, moduleName: string, modulePath: string): void;
/** Finds the call to `bootstrapApplication` within a file. */
export declare function findBootstrapApplicationCall(sourceFile: ts.SourceFile): ts.CallExpression | null;
