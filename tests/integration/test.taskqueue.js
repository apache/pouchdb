'use strict';

const adapters = ['http', 'local'];

adapters.forEach((adapter) => {
  describe(`test.taskqueue.js-${adapter}`, () => {

    const dbs = {};

    beforeEach(() => {
      dbs.name = testUtils.adapterUrl(adapter, 'testdb');
    });

    afterEach((done) => {
      testUtils.cleanup([dbs.name], done);
    });

    it('Add a doc', () => {
      const db = new PouchDB(dbs.name);
      return db.post({test: 'somestuff'});
    });

    it('Bulk docs', async () => {
      const db = new PouchDB(dbs.name);
      const infos = await db.bulkDocs({
        docs: [
          { test: 'somestuff' },
          { test: 'another' }
        ]
      });
      should.not.exist(infos[0].error);
      should.not.exist(infos[1].error);
    });

    it('Get', async () => {
      const db = new PouchDB(dbs.name);
      try {
        await db.get('0');
        throw 'Get should error';
      } catch (err) {
        should.exist(err);
      }
    });

    it('Info', async () => {
      const db = new PouchDB(dbs.name);
      const info = await db.info();
      info.doc_count.should.equal(0);
    });

  });
});
