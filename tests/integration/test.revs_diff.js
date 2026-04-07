'use strict';

const adapters = ['http', 'local'];

adapters.forEach((adapter) => {
  describe(`test.revs_diff.js-${adapter}`, () => {

    const dbs = {};

    beforeEach(() => {
      dbs.name = testUtils.adapterUrl(adapter, 'testdb');
    });

    afterEach(async () => {
      await new Promise(resolve => testUtils.cleanup([dbs.name], resolve));
    });

    it('Test revs diff', async () => {
      const db = new PouchDB(dbs.name, {auto_compaction: false});
      const revs = [];
      const info = await db.post({
        test: 'somestuff',
        _id: 'somestuff'
      });
      revs.push(info.rev);
      const info2 = await db.put({
        _id: info.id,
        _rev: info.rev,
        another: 'test'
      });
      revs.push(info2.rev);
      let results = await db.revsDiff({ 'somestuff': revs });
      results.should.not.include.keys('somestuff');
      revs.push('2-randomid');
      results = await db.revsDiff({ 'somestuff': revs });
      results.should.include.keys('somestuff');
      results.somestuff.missing.should.have.length(1);
    });

    it('Test revs diff with opts object', async () => {
      const db = new PouchDB(dbs.name, {auto_compaction: false});
      const revs = [];
      const info = await db.post({
        test: 'somestuff',
        _id: 'somestuff'
      });
      revs.push(info.rev);
      const info2 = await db.put({
        _id: info.id,
        _rev: info.rev,
        another: 'test'
      });
      revs.push(info2.rev);
      let results = await db.revsDiff({ 'somestuff': revs }, {});
      results.should.not.include.keys('somestuff');
      revs.push('2-randomid');
      results = await db.revsDiff({ 'somestuff': revs });
      results.should.include.keys('somestuff');
      results.somestuff.missing.should.have.length(1);
    });

    it('Missing docs should be returned with all revisions', async () => {
      const db = new PouchDB(dbs.name);
      const revs = ['1-a', '2-a', '2-b'];
      const results = await db.revsDiff({'foo': revs });
      results.should.include.keys('foo');
      results.foo.missing.should.deep.equal(revs, 'listed all revs');
    });

    it('Conflicting revisions that are available', async () => {
      const doc = {_id: '939', _rev: '1-a'};
      const createConflicts = async (db) => {
        await db.put(doc, { new_edits: false });
        await new Promise((resolve) => testUtils.putAfter(db, {
          _id: '939',
          _rev: '2-a'
        }, '1-a', resolve));
        await new Promise((resolve) => testUtils.putAfter(db, {
          _id: '939',
          _rev: '2-b'
        }, '1-a', resolve));
      };
      const db = new PouchDB(dbs.name, {auto_compaction: false});
      await createConflicts(db);
      const results = await db.revsDiff({'939': ['1-a', '2-a', '2-b']});
      results.should.not.include.keys('939');
    });

    it('Deleted revisions that are available', async () => {
      const createDeletedRevision = async (db) => {
        await db.put({
          _id: '935',
          _rev: '1-a'
        }, { new_edits: false });
        await new Promise((resolve) => testUtils.putAfter(db, {
          _id: '935',
          _rev: '2-a',
          _deleted: true
        }, '1-a', resolve));
      };
      const db = new PouchDB(dbs.name);
      await createDeletedRevision(db);
      const results = await db.revsDiff({'935': ['1-a', '2-a']});
      results.should.not.include.keys('939');
    });

    it('Revs diff with empty revs', async () => {
      const db = new PouchDB(dbs.name);
      const res = await db.revsDiff({});
      should.exist(res);
    });

    it('Test revs diff with reserved ID', async () => {
      const db = new PouchDB(dbs.name, {auto_compaction: false});
      const revs = [];
      const info = await db.post({
        test: 'constructor',
        _id: 'constructor'
      });
      revs.push(info.rev);
      const info2 = await db.put({
        _id: info.id,
        _rev: info.rev,
        another: 'test'
      });
      revs.push(info2.rev);
      let results = await db.revsDiff({ 'constructor': revs });
      results.should.not.include.keys('constructor');
      revs.push('2-randomid');
      results = await db.revsDiff({ 'constructor': revs });
      results.should.include.keys('constructor');
      results.constructor.missing.should.have.length(1);
    });

  });
});
