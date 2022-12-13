const fs = require('graceful-fs');
const lib = require('./index');

function program(cliArgs) {
  let args;
  try {
    args = parseArgs(cliArgs);
  } catch (ex) {
    error(ex);
  }

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  let config;
  if (args.config) {
    try {
      config = JSON.parse(fs.readFileSync(args.config, { encoding: 'utf-8' }));
    } catch (err) {
      console.error('Could not parse configuration from file ' + args.config);
      console.error('Maybe try a JSON config like this instead?\n');
      console.error(JSON.stringify(lib.defaults, undefined, 2));
      process.exit(1);
    }
  }

  return lib
    .hashElement(args.src || process.cwd(), config)
    .then(result => console.log(result.toString()))
    .catch(error);
}

function parseArgs(args) {
  let help, config, src;

  for (let index = 0; index < args.length; index++) {
    switch (args[index]) {
      case '-h':
      case '--help':
        help = true;
        break;

      case '-c':
      case '--config':
        if (!args[++index]) {
          throw new Error(`Need to supply a JSON config file after "${args[index]}"`);
        }
        config = args[index];
        break;

      default:
        if (!src) {
          src = args[index];
        } else {
          console.log(`Ignoring param "${args[index]}"`);
        }
        break;
    }
  }

  return { help, config, src };
}

function error(err) {
  console.error('ERROR:', ex.message || ex.name || ex);
  process.exit(1);
}

function printHelp() {
  console.log('Use folder-hash on cli like this:');
  console.log('  folder-hash [--config <json-file>] <file-or-folder>');
}

module.exports = program;
