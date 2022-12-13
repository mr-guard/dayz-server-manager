"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.forceAutocomplete = exports.ngDebug = exports.disableVersionCheck = exports.isCI = exports.analyticsDisabled = void 0;
function isPresent(variable) {
    return typeof variable === 'string' && variable !== '';
}
function isDisabled(variable) {
    return isPresent(variable) && (variable === '0' || variable.toLowerCase() === 'false');
}
function isEnabled(variable) {
    return isPresent(variable) && (variable === '1' || variable.toLowerCase() === 'true');
}
function optional(variable) {
    if (!isPresent(variable)) {
        return undefined;
    }
    return isEnabled(variable);
}
exports.analyticsDisabled = isDisabled(process.env['NG_CLI_ANALYTICS']);
exports.isCI = isEnabled(process.env['CI']);
exports.disableVersionCheck = isEnabled(process.env['NG_DISABLE_VERSION_CHECK']);
exports.ngDebug = isEnabled(process.env['NG_DEBUG']);
exports.forceAutocomplete = optional(process.env['NG_FORCE_AUTOCOMPLETE']);
