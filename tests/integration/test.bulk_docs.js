'use strict';

const adapters = ['local', 'http'];

function makeDocs(start, end, templateDoc) {
  const templateDocSrc = templateDoc ? JSON.stringify(templateDoc) : '{}';
  if (end === undefined) {
    end = start;
    start = 0;
  }
  const docs = [];
  for (let i = start; i < end; i++) {
    const newDoc = eval('(' + templateDocSrc + ')');
    newDoc._id = i.toString();
    newDoc.integer = i;
    newDoc.string = i.toString();
    docs.push(newDoc);
  }
  return docs;
}

adapters.forEach((adapter) => {
  describe(`test.bulk_docs.js-${adapter}`, () => {

    const dbs = {};

    beforeEach(() => {
      dbs.name = testUtils.adapterUrl(adapter, 'testdb');
    });

    afterEach(function (done) {
      testUtils.cleanup([dbs.name], done);
    });

    const authors = [
      {name: 'Dale Harvey', commits: 253},
      {name: 'Mikeal Rogers', commits: 42},
      {name: 'Johannes J. Schmidt', commits: 13},
      {name: 'Randall Leeds', commits: 9}
    ];

    it('Testing bulk docs', async () => {
      const db = new PouchDB(dbs.name);
      const docs = makeDocs(5);
      const results1 = await db.bulkDocs({ docs });
      results1.should.have.length(5, 'results length matches');
      for (let i = 0; i < 5; i++) {
        results1[i].id.should.equal(docs[i]._id, 'id matches');
        should.exist(results1[i].rev, 'rev is set');
        // Update the doc
        docs[i]._rev = results1[i].rev;
        docs[i].string = docs[i].string + '.00';
      }
      const results2 = await db.bulkDocs({ docs });
      results2.should.have.length(5, 'results length matches');
      for (let i = 0; i < 5; i++) {
        results2[i].id.should.equal(i.toString(), 'id matches again');
        // set the delete flag to delete the docs in the next step
        docs[i]._rev = results2[i].rev;
        docs[i]._deleted = true;
      }
      await db.put(docs[0]);
      const results3 = await db.bulkDocs({ docs });
      results3[0].name.should.equal(
        'conflict', 'First doc should be in conflict');
      should.not.exist(results3[0].rev, 'no rev in conflict');
      should.exist(results3[0].id);
      results3[0].id.should.equal("0");
      for (let i = 1; i < 5; i++) {
        results3[i].id.should.equal(i.toString());
        should.exist(results3[i].rev);
      }
    });

    it('#6039 test id in bulk docs for conflict', async () => {
      const db = new PouchDB(dbs.name);
      const docs = makeDocs(5);
      const res1 = await db.bulkDocs(docs);
      docs.forEach((doc, i) => {
        doc._rev = res1[i].rev;
      });
      docs[2]._rev = '3-totally_fake_rev';
      delete docs[4]._rev;
      let res = await db.bulkDocs(docs);
      const expected = [{
        "id": "0",
        "rev": "rev_placeholder"
      }, {
        "id": "1",
        "rev": "rev_placeholder"
      }, {
        "id": "2",
        "error": true,
        "name": "conflict",
        "status": 409
      }, {
        "id": "3",
        "rev": "rev_placeholder"
      }, {
        "id": "4",
        "error": true,
        "name": "conflict",
        "status": 409
      }];
      res = res.map((x) => {
        // parse+stringify to remove undefineds for comparison
        return JSON.parse(JSON.stringify({
          id: x.id,
          error: x.error && true,
          name: x.name,
          status: x.status,
          rev: (x.rev && "rev_placeholder")
        }));
      });
      res.should.deep.equal(expected);
    });

    it('No id in bulk docs', async () => {
      const db = new PouchDB(dbs.name);
      const newdoc = {
        '_id': 'foobar',
        'body': 'baz'
      };
      const doc = await db.put(newdoc);
      should.exist(doc.ok);
      const docs = [
        {
          '_id': newdoc._id,
          '_rev': newdoc._rev,
          'body': 'blam'
        },
        {
          '_id': newdoc._id,
          '_rev': newdoc._rev,
          '_deleted': true
        }
      ];
      const results = await db.bulkDocs({ docs });
      results[0].should.have.property('name', 'conflict');
      results[1].should.have.property('name', 'conflict');
    });

    it('No _rev and new_edits=false', async () => {
      const db = new PouchDB(dbs.name);
      const docs = [{
        _id: 'foo',
        integer: 1
      }];
      try {
        await db.bulkDocs({ docs }, { new_edits: false });
      } catch (err) {
        should.exist(err, 'error reported');
      }
    });

    it("7829 bare rev 1- with new_edits=false", async () => {
      const db = new PouchDB(dbs.name);
      const docs = [
        {
          _id: "foo",
          _rev: "1-",
          integer: 1
        }
      ];
      await db.bulkDocs({ docs }, { new_edits: false });
    });

    it('Test empty bulkDocs', () => {
      const db = new PouchDB(dbs.name);
      return db.bulkDocs([]);
    });

    it('Test many bulkDocs', async () => {
      const db = new PouchDB(dbs.name);
      const docs = [];
      for (let i = 0; i < 201; i++) {
        docs.push({_id: i.toString()});
      }
      await db.bulkDocs(docs);
    });

    it('Test errors on invalid doc id', async () => {
      const db = new PouchDB(dbs.name);
      const docs = [{
        '_id': '_invalid',
        foo: 'bar'
      }];
      try {
        await db.bulkDocs({ docs });
      } catch (err) {
        should.exist(err);
        err.status.should.equal(testUtils.errors.RESERVED_ID.status,
                            'correct error status returned');
      }
    });

    it('Test two errors on invalid doc id', async () => {
      const docs = [
        {'_id': '_invalid', foo: 'bar'},
        {'_id': 123, foo: 'bar'}
      ];

      const db = new PouchDB(dbs.name);
      try {
        await db.bulkDocs({ docs });
      } catch (err) {
        should.exist(err);
        err.status.should.equal(testUtils.errors.RESERVED_ID.status,
                            'correct error returned');
      }
    });

    it('No docs', async () => {
      const db = new PouchDB(dbs.name);
      try {
        await db.bulkDocs({ 'doc': [{ 'foo': 'bar' }] });
      } catch (err) {
        should.exist(err);
        err.status.should.equal(testUtils.errors.MISSING_BULK_DOCS.status,
                            'correct error returned');
        err.message.should.equal(testUtils.errors.MISSING_BULK_DOCS.message,
                             'correct error message returned');
      }
    });

    it('Jira 911', async () => {
      const db = new PouchDB(dbs.name);
      const docs = [
        {'_id': '0', 'a': 0},
        {'_id': '1', 'a': 1},
        {'_id': '1', 'a': 1},
        {'_id': '3', 'a': 3}
      ];
      const results = await db.bulkDocs({ docs });
      results[1].id.should.equal('1', 'check ordering');
      should.not.exist(results[1].name, 'first id succeded');
      results[2].name.should.equal('conflict', 'second conflicted');
      results.should.have.length(4, 'got right amount of results');
    });

    it('Test multiple bulkdocs', async () => {
      const db = new PouchDB(dbs.name);
      await db.bulkDocs({ docs: authors });
      await db.bulkDocs({ docs: authors });
      const result = await db.allDocs();
      result.total_rows.should.equal(8, 'correct number of results');
    });

    it('#2935 new_edits=false correct number', async () => {
      const docs = [
        {
          "_id": "EE35E",
          "_rev": "4-70b26",
          "_deleted": true,
          "_revisions": {
            "start": 4,
            "ids": ["70b26", "9f454", "914bf", "7fdf8"]
          }
        }, {
          "_id": "EE35E",
          "_rev": "3-f6d28",
          "_revisions": {"start": 3, "ids": ["f6d28", "914bf", "7fdf8"]}
        }
      ];

      const db = new PouchDB(dbs.name);

      const res1 = await db.bulkDocs({docs, new_edits: false});
      res1.should.deep.equal([]);
      const res2 = await db.allDocs();
      res2.total_rows.should.equal(1);
      const info = await db.info();
      info.doc_count.should.equal(1);
    });

    it('#2935 new_edits=false correct number 2', async () => {
      const docs = [
        {
          "_id": "EE35E",
          "_rev": "3-f6d28",
          "_revisions": {"start": 3, "ids": ["f6d28", "914bf", "7fdf8"]}
        }, {
          "_id": "EE35E",
          "_rev": "4-70b26",
          "_deleted": true,
          "_revisions": {
            "start": 4,
            "ids": ["70b26", "9f454", "914bf", "7fdf8"]
          }
        }
      ];

      const db = new PouchDB(dbs.name);

      const res1 = await db.bulkDocs({docs, new_edits: false});
      res1.should.deep.equal([]);
      const res2 = await db.allDocs();
      res2.total_rows.should.equal(1);
      const info = await db.info();
      info.doc_count.should.equal(1);
    });

    it('bulk docs update then delete then conflict', async () => {
      const db = new PouchDB(dbs.name);
      const docs= [{_id: '1'}];
      const res1 = await db.bulkDocs(docs);
      should.not.exist(res1[0].error, 'no error');
      docs[0]._rev = res1[0].rev;
      const res2 = await db.bulkDocs(docs);
      should.not.exist(res2[0].error, 'no error');
      docs[0]._rev = res2[0].rev;
      docs[0]._deleted = true;
      const res3 = await db.bulkDocs(docs);
      should.not.exist(res3[0].error, 'no error');
      const res4 = await db.bulkDocs(docs);
      should.exist(res4[0].error, 'has an error');
      res4[0].name.should.equal(
        'conflict', 'First doc should be in conflict');
    });

    it('bulk_docs delete then undelete', async () => {
      const db = new PouchDB(dbs.name);
      const doc = {_id: '1'};
      const res1 = await db.bulkDocs([doc]);
      should.not.exist(res1[0].error, 'should not be an error 1');
      doc._rev = res1[0].rev;
      doc._deleted = true;
      const res2 = await db.bulkDocs([doc]);
      should.not.exist(res2[0].error, 'should not be an error 2');
      delete doc._rev;
      doc._deleted = false;
      await db.bulkDocs([doc]);
    });

    it('#2935 new_edits=false with single unauthorized', async () => {

      testUtils.isCouchDB(async (isCouchDB) => {
        if (adapter !== 'http' || !isCouchDB) {
          return;
        }

        const ddoc = {
          "_id": "_design/validate",
          "validate_doc_update": function (newDoc) {
            if (newDoc.foo === undefined) {
              throw {unauthorized: 'Document must have a foo.'};
            }
          }.toString()
        };

        const db = new PouchDB(dbs.name);

        await db.put(ddoc);
        const res = await db.bulkDocs({
          docs: [
            {
              '_id': 'doc0',
              '_rev': '1-x',
              'foo': 'bar',
              '_revisions': {
                'start': 1,
                'ids': ['x']
              }
            }, {
              '_id': 'doc1',
              '_rev': '1-x',
              '_revisions': {
                'start': 1,
                'ids': ['x']
              }
            }, {
              '_id': 'doc2',
              '_rev': '1-x',
              'foo': 'bar',
              '_revisions': {
                'start': 1,
                'ids': ['x']
              }
            }
          ]
        }, {new_edits: false});
        res.should.have.length(1);
        should.exist(res[0].error);
        res[0].id.should.equal('doc1');
      });
    });

    it('Deleting _local docs with bulkDocs' , async () => {
      const db = new PouchDB(dbs.name);

      const info1 = await db.put({_id: '_local/godzilla'});
      const rev1 = info1.rev;
      const info2 = await db.put({_id: 'mothra'});
      const rev2 = info2.rev;
      const info3 = await db.put({_id: 'rodan'});
      const rev3 = info3.rev;
      await db.bulkDocs([
        {_id: 'mothra', _rev: rev2, _deleted: true},
        {_id: '_local/godzilla', _rev: rev1, _deleted: true},
        {_id: 'rodan', _rev: rev3, _deleted: true}
      ]);
      const info = await db.allDocs();
      info.rows.should.have.length(0);
      try {
        await db.get('_local/godzilla');
      } catch (err) {
        should.exist(err);
      }
    });

    if (adapter === 'local') {
      // these tests crash CouchDB with a 500, neat
      // https://issues.apache.org/jira/browse/COUCHDB-2758

      it('Deleting _local docs with bulkDocs, not found', async () => {
        const db = new PouchDB(dbs.name);

        const info1 = await db.put({_id: 'mothra'});
        const rev2 = info1.rev;
        const info2 = await db.put({_id: 'rodan'});
        const rev3 = info2.rev;
        const res = await db.bulkDocs([
          {_id: 'mothra', _rev: rev2, _deleted: true},
          {_id: '_local/godzilla', _rev: '1-fake', _deleted: true},
          {_id: 'rodan', _rev: rev3, _deleted: true}
        ]);
        should.not.exist(res[0].error);
        should.exist(res[1].error);
        should.not.exist(res[2].error);
      });

      it('Deleting _local docs with bulkDocs, wrong rev', async () => {
        const db = new PouchDB(dbs.name);

        await db.put({_id: '_local/godzilla'});
        const info1 = await db.put({_id: 'mothra'});
        const rev2 = info1.rev;
        const info2 = await db.put({_id: 'rodan'});
        const rev3 = info2.rev;
        const res = await db.bulkDocs([
          {_id: 'mothra', _rev: rev2, _deleted: true},
          {_id: '_local/godzilla', _rev: '1-fake', _deleted: true},
          {_id: 'rodan', _rev: rev3, _deleted: true}
        ]);
        should.not.exist(res[0].error);
        should.exist(res[1].error);
        should.not.exist(res[2].error);
      });
    }

    it('Bulk with new_edits=false', async () => {
      const db = new PouchDB(dbs.name);
      const docs = [{
        '_id': 'foo',
        '_rev': '2-x',
        '_revisions': {
          'start': 2,
          'ids': ['x', 'a']
        }
      }, {
        '_id': 'foo',
        '_rev': '2-y',
        '_revisions': {
          'start': 2,
          'ids': ['y', 'a']
        }
      }];
      await db.bulkDocs({docs}, {new_edits: false});
      const res = await db.get('foo', {open_revs: 'all'});
      res.sort((a, b) => {
        return a.ok._rev < b.ok._rev ? -1 :
          a.ok._rev > b.ok._rev ? 1 : 0;
      });
      res.length.should.equal(2);
      res[0].ok._rev.should.equal('2-x', 'doc1 ok');
      res[1].ok._rev.should.equal('2-y', 'doc2 ok');
    });

    it('Testing successive new_edits to the same doc', async () => {

      const db = new PouchDB(dbs.name);
      const docs = [{
        '_id': 'foobar123',
        '_rev': '1-x',
        'bar': 'huzzah',
        '_revisions': {
          'start': 1,
          'ids': ['x']
        }
      }];

      await db.bulkDocs({docs, new_edits: false});
      await db.bulkDocs({docs, new_edits: false});
      const res = await db.get('foobar123');
      res._rev.should.equal('1-x');
    });

    it('#3062 bulkDocs with staggered seqs', async () => {
      const db = new PouchDB(dbs.name);
      const docs = [];
      for (let i = 10; i <= 20; i++) {
        docs.push({ _id: `doc-${i}`});
      }
      const infos = await db.bulkDocs({docs});
      docs.forEach((doc, i) => {
        doc._rev = infos[i].rev;
      });
      const docsToUpdate = docs.filter((doc, i) => {
        return i % 2 === 1;
      });
      docsToUpdate.reverse();
      const infos2 = await db.bulkDocs({docs: docsToUpdate});
      infos2.map((x) => {
        return {id: x.id, error: !!x.error, rev: (typeof x.rev)};
      }).should.deep.equal([
        { error: false, id: 'doc-19', rev: 'string'},
        { error: false, id: 'doc-17', rev: 'string'},
        { error: false, id: 'doc-15', rev: 'string'},
          { error: false, id: 'doc-13', rev: 'string'},
        { error: false, id: 'doc-11', rev: 'string'}
      ]);
    });

    it('Testing successive new_edits to the same doc, different content',
      async () => {

      const db = new PouchDB(dbs.name);
      const docsA = [{
        '_id': 'foo321',
        '_rev': '1-x',
        'bar' : 'baz',
        '_revisions': {
          'start': 1,
          'ids': ['x']
        }
      }, {
        '_id' : 'fee321',
        'bar': 'quux',
        '_rev': '1-x',
        '_revisions': {
          'start': 1,
          'ids': ['x']
        }
      }];

      const docsB = [{
        '_id': 'foo321',
        '_rev': '1-x',
        'bar' : 'zam', // this update should be rejected
        '_revisions': {
          'start': 1,
          'ids': ['x']
        }
      }, {
        '_id' : 'faa321',
        '_rev': '1-x',
        'bar': 'zul',
        '_revisions': {
          'start': 1,
          'ids': ['x']
        }
      }];

      await db.bulkDocs({docs: docsA, new_edits: false});
      const result1 = await db.changes({return_docs: true});
      const ids1 = result1.results.map((row) => row.id);
      ids1.should.include("foo321");
      ids1.should.include("fee321");
      ids1.should.not.include("faa321");

      const update_seq = result1.last_seq;
      await db.bulkDocs({docs: docsB, new_edits: false});
      const result2 = await db.changes({
        return_docs: true,
        since: update_seq
      });
      const ids2 = result2.results.map((row) => row.id);
      ids2.should.not.include("foo321");
      ids2.should.not.include("fee321");
      ids2.should.include("faa321");

      const res = await db.get('foo321');
      res._rev.should.equal('1-x');
      res.bar.should.equal("baz");
      const info = await db.info();
      info.doc_count.should.equal(3);
    });

    it('Testing successive new_edits to two doc', async () => {

      const db = new PouchDB(dbs.name);
      const doc1 = {
        '_id': 'foo',
        '_rev': '1-x',
        '_revisions': {
          'start': 1,
          'ids': ['x']
        }
      };
      const doc2 = {
        '_id': 'bar',
        '_rev': '1-x',
        '_revisions': {
          'start': 1,
          'ids': ['x']
        }
      };

      await db.put(doc1, {new_edits: false});
      await db.put(doc2, {new_edits: false});
      await db.put(doc1, {new_edits: false});
      await db.get('foo');
      await db.get('bar');
    });

    it('Deletion with new_edits=false', async () => {

      const db = new PouchDB(dbs.name);
      const doc1 = {
        '_id': 'foo',
        '_rev': '1-x',
        '_revisions': {
          'start': 1,
          'ids': ['x']
        }
      };
      const doc2 = {
        '_deleted': true,
        '_id': 'foo',
        '_rev': '2-y',
        '_revisions': {
          'start': 2,
          'ids': ['y', 'x']
        }
      };

      await db.put(doc1, {new_edits: false});
      await db.put(doc2, {new_edits: false});
      const res = await db.allDocs({keys: ['foo']});
      res.rows[0].value.rev.should.equal('2-y');
      res.rows[0].value.deleted.should.equal(true);
    });

    it('Deletion with new_edits=false, no history', async () => {

      const db = new PouchDB(dbs.name);
      const doc1 = {
        '_id': 'foo',
        '_rev': '1-x',
        '_revisions': {
          'start': 1,
          'ids': ['x']
        }
      };
      const doc2 = {
        '_deleted': true,
        '_id': 'foo',
        '_rev': '2-y'
      };

      await db.put(doc1, {new_edits: false});
      await db.put(doc2, {new_edits: false});
      const res = await db.allDocs({keys: ['foo']});
      res.rows[0].value.rev.should.equal('1-x');
      should.equal(!!res.rows[0].value.deleted, false);
    });

    it('Modification with new_edits=false, no history', async () => {

      const db = new PouchDB(dbs.name);
      const doc1 = {
        '_id': 'foo',
        '_rev': '1-x',
        '_revisions': {
          'start': 1,
          'ids': ['x']
        }
      };
      const doc2 = {
        '_id': 'foo',
        '_rev': '2-y'
      };

      await db.put(doc1, {new_edits: false});
      await db.put(doc2, {new_edits: false});
      const res = await db.allDocs({keys: ['foo']});
      res.rows[0].value.rev.should.equal('2-y');
    });

    it('Deletion with new_edits=false, no history, no revisions', async () => {

      const db = new PouchDB(dbs.name);
      const doc = {
        '_deleted': true,
        '_id': 'foo',
        '_rev': '2-y'
      };

      await db.put(doc, {new_edits: false});
      const res = await db.allDocs({keys: ['foo']});
      res.rows[0].value.rev.should.equal('2-y');
      res.rows[0].value.deleted.should.equal(true);
    });

    it('Testing new_edits=false in req body', async () => {
      const db = new PouchDB(dbs.name);
      const docs = [{
        '_id': 'foo',
        '_rev': '2-x',
        '_revisions': {
          'start': 2,
          'ids': ['x', 'a']
        }
      }, {
        '_id': 'foo',
        '_rev': '2-y',
        '_revisions': {
          'start': 2,
          'ids': ['y', 'a']
        }
      }];
      await db.bulkDocs({docs, new_edits: false});
      const res = await db.get('foo', {open_revs: 'all'});
      res.sort((a, b) => {
        return a.ok._rev < b.ok._rev ? -1 :
          a.ok._rev > b.ok._rev ? 1 : 0;
      });
      res.length.should.equal(2);
      res[0].ok._rev.should.equal('2-x', 'doc1 ok');
      res[1].ok._rev.should.equal('2-y', 'doc2 ok');
    });

    it('656 regression in handling deleted docs', async () => {
      const db = new PouchDB(dbs.name);
      await db.bulkDocs({
        docs: [{
          _id: 'foo',
          _rev: '1-a',
          _deleted: true
        }]
      }, { new_edits: false });
      try {
        await db.get('foo');
      } catch (err) {
        should.exist(err, 'deleted');
        err.name.should.equal('not_found');
        err.status.should.equal(testUtils.errors.MISSING_DOC.status,
                                 'correct error status returned');
      }
    });

    it('Test quotes in doc ids', async () => {
      const db = new PouchDB(dbs.name);
      const docs = [{ _id: '\'your_sql_injection_script_here\'' }];
      await db.bulkDocs({docs});
      try {
        await db.get('foo');
      } catch (err) {
        should.exist(err, 'deleted');
      }
    });

    it('Bulk docs empty list', async () => {
      const db = new PouchDB(dbs.name);
      await db.bulkDocs({ docs: [] });
    });

    it('handles simultaneous writes', async () => {
      const db1 = new PouchDB(dbs.name);
      const db2 = new PouchDB(dbs.name);
      const id = 'fooId';
      const errorNames = [];
      const ids = [];

      const results = await Promise.all([
        db1.bulkDocs({docs: [{_id: id}]}),
        db2.bulkDocs({docs: [{_id: id}]})
      ]);

      for (const res of results) {
        if (res[0].error) {
          errorNames.push(res[0].name);
        } else {
          ids.push(res[0].id);
        }
      }

      errorNames.should.deep.equal(['conflict']);
      ids.should.deep.equal([id]);
    });

    it('bulk docs input by array', async () => {
      const db = new PouchDB(dbs.name);
      const docs = makeDocs(5);
      const results1 = await db.bulkDocs(docs);
      results1.should.have.length(5, 'results length matches');
      for (let i = 0; i < 5; i++) {
        results1[i].id.should.equal(docs[i]._id, 'id matches');
        should.exist(results1[i].rev, 'rev is set');
        // Update the doc
        docs[i]._rev = results1[i].rev;
        docs[i].string = docs[i].string + '.00';
      }

      const results2 = await db.bulkDocs(docs);
      results2.should.have.length(5, 'results length matches');
      for (let i = 0; i < 5; i++) {
        results2[i].id.should.equal(i.toString(), 'id matches again');
        // set the delete flag to delete the docs in the next step
        docs[i]._rev = results2[i].rev;
        docs[i]._deleted = true;
      }

      await db.put(docs[0]);
      const results3 = await db.bulkDocs(docs);
      results3[0].name.should.equal(
        'conflict', 'First doc should be in conflict');
      should.not.exist(results3[0].rev, 'no rev in conflict');
      for (let i = 1; i < 5; i++) {
        results3[i].id.should.equal(i.toString());
        should.exist(results3[i].rev);
      }
    });

    it('Bulk empty list', async () => {
      const db = new PouchDB(dbs.name);
      await db.bulkDocs([]);
    });

    it('Bulk docs not an array', async () => {
      const db = new PouchDB(dbs.name);
      try {
        await db.bulkDocs({ docs: 'foo' });
      } catch (err) {
        should.exist(err, 'error reported');
        err.status.should.equal(testUtils.errors.MISSING_BULK_DOCS.status,
                                'correct error status returned');
        err.message.should.equal(testUtils.errors.MISSING_BULK_DOCS.message,
                                 'correct error message returned');
      }
    });

    it('Bulk docs not an object', async () => {
      const db = new PouchDB(dbs.name);
      try {
        await db.bulkDocs({ docs: ['foo'] });
      } catch (err) {
        should.exist(err, 'error reported');
        err.status.should.equal(testUtils.errors.NOT_AN_OBJECT.status,
                                'correct error status returned');
        err.message.should.equal(testUtils.errors.NOT_AN_OBJECT.message,
                                 'correct error message returned');
      }
      try {
        await db.bulkDocs({ docs: [[]] });
      } catch (err) {
        should.exist(err, 'error reported');
        err.status.should.equal(testUtils.errors.NOT_AN_OBJECT.status,
                                'correct error status returned');
        err.message.should.equal(testUtils.errors.NOT_AN_OBJECT.message,
                                 'correct error message returned');
      }
    });

    it('Bulk docs two different revisions to same document id', async () => {
      const db = new PouchDB(dbs.name);
      const docid = "mydoc";

      const uuid = () => testUtils.rev();

      // create a few of rando, good revisions
      const numRevs = 3;
      const uuids = [];
      for (let i = 0; i < numRevs - 1; i++) {
          uuids.push(uuid());
      }

      // branch 1
      const a_conflict = uuid();
      const a_doc = {
        _id: docid,
        _rev: numRevs + '-' + a_conflict,
        _revisions: {
          start: numRevs,
          ids: [ a_conflict ].concat(uuids)
        }
      };

      // branch 2
      const b_conflict = uuid();
      const b_doc = {
        _id: docid,
        _rev: numRevs + '-' + b_conflict,
        _revisions: {
          start: numRevs,
          ids: [ b_conflict ].concat(uuids)
        }
      };

      // push the conflicted documents
      await db.bulkDocs([ a_doc, b_doc ], { new_edits: false });
      const resp = await db.get(docid, { open_revs: "all" });
      resp.length.should.equal(2, 'correct number of open revisions');
      resp[0].ok._id.should.equal(docid, 'rev 1, correct document id');
      resp[1].ok._id.should.equal(docid, 'rev 2, correct document id');

      // order of revisions is not specified
      ((resp[0].ok._rev === a_doc._rev &&
        resp[1].ok._rev === b_doc._rev) ||
       (resp[0].ok._rev === b_doc._rev &&
        resp[1].ok._rev === a_doc._rev)).should.equal(true);
    });

    it('4204 respect revs_limit', async () => {
      const db = new PouchDB(dbs.name);

      // simulate 5000 normal commits with two conflicts at the very end

      const isSafari = testUtils.isSafari();

      const numRevs = isSafari ? 10 : 5000;
      const expected = isSafari ? 10 : 1000;
      const uuids = [];

      for (let i = 0; i < numRevs - 1; i++) {
        uuids.push(testUtils.rev());
      }
      const conflict1 = 'a' + testUtils.rev();

      const doc1 = {
        _id: 'doc',
        _rev: numRevs + '-' + conflict1,
        _revisions: {
          start: numRevs,
          ids: [conflict1].concat(uuids)
        }
      };

      await db.bulkDocs([doc1], {new_edits: false});
      const doc = await db.get('doc', {revs: true});
      doc._revisions.ids.length.should.equal(expected);
    });

    it('2839 implement revs_limit', async () => {

      // We only implement revs_limit locally
      if (adapter === 'http') {
        return;
      }

      const LIMIT = 50;
      const db = new PouchDB(dbs.name, {revs_limit: LIMIT});

      // simulate 5000 normal commits with two conflicts at the very end
      const uuid = () => testUtils.rev();

      const numRevs = 5000;
      const uuids = [];
      for (let i = 0; i < numRevs - 1; i++) {
        uuids.push(uuid());
      }
      const conflict1 = 'a' + uuid();
      const doc1 = {
        _id: 'doc',
        _rev: numRevs + '-' + conflict1,
        _revisions: {
          start: numRevs,
          ids: [conflict1].concat(uuids)
        }
      };

      await db.bulkDocs([doc1], {new_edits: false});
      const doc = await db.get('doc', {revs: true});
      doc._revisions.ids.length.should.equal(LIMIT);
    });

    it('4372 revs_limit deletes old revisions of the doc', async () => {

      // We only implement revs_limit locally
      if (adapter === 'http') {
        return;
      }

      const db = new PouchDB(dbs.name, {revs_limit: 2});

      // old revisions are always deleted with auto compaction
      if (db.auto_compaction) {
        return;
      }

      const revs = [];
      const v1 = await db.put({_id: 'doc', v: 1});
      revs.push(v1.rev);
      const v2 = await db.put({_id: 'doc', _rev: revs[0], v: 2});
      revs.push(v2.rev);
      await db.put({_id: 'doc', _rev: revs[1], v: 3});
      // the v2 revision is still in the db
      const v2doc = await db.get('doc', {rev: revs[1]});
      v2doc.v.should.equal(2);

      // the v1 revision is not in the db anymore
      try {
        await db.get('doc', {rev: revs[0]});
      } catch (err) {
        should.exist(err, 'v1 should be missing');
        err.message.should.equal('missing');
      }
    });

    it('4372 revs_limit with auto_compaction deletes old revisions of the doc', async () => {
      // We only implement revs_limit locally
      if (adapter === 'http') {
        return;
      }

      const db = new PouchDB(dbs.name, {revs_limit: 2, auto_compaction: true});

      try {
        const revs = [];
        const v1 = await db.put({_id: 'doc', v: 1});
        revs.push(v1.rev);
        const v2 = await db.put({_id: 'doc', _rev: revs[0], v: 2});
        revs.push(v2.rev);
        await db.put({_id: 'doc', _rev: revs[1], v: 3});

        try {
          const doc = await db.get('doc', {rev: revs[1]});
          should.not.exist(doc);
        } catch (error) {
          error.message.should.equal('missing');
        }
      } catch (error) {
        should.not.exist(error);
      }
    });

    it('4712 invalid rev for new doc generates conflict', async () => {
      // CouchDB 1.X has a bug which allows this insertion via bulk_docs
      // (which PouchDB uses for all document insertions)
      if (adapter === 'http' && !testUtils.isCouchMaster()) {
        return;
      }

      const db = new PouchDB(dbs.name);
      const newdoc = {
        '_id': 'foobar',
        '_rev': '1-123'
      };

      const results = await db.bulkDocs({ docs: [newdoc] });
      results[0].should.have.property('status', 409);
    });

    it('5793 bulk docs accepts _conflicts when new_edits=false', async () => {
      const db = new PouchDB(dbs.name);
      const newdoc = {
        '_id': 'foobar',
        '_rev': '1-123',
        '_conflicts': []
      };

      await db.bulkDocs({ docs: [newdoc] }, { new_edits: false });
      const result = await db.allDocs();
      result.rows.length.should.equal(1);
    });
  });
});
