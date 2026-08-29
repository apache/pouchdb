'use strict';

const adapters = ['local'];

adapters.forEach((adapter) => {
  describe(`browser.info.js-${adapter}`, () => {

    const dbs = {};

    beforeEach((done) => {
      dbs.name = testUtils.adapterUrl(adapter, 'testdb');
      testUtils.cleanup([dbs.name], done);
    });

    after((done) => {
      testUtils.cleanup([dbs.name], done);
    });

    it('adapter-specific info', async () => {
      const db = new PouchDB(dbs.name);
      const info = await db.info();
      switch (db.adapter) {
        case 'websql':
          info.websql_encoding.should.be.a('string');
          info.adapter.should.equal('websql');
          break;
        case 'idb':
          info.idb_attachment_format.should.be.a('string');
          info.adapter.should.equal('idb');
          break;
        default:
          should.exist(info); // can't make any guarantees
          break;
      }
    });
  });
});
