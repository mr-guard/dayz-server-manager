/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import type { ListChoiceOptions } from 'inquirer';
export declare function askConfirmation(message: string, defaultResponse: boolean, noTTYResponse?: boolean): Promise<boolean>;
export declare function askQuestion(message: string, choices: ListChoiceOptions[], defaultResponseIndex: number, noTTYResponse: null | string): Promise<string | null>;
