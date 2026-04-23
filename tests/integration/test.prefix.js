'use strict';

describe('test.prefix.js', function () {

  it('Test url prefix', function () {

    var CustomPouch = PouchDB.defaults({
      prefix: testUtils.couchHost()
    });

    var db = new CustomPouch('testdb');

    return db.info().then(function (info) {
      info.adapter.should.equal('http');
    }).then(function () {
      return db.destroy();
    });

  });

  it('Test plain prefix', function () {

    var CustomPouch = PouchDB.defaults({prefix: 'testing'});
    var db = new CustomPouch('testdb');

    return db.info().then(function (info) {
      info.db_name.should.equal('testdb');
    }).then(function () {
      return db.destroy();
    });

  });

});
