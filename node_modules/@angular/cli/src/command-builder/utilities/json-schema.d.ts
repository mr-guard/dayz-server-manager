/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { json } from '@angular-devkit/core';
import yargs from 'yargs';
/**
 * An option description.
 */
export interface Option extends yargs.Options {
    /**
     * The name of the option.
     */
    name: string;
    /**
     * Whether this option is required or not.
     */
    required?: boolean;
    /**
     * Format field of this option.
     */
    format?: string;
    /**
     * Whether this option should be hidden from the help output. It will still show up in JSON help.
     */
    hidden?: boolean;
    /**
     * If this option can be used as an argument, the position of the argument. Otherwise omitted.
     */
    positional?: number;
    /**
     * Whether or not to report this option to the Angular Team, and which custom field to use.
     * If this is falsey, do not report this option.
     */
    userAnalytics?: string;
}
export declare function parseJsonSchemaToOptions(registry: json.schema.SchemaRegistry, schema: json.JsonObject, interactive?: boolean): Promise<Option[]>;
