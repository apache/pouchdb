module.exports = require('builtin-modules').flatMap(m => [ m, `node:${m}` ]);
