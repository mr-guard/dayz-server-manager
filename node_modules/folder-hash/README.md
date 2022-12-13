Create a hash checksum over a folder or a file.  
The hashes are propagated upwards, the hash that is returned for a folder is generated over all the hashes of its children.  
The hashes are generated with the _sha1_ algorithm and returned in _base64_ encoding by default.

Each file returns a name and a hash, and each folder returns additionally an array of children (file or folder elements).

## Usage

First, install folder-hash with `npm install --save folder-hash` or `yarn add folder-hash`.

### Simple example

To see differences to the last version of this package, I would create hashes over all _.js_ and _.json_ files. But ignore everything inside folders starting with a dot, and also from the folders _node_modules_, _test_coverage_. The structure of the options object is documented <a href="#options">below.</a>  
This example is also stored in [./examples/readme-example1.js](/examples/readme-example1.js).

```js
const { hashElement } = require('folder-hash');

const options = {
  folders: { exclude: ['.*', 'node_modules', 'test_coverage'] },
  files: { include: ['*.js', '*.json'] },
};

console.log('Creating a hash over the current folder:');
hashElement('.', options)
  .then(hash => {
    console.log(hash.toString());
  })
  .catch(error => {
    return console.error('hashing failed:', error);
  });
```

The returned information looks for example like this:

```
Creating a hash over the current folder:
{ name: '.', hash: 'YZOrKDx9LCLd8X39PoFTflXGpRU=,'
  children: [
    { name: 'examples', hash: 'aG8wg8np5SGddTnw1ex74PC9EnM=,'
      children: [
        { name: 'readme-example1.js', hash: 'Xlw8S2iomJWbxOJmmDBnKcauyQ8=' }
        { name: 'readme-with-callbacks.js', hash: 'ybvTHLCQBvWHeKZtGYZK7+6VPUw=' }
        { name: 'readme-with-promises.js', hash: '43i9tE0kSFyJYd9J2O0nkKC+tmI=' }
        { name: 'sample.js', hash: 'PRTD9nsZw3l73O/w5B2FH2qniFk=' }
      ]}
    { name: 'index.js', hash: 'kQQWXdgKuGfBf7ND3rxjThTLVNA=' }
    { name: 'package.json', hash: 'w7F0S11l6VefDknvmIy8jmKx+Ng=' }
    { name: 'test', hash: 'H5x0JDoV7dEGxI65e8IsencDZ1A=,'
      children: [
        { name: 'parameters.js', hash: '3gCEobqzHGzQiHmCDe5yX8weq7M=' }
        { name: 'test.js', hash: 'kg7p8lbaVf1CPtWLAIvkHkdu1oo=' }
      ]}
  ]}
```

And the structure may be traversed to e.g. create incremental backups.

It is also possible to only match the full path and not the basename. The same configuration could look like this:  
_You should be aware that \*nix and Windows behave differently, so please use caution._

```js
const options = {
  folders: {
    exclude: ['.*', '**.*', '**node_modules', '**test_coverage'],
    matchBasename: false,
    matchPath: true,
  },
  files: {
    //include: ['**.js', '**.json' ], // Windows
    include: ['*.js', '**/*.js', '*.json', '**/*.json'], // *nix
    matchBasename: false,
    matchPath: true,
  },
};
```

### Parameters for the hashElement function

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Attributes</th>
            <th>Description</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>name</td>
            <td>
                <span>string</span>
            </td>
            <td>
            </td>
            <td>element name or an element's path</td>
        </tr>
        <tr>
            <td>dir</td>
            <td>
                <span>string</span>
            </td>
            <td>
                &lt;optional&gt;<br>
            </td>
            <td>directory that contains the element (generated from name if omitted)</td>
        </tr>
        <tr>
            <td>options</td>
            <td>
                <span>Object</span>
            </td>
            <td>
                &lt;optional&gt;<br>
            </td>
            <td>
                <a href="#options">Options object (see below)</a>
            </td>
        </tr>
        <tr>
            <td>callback</td>
            <td>
                <span>fn</span>
            </td>
            <td>
                &lt;optional&gt;<br>
            </td>
            <td>Error-first callback function</td>
        </tr>
    </tbody>
</table>

## Options

### Default values

```js
{
    algo: 'sha1',       // see crypto.getHashes() for options in your node.js REPL
    encoding: 'base64', // 'base64', 'hex' or 'binary'
    files: {
        exclude: [],
        include: [],
        matchBasename: true,
        matchPath: false,
        ignoreBasename: false,
        ignoreRootName: false
    },
    folders: {
        exclude: [],
        include: [],
        matchBasename: true,
        matchPath: false,
        ignoreRootName: false
    },
    symbolicLinks: {
        include: true,
        ignoreBasename: false,
        ignoreTargetPath: true,
        ignoreTargetContent: false,
        ignoreTargetContentAfterError: false,
    }
}
```

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Attributes</th>
            <th>Default</th>
            <th>Description</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>algo</td>
            <td>
                <span>string</span>
            </td>
            <td>
                &lt;optional&gt;<br>
            </td>
            <td>
                'sha1'
            </td>
            <td>checksum algorithm, see options in crypto.getHashes()</td>
        </tr>
        <tr>
            <td>encoding</td>
            <td>
                <span>string</span>
            </td>
            <td>
                &lt;optional&gt;<br>
            </td>
            <td>
                'base64'
            </td>
            <td>encoding of the resulting hash. One of 'base64', 'hex' or 'binary'</td>
        </tr>
        <tr>
            <td>files</td>
            <td>
                <span>Object</span>
            </td>
            <td>
                &lt;optional&gt;<br>
            </td>
            <td colspan="2">
                <a href="#rules-object-properties">Rules object (see below)</a>
            </td>
        </tr>
        <tr>
            <td>folders</td>
            <td>
                <span>Object</span>
            </td>
            <td>
                &lt;optional&gt;<br>
            </td>
            <td colspan="2">
                <a href="#rules-object-properties">Rules object (see below)</a>
            </td>
        </tr>
        <tr>
            <td>symLinks</td>
            <td>
                <span>Object</span>
            </td>
            <td>
                &lt;optional&gt;<br>
            </td>
            <td colspan="2">
                <a href="#symlink-options">Symlink options (see below)</a>
            </td>
        </tr>
    </tbody>
</table>

#### Rules object properties

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Attributes</th>
            <th>Default</th>
            <th>Description</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>exclude</td>
            <td>
                <span>Array.&lt;string&gt; || Function</span>
            </td>
            <td>
                &lt;optional&gt;<br>
            </td>
            <td>
                []
            </td>
            <td>Array of optional exclude glob patterns, see <a href="https://github.com/isaacs/minimatch#features">minimatch doc</a>. Can also be a function which returns true if the passed file is excluded.</td>
        </tr>
        <tr>
            <td>include</td>
            <td>
                <span>Array.&lt;string&gt; || Function</span>
            </td>
            <td>
                &lt;optional&gt;<br>
            </td>
            <td>
                []
            </td>
            <td>Array of optional include glob patterns, see <a href="https://github.com/isaacs/minimatch#features">minimatch doc</a>. Can also be a function which returns true if the passed file is included.</td>
        </tr>
        <tr>
            <td>matchBasename</td>
            <td>
                <span>bool</span>
            </td>
            <td>
                &lt;optional&gt;<br>
            </td>
            <td>
                true
            </td>
            <td>Match the glob patterns to the file/folder name</td>
        </tr>
        <tr>
            <td>matchPath</td>
            <td>
                <span>bool</span>
            </td>
            <td>
                &lt;optional&gt;<br>
            </td>
            <td>
                false
            </td>
            <td>Match the glob patterns to the file/folder path</td>
        </tr>
        <tr>
            <td>ignoreBasename</td>
            <td>
                <span>bool</span>
            </td>
            <td>
                &lt;optional&gt;<br>
            </td>
            <td>
                false
            </td>
            <td>Set to true to calculate the hash without the basename element</td>
        </tr>
        <tr>
            <td>ignoreRootName</td>
            <td>
                <span>bool</span>
            </td>
            <td>
                &lt;optional&gt;<br>
            </td>
            <td>
                false
            </td>
            <td>Set to true to calculate the hash without the basename of the root (first) element</td>
        </tr>
    </tbody>
</table>

### Symlink options

Configure, how symbolic links should be hashed.  
To understand how the options can be combined to create a specific behavior, look into [test/symbolic-links.js](https://github.com/marc136/node-folder-hash/blob/master/test/symbolic-links.js).

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Default</th>
            <th>Description</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>include</td>
            <td>
                <span>bool</span>
            </td>
            <td>
                true
            </td>
            <td>If false, symbolic links are not handled at all. A folder with three symbolic links inside will have no children entries.</td>
        </tr>
        <tr>
            <td>ignoreBasename</td>
            <td>
                <span>bool</span>
            </td>
            <td>
                false
            </td>
            <td>Set to true to calculate the hash without the basename element</td>
        </tr>
        <tr>
            <td>ignoreTargetPath</td>
            <td>
                <span>bool</span>
            </td>
            <td>
                true
            </td>
            <td>If false, the resolved link target is added to the hash (uses <a href="https://devdocs.io/node/fs#fs_fs_readlink_path_options_callback">fs.readlink</a>)</td>
        </tr>
        <tr>
            <td>ignoreTargetContent</td>
            <td>
                <span>bool</span>
            </td>
            <td>
                false
            </td>
            <td>If true, will only assess the basename and target path (as configured in the other options)</td>
        </tr>
        <tr>
            <td>ignoreTargetContentAfterError</td>
            <td>
                <span>bool</span>
            </td>
            <td>
                false
            </td>
            <td>If true, will ignore all errors while trying to hash symbolic links and only assess the basename and target path (as configured in other options).<br />E.g. a missing target (<i>ENOENT</i>) or access permissions (<i>EPERM</i>).</td>
        </tr>
    </tbody>
</table>

## Command line usage

After installing it globally via

```
$ npm install -g folder-hash
```

You can use it like this:

```
# local folder
$ folder-hash -c config.json .
# local folder
$ folder-hash
# global folder
$ folder-hash /user/bin
```

It also allows to pass an optional JSON configuration file with the `-c` or `--config` flag, which should contain the same configuration as when using the JavaScript API.

You can also use a local version of folder-hash like this:

```
$ npx folder-hash --help
Use folder-hash on cli like this:
  folder-hash [--config <json-file>] <file-or-folder>
```

## Examples

### Other examples using promises

See file _./examples/readme-with-promises.js_

```js
const path = require('path');
const { hashElement } = require('folder-hash');

// pass element name and folder path separately
hashElement('test', path.join(__dirname, '..'))
  .then(hash => {
    console.log('Result for folder "../test":', hash.toString(), '\n');
  })
  .catch(error => {
    return console.error('hashing failed:', error);
  });

// pass element path directly
hashElement(__dirname)
  .then(hash => {
    console.log(`Result for folder "${__dirname}":`);
    console.log(hash.toString(), '\n');
  })
  .catch(error => {
    return console.error('hashing failed:', error);
  });

// pass options (example: exclude dotFolders)
const options = { encoding: 'hex', folders: { exclude: ['.*'] } };
hashElement(__dirname, options)
  .then(hash => {
    console.log('Result for folder "' + __dirname + '" (with options):');
    console.log(hash.toString(), '\n');
  })
  .catch(error => {
    return console.error('hashing failed:', error);
  });
```

### Other examples using error-first callbacks

See _./examples/readme-with-callbacks.js_

```js
const path = require('path');
const { hashElement } = require('folder-hash');

// pass element name and folder path separately
hashElement('test', path.join(__dirname, '..'), (error, hash) => {
  if (error) {
    return console.error('hashing failed:', error);
  } else {
    console.log('Result for folder "../test":', hash.toString(), '\n');
  }
});

// pass element path directly
hashElement(__dirname, (error, hash) => {
  if (error) {
    return console.error('hashing failed:', error);
  } else {
    console.log('Result for folder "' + __dirname + '":');
    console.log(hash.toString(), '\n');
  }
});

// pass options (example: exclude dotFiles)
const options = { algo: 'md5', files: { exclude: ['.*'], matchBasename: true } };
hashElement(__dirname, options, (error, hash) => {
  if (error) {
    return console.error('hashing failed:', error);
  } else {
    console.log('Result for folder "' + __dirname + '":');
    console.log(hash.toString());
  }
});
```

## Behavior

The behavior is documented and verified in the unit tests. Execute `npm test` or `mocha test`, and have a look at the _test_ subfolder.  
You can also have a look at the [CircleCI report. ![CircleCI](https://circleci.com/gh/marc136/node-folder-hash/tree/master.svg?style=svg)](https://circleci.com/gh/marc136/node-folder-hash/tree/master)

### Creating hashes over files (with default options)

**The hashes are the same if:**

- A file is checked again
- Two files have the same name and content (but exist in different folders)

**The hashes are different if:**

- A file was renamed or its content was changed
- Two files have the same name but different content
- Two files have the same content but different names

### Creating hashes over folders (with default options)

Content means in this case a folder's children - both the files and the subfolders with their children.

**The hashes are the same if:**

- A folder is checked again
- Two folders have the same name and content (but have different parent folders)

**The hashes are different if:**

- A file somewhere in the directory structure was renamed or its content was changed
- Two folders have the same name but different content
- Two folders have the same content but different names

## License

MIT, see LICENSE.txt
