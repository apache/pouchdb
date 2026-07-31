'use strict';

const adapters = [
  ['local', 'http'],
  ['http', 'http'],
  ['http', 'local'],
  ['local', 'local']
];

adapters.forEach((adapters) => {
  describe(`test.reserved.js-${adapters[0]}-${adapters[1]}`, () => {

    const dbs = {};

    beforeEach(() => {
      dbs.name = testUtils.adapterUrl(adapters[0], 'testdb');
      dbs.remote = testUtils.adapterUrl(adapters[1], 'test_repl_remote');
    });

    afterEach(async () => {
      await new Promise(resolve => testUtils.cleanup([dbs.name, dbs.remote], resolve));
    });

    it('test docs with reserved javascript ids', async () => {
      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);
      await db.bulkDocs([
        {_id: 'constructor'},
        {_id: 'toString'},
        {_id: 'valueOf'},
        {
          _id: '_design/all',
          views: {
            all: {
              map: function (doc) {
                emit(doc._id);
              }.toString()
            }
          }
        }
      ]);

      let res = await db.allDocs({key: 'constructor'});
      res.rows.should.have.length(1, 'allDocs with key');

      res = await db.allDocs({keys: ['constructor']});
      res.rows.should.have.length(1, 'allDocs with keys');

      res = await db.allDocs();
      res.rows.should.have.length(4, 'allDocs empty opts');

      if (db.query) {
        res = await db.query('all/all', {key: 'constructor'});
      }

      if (db.query) {
        res.rows.should.have.length(1, 'query with key');
        res = await db.query('all/all', {keys: ['constructor']});
      }

      if (db.query) {
        res.rows.should.have.length(1, 'query with keys');
      }

      await new Promise((resolve, reject) => {
        db.replicate.to(remote).on('complete', resolve).on('error', reject);
      });
    });

    it('can create db with reserved name', async () => {
      const db = new PouchDB('constructor');
      await db.info();
      await db.destroy();
    });
  });
});
