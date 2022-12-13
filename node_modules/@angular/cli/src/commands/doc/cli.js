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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocCommandModule = void 0;
const open_1 = __importDefault(require("open"));
const command_module_1 = require("../../command-builder/command-module");
class DocCommandModule extends command_module_1.CommandModule {
    constructor() {
        super(...arguments);
        this.command = 'doc <keyword>';
        this.aliases = ['d'];
        this.describe = 'Opens the official Angular documentation (angular.io) in a browser, and searches for a given keyword.';
    }
    builder(localYargs) {
        return localYargs
            .positional('keyword', {
            description: 'The keyword to search for, as provided in the search bar in angular.io.',
            type: 'string',
            demandOption: true,
        })
            .option('search', {
            description: `Search all of angular.io. Otherwise, searches only API reference documentation.`,
            alias: ['s'],
            type: 'boolean',
            default: false,
        })
            .option('version', {
            description: 'Contains the version of Angular to use for the documentation. ' +
                'If not provided, the command uses your current Angular core version.',
            type: 'string',
        })
            .strict();
    }
    async run(options) {
        let domain = 'angular.io';
        if (options.version) {
            // version can either be a string containing "next"
            if (options.version === 'next') {
                domain = 'next.angular.io';
            }
            else if (options.version === 'rc') {
                domain = 'rc.angular.io';
                // or a number where version must be a valid Angular version (i.e. not 0, 1 or 3)
            }
            else if (!isNaN(+options.version) && ![0, 1, 3].includes(+options.version)) {
                domain = `v${options.version}.angular.io`;
            }
            else {
                this.context.logger.error('Version should either be a number (2, 4, 5, 6...), "rc" or "next"');
                return 1;
            }
        }
        else {
            // we try to get the current Angular version of the project
            // and use it if we can find it
            try {
                /* eslint-disable-next-line import/no-extraneous-dependencies */
                const currentNgVersion = (await Promise.resolve().then(() => __importStar(require('@angular/core')))).VERSION.major;
                domain = `v${currentNgVersion}.angular.io`;
            }
            catch { }
        }
        await (0, open_1.default)(options.search
            ? `https://${domain}/docs?search=${options.keyword}`
            : `https://${domain}/api?query=${options.keyword}`);
    }
}
exports.DocCommandModule = DocCommandModule;
