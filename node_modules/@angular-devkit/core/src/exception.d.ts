/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export declare class BaseException extends Error {
    constructor(message?: string);
}
export declare class UnknownException extends BaseException {
    constructor(message: string);
}
export declare class FileDoesNotExistException extends BaseException {
    constructor(path: string);
}
export declare class FileAlreadyExistException extends BaseException {
    constructor(path: string);
}
export declare class PathIsDirectoryException extends BaseException {
    constructor(path: string);
}
export declare class PathIsFileException extends BaseException {
    constructor(path: string);
}
/**
 * @deprecated since version 14. Use the same symbol from `@angular-devkit/schematics`.
 */
export declare class ContentHasMutatedException extends BaseException {
    constructor(path: string);
}
/**
 * @deprecated since version 14. Use the same symbol from `@angular-devkit/schematics`.
 */
export declare class InvalidUpdateRecordException extends BaseException {
    constructor();
}
/**
 * @deprecated since version 14. Use the same symbol from `@angular-devkit/schematics`.
 */
export declare class MergeConflictException extends BaseException {
    constructor(path: string);
}
/**
 * @deprecated since version 14. Create a custom exception implementation instead.
 */
export declare class UnimplementedException extends BaseException {
    constructor();
}
/**
 * @deprecated since version 14. Create a custom exception implementation instead.
 */
export declare class UnsupportedPlatformException extends BaseException {
    constructor();
}
