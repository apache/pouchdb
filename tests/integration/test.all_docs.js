'use strict';

const adapters = ['http', 'local'];

adapters.forEach((adapter) => {
  describe(`test.all_docs.js-${adapter}`, () => {

    const dbs = {};

    beforeEach(() => {
      dbs.name = testUtils.adapterUrl(adapter, 'testdb');
    });

    afterEach((done) => {
      testUtils.cleanup([dbs.name], done);
    });

    const origDocs = [
      {_id: '0', a: 1, b: 1},
      {_id: '3', a: 4, b: 16},
      {_id: '1', a: 2, b: 4},
      {_id: '2', a: 3, b: 9}
    ];

    it('Testing all docs', (done) => {
      const db = new PouchDB(dbs.name);
      testUtils.writeDocs(db, JSON.parse(JSON.stringify(origDocs)),
        () => {
        db.allDocs((err, result) => {
          should.not.exist(err);
          const rows = result.rows;
          result.total_rows.should.equal(4, 'correct number of results');
          for (let i = 0; i < rows.length; i++) {
            rows[i].id.should.be.at.least('0');
            rows[i].id.should.be.at.most('4');
          }
          db.allDocs({
            startkey: '2',
            include_docs: true
          }, (err, all) => {
            all.rows.should.have
              .length(2, 'correct number when opts.startkey set');
            all.rows[0].id.should
              .equal('2', 'correct docs when opts.startkey set');
            const opts = {
              startkey: 'org.couchdb.user:',
              endkey: 'org.couchdb.user;'
            };
            db.allDocs(opts, (err, raw) => {
              raw.rows.should.have.length(0, 'raw collation');
              const ids = ['0', '3', '1', '2'];
              db.changes().on('complete', (changes) => {
                // order of changes is not guaranteed in a
                // clustered changes feed
                changes.results.forEach((row) => {
                  ids.should.include(row.id, 'seq order');
                });
                db.changes({
                  descending: true
                }).on('complete', (changes) => {
                  // again, order is not guaranteed so
                  // unsure if this is a useful test
                  const ids = ['2', '1', '3', '0'];
                  changes.results.forEach((row) => {
                    ids.should.include(row.id, 'descending=true');
                  });
                  done();
                }).on('error', done);
              }).on('error', done);
            });
          });
        });
      });
    });

    it('Testing allDocs opts.keys', async () => {
      const db = new PouchDB(dbs.name);
      const keyFunc = (doc) => doc.key;
      let keys;
      await db.bulkDocs(origDocs);
      keys = ['3', '1'];
      let result = await db.allDocs({keys});
      result.rows.map(keyFunc).should.deep.equal(keys);
      keys = ['2', '0', '1000'];
      result = await db.allDocs({ keys });
      result.rows.map(keyFunc).should.deep.equal(keys);
      result.rows[2].error.should.equal('not_found');
      result = await db.allDocs({
        keys,
        descending: true
      });
      result.rows.map(keyFunc).should.deep.equal(['1000', '0', '2']);
      result.rows[0].error.should.equal('not_found');
      try {
        await db.allDocs({
          keys,
          startkey: 'a'
        });
        throw new Error('expected an error');
      } catch (err) {
        should.exist(err);
      }
      try {
        await db.allDocs({
          keys,
          endkey: 'a'
        });
        throw new Error('expected an error');
      } catch (err) {
        should.exist(err);
      }
      result = await db.allDocs({keys: []});
      result.rows.should.have.length(0);
      const doc = await db.get('2');
      await db.remove(doc);
      result = await db.allDocs({
        keys,
        include_docs: true
      });
      result.rows.map(keyFunc).should.deep.equal(keys);
      result.rows[keys.indexOf('2')].value.deleted.should.equal(true, 'deleted doc with keys option');
      (result.rows[keys.indexOf('2')].doc === null).should.equal(true, 'deleted doc with keys option');
    });

    it('Testing allDocs opts.keys with skip', async () => {
      const db = new PouchDB(dbs.name);
      await db.bulkDocs(origDocs);
      const res = await db.allDocs({
        keys: ['3', '1'],
        skip: 1
      });
      res.total_rows.should.equal(4);
      res.rows.should.have.length(1);
      res.rows[0].id.should.equal('1');
    });

    it('Testing allDocs opts.keys with limit', async () => {
      const db = new PouchDB(dbs.name);
      await db.bulkDocs(origDocs);
      let res = await db.allDocs({
        keys: ['3', '1'],
        limit: 1
      });
      res.total_rows.should.equal(4);
      res.rows.should.have.length(1);
      res.rows[0].id.should.equal('3');
      res = await db.allDocs({
        keys: ['0', '2'],
        limit: 3
      });
      res.rows.should.have.length(2);
      res.rows[0].id.should.equal('0');
      res.rows[1].id.should.equal('2');
    });

    it('Testing allDocs invalid opts.keys', async () => {
      const db = new PouchDB(dbs.name);
      try {
        await db.allDocs({keys: 1234});
        throw new Error('should not be here');
      } catch (err) {
        should.exist(err);
      }
    });

    it('Testing deleting in changes', (done) => {
      const db = new PouchDB(dbs.name);

      db.info((err, info) => {
        const update_seq = info.update_seq;

        testUtils.writeDocs(db, JSON.parse(JSON.stringify(origDocs)),
          () => {
          db.get('1', (err, doc) => {
            db.remove(doc, (err, deleted) => {
              should.exist(deleted.ok);

              db.changes({
                return_docs: true,
                since: update_seq
              }).on('complete', (changes) => {
                const deleted_ids = changes.results.map((c) => {
                  if (c.deleted) { return c.id; }
                });
                deleted_ids.should.include('1');

                done();
              }).on('error', done);
            });
          });
        });
      });
    });

    it('Testing updating in changes', (done) => {
      const db = new PouchDB(dbs.name);

      db.info((err, info) => {
        const update_seq = info.update_seq;

        testUtils.writeDocs(db, JSON.parse(JSON.stringify(origDocs)),
          () => {
          db.get('3', (err, doc) => {
            doc.updated = 'totally';
            db.put(doc, () => {
              db.changes({
                return_docs: true,
                since: update_seq
              }).on('complete', (changes) => {
                const ids = changes.results.map((c) => c.id);
                ids.should.include('3');

                done();
              }).on('error', done);
            });
          });
        });
      });
    });

    it('Testing include docs', (done) => {
      const db = new PouchDB(dbs.name);
      testUtils.writeDocs(db, JSON.parse(JSON.stringify(origDocs)),
        () => {
        db.changes({
          include_docs: true
        }).on('complete', (changes) => {
          changes.results.forEach((row) => {
            if (row.id === '0') {
              row.doc.a.should.equal(1);
            }
          });
          done();
        }).on('error', done);
      });
    });

    it('Testing conflicts', (done) => {
      const db = new PouchDB(dbs.name);
      testUtils.writeDocs(db, JSON.parse(JSON.stringify(origDocs)),
        () => {
        // add conflicts
        const conflictDoc1 = {
          _id: '3',
          _rev: '2-aa01552213fafa022e6167113ed01087',
          value: 'X'
        };
        const conflictDoc2 = {
          _id: '3',
          _rev: '2-ff01552213fafa022e6167113ed01087',
          value: 'Z'
        };
        db.put(conflictDoc1, { new_edits: false }, () => {
          db.put(conflictDoc2, { new_edits: false }, () => {
            db.get('3', (err, winRev) => {
              winRev._rev.should.equal(conflictDoc2._rev);
              db.changes({
                return_docs: true,
                include_docs: true,
                conflicts: true,
                style: 'all_docs'
              }).on('complete', (changes) => {
                changes.results.map((x) => x.id).sort()
                  .should.deep.equal(['0', '1', '2', '3'],
                    'all ids are in _changes');

                const result = changes.results.filter((row) => {
                  return row.id === '3';
                })[0];

                result.changes.should.have
                  .length(3, 'correct number of changes');
                result.doc._rev.should.equal(conflictDoc2._rev);
                result.doc._id.should.equal('3', 'correct doc id');
                winRev._rev.should.equal(result.doc._rev);
                result.doc._conflicts.should.be.instanceof(Array);
                result.doc._conflicts.should.have.length(2);
                conflictDoc1._rev.should.equal(result.doc._conflicts[0]);

                db.allDocs({
                  include_docs: true,
                  conflicts: true
                }, (err, res) => {
                  const row = res.rows[3];
                  res.rows.should.have.length(4, 'correct number of changes');
                  row.key.should.equal('3', 'correct key');
                  row.id.should.equal('3', 'correct id');
                  row.value.rev.should.equal(winRev._rev, 'correct rev');
                  row.doc._rev.should.equal(winRev._rev, 'correct rev');
                  row.doc._id.should.equal('3', 'correct order');
                  row.doc._conflicts.should.be.instanceof(Array);
                  row.doc._conflicts.should.have.length(2);
                  conflictDoc1._rev.should
                    .equal(res.rows[3].doc._conflicts[0]);
                  done();
                });
              }).on('error', done);
            });
          });
        });
      });
    });

    it('test basic collation', async () => {
      const db = new PouchDB(dbs.name);
      const docs = {
        docs: [
          {_id: 'z', foo: 'z'},
          {_id: 'a', foo: 'a'}
        ]
      };
      await db.bulkDocs(docs);
      const result = await db.allDocs({
        startkey: 'z',
        endkey: 'z'
      });
      result.rows.should.have.length(1, 'Exclude a result');
    });

    it('3883 start_key end_key aliases', async () => {
      const db = new PouchDB(dbs.name);
      const docs = [{_id: 'a', foo: 'a'}, {_id: 'z', foo: 'z'}];
      await db.bulkDocs(docs);
      const result = await db.allDocs({start_key: 'z', end_key: 'z'});
      result.rows.should.have.length(1, 'Exclude a result');
    });

    it('test total_rows with a variety of criteria', async function () {
      this.timeout(20000);
      const db = new PouchDB(dbs.name);

      const docs = [
        {_id : '0'},
        {_id : '1'},
        {_id : '2'},
        {_id : '3'},
        {_id : '4'},
        {_id : '5'},
        {_id : '6'},
        {_id : '7'},
        {_id : '8'},
        {_id : '9'}
      ];
      const bulkRes = await db.bulkDocs({docs});
      docs[3]._deleted = true;
      docs[7]._deleted = true;
      docs[3]._rev = bulkRes[3].rev;
      docs[7]._rev = bulkRes[7].rev;
      await db.remove(docs[3]);
      await db.remove(docs[7]);

      let res = await db.allDocs();
      res.rows.should.have.length(8,  'correctly return rows');
      res.total_rows.should.equal(8,  'correctly return total_rows');
      res = await db.allDocs({startkey : '5'});
      res.rows.should.have.length(4,  'correctly return rows');
      res.total_rows.should.equal(8,  'correctly return total_rows');
      res = await db.allDocs({startkey : '5', skip : 2, limit : 10});
      res.rows.should.have.length(2,  'correctly return rows');
      res.total_rows.should.equal(8,  'correctly return total_rows');
      res = await db.allDocs({startkey : '5', limit : 0});
      res.rows.should.have
        .length(0,  'correctly return rows, startkey w/ limit=0');
      res.total_rows.should.equal(8,  'correctly return total_rows');
      res = await db.allDocs({keys : ['5'], limit : 0});
      res.rows.should.have
        .length(0,  'correctly return rows, keys w/ limit=0');
      res.total_rows.should.equal(8,  'correctly return total_rows');
      res = await db.allDocs({limit : 0});
      res.rows.should.have.length(0,  'correctly return rows, limit=0');
      res.total_rows.should.equal(8,  'correctly return total_rows');
      res = await db.allDocs({startkey : '5', descending : true, skip : 1});
      res.rows.should.have.length(4,  'correctly return rows');
      res.total_rows.should.equal(8,  'correctly return total_rows');
      res = await db.allDocs({startkey : '5', endkey : 'z'});
      res.rows.should.have.length(4,  'correctly return rows');
      res.total_rows.should.equal(8,  'correctly return total_rows');
      res = await db.allDocs({startkey : '5', endkey : '5'});
      res.rows.should.have.length(1,  'correctly return rows');
      res.total_rows.should.equal(8,  'correctly return total_rows');
      res = await db.allDocs({startkey : '5', endkey : '4'});
      res.rows.should.have.length(0,  'correctly return rows');
      res.total_rows.should.equal(8,  'correctly return total_rows');
      res = await db.allDocs({startkey : '5', endkey : '4', descending : true});
      res.rows.should.have.length(2,  'correctly return rows');
      res.total_rows.should.equal(8,  'correctly return total_rows');
      res = await db.allDocs({startkey : '3', endkey : '7', descending : false});
      res.rows.should.have.length(3,  'correctly return rows');
      res.total_rows.should.equal(8,  'correctly return total_rows');
      res = await db.allDocs({startkey : '7', endkey : '3', descending : true});
      res.rows.should.have.length(3,  'correctly return rows');
      res.total_rows.should.equal(8,  'correctly return total_rows');
      res = await db.allDocs({startkey : '', endkey : '0'});
      res.rows.should.have.length(1,  'correctly return rows');
      res.total_rows.should.equal(8,  'correctly return total_rows');
      res = await db.allDocs({keys : ['0', '1', '3']});
      res.rows.should.have.length(3,  'correctly return rows');
      res.total_rows.should.equal(8,  'correctly return total_rows');
      res = await db.allDocs({keys : ['0', '1', '0', '2', '1', '1']});
      res.rows.should.have.length(6,  'correctly return rows');
      res.rows.map((row) => row.key).should.deep.equal(
        ['0', '1', '0', '2', '1', '1']);
      res.total_rows.should.equal(8,  'correctly return total_rows');
      res = await db.allDocs({keys : []});
      res.rows.should.have.length(0,  'correctly return rows');
      res.total_rows.should.equal(8,  'correctly return total_rows');
      res = await db.allDocs({keys : ['7']});
      res.rows.should.have.length(1,  'correctly return rows');
      res.total_rows.should.equal(8,  'correctly return total_rows');
      res = await db.allDocs({key : '3'});
      res.rows.should.have.length(0,  'correctly return rows');
      res.total_rows.should.equal(8,  'correctly return total_rows');
      res = await db.allDocs({key : '2'});
      res.rows.should.have.length(1,  'correctly return rows');
      res.total_rows.should.equal(8,  'correctly return total_rows');
      res = await db.allDocs({key : 'z'});
      res.rows.should.have.length(0,  'correctly return rows');
      res.total_rows.should.equal(8,  'correctly return total_rows');
    });

    it('test total_rows with a variety of criteria * 100', async () => {
      const db = new PouchDB(dbs.name);

      const docs = [];
      for (let i=0; i<1000; ++i) {
        docs.push({ _id:i.toString().padStart(5, '0') });
      }

      const bulkRes = await db.bulkDocs({docs});
      const deletes = [];
      for (let i=300; i<400; ++i) {
        docs[i]._deleted = true;
        docs[i]._rev = bulkRes[i].rev;
        deletes.push(docs[i]);
      }
      for (let i=700; i<800; ++i) {
        docs[i]._deleted = true;
        docs[i]._rev = bulkRes[i].rev;
        deletes.push(docs[i]);
      }
      if (adapter === 'http') {
        const serverType = await testUtils.getServerType();
        if (serverType === 'pouchdb-express-router') {
          // Workaround for https://github.com/pouchdb/pouchdb-express-router/issues/18
          await deletes.reduce(
            (chain, doc) => chain.then(() => db.remove(doc)),
            Promise.resolve(),
          );
        } else {
          const deleted = await Promise.all(deletes.map(doc => db.remove(doc)));
          deleted.should.have.length(200);
        }
      } else {
        const deleted = await Promise.all(deletes.map(doc => db.remove(doc)));
        deleted.should.have.length(200);
      }

      let res = await db.allDocs();
      res.rows.should.have.length(800,  'correctly return rows');
      res.total_rows.should.equal(800,  'correctly return total_rows');
      res = await db.allDocs({startkey : '00500'});
      res.rows.should.have.length(400,  'correctly return rows');
      res.total_rows.should.equal(800,  'correctly return total_rows');
      res = await db.allDocs({startkey : '00500', skip : 200, limit : 1000});
      res.rows.should.have.length(200,  'correctly return rows');
      res.total_rows.should.equal(800,  'correctly return total_rows');
      res = await db.allDocs({startkey : '00500', limit : 0});
      res.rows.should.have
        .length(0,  'correctly return rows, startkey w/ limit=0');
      res.total_rows.should.equal(800,  'correctly return total_rows');
      res = await db.allDocs({keys : ['00500'], limit : 0});
      res.rows.should.have
        .length(0,  'correctly return rows, keys w/ limit=0');
      res.total_rows.should.equal(800,  'correctly return total_rows');
      res = await db.allDocs({limit : 0});
      res.rows.should.have.length(0,  'correctly return rows, limit=0');
      res.total_rows.should.equal(800,  'correctly return total_rows');
      res = await db.allDocs({startkey : '00500', descending : true, skip : 1});
      res.rows.should.have.length(400,  'correctly return rows');
      res.total_rows.should.equal(800,  'correctly return total_rows');
      res = await db.allDocs({startkey : '00500', endkey : 'z'});
      res.rows.should.have.length(400,  'correctly return rows');
      res.total_rows.should.equal(800,  'correctly return total_rows');
      res = await db.allDocs({startkey : '00500', endkey : '00500'});
      res.rows.should.have.length(1,  'correctly return rows');
      res.total_rows.should.equal(800,  'correctly return total_rows');
      res = await db.allDocs({startkey : '00500', endkey : '00400'});
      res.rows.should.have.length(0,  'correctly return rows');
      res.total_rows.should.equal(800,  'correctly return total_rows');
      res = await db.allDocs({startkey : '00599', endkey : '00400', descending : true});
      res.rows.should.have.length(200,  'correctly return rows');
      res.total_rows.should.equal(800,  'correctly return total_rows');
      res = await db.allDocs({startkey:'00599', endkey:'00400', descending:true, inclusive_end:false });
      res.rows.should.have.length(199,  'correctly return rows');
      res.total_rows.should.equal(800,  'correctly return total_rows');
      res = await db.allDocs({startkey : '00300', endkey : '00799', descending : false});
      res.rows.should.have.length(300,  'correctly return rows');
      res.total_rows.should.equal(800,  'correctly return total_rows');
      res = await db.allDocs({startkey:'00300', endkey:'00799', descending:false, inclusive_end:false });
      res.rows.should.have.length(300,  'correctly return rows');
      res.total_rows.should.equal(800,  'correctly return total_rows');
      res = await db.allDocs({startkey : '00799', endkey : '00300', descending : true});
      res.rows.should.have.length(300,  'correctly return rows');
      res.total_rows.should.equal(800,  'correctly return total_rows');
      res = await db.allDocs({startkey : '', endkey : '00000'});
      res.rows.should.have.length(1,  'correctly return rows');
      res.total_rows.should.equal(800,  'correctly return total_rows');
      res = await db.allDocs({keys : ['00000', '00100', '00300']});
      res.rows.should.have.length(3,  'correctly return rows');
      res.total_rows.should.equal(800,  'correctly return total_rows');
      res = await db.allDocs({keys : ['00000', '00100', '00000', '00200', '00100', '00100']});
      res.rows.should.have.length(6,  'correctly return rows');
      res.rows.map((row) => row.key).should.deep.equal(
        ['00000', '00100', '00000', '00200', '00100', '00100']);
      res.total_rows.should.equal(800,  'correctly return total_rows');
      res = await db.allDocs({keys : []});
      res.rows.should.have.length(0,  'correctly return rows');
      res.total_rows.should.equal(800,  'correctly return total_rows');
      res = await db.allDocs({keys : ['00700']});
      res.rows.should.have.length(1,  'correctly return rows');
      res.total_rows.should.equal(800,  'correctly return total_rows');
      res = await db.allDocs({key : '00300'});
      res.rows.should.have.length(0,  'correctly return rows');
      res.total_rows.should.equal(800,  'correctly return total_rows');
      res = await db.allDocs({key : '00200'});
      res.rows.should.have.length(1,  'correctly return rows');
      res.total_rows.should.equal(800,  'correctly return total_rows');
      res = await db.allDocs({key : 'z'});
      res.rows.should.have.length(0,  'correctly return rows');
      res.total_rows.should.equal(800,  'correctly return total_rows');
    });

    it('test total_rows with both skip and limit', async () => {
      const db = new PouchDB(dbs.name);
      const docs = {
        docs: [
          {_id: "w", foo: "w"},
          {_id: "x", foo: "x"},
          {_id: "y", foo: "y"},
          {_id: "z", foo: "z"}
        ]
      };
      await db.bulkDocs(docs);
      let res = await db.allDocs({ startkey: 'x', limit: 1, skip : 1});
      res.total_rows.should.equal(4,  'Accurately return total_rows count');
      res.rows.should.have.length(1,  'Correctly limit the returned rows');
      res.rows[0].id.should.equal('y', 'Correctly skip 1 doc');

      const xDoc = await db.get('x');
      await db.remove(xDoc);
      res = await db.allDocs({ startkey: 'w', limit: 2, skip : 1});
      res.total_rows.should
        .equal(3,  'Accurately return total_rows count after delete');
      res.rows.should.have
        .length(2,  'Correctly limit the returned rows after delete');
      res.rows[0].id.should
        .equal('y', 'Correctly skip 1 doc after delete');
    });

    it('test limit option and total_rows', async () => {
      const db = new PouchDB(dbs.name);
      const docs = {
        docs: [
          {_id: 'z', foo: 'z'},
          {_id: 'a', foo: 'a'}
        ]
      };
      await db.bulkDocs(docs);
      const res = await db.allDocs({
        startkey: 'a',
        limit: 1
      });
      res.total_rows.should.equal(2, 'Accurately return total_rows count');
      res.rows.should.have.length(1, 'Correctly limit the returned rows.');
    });

    it('test escaped startkey/endkey', async () => {
      const db = new PouchDB(dbs.name);
      const id1 = '"weird id!" a';
      const id2 = '"weird id!" z';
      const docs = {
        docs: [
          {
            _id: id1,
            foo: 'a'
          },
          {
            _id: id2,
            foo: 'z'
          }
        ]
      };
      await db.bulkDocs(docs);
      const res = await db.allDocs({
        startkey: id1,
        endkey: id2
      });
      res.total_rows.should.equal(2, 'Accurately return total_rows count');
    });

    it('test "key" option', async () => {
      const db = new PouchDB(dbs.name);
      await db.bulkDocs({
        docs: [
          { _id: '0' },
          { _id: '1' },
          { _id: '2' }
        ]
      });
      const res = await db.allDocs({ key: '1' });
      res.rows.should.have.length(1, 'key option returned 1 doc');
      try {
        await db.allDocs({
          key: '1',
          keys: [
            '1',
            '2'
          ]
        });
        should.fail('expected an error');
      } catch (err) {
        should.exist(err);
      }
      await db.allDocs({
        key: '1',
        startkey: '1'
      });
      await db.allDocs({
        key: '1',
        endkey: '1'
      });
      // when mixing key/startkey or key/endkey, the results
      // are very weird and probably undefined, so don't go beyond
      // verifying that there's no error
    });

    it('test inclusive_end=false', async () => {
      const db = new PouchDB(dbs.name);
      const docs = [
        { _id: '1' },
        { _id: '2' },
        { _id: '3' },
        { _id: '4' }
      ];
      await db.bulkDocs({docs});
      let res = await db.allDocs({inclusive_end: false, endkey: '2'});
      res.rows.should.have.length(1);
      res = await db.allDocs({inclusive_end: false, endkey: '1'});
      res.rows.should.have.length(0);
      res = await db.allDocs({inclusive_end: false, endkey: '1',
                       startkey: '0'});
      res.rows.should.have.length(0);
      res = await db.allDocs({inclusive_end: false, endkey: '5'});
      res.rows.should.have.length(4);
      res = await db.allDocs({inclusive_end: false, endkey: '4'});
      res.rows.should.have.length(3);
      res = await db.allDocs({inclusive_end: false, endkey: '4',
                       startkey: '3'});
      res.rows.should.have.length(1);
      res = await db.allDocs({inclusive_end: false, endkey: '1',
                       descending: true});
      res.rows.should.have.length(3);
      res = await db.allDocs({inclusive_end: true, endkey: '4'});
      res.rows.should.have.length(4);
      res = await db.allDocs({
        descending: true,
        startkey: '3',
        endkey: '2',
        inclusive_end: false
      });
      res.rows.should.have.length(1);
    });

    it('test descending with startkey/endkey', async () => {
      const db = new PouchDB(dbs.name);
      await db.bulkDocs([
        {_id: 'a'},
        {_id: 'b'},
        {_id: 'c'},
        {_id: 'd'},
        {_id: 'e'}
      ]);
      let res = await db.allDocs({
        descending: true,
        startkey: 'd',
        endkey: 'b'
      });
      let ids = res.rows.map((x) => x.id);
      ids.should.deep.equal(['d', 'c', 'b']);
      res = await db.allDocs({
        descending: true,
        startkey: 'd',
        endkey: 'b',
        inclusive_end: false
      });
      ids = res.rows.map((x) => x.id);
      ids.should.deep.equal(['d', 'c']);
      res = await db.allDocs({
        descending: true,
        startkey: 'd',
        endkey: 'a',
        skip: 1,
        limit: 2
      });
      ids = res.rows.map((x) => x.id);
      ids.should.deep.equal(['c', 'b']);
      res = await db.allDocs({
        descending: true,
        startkey: 'd',
        endkey: 'a',
        skip: 1
      });
      ids = res.rows.map((x) => x.id);
      ids.should.deep.equal(['c', 'b', 'a']);
    });

    it('#3082 test wrong num results returned', async () => {
      const db = new PouchDB(dbs.name);
      const docs = [];
      for (let i = 0; i < 1000; i++) {
        docs.push({});
      }

      let lastkey;
      const allkeys = [];

      const paginate = async () => {
        const opts = {include_doc: true, limit: 100};
        if (lastkey) {
          opts.startkey = lastkey;
          opts.skip = 1;
        }
        const res = await db.allDocs(opts);
        if (!res.rows.length) {
          return;
        }
        if (lastkey) {
          res.rows[0].key.should.be.above(lastkey);
        }
        res.rows.should.have.length(100);
        lastkey = res.rows.pop().key;
        allkeys.push(lastkey);
        return paginate();
      };

      await db.bulkDocs(docs);
      await paginate();
      // try running all queries at once to try to isolate race condition
      await Promise.all(allkeys.map(async (key) => {
        const res = await db.allDocs({
          limit: 100,
          include_docs: true,
          startkey: key,
          skip: 1
        });
        if (!res.rows.length) {
          return;
        }
        res.rows[0].key.should.be.above(key);
        res.rows.should.have.length(100);
      }));
    });

    it('test empty db', async () => {
      const db = new PouchDB(dbs.name);
      const res = await db.allDocs();
      res.rows.should.have.length(0);
      res.total_rows.should.equal(0);
    });

    it('test after db close', async () => {
      const db = new PouchDB(dbs.name);
      await db.close();
      try {
        await db.allDocs();
      } catch (err) {
        err.message.should.equal('database is closed');
      }
    });

    if (adapter === 'local') { // chrome doesn't like \u0000 in URLs
      it('test unicode ids and revs', async () => {
        const db = new PouchDB(dbs.name);
        const id = 'baz\u0000';
        const putRes = await db.put({_id: id});
        const rev = putRes.rev;
        const doc = await db.get(id);
        doc._id.should.equal(id);
        doc._rev.should.equal(rev);
        const res = await db.allDocs({keys: [id]});
        res.rows.should.have.length(1);
        res.rows[0].value.rev.should.equal(rev);
      });
    }

    it('5793 _conflicts should not exist if no conflicts', async () => {
      const db = new PouchDB(dbs.name);
      await db.put({
        _id: '0', a: 1
      });
      const result = await db.allDocs({
        include_docs: true,
        conflicts: true
      });
      should.not.exist(result.rows[0].doc._conflicts);
    });

    it('#6230 Test allDocs opts update_seq: false', async () => {
      const db = new PouchDB(dbs.name);
      await db.bulkDocs(origDocs);
      const result = await db.allDocs({
        update_seq: false
      });
      result.rows.should.have.length(4);
      should.not.exist(result.update_seq);
    });


    it('#6230 Test allDocs opts update_seq: true', async () => {

      const db = new PouchDB(dbs.name);

      await db.bulkDocs(origDocs);
      const result = await db.allDocs({
        update_seq: true
      });
      result.rows.should.have.length(4);
      should.exist(result.update_seq);
      result.update_seq.should.satisfy((update_seq) => {
        if (typeof update_seq === 'number' || typeof update_seq === 'string') {
          return true;
        } else {
          return false;
        }
      });
      const normSeq = normalizeSeq(result.update_seq);
      normSeq.should.be.a('number');

      function normalizeSeq(seq) {
        try {
          if (typeof seq === 'string' && seq.indexOf('-') > 0) {
            return parseInt(seq.substring(0, seq.indexOf('-')));
          }
          return seq;
        } catch (err) {
          return seq;
        }
      }
    });

    it('#6230 Test allDocs opts with update_seq missing', async () => {
      const db = new PouchDB(dbs.name);
      await db.bulkDocs(origDocs);
      const result = await db.allDocs();
      result.rows.should.have.length(4);
      should.not.exist(result.update_seq);
    });
  });
});
