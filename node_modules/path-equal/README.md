# path-equal

[![NPM version][npm-image]][npm-url]
[![NPM downloads][downloads-image]][npm-url]

[![GitHub NodeJS][github-nodejs]][github-action-url]
[![Codecov][codecov-image]][codecov-url]

[![Visual Studio Code][vscode-image]][vscode-url]

Compare two file paths regardless of platforms.

The file paths in Unix and Windows are different.

If you do not compare them correctly,
your code might work on one platform but not another.

This library provides this comparison to check if the two paths are the same,
regardless of the running platform.

## Install

```sh
# npm
npm install path-equal

# yarn
yarn add path-equal

# pnpm
pnpm install path-equal

#rush
rush add -p path-equal
```

## Usage

```ts
import { pathEqual } from 'path-equal'

pathEqual('dir/sub-dir/file.txt', 'dir\\sub-dir\\file.txt') // true
```

This library will not access the file system,
so comparing absolute path with relative path will fail.

## Contribute

```sh
# after fork and clone
yarn

# begin making changes
git checkout -b <branch>
yarn watch

# after making change(s)
git commit -m "<commit message>"
git push

# create PR
```

[codecov-image]: https://codecov.io/gh/unional/path-equal/branch/main/graph/badge.svg
[codecov-url]: https://codecov.io/gh/unional/path-equal
[downloads-image]: https://img.shields.io/npm/dm/path-equal.svg?style=flat
[github-nodejs]: https://github.com/unional/path-equal/actions/workflows/release.yml/badge.svg
[github-action-url]: https://github.com/unional/path-equal/actions/workflows/release.yml
[npm-image]: https://img.shields.io/npm/v/path-equal.svg?style=flat
[npm-url]: https://npmjs.org/package/path-equal
[vscode-image]: https://img.shields.io/badge/vscode-ready-green.svg
[vscode-url]: https://code.visualstudio.com/
