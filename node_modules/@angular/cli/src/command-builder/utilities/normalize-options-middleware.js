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
exports.normalizeOptionsMiddleware = void 0;
const yargs = __importStar(require("yargs"));
/**
 * A Yargs middleware that normalizes non Array options when the argument has been provided multiple times.
 *
 * By default, when an option is non array and it is provided multiple times in the command line, yargs
 * will not override it's value but instead it will be changed to an array unless `duplicate-arguments-array` is disabled.
 * But this option also have an effect on real array options which isn't desired.
 *
 * See: https://github.com/yargs/yargs-parser/pull/163#issuecomment-516566614
 */
function normalizeOptionsMiddleware(args) {
    // `getOptions` is not included in the types even though it's public API.
    // https://github.com/yargs/yargs/issues/2098
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { array } = yargs.getOptions();
    const arrayOptions = new Set(array);
    for (const [key, value] of Object.entries(args)) {
        if (key !== '_' && Array.isArray(value) && !arrayOptions.has(key)) {
            const newValue = value.pop();
            // eslint-disable-next-line no-console
            console.warn(`Option '${key}' has been specified multiple times. The value '${newValue}' will be used.`);
            args[key] = newValue;
        }
    }
}
exports.normalizeOptionsMiddleware = normalizeOptionsMiddleware;
