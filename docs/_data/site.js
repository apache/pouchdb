const { version } = require('../../package.json');

module.exports = {
  name: 'PouchDB',
  description: 'PouchDB, the JavaScript Database that Syncs!',
  url: 'http://pouchdb.com',
  baseurl: '',
  version,
  github: {
    repository_url: 'https://github.com/apache/pouchdb',
  },
  time: new Date().toISOString(),
};
