/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Argv } from 'yargs';
import { CommandModule, CommandModuleImplementation, Options } from '../../command-builder/command-module';
interface DocCommandArgs {
    keyword: string;
    search?: boolean;
    version?: string;
}
export declare class DocCommandModule extends CommandModule<DocCommandArgs> implements CommandModuleImplementation<DocCommandArgs> {
    command: string;
    aliases: string[];
    describe: string;
    longDescriptionPath?: string;
    builder(localYargs: Argv): Argv<DocCommandArgs>;
    run(options: Options<DocCommandArgs>): Promise<number | void>;
}
export {};
