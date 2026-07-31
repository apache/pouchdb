'use strict';

const adapters = ['http', 'local'];

adapters.forEach((adapter) => {
  describe(`test.conflicts.js-${adapter}`, () => {

    const dbs = {};

    beforeEach(() => {
      dbs.name = testUtils.adapterUrl(adapter, 'testdb');
    });

    afterEach(async () => {
      await new Promise((resolve, reject) => testUtils.cleanup([dbs.name], (err) => {
        return err ? reject(err) : resolve();
      }));
    });

    it('Testing conflicts', async () => {
      const db = new PouchDB(dbs.name);
      const doc = {_id: 'foo', a: 1, b: 1};
      const res = await db.put(doc);
      doc._rev = res.rev;
      should.exist(res.ok, 'Put first document');
      const doc2 = await db.get('foo');
      doc._id.should.equal(doc2._id);
      doc.should.have.property('_rev');
      doc2.should.have.property('_rev');
      doc.a = 2;
      doc2.a = 3;
      const res2 = await db.put(doc);
      should.exist(res2.ok, 'Put second doc');
      try {
        await db.put(doc2);
      } catch (err) {
        err.name.should.equal('conflict', 'Put got a conflicts');
      }
      const results = await db.changes({return_docs: true});
      results.results.should.have.length(1);
      doc2._rev = undefined;
      try {
        await db.put(doc2);
      } catch (err) {
        err.name.should.equal('conflict', 'Another conflict');
      }
    });

    it('Testing conflicts', async () => {
      const doc = {_id: 'fubar', a: 1, b: 1};
      const db = new PouchDB(dbs.name);
      const ndoc = await db.put(doc);
      doc._rev = ndoc.rev;
      await db.remove(doc);
      delete doc._rev;
      const ndoc2 = await db.put(doc);
      should.exist(ndoc2.ok, 'written previously deleted doc without rev');
    });

    it('force put ok on 1st level', async () => {
      const db = new PouchDB(dbs.name);
      const docId = "docId";
      let rev1, rev2, rev3, rev2_;
      // given
      const result1 = await db.put({_id: docId, update:1});
      rev1 = result1.rev;
      const result2 = await db.put({_id: docId, update:2.1, _rev: rev1});
      rev2 = result2.rev;
      const result3 = await db.put({_id: docId, update:3, _rev:rev2});
      // when
      rev3 = result3.rev;
      const result4 = await db.put({_id: docId, update:2.2, _rev: rev1}, {force: true});
      // then
      rev2_ = result4.rev;
      rev2_.should.not.equal(rev3);
      rev2_.substring(0, 2).should.equal('2-');
      should.exist(result4.ok, 'update based on nonleaf revision');

      const doc = await db.get(docId, {conflicts: true, revs: true});
      doc._rev.should.equal(rev3);
      doc._conflicts.should.eql([rev2_]);

      await db.get(docId, {conflicts: true, revs: true, rev: rev2_});
    });

    it('force put ok on 2nd level', async () => {
      const db = new PouchDB(dbs.name);
      const docId = "docId";
      let rev2, rev3, rev4, rev3_;
      // given
      const result1 = await db.put({_id: docId, update: 1});
      const result2 = await db.put({_id: docId, update: 2, _rev: result1.rev});
      rev2 = result2.rev;
      const result3 = await db.put({_id: docId, update: 3.1, _rev: rev2});
      rev3 = result3.rev;
      const result4 = await db.put({_id: docId, update: 4, _rev: rev3});
      // when
      rev4 = result4.rev;
      const result5 = await db.put({_id: docId, update:3.2, _rev: rev2}, {force: true});
      // then
      rev3_ = result5.rev;
      rev3_.should.not.equal(rev4);
      rev3_.substring(0, 2).should.equal('3-');
      should.exist(result5.ok, 'update based on nonleaf revision');

      const doc = await db.get(docId, {conflicts: true, revs: true});
      doc._rev.should.equal(rev4);
      doc._conflicts.should.eql([rev3_]);

      await db.get(docId, {conflicts: true, revs: true, rev: rev3_});
    });

    // Each revision includes a list of previous revisions. The
    // revision with the longest revision history list becomes the
    // winning revision. If they are the same, the _rev values are
    // compared in ASCII sort order, and the highest wins. So, in our
    // example, 2-de0ea16f8621cbac506d23a0fbbde08a beats
    // 2-7c971bb974251ae8541b8fe045964219.

    it('Conflict resolution 1', async () => {
      const docs = [
        {
          _id: 'fubar',
          _rev: '1-a',
          _revisions: {
            start: 1,
            ids: [ 'a' ]
          }
        }, {
          _id: 'fubar',
          _rev: '1-b',
          _revisions: {
            start: 1,
            ids: [ 'b' ]
          }
        }, {
          _id: 'fubar',
          _rev: '1-1',
          _revisions: {
            start: 1,
            ids: [ '1' ]
          }
        }
      ];
      const db = new PouchDB(dbs.name);
      await db.bulkDocs({ docs, new_edits: false });
      const doc = await db.get('fubar');
      doc._rev.should.equal('1-b', 'Correct revision wins');
      await db.bulkDocs({
        new_edits: false,
        docs: [{
          _id: 'fubar',
          _rev: '2-2',
          _revisions: {
            start: 2,
            ids: [ '2', '1' ]
          }
        }]
      });
      const doc2 = await db.get('fubar');
      doc2._rev.should.equal('2-2', 'Correct revision wins');
    });

    it('Conflict resolution 2', async () => {
      const docs = [
        {
          _id: 'fubar',
          _rev: '2-a',
          _revisions: {
            start: 2,
            ids: [ 'a' ]
          }
        }, {
          _id: 'fubar',
          _rev: '1-b',
          _revisions: {
            start: 1,
            ids: [ 'b' ]
          }
        }
      ];
      const db = new PouchDB(dbs.name);
      await db.bulkDocs({ docs, new_edits: false });
      const doc = await db.get('fubar');
      doc._rev.should.equal('2-a', 'Correct revision wins');
      const info = await db.info();
      info.doc_count.should.equal(1, 'Correct number of docs');
    });

    it('Conflict resolution 3', async () => {
      const docs = [
        {
          _id: 'fubar',
          _rev: '10-a',
          _revisions: {
            start: 10,
            ids: [ 'a' ]
          }
        }, {
          _id: 'fubar',
          _rev: '2-b',
          _revisions: {
            start: 2,
            ids: [ 'b' ]
          }
        }
      ];
      const db = new PouchDB(dbs.name);
      await db.bulkDocs({ docs, new_edits: false });
      const doc = await db.get('fubar');
      doc._rev.should.equal('10-a', 'Correct revision wins');
      const info = await db.info();
      info.doc_count.should.equal(1, 'Correct number of docs');
    });

    it('Conflict resolution 4-a', async () => {
      const docs = [
        {
          _id: 'fubar',
          _rev: '1-a1',
          _revisions: { start: 1, ids: [ 'a1' ] }
        }, {
          _id: 'fubar',
          _rev: '2-a2',
          _revisions: { start: 2, ids: [ 'a2', 'a1' ] }
        }, {
          _id: 'fubar',
          _deleted: true,
          _rev: '3-a3',
          _revisions: { start: 3, ids: [ 'a3', 'a2', 'a1' ] }
        }, {
          _id: 'fubar',
          _rev: '1-b1',
          _revisions: { start: 1, ids: [ 'b1' ] }
        }
      ];
      const db = new PouchDB(dbs.name);
      await db.bulkDocs({ docs, new_edits: false });
      const doc = await db.get('fubar');
      doc._rev.should.equal('1-b1', 'Correct revision wins');
      const info = await db.info();
      info.doc_count.should.equal(1, 'Correct number of docs');
    });

    it('Conflict resolution 4-b', async () => {
      const docs = [
        {
          _id: 'fubar',
          _deleted: true,
          _rev: '3-a3',
          _revisions: { start: 3, ids: [ 'a3', 'a2', 'a1' ] }
        }, {
          _id: 'fubar',
          _rev: '2-a2',
          _revisions: { start: 2, ids: [ 'a2', 'a1' ] }
        }, {
          _id: 'fubar',
          _rev: '1-a1',
          _revisions: { start: 1, ids: [ 'a1' ] }
        }, {
          _id: 'fubar',
          _rev: '1-b1',
          _revisions: { start: 1, ids: [ 'b1' ] }
        }
      ];
      const db = new PouchDB(dbs.name);
      await db.bulkDocs({ docs, new_edits: false });
      const doc = await db.get('fubar');
      doc._rev.should.equal('1-b1', 'Correct revision wins');
      const info = await db.info();
      info.doc_count.should.equal(1, 'Correct number of docs');
    });

    it('Conflict resolution 4-c', async () => {
      const docs = [
        {
          _id: 'fubar',
          _rev: '1-a1',
          _revisions: { start: 1, ids: [ 'a1' ] }
        }, {
          _id: 'fubar',
          _rev: '1-b1',
          _revisions: { start: 1, ids: [ 'b1' ] }
        }, {
          _id: 'fubar',
          _rev: '2-a2',
          _revisions: { start: 2, ids: [ 'a2', 'a1' ] }
        }, {
          _id: 'fubar',
          _deleted: true,
          _rev: '3-a3',
          _revisions: { start: 3, ids: [ 'a3', 'a2', 'a1' ] }
        }
      ];
      const db = new PouchDB(dbs.name);
      await db.bulkDocs({ docs, new_edits: false });
      const doc = await db.get('fubar');
      doc._rev.should.equal('1-b1', 'Correct revision wins');
      const info = await db.info();
      info.doc_count.should.equal(1, 'Correct number of docs');
    });

    it('Conflict resolution 4-d', async () => {
      const docs = [
        {
          _id: 'fubar',
          _rev: '1-a1',
          _revisions: { start: 1, ids: [ 'a1' ] }
        }, {
          _id: 'fubar',
          _rev: '1-b1',
          _revisions: { start: 1, ids: [ 'b1' ] }
        }, {
          _id: 'fubar',
          _rev: '2-a2',
          _revisions: { start: 2, ids: [ 'a2', 'a1' ] }
        }, {
          _id: 'fubar',
          _deleted: true,
          _rev: '3-a3',
          _revisions: { start: 3, ids: [ 'a3', 'a2', 'a1' ] }
        }
      ];
      const db = new PouchDB(dbs.name);
      await db.bulkDocs({ docs, new_edits: false });
      const doc = await db.get('fubar');
      doc._rev.should.equal('1-b1', 'Correct revision wins');
      const info = await db.info();
      info.doc_count.should.equal(1, 'Correct number of docs');
    });

    it('Conflict resolution 4-e', async () => {
      const docs = [
        {
          _id: 'fubar',
          _deleted: true,
          _rev: '3-a3',
          _revisions: { start: 3, ids: [ 'a3', 'a2', 'a1' ] }
        }, {
          _id: 'fubar',
          _rev: '2-a2',
          _revisions: { start: 2, ids: [ 'a2', 'a1' ] }
        }, {
          _id: 'fubar',
          _rev: '1-b1',
          _revisions: { start: 1, ids: [ 'b1' ] }
        }, {
          _id: 'fubar',
          _rev: '1-a1',
          _revisions: { start: 1, ids: [ 'a1' ] }
        }
      ];
      const db = new PouchDB(dbs.name);
      await db.bulkDocs({ docs, new_edits: false });
      const doc = await db.get('fubar');
      doc._rev.should.equal('1-b1', 'Correct revision wins');
      const info = await db.info();
      info.doc_count.should.equal(1, 'Correct number of docs');
    });

    it('Conflict resolution 5-a', async () => {
      const docs = [
        {
          _id: 'fubar',
          _rev: '2-a2',
          _revisions: { start: 2, ids: [ 'a2', 'a1' ] }
        }, {
          _id: 'fubar',
          _deleted: true,
          _rev: '1-b1',
          _revisions: { start: 1, ids: [ 'b1' ] }
        }, {
          _id: 'fubar',
          _deleted: true,
          _rev: '1-c1',
          _revisions: { start: 1, ids: [ 'c1' ] }
        }
      ];
      const db = new PouchDB(dbs.name);
      await db.bulkDocs({ docs, new_edits: false });
      const doc = await db.get('fubar');
      doc._rev.should.equal('2-a2', 'Correct revision wins');
      const info = await db.info();
      info.doc_count.should.equal(1, 'Correct number of docs');
    });

    it('Conflict resolution 5-b', async () => {
      const docs = [
        {
          _id: 'fubar',
          _deleted: true,
          _rev: '1-b1',
          _revisions: { start: 1, ids: [ 'b1' ] }
        }, {
          _id: 'fubar',
          _rev: '2-a2',
          _revisions: { start: 2, ids: [ 'a2', 'a1' ] }
        }, {
          _id: 'fubar',
          _deleted: true,
          _rev: '1-c1',
          _revisions: { start: 1, ids: [ 'c1' ] }
        }
      ];
      const db = new PouchDB(dbs.name);
      await db.bulkDocs({ docs, new_edits: false });
      const doc = await db.get('fubar');
      doc._rev.should.equal('2-a2', 'Correct revision wins');
      const info = await db.info();
      info.doc_count.should.equal(1, 'Correct number of docs');
    });

    it('Conflict resolution 5-c', async () => {
      const docs = [
        {
          _id: 'fubar',
          _deleted: true,
          _rev: '1-b1',
          _revisions: { start: 1, ids: [ 'b1' ] }
        }, {
          _id: 'fubar',
          _deleted: true,
          _rev: '1-c1',
          _revisions: { start: 1, ids: [ 'c1' ] }
        }, {
          _id: 'fubar',
          _rev: '2-a2',
          _revisions: { start: 2, ids: [ 'a2', 'a1' ] }
        }
      ];
      const db = new PouchDB(dbs.name);
      await db.bulkDocs({ docs, new_edits: false });
      const doc = await db.get('fubar');
      doc._rev.should.equal('2-a2', 'Correct revision wins');
      const info = await db.info();
      info.doc_count.should.equal(1, 'Correct number of docs');
    });

    it('#2543 excessive recursion with merging', async () => {
      const db = new PouchDB(dbs.name);

      const addTask = (batch) => async () => {
        const docs = [];
        for (let i = 0; i < 50; i++) {
          const hash = batch + 'a' +  i;
          docs.push({
            _id: 'foo',
            _rev: `2-${hash}`,
            _revisions: {
              start: 2,
              ids: [hash, 'a']
            }
          });
        }
        return db.bulkDocs(docs, {new_edits: false});
      };

      await db.bulkDocs([{
        _id: 'foo',
        _rev: '1-a'
      }], {new_edits: false});

      for (let i = 0; i < 10; i++) {
        await addTask(i)();
      }
    });

    it('5832 - update losing leaf returns correct rev', async () => {
      // given
      const docs = [
        {
          _id: 'fubar',
          _rev: '1-a1',
          _revisions: { start: 1, ids: [ 'a1' ] }
        }, {
          _id: 'fubar',
          _rev: '2-a2',
          _revisions: { start: 2, ids: [ 'a2', 'a1' ] }
        }, {
          _id: 'fubar',
          _rev: '2-b2',
          _revisions: { start: 2, ids: [ 'b2', 'a1' ] }
        }
      ];
      const db = new PouchDB(dbs.name);
      await db.bulkDocs({ docs, new_edits: false });
      const doc = await db.get('fubar', { conflicts: true });
      const result = await db.remove(doc);
      result.rev[0].should.equal('3');
    });

  });
});
