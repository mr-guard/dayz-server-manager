"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Builders = exports.ProjectType = void 0;
var ProjectType;
(function (ProjectType) {
    ProjectType["Application"] = "application";
    ProjectType["Library"] = "library";
})(ProjectType = exports.ProjectType || (exports.ProjectType = {}));
/**
 * An enum of the official Angular builders.
 * Each enum value provides the fully qualified name of the associated builder.
 * This enum can be used when analyzing the `builder` fields of project configurations from the
 * `angular.json` workspace file.
 */
var Builders;
(function (Builders) {
    Builders["AppShell"] = "@angular-devkit/build-angular:app-shell";
    Builders["Server"] = "@angular-devkit/build-angular:server";
    Builders["Browser"] = "@angular-devkit/build-angular:browser";
    Builders["Karma"] = "@angular-devkit/build-angular:karma";
    Builders["TsLint"] = "@angular-devkit/build-angular:tslint";
    Builders["DeprecatedNgPackagr"] = "@angular-devkit/build-ng-packagr:build";
    Builders["NgPackagr"] = "@angular-devkit/build-angular:ng-packagr";
    Builders["DevServer"] = "@angular-devkit/build-angular:dev-server";
    Builders["ExtractI18n"] = "@angular-devkit/build-angular:extract-i18n";
    Builders["Protractor"] = "@angular-devkit/build-angular:protractor";
})(Builders = exports.Builders || (exports.Builders = {}));
