'use strict';

describe('DB Setup', () => {

  it('PouchDB has a version', () => {
    PouchDB.version.should.be.a('string');
    PouchDB.version.should.match(/\d+\.\d+\.\d+/);
  });

  if (typeof process !== 'undefined' && !process.browser) {
    it('PouchDB version matches package.json', () => {
      const pkg = require('../../packages/node_modules/pouchdb/package.json');
      PouchDB.version.should.equal(pkg.version);
    });
  }

});
