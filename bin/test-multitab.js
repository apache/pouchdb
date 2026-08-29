'use strict';

const { spawn } = require('child_process');
const devserver = require('./dev-server');

const MOCHA_BIN = './node_modules/.bin/mocha';
const MULTITAB_TESTS = 'tests/multitab';
const TIMEOUT = '10000';

devserver.start(() => {
  let argv = ['-t', TIMEOUT, MULTITAB_TESTS];
  let mocha = spawn(MOCHA_BIN, argv, { stdio: 'inherit' });
  mocha.on('close', (status) => process.exit(status));
});
