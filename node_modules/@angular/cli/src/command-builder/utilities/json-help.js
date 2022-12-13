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
exports.jsonHelpUsage = void 0;
const yargs_1 = __importDefault(require("yargs"));
const yargsDefaultCommandRegExp = /^\$0|\*/;
function jsonHelpUsage() {
    var _a, _b, _c, _d, _e;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const localYargs = yargs_1.default;
    const { deprecatedOptions, alias: aliases, array, string, boolean, number, choices, demandedOptions, default: defaultVal, hiddenOptions = [], } = localYargs.getOptions();
    const internalMethods = localYargs.getInternalMethods();
    const usageInstance = internalMethods.getUsageInstance();
    const context = internalMethods.getContext();
    const descriptions = usageInstance.getDescriptions();
    const groups = localYargs.getGroups();
    const positional = groups[usageInstance.getPositionalGroupName()];
    const hidden = new Set(hiddenOptions);
    const normalizeOptions = [];
    const allAliases = new Set([...Object.values(aliases).flat()]);
    for (const [names, type] of [
        [array, 'array'],
        [string, 'string'],
        [boolean, 'boolean'],
        [number, 'number'],
    ]) {
        for (const name of names) {
            if (allAliases.has(name) || hidden.has(name)) {
                // Ignore hidden, aliases and already visited option.
                continue;
            }
            const positionalIndex = (_a = positional === null || positional === void 0 ? void 0 : positional.indexOf(name)) !== null && _a !== void 0 ? _a : -1;
            const alias = aliases[name];
            normalizeOptions.push({
                name,
                type,
                deprecated: deprecatedOptions[name],
                aliases: (alias === null || alias === void 0 ? void 0 : alias.length) > 0 ? alias : undefined,
                default: defaultVal[name],
                required: demandedOptions[name],
                enum: choices[name],
                description: (_b = descriptions[name]) === null || _b === void 0 ? void 0 : _b.replace('__yargsString__:', ''),
                positional: positionalIndex >= 0 ? positionalIndex : undefined,
            });
        }
    }
    // https://github.com/yargs/yargs/blob/00e4ebbe3acd438e73fdb101e75b4f879eb6d345/lib/usage.ts#L124
    const subcommands = usageInstance.getCommands()
        .map(([name, rawDescription, isDefault, aliases, deprecated]) => ({
        name: name.split(' ', 1)[0].replace(yargsDefaultCommandRegExp, ''),
        command: name.replace(yargsDefaultCommandRegExp, ''),
        default: isDefault || undefined,
        ...parseDescription(rawDescription),
        aliases,
        deprecated,
    }))
        .sort((a, b) => a.name.localeCompare(b.name));
    const [command, rawDescription] = (_c = usageInstance.getUsage()[0]) !== null && _c !== void 0 ? _c : [];
    const defaultSubCommand = (_e = (_d = subcommands.find((x) => x.default)) === null || _d === void 0 ? void 0 : _d.command) !== null && _e !== void 0 ? _e : '';
    const otherSubcommands = subcommands.filter((s) => !s.default);
    const output = {
        name: [...context.commands].pop(),
        command: `${command === null || command === void 0 ? void 0 : command.replace(yargsDefaultCommandRegExp, localYargs['$0'])}${defaultSubCommand}`,
        ...parseDescription(rawDescription),
        options: normalizeOptions.sort((a, b) => a.name.localeCompare(b.name)),
        subcommands: otherSubcommands.length ? otherSubcommands : undefined,
    };
    return JSON.stringify(output, undefined, 2);
}
exports.jsonHelpUsage = jsonHelpUsage;
function parseDescription(rawDescription) {
    try {
        const { longDescription, describe: shortDescription, longDescriptionRelativePath, } = JSON.parse(rawDescription);
        return {
            shortDescription,
            longDescriptionRelativePath,
            longDescription,
        };
    }
    catch {
        return {
            shortDescription: rawDescription,
        };
    }
}
