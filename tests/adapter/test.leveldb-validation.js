'use strict';

// Test the adapter directly - this works reliably
const leveldbCore = require('../../packages/node_modules/pouchdb-adapter-leveldb-core');

describe('database name validation (leveldb adapter)', function () {

  it('should reject invalid database names', function () {
    (function () {
      new leveldbCore({ name: 'MyDb', db: require('leveldown') });
    }).should.throw(/Invalid database name/);

    (function () {
      new leveldbCore({ name: 'test<bad>name', db: require('leveldown') });
    }).should.throw(/Invalid database name/);

    (function () {
      new leveldbCore({ name: 'test:bad:name', db: require('leveldown') });
    }).should.throw(/Invalid database name/);

    (function () {
      new leveldbCore({ name: 'test|bad|name', db: require('leveldown') });
    }).should.throw(/Invalid database name/);
  });

  it('should reject path traversal patterns', function () {
    (function () {
      new leveldbCore({ name: '../evil', db: require('leveldown') });
    }).should.throw(/Invalid database name/);

    (function () {
      new leveldbCore({ name: '..\\evil', db: require('leveldown') });
    }).should.throw(/Invalid database name/);

    (function () {
      new leveldbCore({ name: '/etc/passwd', db: require('leveldown') });
    }).should.throw(/Invalid database name/);
  });

  it('should reject encoded traversal patterns', function () {
    (function () {
      new leveldbCore({ name: '%2e%2e%2fsecret', db: require('leveldown') });
    }).should.throw(/Invalid database name/);
  });

  it('should allow valid CouchDB-style names', function () {
    (function () {
      new leveldbCore({ name: 'mydb', db: require('leveldown') });
    }).should.not.throw();

    (function () {
      new leveldbCore({ name: 'my-db', db: require('leveldown') });
    }).should.not.throw();

    (function () {
      new leveldbCore({ name: 'my_db', db: require('leveldown') });
    }).should.not.throw();

    (function () {
      new leveldbCore({ name: 'my123db', db: require('leveldown') });
    }).should.not.throw();

    (function () {
      new leveldbCore({ name: 'my$db', db: require('leveldown') });
    }).should.not.throw();

    (function () {
      new leveldbCore({ name: 'my+db', db: require('leveldown') });
    }).should.not.throw();

    (function () {
      new leveldbCore({ name: 'my(db)', db: require('leveldown') });
    }).should.not.throw();

    (function () {
      new leveldbCore({ name: 'my/db', db: require('leveldown') });
    }).should.not.throw();
  });

  it('should reject names starting with numbers', function () {
    (function () {
      new leveldbCore({ name: '123db', db: require('leveldown') });
    }).should.throw(/Invalid database name/);
  });

  it('should allow names starting with lowercase letters', function () {
    (function () {
      new leveldbCore({ name: 'adb', db: require('leveldown') });
    }).should.not.throw();

    (function () {
      new leveldbCore({ name: 'zdb', db: require('leveldown') });
    }).should.not.throw();
  });

});
