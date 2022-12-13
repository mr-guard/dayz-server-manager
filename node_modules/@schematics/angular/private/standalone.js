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
exports.findBootstrapApplicationCall = exports.addModuleImportToStandaloneBootstrap = exports.importsProvidersFrom = void 0;
const schematics_1 = require("@angular-devkit/schematics");
const typescript_1 = __importDefault(require("../third_party/github.com/Microsoft/TypeScript/lib/typescript"));
const ast_utils_1 = require("../utility/ast-utils");
const change_1 = require("../utility/change");
/**
 * Checks whether the providers from a module are being imported in a `bootstrapApplication` call.
 * @param tree File tree of the project.
 * @param filePath Path of the file in which to check.
 * @param className Class name of the module to search for.
 */
function importsProvidersFrom(tree, filePath, className) {
    const sourceFile = typescript_1.default.createSourceFile(filePath, tree.readText(filePath), typescript_1.default.ScriptTarget.Latest, true);
    const bootstrapCall = findBootstrapApplicationCall(sourceFile);
    const importProvidersFromCall = bootstrapCall ? findImportProvidersFromCall(bootstrapCall) : null;
    return (!!importProvidersFromCall &&
        importProvidersFromCall.arguments.some((arg) => typescript_1.default.isIdentifier(arg) && arg.text === className));
}
exports.importsProvidersFrom = importsProvidersFrom;
/**
 * Adds an `importProvidersFrom` call to the `bootstrapApplication` call.
 * @param tree File tree of the project.
 * @param filePath Path to the file that should be updated.
 * @param moduleName Name of the module that should be imported.
 * @param modulePath Path from which to import the module.
 */
function addModuleImportToStandaloneBootstrap(tree, filePath, moduleName, modulePath) {
    const sourceFile = typescript_1.default.createSourceFile(filePath, tree.readText(filePath), typescript_1.default.ScriptTarget.Latest, true);
    const bootstrapCall = findBootstrapApplicationCall(sourceFile);
    if (!bootstrapCall) {
        throw new schematics_1.SchematicsException(`Could not find bootstrapApplication call in ${filePath}`);
    }
    const recorder = tree.beginUpdate(filePath);
    const importCall = findImportProvidersFromCall(bootstrapCall);
    const printer = typescript_1.default.createPrinter();
    const sourceText = sourceFile.getText();
    // Add imports to the module being added and `importProvidersFrom`. We don't
    // have to worry about duplicates, because `insertImport` handles them.
    [
        (0, ast_utils_1.insertImport)(sourceFile, sourceText, moduleName, modulePath),
        (0, ast_utils_1.insertImport)(sourceFile, sourceText, 'importProvidersFrom', '@angular/core'),
    ].forEach((change) => {
        if (change instanceof change_1.InsertChange) {
            recorder.insertLeft(change.pos, change.toAdd);
        }
    });
    // If there is an `importProvidersFrom` call already, reuse it.
    if (importCall) {
        recorder.insertRight(importCall.arguments[importCall.arguments.length - 1].getEnd(), `, ${moduleName}`);
    }
    else if (bootstrapCall.arguments.length === 1) {
        // Otherwise if there is no options parameter to `bootstrapApplication`,
        // create an object literal with a `providers` array and the import.
        const newCall = typescript_1.default.factory.updateCallExpression(bootstrapCall, bootstrapCall.expression, bootstrapCall.typeArguments, [
            ...bootstrapCall.arguments,
            typescript_1.default.factory.createObjectLiteralExpression([createProvidersAssignment(moduleName)], true),
        ]);
        recorder.remove(bootstrapCall.getStart(), bootstrapCall.getWidth());
        recorder.insertRight(bootstrapCall.getStart(), printer.printNode(typescript_1.default.EmitHint.Unspecified, newCall, sourceFile));
    }
    else {
        const providersLiteral = findProvidersLiteral(bootstrapCall);
        if (providersLiteral) {
            // If there's a `providers` array, add the import to it.
            const newProvidersLiteral = typescript_1.default.factory.updateArrayLiteralExpression(providersLiteral, [
                ...providersLiteral.elements,
                createImportProvidersFromCall(moduleName),
            ]);
            recorder.remove(providersLiteral.getStart(), providersLiteral.getWidth());
            recorder.insertRight(providersLiteral.getStart(), printer.printNode(typescript_1.default.EmitHint.Unspecified, newProvidersLiteral, sourceFile));
        }
        else {
            // Otherwise add a `providers` array to the existing object literal.
            const optionsLiteral = bootstrapCall.arguments[1];
            const newOptionsLiteral = typescript_1.default.factory.updateObjectLiteralExpression(optionsLiteral, [
                ...optionsLiteral.properties,
                createProvidersAssignment(moduleName),
            ]);
            recorder.remove(optionsLiteral.getStart(), optionsLiteral.getWidth());
            recorder.insertRight(optionsLiteral.getStart(), printer.printNode(typescript_1.default.EmitHint.Unspecified, newOptionsLiteral, sourceFile));
        }
    }
    tree.commitUpdate(recorder);
}
exports.addModuleImportToStandaloneBootstrap = addModuleImportToStandaloneBootstrap;
/** Finds the call to `bootstrapApplication` within a file. */
function findBootstrapApplicationCall(sourceFile) {
    const localName = findImportLocalName(sourceFile, 'bootstrapApplication', '@angular/platform-browser');
    return localName ? findCall(sourceFile, localName) : null;
}
exports.findBootstrapApplicationCall = findBootstrapApplicationCall;
/** Find a call to `importProvidersFrom` within a `bootstrapApplication` call. */
function findImportProvidersFromCall(bootstrapCall) {
    const providersLiteral = findProvidersLiteral(bootstrapCall);
    const importProvidersName = findImportLocalName(bootstrapCall.getSourceFile(), 'importProvidersFrom', '@angular/core');
    if (providersLiteral && importProvidersName) {
        for (const element of providersLiteral.elements) {
            // Look for an array element that calls the `importProvidersFrom` function.
            if (typescript_1.default.isCallExpression(element) &&
                typescript_1.default.isIdentifier(element.expression) &&
                element.expression.text === importProvidersName) {
                return element;
            }
        }
    }
    return null;
}
/** Finds the `providers` array literal within a `bootstrapApplication` call. */
function findProvidersLiteral(bootstrapCall) {
    // The imports have to be in the second argument of
    // the function which has to be an object literal.
    if (bootstrapCall.arguments.length > 1 &&
        typescript_1.default.isObjectLiteralExpression(bootstrapCall.arguments[1])) {
        for (const prop of bootstrapCall.arguments[1].properties) {
            if (typescript_1.default.isPropertyAssignment(prop) &&
                typescript_1.default.isIdentifier(prop.name) &&
                prop.name.text === 'providers' &&
                typescript_1.default.isArrayLiteralExpression(prop.initializer)) {
                return prop.initializer;
            }
        }
    }
    return null;
}
/**
 * Finds the local name of an imported symbol. Could be the symbol name itself or its alias.
 * @param sourceFile File within which to search for the import.
 * @param name Actual name of the import, not its local alias.
 * @param moduleName Name of the module from which the symbol is imported.
 */
function findImportLocalName(sourceFile, name, moduleName) {
    for (const node of sourceFile.statements) {
        // Only look for top-level imports.
        if (!typescript_1.default.isImportDeclaration(node) ||
            !typescript_1.default.isStringLiteral(node.moduleSpecifier) ||
            node.moduleSpecifier.text !== moduleName) {
            continue;
        }
        // Filter out imports that don't have the right shape.
        if (!node.importClause ||
            !node.importClause.namedBindings ||
            !typescript_1.default.isNamedImports(node.importClause.namedBindings)) {
            continue;
        }
        // Look through the elements of the declaration for the specific import.
        for (const element of node.importClause.namedBindings.elements) {
            if ((element.propertyName || element.name).text === name) {
                // The local name is always in `name`.
                return element.name.text;
            }
        }
    }
    return null;
}
/**
 * Finds a call to a function with a specific name.
 * @param rootNode Node from which to start searching.
 * @param name Name of the function to search for.
 */
function findCall(rootNode, name) {
    let result = null;
    rootNode.forEachChild(function walk(node) {
        if (typescript_1.default.isCallExpression(node) &&
            typescript_1.default.isIdentifier(node.expression) &&
            node.expression.text === name) {
            result = node;
        }
        if (!result) {
            node.forEachChild(walk);
        }
    });
    return result;
}
/** Creates an `importProvidersFrom({{moduleName}})` call. */
function createImportProvidersFromCall(moduleName) {
    return typescript_1.default.factory.createCallChain(typescript_1.default.factory.createIdentifier('importProvidersFrom'), undefined, undefined, [typescript_1.default.factory.createIdentifier(moduleName)]);
}
/** Creates a `providers: [importProvidersFrom({{moduleName}})]` property assignment. */
function createProvidersAssignment(moduleName) {
    return typescript_1.default.factory.createPropertyAssignment('providers', typescript_1.default.factory.createArrayLiteralExpression([createImportProvidersFromCall(moduleName)]));
}
