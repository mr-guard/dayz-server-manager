"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnsupportedPlatformException = exports.UnimplementedException = exports.MergeConflictException = exports.InvalidUpdateRecordException = exports.ContentHasMutatedException = exports.PathIsFileException = exports.PathIsDirectoryException = exports.FileAlreadyExistException = exports.FileDoesNotExistException = exports.UnknownException = exports.BaseException = void 0;
class BaseException extends Error {
    constructor(message = '') {
        super(message);
    }
}
exports.BaseException = BaseException;
class UnknownException extends BaseException {
    constructor(message) {
        super(message);
    }
}
exports.UnknownException = UnknownException;
// Exceptions
class FileDoesNotExistException extends BaseException {
    constructor(path) {
        super(`Path "${path}" does not exist.`);
    }
}
exports.FileDoesNotExistException = FileDoesNotExistException;
class FileAlreadyExistException extends BaseException {
    constructor(path) {
        super(`Path "${path}" already exist.`);
    }
}
exports.FileAlreadyExistException = FileAlreadyExistException;
class PathIsDirectoryException extends BaseException {
    constructor(path) {
        super(`Path "${path}" is a directory.`);
    }
}
exports.PathIsDirectoryException = PathIsDirectoryException;
class PathIsFileException extends BaseException {
    constructor(path) {
        super(`Path "${path}" is a file.`);
    }
}
exports.PathIsFileException = PathIsFileException;
/**
 * @deprecated since version 14. Use the same symbol from `@angular-devkit/schematics`.
 */
class ContentHasMutatedException extends BaseException {
    constructor(path) {
        super(`Content at path "${path}" has changed between the start and the end of an update.`);
    }
}
exports.ContentHasMutatedException = ContentHasMutatedException;
/**
 * @deprecated since version 14. Use the same symbol from `@angular-devkit/schematics`.
 */
class InvalidUpdateRecordException extends BaseException {
    constructor() {
        super(`Invalid record instance.`);
    }
}
exports.InvalidUpdateRecordException = InvalidUpdateRecordException;
/**
 * @deprecated since version 14. Use the same symbol from `@angular-devkit/schematics`.
 */
class MergeConflictException extends BaseException {
    constructor(path) {
        super(`A merge conflicted on path "${path}".`);
    }
}
exports.MergeConflictException = MergeConflictException;
/**
 * @deprecated since version 14. Create a custom exception implementation instead.
 */
class UnimplementedException extends BaseException {
    constructor() {
        super('This function is unimplemented.');
    }
}
exports.UnimplementedException = UnimplementedException;
/**
 * @deprecated since version 14. Create a custom exception implementation instead.
 */
class UnsupportedPlatformException extends BaseException {
    constructor() {
        super('This platform is not supported by this code path.');
    }
}
exports.UnsupportedPlatformException = UnsupportedPlatformException;
