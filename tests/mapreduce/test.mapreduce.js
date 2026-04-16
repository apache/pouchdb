/* global sum */
'use strict';

const viewTypes = ['persisted', 'temp'];
viewTypes.forEach(function (viewType) {
  const suiteName = 'test.mapreduce.js-' + viewType;
  const adapter = testUtils.adapterType();
  const dbName = testUtils.adapterUrl(adapter, 'testdb');

  tests(suiteName, dbName, adapter, viewType);
});

function tests(suiteName, dbName, dbType, viewType) {

  describe(suiteName, function () {
    let createView;
    if (dbType === 'http' || viewType === 'persisted') {
      createView = async (db, viewObj) => {
        const storableViewObj = {
          map: `${viewObj.map}`
        };
        if (viewObj.reduce) {
          storableViewObj.reduce = `${viewObj.reduce}`;
        }

        await db.put({
          _id: '_design/theViewDoc',
          views: {
            'theView' : storableViewObj
          }
        });
        return 'theViewDoc/theView';
      };
    } else {
      createView = async (db, viewObj) => {
        await Promise.resolve();
        return viewObj;
      };
    }

    beforeEach(async function () {
      if (dbType === 'http') {
        const url = new URL(dbName);
        const dbUrl = `${url.origin}${url.pathname}`;
        await PouchDB.fetch(dbUrl + '?q=1', {
          method: 'PUT',
          headers: { Authorization: 'Basic ' + testUtils.btoa(`${url.username}:${url.password}`) },
        });
      }
    });

    afterEach(async function () {
      await new PouchDB(dbName).destroy();
    });

    it("Test basic view", async function () {
      const db = new PouchDB(dbName);
      const view = await createView(db, {
        map: function (doc) {
          emit(doc.foo, doc);
        }
      });

      await db.bulkDocs({docs: [
        {foo: 'bar'},
        { _id: 'volatile', foo: 'baz' }
      ]});

      const doc = await db.get('volatile');
      await db.remove(doc);
      const res = await db.query(view, {include_docs: true, reduce: false});

      res.rows.should.have.length(1, 'Dont include deleted documents');
      res.total_rows.should.equal(1, 'Include total_rows property.');
      res.rows.forEach((x) => {
        should.exist(x.id);
        should.exist(x.key);
        should.exist(x.value);
        should.exist(x.value._rev);
        should.exist(x.doc);
        should.exist(x.doc._rev);
      });
    });

    it("Test basic view, no emitted value", async function () {
      const db = new PouchDB(dbName);
      const view = await createView(db, {
        map: function (doc) {
          emit(doc.foo);
        }
      });

      await db.bulkDocs({docs: [
        {foo: 'bar'},
        { _id: 'volatile', foo: 'baz' }
      ]});

      const doc = await db.get('volatile');
      await db.remove(doc);
      const res = await db.query(view, {include_docs: true, reduce: false});

      res.rows.should.have.length(1, 'Dont include deleted documents');
      res.total_rows.should.equal(1, 'Include total_rows property.');
      res.rows.forEach((x) => {
        should.exist(x.id);
        should.exist(x.key);
        should.equal(x.value, null);
        should.exist(x.doc);
        should.exist(x.doc._rev);
      });
    });

    if (dbType === 'local' && viewType === 'temp') {
      it("with a closure",  async function () {
        const db = new PouchDB(dbName);
        await db.bulkDocs({docs: [
          {foo: 'bar'},
          { _id: 'volatile', foo: 'baz' }
        ]});

        const queryFun = (function (test) {
          return function (doc, emit) {
            if (doc._id === test) {
              emit(doc.foo);
            }
          };
        }('volatile'));

        const res =  await db.query(queryFun, {reduce: false});
        res.should.deep.equal({
          total_rows: 1,
          offset: 0,
          rows: [
            {
              id: 'volatile',
              key: 'baz',
              value: null
            }
          ]
        });
      });
    }

    if (viewType === 'temp' && dbType !== 'http') {
      it('Test simultaneous temp views', async function () {
        const db = new PouchDB(dbName);
        await db.put({_id: '0', foo: 1, bar: 2, baz: 3});

        await Promise.all(['foo', 'bar', 'baz'].map(async (key, i) => {
          const fun = 'function(doc){emit(doc.' + key + ');}';
          const res = await db.query({map: fun});

          res.rows.should.deep.equal([{
            id: '0',
            key: i + 1,
            value: null
          }]);
        }));
      });

      it("Test passing just a function", async function () {
        const db = new PouchDB(dbName);
        await db.bulkDocs({docs: [
          {foo: 'bar'},
          { _id: 'volatile', foo: 'baz' }
        ]});
        const doc = await db.get('volatile');
        await db.remove(doc);

        const res = await db.query({
          map: function (doc) {
            emit(doc.foo, doc);
          }},
          {include_docs: true, reduce: false});

        res.rows.should.have.length(1, 'Dont include deleted documents');
        res.rows.forEach((x) => {
          should.exist(x.id);
          should.exist(x.key);
          should.exist(x.value);
          should.exist(x.value._rev);
          should.exist(x.doc);
          should.exist(x.doc._rev);
        });
      });
    }

    it("Test opts.startkey/opts.endkey", async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map: function (doc) {
          emit(doc.key, doc);
        }
      });

      await db.bulkDocs({docs: [
        {key: 'key1'},
        {key: 'key2'},
        {key: 'key3'},
        {key: 'key4'},
        {key: 'key5'}]});

      let res = await db.query(queryFun, {reduce: false, startkey: 'key2'});
      res.rows.should.have.length(4, 'Startkey is inclusive');

      res = await db.query(queryFun, {reduce: false, endkey: 'key3'});
      res.rows.should.have.length(3, 'Endkey is inclusive');

      res = await db.query(queryFun, {
            reduce: false,
            startkey: 'key2',
            endkey: 'key3'
      });
      res.rows.should.have.length(2, 'Startkey and endkey together');

      res = await db.query(queryFun, {
            reduce: false,
            startkey: 'key4',
            endkey: 'key4'
      });
      res.rows.should.have.length(1, 'Startkey=endkey');
    });

    it("#4154 opts.start_key/opts.end_key are synonyms", async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map: function (doc) {
          emit(doc.key, doc);
        }
      });

      await db.bulkDocs({docs: [
        {key: 'key1'},
        {key: 'key2'},
        {key: 'key3'},
        {key: 'key4'},
        {key: 'key5'}
      ]});

      let res = await db.query(queryFun, {reduce: false, start_key: 'key2'});
      res.rows.should.have.length(4, 'Startkey is inclusive');

      res = await db.query(queryFun, {reduce: false, end_key: 'key3'});
      res.rows.should.have.length(3, 'Endkey is inclusive');

      res = await db.query(queryFun, {
          reduce: false,
          start_key: 'key2',
          end_key: 'key3'
      });
      res.rows.should.have.length(2, 'Startkey and endkey together');

      res = await db.query(queryFun, {
          reduce: false,
          start_key: 'key4',
          end_key: 'key4'
      });
      res.rows.should.have.length(1, 'Startkey=endkey');
    });

    //TODO: split this to their own tests within a describe block
    it("Test opts.inclusive_end = false", async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map: function (doc) {
          emit(doc.key, doc);
        }
      });

      await db.bulkDocs({docs: [
        {key: 'key1'},
        {key: 'key2'},
        {key: 'key3'},
        {key: 'key4'},
        {key: 'key4'},
        {key: 'key5'}
      ]});

      let res = await db.query(queryFun, {
          reduce: false,
          endkey: 'key4',
          inclusive_end: false
      });
      res.rows.should.have.length(3, 'endkey=key4 without ' + 'inclusive end');
      res.rows[0].key.should.equal('key1');
      res.rows[2].key.should.equal('key3');

      res = await db.query(queryFun, {
            reduce: false,
            startkey: 'key3',
            endkey: 'key4',
            inclusive_end: false
      });
      res.rows.should.have.length(1, 'startkey=key3, endkey=key4 ' + 'without inclusive end');
      res.rows[0].key.should.equal('key3');

      res = await db.query(queryFun, {
            reduce: false,
            startkey: 'key4',
            endkey: 'key1',
            descending: true,
            inclusive_end: false
      });
      res.rows.should.have.length(4, 'startkey=key4, endkey=key1 descending without ' +
                          'inclusive end');
      res.rows[0].key.should.equal('key4');
    });

    it("Test opts.key", async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map: function (doc) {
          emit(doc.key, doc);
        }
      });

      await db.bulkDocs({docs: [
          {key: 'key1'},
          {key: 'key2'},
          {key: 'key3'},
          {key: 'key3'}
      ]});

      let res = await db.query(queryFun, {reduce: false, key: 'key2'});
      res.rows.should.have.length(1, 'Doc with key');

      res = await db.query(queryFun, {reduce: false, key: 'key3'});
      res.rows.should.have.length(2, 'Multiple docs with key');
    });

    it("Test basic view collation", async function () {

      const values = [];

      // special values sort before all other types
      values.push(null);
      values.push(false);
      values.push(true);

      // then numbers
      values.push(1);
      values.push(2);
      values.push(3.0);
      values.push(4);

      // then text, case sensitive
      // currently chrome uses ascii ordering and so wont handle caps properly
      values.push("a");
      //values.push("A");
      values.push("aa");
      values.push("b");
      //values.push("B");
      values.push("ba");
      values.push("bb");

      // then arrays. compared element by element until different.
      // Longer arrays sort after their prefixes
      values.push(["a"]);
      values.push(["b"]);
      values.push(["b", "c"]);
      values.push(["b", "c", "a"]);
      values.push(["b", "d"]);
      values.push(["b", "d", "e"]);

      // then object, compares each key value in the list until different.
      // larger objects sort after their subset objects.
      values.push({a: 1});
      values.push({a: 2});
      values.push({b: 1});
      values.push({b: 2});
      values.push({b: 2, a: 1}); // Member order does matter for collation.
      // CouchDB preserves member order
      // but doesn't require that clients will.
      // (this test might fail if used with a js engine
      // that doesn't preserve order)
      values.push({b: 2, c: 2});
      const db = new PouchDB(dbName);

      const queryFun = await createView(db, {
        map: function (doc) {
          emit(doc.foo);
        }
      });

      const docs = values.map((x, i) => ({_id: `${i}`, foo: x}));

      await db.bulkDocs({docs});

      let res = await db.query(queryFun, {reduce: false});

      res.rows.forEach((x, i) => {
        JSON.stringify(x.key).should.equal(JSON.stringify(values[i]), 'keys collate');
      });

      res = await db.query(queryFun, {descending: true, reduce: false});

      res.rows.forEach((x, i) => {
        JSON.stringify(x.key).should.equal(JSON.stringify(
          values[values.length - 1 - i]), 'keys collate descending');
      });
    });

    it('Test complex key collation', async function () {
      const map = function () {
        emit(null);
        emit(false);
        emit(true);
        emit(1);
        emit(2);
        emit(3);
        emit(4);
        emit("a");
        emit("aa");
        emit("b");
        emit("ba");
        emit("bb");
        emit(["a"]);
        emit(["b"]);
        emit(["b","c"]);
        emit(["b","c","a"]);
        emit(["b","d"]);
        emit(["b","d","e"]);
        emit({"a":1});
        emit({"a":2});
        emit({"b":1});
        emit({"b":2});
        emit({"b":2,"a":1});
        emit({"b":2,"c":2});
      };

      const db = new PouchDB(dbName);
      await db.bulkDocs([
        { _id: '1' },
        { _id: '2' }
      ]);

      const queryFun = await createView(db, { map });
      const res = await db.query(queryFun);
      const rows = mapToRows(res);

      assert.deepEqual(rows, [
        { id: '1', key: null, value: null },
        { id: '2', key: null, value: null },
        { id: '1', key: false, value: null },
        { id: '2', key: false, value: null },
        { id: '1', key: true, value: null },
        { id: '2', key: true, value: null },
        { id: '1', key: 1, value: null },
        { id: '2', key: 1, value: null },
        { id: '1', key: 2, value: null },
        { id: '2', key: 2, value: null },
        { id: '1', key: 3, value: null },
        { id: '2', key: 3, value: null },
        { id: '1', key: 4, value: null },
        { id: '2', key: 4, value: null },
        { id: '1', key: 'a', value: null },
        { id: '2', key: 'a', value: null },
        { id: '1', key: 'aa', value: null },
        { id: '2', key: 'aa', value: null },
        { id: '1', key: 'b', value: null },
        { id: '2', key: 'b', value: null },
        { id: '1', key: 'ba', value: null },
        { id: '2', key: 'ba', value: null },
        { id: '1', key: 'bb', value: null },
        { id: '2', key: 'bb', value: null },
        { id: '1', key: [ 'a' ], value: null },
        { id: '2', key: [ 'a' ], value: null },
        { id: '1', key: [ 'b' ], value: null },
        { id: '2', key: [ 'b' ], value: null },
        { id: '1', key: [ 'b', 'c' ], value: null },
        { id: '2', key: [ 'b', 'c' ], value: null },
        { id: '1', key: [ 'b', 'c', 'a' ], value: null },
        { id: '2', key: [ 'b', 'c', 'a' ], value: null },
        { id: '1', key: [ 'b', 'd' ], value: null },
        { id: '2', key: [ 'b', 'd' ], value: null },
        { id: '1', key: [ 'b', 'd', 'e' ], value: null },
        { id: '2', key: [ 'b', 'd', 'e' ], value: null },
        { id: '1', key: { a: 1 }, value: null },
        { id: '2', key: { a: 1 }, value: null },
        { id: '1', key: { a: 2 }, value: null },
        { id: '2', key: { a: 2 }, value: null },
        { id: '1', key: { b: 1 }, value: null },
        { id: '2', key: { b: 1 }, value: null },
        { id: '1', key: { b: 2 }, value: null },
        { id: '2', key: { b: 2 }, value: null },
        { id: '1', key: { b: 2, a: 1 }, value: null },
        { id: '2', key: { b: 2, a: 1 }, value: null },
        { id: '1', key: { b: 2, c: 2 }, value: null },
        { id: '2', key: { b: 2, c: 2 }, value: null }
      ]);
    });

    it('Test duplicate collation of objects', async function () {
      const db = new PouchDB(dbName);
      await db.bulkDocs([
        { _id: '1' },
        { _id: '2' }
      ]);

      const queryFun = await createView(db, {
        map: function () {
          emit({ a: 'a' }, { b: 'b' });
          emit({ a: 'a' }, { b: 'b' });
        }
      });

      const res = await db.query(queryFun);
      const rows = mapToRows(res);

      assert.deepEqual(rows, [
        { "id": "1", "key": { "a": "a" }, "value": { b: 'b' }},
        { "id": "1", "key": { "a": "a" }, "value": { b: 'b' }},
        { "id": "2", "key": { "a": "a" }, "value": { b: 'b' }},
        { "id": "2", "key": { "a": "a" }, "value": { b: 'b' }}
      ]);
    });

    it('Test collation of undefined/null', async function () {
      const db = new PouchDB(dbName);
      await db.bulkDocs([
        { _id: '1' },
        { _id: '2' }
      ]);

      const queryFun = await createView(db, {
        map: function () {
          emit();
          emit(null);
        }
      });

      const res = await db.query(queryFun);
      const rows = mapToRows(res);

      assert.deepEqual(rows, [
        { "id": "1", "key": null, "value": null},
        { "id": "1", "key": null, "value": null},
        { "id": "2", "key": null, "value": null},
        { "id": "2", "key": null, "value": null}
      ]);
    });

    it('Test collation of null/undefined', async function () {
      const db = new PouchDB(dbName);
      await db.bulkDocs([
        { _id: '1' },
        { _id: '2' }
      ]);
      const queryFun = await createView(db, {
        map: function () {
          emit(null);
          emit();
        }
      });

      const res = await db.query(queryFun);
      const rows = mapToRows(res);

      assert.deepEqual(rows, [
        { "id": "1", "key": null, "value": null},
        { "id": "1", "key": null, "value": null},
        { "id": "2", "key": null, "value": null},
        { "id": "2", "key": null, "value": null}
      ]);
    });

    it('Test duplicate collation of nulls', async function () {
      const db = new PouchDB(dbName);
      await db.bulkDocs([
        { _id: '1' },
        { _id: '2' }
      ]);
      const queryFun = await createView(db, {
        map: function () {
          emit(null);
          emit(null);
        }
      });

      const res = await db.query(queryFun);
      const rows = mapToRows(res);

      assert.deepEqual(rows, [
        { "id": "1", "key": null, "value": null},
        { "id": "1", "key": null, "value": null},
        { "id": "2", "key": null, "value": null},
        { "id": "2", "key": null, "value": null}
      ]);
    });

    it('Test duplicate collation of booleans', async function () {
      const db = new PouchDB(dbName);
      await db.bulkDocs([
        { _id: '1' },
        { _id: '2' }
      ]);

      const queryFun = await createView(db, {
        map: function () {
          emit(true);
          emit(true);
        }
      });

      const res = await db.query(queryFun);
      const rows = mapToRows(res);

      assert.deepEqual(rows, [
        { "id": "1", "key": true, "value": null},
        { "id": "1", "key": true, "value": null},
        { "id": "2", "key": true, "value": null},
        { "id": "2", "key": true, "value": null}
      ]);
    });

    it('Test collation of different objects', async function () {
      const db = new PouchDB(dbName);
      await db.bulkDocs([
        { _id: '1' },
        { _id: '2' }
      ]);

      const queryFun = await createView(db, {
        map: function () {
          emit({ a: 'b' }, { a: 'a' });
          emit({ a: 'a' }, { b: 'b' });
        }
      });

      const res = await db.query(queryFun);
      const rows = mapToRows(res);

      assert.deepEqual(rows, [
        { "id": "1", "key": { "a": "a" }, "value": { "b": "b" } },
        { "id": "2", "key": { "a": "a" }, "value": { "b": "b" } },
        { "id": "1", "key": { "a": "b" }, "value": { "a": "a" } },
        { "id": "2", "key": { "a": "b" }, "value": { "a": "a" } }
      ]);
    });

    it('Test collation of different objects 2', async function () {
      const db = new PouchDB(dbName);
      await db.bulkDocs([
        { _id: '1' },
        { _id: '2' }
      ]);

      const queryFun =  await createView(db, {
        map: function () {
          emit({ a: 'b', b: 'c' }, { a: 'a' });
          emit({ a: 'a' }, { b: 'b' });
        }
      });

      const res = await db.query(queryFun);
      const rows = mapToRows(res);

      assert.deepEqual(rows, [
        { "id": "1", "key": { "a": "a" }, "value": { "b": "b" } },
        { "id": "2", "key": { "a": "a" }, "value": { "b": "b" } },
        { "id": "1", "key": { "a": "b", "b": "c" }, "value": { "a": "a" } },
        { "id": "2", "key": { "a": "b", "b": "c" }, "value": { "a": "a" } }
      ]);
    });

    it('Test collation of different objects 3', async function () {
      const db = new PouchDB(dbName);
      await db.bulkDocs([
        { _id: '1' },
        { _id: '2' }
      ]);

      const queryFun = await createView(db, {
        map: function () {
          emit({ a: 'a' }, { b: 'b' });
          emit({ a: 'b'}, { a: 'a' });
        }
      });

      const res = await db.query(queryFun);
      const rows = mapToRows(res);

      assert.deepEqual(rows, [
        { "id": "1", "key": { "a": "a" }, "value": { "b": "b" } },
        { "id": "2", "key": { "a": "a" }, "value": { "b": "b" } },
        { "id": "1", "key": { "a": "b" }, "value": { "a": "a" } },
        { "id": "2", "key": { "a": "b" }, "value": { "a": "a" } }
      ]);
    });

    it('Test collation of different objects 4', async function () {
      const db = new PouchDB(dbName);
      await db.bulkDocs([
        { _id: '1' },
        { _id: '2' }
      ]);

      const queryFun = await createView(db, {
        map: function () {
          emit({ a: 'a'});
          emit({ b: 'b'});
        }
      });

      const res = await db.query(queryFun);
      const rows = mapToRows(res);

      assert.deepEqual(rows, [
        { "id": "1", "key": { "a": "a" }, "value": null },
        { "id": "2", "key": { "a": "a" }, "value": null },
        { "id": "1", "key": { "b": "b" }, "value": null },
        { "id": "2", "key": { "b": "b" }, "value": null }
      ]);
    });

    it('Test collation of different objects 5', async function () {
      const db = new PouchDB(dbName);
      await db.bulkDocs([
        { _id: '1' },
        { _id: '2' }
      ]);

      const queryFun = await createView(db, {
        map: function () {
          emit({ a: 'a'});
          emit({ a: 'a', b: 'b'});
        }
      });

      const res = await db.query(queryFun);
      const rows = mapToRows(res);

      assert.deepEqual(rows, [
        { "id": "1", "key": { "a": "a" }, "value": null },
        { "id": "2", "key": { "a": "a" }, "value": null },
        { "id": "1", "key": { "a": "a", "b": "b" }, "value": null },
        { "id": "2", "key": { "a": "a", "b": "b" }, "value": null }
      ]);
    });

    it('Test collation of different objects 6', async function () {
      const db = new PouchDB(dbName);
      await db.bulkDocs([
        { _id: '1' },
        { _id: '2' }
      ]);

      const queryFun = await createView(db, {
        map: function () {
          emit({ a: 'a'});
          emit({ a: 'a', b: 'b'});
        }
      });

      const res = await db.query(queryFun);
      const rows = mapToRows(res);

      assert.deepEqual(rows, [
        { "id": "1", "key": { "a": "a" }, "value": null },
        { "id": "2", "key": { "a": "a" }, "value": null },
        { "id": "1", "key": { "a": "a", "b": "b" }, "value": null },
        { "id": "2", "key": { "a": "a", "b": "b" }, "value": null }
      ]);
    });

    it('Test collation of different booleans', async function () {
      const db = new PouchDB(dbName);
      await db.bulkDocs([
        { _id: '1' },
        { _id: '2' }
      ]);

      const queryFun = await createView(db, {
        map: function () {
          emit(true);
          emit(false);
        }
      });

      const res = await db.query(queryFun);
      const rows = mapToRows(res);

      assert.deepEqual(rows, [
        { "id": "1", "key": false, "value": null },
        { "id": "2", "key": false, "value": null },
        { "id": "1", "key": true, "value": null },
        { "id": "2", "key": true, "value": null }
      ]);
    });

    it('Test collation of different booleans 2', async function () {
      const db = new PouchDB(dbName);
      await db.bulkDocs([
        { _id: '1' },
        { _id: '2' }
      ]);

      const queryFun = await createView(db, {
        map: function () {
          emit(false);
          emit(true);
        }
      });

      const res = await db.query(queryFun);
      const rows = mapToRows(res);

      assert.deepEqual(rows, [
        { "id": "1", "key": false, "value": null },
        { "id": "2", "key": false, "value": null },
        { "id": "1", "key": true, "value": null },
        { "id": "2", "key": true, "value": null }
      ]);
    });

    it("Test joins", async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map: function (doc) {
          if (doc.doc_id) {
            emit(doc._id, {_id: doc.doc_id});
          }
        }
      });

      await db.bulkDocs({docs: [
        {_id: 'mydoc', foo: 'bar'},
        { doc_id: 'mydoc' }
      ]});

      const res = await db.query(queryFun, {include_docs: true, reduce: false});

      should.exist(res.rows[0].doc);
      res.rows[0].doc._id.should.equal('mydoc', 'mydoc included');
    });

    it("No reduce function", async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map: function () {
          emit('key', 'val');
        }
      });

      await db.post({foo: 'bar'});

      await db.query(queryFun).should.be.fulfilled;
    });

    it("Query after db.close", async function () {
      let db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map: function (doc) {
          emit(doc.foo, 'val');
        }
      });

      await db.put({_id: 'doc', foo: 'bar'});
      let res = await db.query(queryFun);

      res.rows.should.deep.equal([
        {
          id: 'doc',
          key: 'bar',
          value: 'val'
        }
      ]);

      await db.close();
      db = new PouchDB(dbName);

      res = await db.query(queryFun);
      res.rows.should.deep.equal([
        {
          id: 'doc',
          key: 'bar',
          value: 'val'
        }
      ]);
    });

    it("Built in _sum reduce function", async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map: function (doc) {
          emit(doc.val, 1);
        },
        reduce: "_sum"
      });

      await db.bulkDocs({
        docs: [
          { val: 'bar' },
          { val: 'bar' },
          { val: 'baz' }
        ]
      });

      const res = await db.query(queryFun, {reduce: true, group_level: 999});
      const mapped = res.rows.map(row => row.value);

      mapped.should.deep.equal([2, 1]);
    });

    it("Built in _count reduce function", async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map: function (doc) {
          emit(doc.val, doc.val);
        },
        reduce: "_count"
      });

      await db.bulkDocs({
        docs: [
          { val: 'bar' },
          { val: 'bar' },
          { val: 'baz' }
        ]
      });

      const res = await db.query(queryFun, {reduce: true, group_level: 999});
      const mapped = res.rows.map(row => row.value);

      mapped.should.deep.equal([2,1]);
    });

    it("Built in _stats reduce function", async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map: "function(doc){emit(doc.val, 1);}",
        reduce: "_stats"
      });

      await db.bulkDocs({
        docs: [
          { val: 'bar' },
          { val: 'bar' },
          { val: 'baz' }
        ]
      });

      const res =  await db.query(queryFun, {reduce: true, group_level: 999});

      res.rows[0].value.should.deep.equal({
        sum: 2,
        count: 2,
        min: 1,
        max: 1,
        sumsqr: 2
      });
    });

    it("Built in _stats reduce function can be used with lists of numbers", async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map: "function(doc){emit(null, doc.val);}",
        reduce: "_stats"
      });

      await db.bulkDocs({
          docs: [
            { _id: '1', val: [1, 2, 3] },
            { _id: '2', val: [4, 5, 6] },
            { _id: '3', val: [7, 8, 9] },
          ]
        });

      const res = await db.query(queryFun, {reduce: true, group_level: 999});

      res.rows[0].value.should.deep.equal([
        { sum: 12, count: 3, min: 1, max: 7, sumsqr: 66  },
        { sum: 15, count: 3, min: 2, max: 8, sumsqr: 93  },
        { sum: 18, count: 3, min: 3, max: 9, sumsqr: 126 }
      ]);
    });

    it("Built in _stats reduce function should throw an error when confronted with strings",
      async function () {
        const db = new PouchDB(dbName);
        const queryFun = await createView(db, {
          map: "function(doc){emit(doc.val, 'lala');}",
          reduce: "_stats"
        });

        await db.bulkDocs({
          docs: [
            { val: 'bar' },
            { val: 'bar' },
            { val: 'baz' }
          ]
        });

        await db.query(queryFun, {reduce: true, group_level: 999}).should.be.rejected;
    });

    it("Built in _stats reduce function should throw an error when confronted with a mix of numbers and arrays",
      async function () {
        const db = new PouchDB(dbName);
        const queryFun = await createView(db, {
          map: "function(doc){emit(null, doc.val);}",
          reduce: "_stats"
        });

        await db.bulkDocs({
          docs: [
            { _id: '1', val: [1, 2, 3] },
            { _id: '2', val: 4 }
          ]
        });

        await db.query(queryFun, {reduce: true, group_level: 999}).should.be.rejected;
    });

    it("Built in _stats reduce function should throw an error when confronted with arrays of inconsistent length",
      async function () {
        const db = new PouchDB(dbName);
        const queryFun = await createView(db, {
          map: "function(doc){emit(null, doc.val);}",
          reduce: "_stats"
        });

        await db.bulkDocs({
          docs: [
            { _id: '1', val: [1, 2, 3] },
            { _id: '2', val: [1, 2] }
          ]
        });

        await db.query(queryFun, {reduce: true, group_level: 999}).should.be.rejected;
    });

    it("Built in _sum reduce function should throw an error with a promise", async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map: "function(doc){emit(null, doc.val);}",
        reduce: "_sum"
      });

      await db.bulkDocs({
        docs: [
          { val: 1 },
          { val: 2 },
          { val: 'baz' }
        ]
      });

      await db.query(queryFun, {reduce: true, group: true}).should.be.rejected;
    });

    it("Built in _sum reduce function with num arrays should throw an error", async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map: "function(doc){emit(null, doc.val);}",
        reduce: "_sum"
      });

      await db.bulkDocs({
        docs: [
          { val: [1, 2, 3] },
          { val: 2 },
          { val: ['baz']}
        ]
      });

      await db.query(queryFun, {reduce: true, group: true}).should.be.rejected;
    });

    it("Built in _sum can be used with lists of numbers", async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map: "function(doc){emit(null, doc.val);}",
        reduce: "_sum"
      });

      await db.bulkDocs({
        docs: [
          { _id: '1', val: 2 },
          { _id: '2', val: [1, 2, 3, 4] },
          { _id: '3', val: [3, 4] },
          { _id: '4', val: 1 }
        ]
      });

      const res = await db.query(queryFun, {reduce: true, group: true});

      res.should.deep.equal({rows : [{
        key : null,
        value : [7, 6, 3, 4]
      }]});
    });

    it("#6364 Recognize built in reduce functions with trailing garbage", async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map: function (doc) {
          emit(doc.val, 1);
        },
        reduce: "_sum\n \r\nandothergarbage"
      });

      await db.bulkDocs({
        docs: [
          { val: 'bar' },
          { val: 'bar' },
          { val: 'baz' }
        ]
      });

      const res =  await db.query(queryFun, {reduce: true, group_level: 999});
      const mapped = res.rows.map(row => row.value);

      mapped.should.deep.equal([2, 1]);
    });

    it("Starts with _ but not a built in reduce function should throw", async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map: "function(doc){emit(null, doc.val);}",
        reduce: "_product"
      });

      await db.bulkDocs({
        docs: [
          { val: 1 },
          { val: 2 },
          { val: 3 }
        ]
      });

      try {
        await db.query(queryFun, {reduce: true, group: true});
        throw new Error('should fail');
      } catch (err) {
        err.message.should.be.a('string');
      }
    });

    if (viewType === 'temp' && dbType !== 'http') {
      it("No reduce function, passing just a function", async function () {
        const db = new PouchDB(dbName);
        await db.post({foo: 'bar'});

        const queryFun = function () {
          emit('key', 'val');
        };

        await db.query(queryFun).should.be.fulfilled;
      });
    }

    it('Query result should include _conflicts', async function () {
      const db2name = testUtils.adapterUrl(dbType, 'test2b');
      const cleanup = () => new PouchDB(db2name).destroy();

      const doc1 = {_id: '1', foo: 'bar'};
      const doc2 = {_id: '1', foo: 'baz'};
      const db = new PouchDB(dbName);

      try {
        await db.info();
        await db.put({
          _id: '_design/test',
          views: {
            test: {
              map: function (doc) {
                if (doc._conflicts) {
                  emit(doc._conflicts, null);
                }
              }.toString()
            }
          }
        });

        const remote = new PouchDB(db2name);
        await remote.info();

        await db.post(doc1);
        await remote.post(doc2);
        await db.replicate.from(remote);

        let res =  await db.query('test', {include_docs : true, conflicts: true});

        res.rows[0].doc._conflicts.should.exist;

        res = await db.get(res.rows[0].doc._id, {conflicts: true});

        res._conflicts.should.exist;
      } finally {
        await cleanup();
      }
    });

    const icons = [
      "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"
    ];

    const iconDigests = [
      "md5-Mf8m9ehZnCXC717bPkqkCA==",
      "md5-fdEZBYtnvr+nozYVDzzxpA==",
      "md5-ImDARszfC+GA3Cv9TVW4HA==",
      "md5-hBsgoz3ujHM4ioa72btwow==",
      "md5-jDUyV6ySnTVANn2qq3332g=="
    ];

    const iconLengths = [1047, 789, 967, 527, 1108];

    it('#190 Query works with attachments=true', async function () {
      const db = new PouchDB(dbName);
      const docs = [];
      for (let i = 0; i < 5; i++) {
        docs.push({
          _id: `${i}`,
          _attachments: {
            'foo.png': {
              data: icons[i],
              content_type: 'image/png'
            }
          }
        });
      }
      await db.bulkDocs(docs);

      const queryFun = await createView(db, {
        map: function (doc) {
          emit(doc._id);
        }
      });

      let res = await db.query(queryFun, {
        include_docs: true,
        attachments: true
      });

      let attachments = res.rows.map((row) => {
        const doc = row.doc;
        delete doc._attachments['foo.png'].revpos;
        return doc._attachments;
      });

      attachments.should.deep.equal(icons.map((icon, i) => {
        return {
          "foo.png": {
            "content_type": "image/png",
            "data": icon,
            "digest": iconDigests[i]
          }
        };
      }), 'works with attachments=true');

      res = await db.query(queryFun, {include_docs: true});

      attachments = res.rows.map((row) => {
        const doc = row.doc;
        delete doc._attachments['foo.png'].revpos;
        return doc._attachments['foo.png'];
      });

      attachments.should.deep.equal(icons.map((icon, i) => {
        return {
          "content_type": "image/png",
          stub: true,
          "digest": iconDigests[i],
          length: iconLengths[i]
        };
      }), 'works with attachments=false');

      res = await db.query(queryFun, {attachments: true});

      res.rows.should.have.length(5);
      res.rows.forEach(row => should.not.exist(row.doc, 'ignored if include_docs=false'));
    });

    it('#2858 Query works with attachments=true, binary=true 1', async function () {
      // Need to avoid the cache to workaround
      // https://issues.apache.org/jira/browse/COUCHDB-2880
      const db = new PouchDB(dbName, {
        fetch: function (url, opts) {
          opts.cache = 'no-store';
          return PouchDB.fetch(url, opts);
        }
      });
      const docs = [];
      for (let i = 0; i < 5; i++) {
        docs.push({
          _id: `${i}`,
          _attachments: {
            'foo.png': {
              data: icons[i],
              content_type: 'image/png'
            }
          }
        });
      }

      await db.bulkDocs(docs);

      const queryFun = await createView(db, {
        map: function (doc) {
          emit(doc._id);
        }
      });

      const res = await db.query(queryFun, {
        include_docs: true,
        attachments: true,
        binary: true
      });

      res.rows.forEach((row) => {
        const doc = row.doc;
        Object.keys(doc._attachments).forEach((attName) => {
          const att = doc._attachments[attName];

          should.not.exist(att.stub);
          att.data.should.not.be.a('string');
        });
      });
    });

    it('#2858 Query works with attachments=true, binary=true 2', async function () {
      // Need to avoid the cache to workaround
      // https://issues.apache.org/jira/browse/COUCHDB-2880
      const db = new PouchDB(dbName, {
        fetch: function (url, opts) {
          opts.cache = 'no-store';
          return PouchDB.fetch(url, opts);
        }
      });
      const docs = [];
      for (let i = 0; i < 5; i++) {
        docs.push({
          _id: `${i}`
        });
      }

      await db.bulkDocs(docs);

      const queryFun = await createView(db, {
        map: function (doc) {
          emit(doc._id);
        }
      });

      const res =  await db.query(queryFun, {
        include_docs: true,
        attachments: true,
        binary: true
      });

      res.rows.forEach((row) => {
        const doc = row.doc;

        should.not.exist(doc._attachments);
      });
    });

    it('#242 conflicts at the root level', async function () {
      const db = new PouchDB(dbName);
      await db.bulkDocs([
        {
          foo: '1',
          _id: 'foo',
          _rev: '1-w',
          _revisions: {start: 1, ids: ['w']}
        }
      ], {new_edits: false});

      const queryFun = await createView(db, {
        map: function (doc) {
          emit(doc.foo);
        }
      });

      let res = await db.query(queryFun);

      res.rows[0].key.should.equal('1');

      await db.bulkDocs([
        {
          foo: '2',
          _id: 'foo',
          _rev: '1-x',
          _revisions: {start: 1, ids: ['x']}
        }
      ], {new_edits: false});

      res = await db.query(queryFun);

      res.rows[0].key.should.equal('2');

      await db.bulkDocs([
        {
          foo: '3',
          _id: 'foo',
          _rev: '1-y',
          _deleted: true,
          _revisions: {start: 1, ids: ['y']}
        }
      ], {new_edits: false});

      res =  await db.query(queryFun);

      res.rows[0].key.should.equal('2');
    });

    it('#242 conflicts at the root+1 level', async function () {
      const db = new PouchDB(dbName);
      await db.bulkDocs([
        {
          foo: '2',
          _id: 'foo',
          _rev: '1-x',
          _revisions: {start: 1, ids: ['x']}
        },
        {
          foo: '3',
          _id: 'foo',
          _rev: '2-y',
          _deleted: true,
          _revisions: {start: 2, ids: ['y', 'x']}
        }
      ], {new_edits: false});

      const queryFun = await createView(db, {
        map: function (doc) {
          emit(doc.foo);
        }
      });

      let res = await db.query(queryFun);

      res.rows.length.should.equal(0);

      await db.bulkDocs([
        {
          foo: '1',
          _id: 'foo',
          _rev: '1-w',
          _revisions: {start: 1, ids: ['w']}
        }
      ], {new_edits: false});

      res = await db.query(queryFun);

      res.rows[0].key.should.equal('1');

      await db.bulkDocs([
        {
          foo: '4',
          _id: 'foo',
          _rev: '1-z',
          _revisions: {start: 1, ids: ['z']}
        }
      ], {new_edits: false});

      res = await db.query(queryFun);

      res.rows[0].key.should.equal('4');
    });

    it('Views should include _conflicts', async function () {
      const db2name = testUtils.adapterUrl(dbType, 'test2');
      const cleanup = () =>  new PouchDB(db2name).destroy();

      const doc1 = {_id: '1', foo: 'bar'};
      const doc2 = {_id: '1', foo: 'baz'};
      const db = new PouchDB(dbName);

      try {
        await db.info();
        const remote = new PouchDB(db2name);
        await remote.info();

        const queryFun = await createView(db, {
          map: function (doc) {
            emit(doc._id, !!doc._conflicts);
          }
        });

        await db.post(doc1);
        await remote.post(doc2);
        await db.replicate.from(remote);

        let res = await db.get(doc1._id, {conflicts: true});

        should.exist(res._conflicts);

        res = await db.query(queryFun);

        res.rows[0].value.should.equal(true);

      } finally {
        await cleanup();
      }
    });

    it("Test view querying with limit option", async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map: function (doc) {
          if (doc.foo === 'bar') {
            emit(doc.foo);
          }
        }
      });

      await db.bulkDocs({
        docs: [
          { foo: 'bar' },
          { foo: 'bar' },
          { foo: 'baz' }
        ]
      });

      const res = await db.query(queryFun, { limit: 1 });

      res.total_rows.should.equal(2, 'Correctly returns total rows');
      res.rows.should.have.length(1, 'Correctly limits returned rows');
    });

    it("Test view querying with custom reduce function", async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map: function (doc) {
          emit(doc.foo);
        },
        reduce: function (keys, values) {
          if (keys) {
            // const id = keyId[1];
            return keys.map(keyId => keyId[0].join(''));
          } else {
            return values.flat();
          }
        }
      });

      await db.bulkDocs({
        docs: [
          { foo: ['foo', 'bar'] },
          { foo: ['foo', 'bar'] },
          { foo: ['foo', 'bar', 'baz'] },
          { foo: ['baz'] },
          { foo: ['baz', 'bar'] }
        ]
      });

      let res = await db.query(queryFun, { reduce: true });
      // We're using `chai.assert` here because the usual `chai.should()`
      // object extension magic won't work when executing functions in a
      // sandbox using node's `vm` module.
      // c.f. https://stackoverflow.com/a/16273649/680742
      assert.lengthOf(res.rows, 1, 'Correctly reduced returned rows');
      assert.isNull(res.rows[0].key, 'Correct, non-existing key');
      assert.lengthOf(res.rows[0].value, 5);
      assert.include(res.rows[0].value, 'foobarbaz');
      assert.include(res.rows[0].value, 'foobar'); // twice
      assert.include(res.rows[0].value, 'bazbar');
      assert.include(res.rows[0].value, 'baz');

      res =  await db.query(queryFun, { group_level: 1, reduce: true });
      // We're using `chai.assert` here because the usual `chai.should()`
      // object extension magic won't work when executing functions in a
      // sandbox using node's `vm` module.
      // c.f. https://stackoverflow.com/a/16273649/680742
      assert.lengthOf(res.rows, 2, 'Correctly group reduced rows');
      assert.deepEqual(res.rows[0].key, ['baz']);
      assert.lengthOf(res.rows[0].value, 2);
      assert.include(res.rows[0].value, 'bazbar');
      assert.include(res.rows[0].value, 'baz');
      assert.deepEqual(res.rows[1].key, ['foo']);
      assert.lengthOf(res.rows[1].value, 3);
      assert.include(res.rows[1].value, 'foobarbaz');
      assert.include(res.rows[1].value, 'foobar'); // twice
    });

    it("Test view querying with group_level option and reduce", async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map: function (doc) {
          emit(doc.foo);
        },
        reduce: '_count'
      });

      await db.bulkDocs({
        docs: [
          { foo: ['foo', 'bar'] },
          { foo: ['foo', 'bar'] },
          { foo: ['foo', 'bar', 'baz'] },
          { foo: ['baz'] },
          { foo: ['baz', 'bar'] }
        ]
      });

      let res = await db.query(queryFun, { group_level: 1, reduce: true});

      res.rows.should.have.length(2, 'Correctly group returned rows');
      res.rows[0].key.should.deep.equal(['baz']);
      res.rows[0].value.should.equal(2);
      res.rows[1].key.should.deep.equal(['foo']);
      res.rows[1].value.should.equal(3);

      res = await db.query(queryFun, { group_level: 999, reduce: true});

      res.rows.should.have.length(4, 'Correctly group returned rows');
      res.rows[2].key.should.deep.equal(['foo', 'bar']);
      res.rows[2].value.should.equal(2);

      res = await db.query(queryFun, { group_level: '999', reduce: true});

      res.rows.should.have.length(4, 'Correctly group returned rows');
      res.rows[2].key.should.deep.equal(['foo', 'bar']);
      res.rows[2].value.should.equal(2);

      res = await db.query(queryFun, { group_level: 0, reduce: true});

      res.rows.should.have.length(1, 'Correctly group returned rows');
      res.rows[0].value.should.equal(5);
    });

    it("Test view querying with invalid group_level options", async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map: function (doc) {
          emit(doc.foo);
        },
        reduce: '_count'
      });
      try {
        const res = await db.query(queryFun, {group_level: -1, reduce: true});
        res.should.not.exist('expected error on invalid group_level');
      } catch (err) {
        err.status.should.be.oneOf([400, 500]);
        err.message.should.be.a('string');
      }

      try {
        const res = await db.query(queryFun, { group_level: 'exact', reduce: true});
        res.should.not.exist('expected error on invalid group_level');
      } catch (err) {
        err.status.should.be.oneOf([400, 500]);
        err.message.should.be.a('string');
      }
    });

    it("Test view querying with limit option and reduce", async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map: function (doc) {
          emit(doc.foo);
        },
        reduce: '_count'
      });

      await db.bulkDocs({
        docs: [
          { foo: 'bar' },
          { foo: 'bar' },
          { foo: 'baz' }
        ]
      });

      let res = await db.query(queryFun, { limit: 1, group: true, reduce: true});

      res.rows.should.have.length(1, 'Correctly limits returned rows');
      res.rows[0].key.should.equal('bar');
      res.rows[0].value.should.equal(2);

      res = await db.query(queryFun, { limit: '1', group: true, reduce: true});

      res.rows.should.have.length(1, 'Correctly limits returned rows');
      res.rows[0].key.should.equal('bar');
      res.rows[0].value.should.equal(2);
    });

    it("Test view querying with invalid limit option and reduce", async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map: function (doc) {
          emit(doc.foo);
        },
        reduce: '_count'
      });

      await db.bulkDocs({
        docs: [
          { foo: 'bar' },
          { foo: 'bar' },
          { foo: 'baz' }
        ]
      });

      try {
        const res = await db.query(queryFun, { limit: -1, group: true, reduce: true});
        res.should.not.exist('expected error on invalid group_level');
      } catch (err) {
        err.status.should.be.oneOf([400, 500]);
        err.message.should.be.a('string');
      }
      try {
        const res = await db.query(queryFun, { limit: '1a', group: true, reduce: true});
        res.should.not.exist('expected error on invalid group_level');
      } catch (err) {
        err.status.should.be.oneOf([400, 500]);
        err.message.should.be.a('string');
      }
    });

    it('Test unsafe object usage (#244)', async function () {
      const db = new PouchDB(dbName);
      const writeRes = await db.bulkDocs([
        {_id: 'constructor'}
      ]);
      const rev = writeRes[0].rev;

      const queryFun =  await createView(db, {
        map: function (doc) {
          emit(doc._id);
        },
      });

      const queryRes = await db.query(queryFun, {include_docs: true});

      queryRes.rows.should.deep.equal([
        {
          "key": "constructor",
          "id": "constructor",
          "value": null,
          "doc": {
            "_id": "constructor",
            "_rev": rev
          }
        }
      ]);

      const writeResWithRev = await db.bulkDocs([
          {_id: 'constructor', _rev: rev}
        ]);

      const rev1 = writeResWithRev[0].rev;

      const queryRes1 = await db.query(queryFun, {include_docs: true});

      queryRes1.rows.should.deep.equal([
        {
          "key": "constructor",
          "id": "constructor",
          "value": null,
          "doc": {
            "_id": "constructor",
            "_rev": rev1
          }
        }
      ]);

      const deletedDoc = await db.bulkDocs([
        {_id: 'constructor', _rev: rev1, _deleted: true}
      ]);

      const rev2 = deletedDoc[0].rev;

      const queryRes2 = await db.query(queryFun, {include_docs: true});

      queryRes2.rows.should.deep.equal([]);
      rev2[0].should.equal('3');
    });

    it("Test view querying with a skip option and reduce", async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map: function (doc) {
          emit(doc.foo);
        },
        reduce: '_count'
      });
      const qf = queryFun;

      await db.bulkDocs({
        docs: [
          { foo: 'bar' },
          { foo: 'bar' },
          { foo: 'baz' }
        ]
      });

      const res = await db.query(queryFun, {skip: 1, group: true, reduce: true});

      res.rows.should.have.length(1, 'Correctly limits returned rows');
      res.rows[0].key.should.equal('baz');
      res.rows[0].value.should.equal(1);

      const resQf =  await db.query(qf, {skip: '1', group: true, reduce: true});

      resQf.rows.should.have.length(1, 'Correctly limits returned rows');
      resQf.rows[0].key.should.equal('baz');
      resQf.rows[0].value.should.equal(1);
    });

    it("Test view querying with invalid skip option and reduce", async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map: function (doc) {
          emit(doc.foo);
        },
        reduce: '_count'
      });

      await db.bulkDocs({
        docs: [
          { foo: 'bar' },
          { foo: 'bar' },
          { foo: 'baz' }
        ]
      });

      try {
        const res = await db.query(queryFun, { skip: -1, group: true, reduce: true});

        res.should.not.exist('expected error on invalid group_level');
      } catch (err) {
        err.status.should.be.oneOf([400, 500]);
        err.message.should.be.a('string');
      }

      try {
        const res = await db.query(queryFun, { skip: '1a', group: true, reduce: true});

        res.should.not.exist('expected error on invalid group_level');
      } catch (err) {
        err.status.should.be.oneOf([400, 500]);
        err.message.should.be.a('string');
      }
    });

    it("Special document member _doc_id_rev should never leak outside", async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map: function (doc) {
          if (doc.foo === 'bar') {
            emit(doc.foo);
          }
        }
      });

      await db.bulkDocs({
        docs: [
          { foo: 'bar' }
        ]
      });

      const res = await db.query(queryFun, { include_docs: true });

      should.not.exist(res.rows[0].doc._doc_id_rev, '_doc_id_rev is leaking but should not');
    });

    it('multiple view creations and cleanups', async function () {
      const db = new PouchDB(dbName);
      const map = function (doc) { emit(doc.num); };
      function createView(name) {
        const storableViewObj = { map: `${map}` };
        return  db.put({
          _id: '_design/' + name,
          views: {
            theView: storableViewObj
          }
        });
      }

      await db.bulkDocs({
        docs: [
          {_id: 'test1'}
        ]
      });

      async function sequence(name) {
        await createView(name);
        await db.query(name + '/theView');
        await db.viewCleanup();
      }

      const attempts = [];
      const numAttempts = 10;
      for (let i = 0; i < numAttempts; i++) {
        attempts.push(sequence('test' + i));
      }

      await Promise.all(attempts);

      const keys = [];
      for (let i = 0; i < numAttempts; i++) {
        keys.push('_design/test' + i);
      }

      const res = await db.allDocs({keys, include_docs : true});

      const docs = res.rows.map((row) => {
        row.doc._deleted = true;
        return row.doc;
      });

      await db.bulkDocs({docs});

      const viewCleanUpResult = await db.viewCleanup();

      if (viewCleanUpResult.error) {
        viewCleanUpResult.error.should.equal('not_found');
      } else {
        viewCleanUpResult.ok.should.equal(true);
      }
    });

    it('If reduce function returns 0, resulting value should not be null', async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map: function (doc) {
          emit(doc.foo);
        },
        reduce: function () {
          return 0;
        }
      });

      await db.bulkDocs({
        docs: [
          { foo: 'bar' }
        ]
      });

      const res = await db.query(queryFun);

      should.exist(res.rows[0].value);
    });

    it('Testing skip with a view', async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map : function (doc) {
          emit(doc.foo);
        }
      });

      await db.bulkDocs({
        docs: [
          { foo: 'bar' },
          { foo: 'baz' },
          { foo: 'baf' }
        ]
      });

      const res = await db.query(queryFun, {skip: 1});

      res.rows.should.have.length(2);
      res.offset.should.equal(1);
      res.total_rows.should.equal(3);
    });

    it('Map documents on 0/null/undefined/empty string', async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map : function (doc) {
          emit(doc.num);
        }
      });

      const docs = [
        {_id: '0', num: 0},
        {_id: '1', num: 1},
        {_id: 'undef' /* num is undefined */},
        {_id: 'null', num: null},
        {_id: 'empty', num: ''},
        {_id: 'nan', num: NaN},
        {_id: 'inf', num: Infinity},
        {_id: 'neginf', num: -Infinity}
      ];

      await db.bulkDocs({docs});

      const res = await db.query(queryFun, {key: 0});

      res.rows.should.have.length(1);
      res.rows[0].id.should.equal('0');

      const resEmptyKey = await db.query(queryFun, {key: ''});

      resEmptyKey.rows.should.have.length(1);
      resEmptyKey.rows[0].id.should.equal('empty');

      const resUndefinedKey = await db.query(queryFun, {key: undefined});

      resUndefinedKey.rows.should.have.length(8); // everything

      // keys that should all resolve to null
      const emptyKeys = [null, NaN, Infinity, -Infinity];
      await Promise.all(emptyKeys.map(async function (emptyKey) {
        const data = await db.query(queryFun, {key: emptyKey});
        const rows = data.rows.map(row => row.id);

        rows.should.deep.equal(['inf', 'nan', 'neginf', 'null', 'undef']);
      }));
    });

    it('Testing query with keys', async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map: function (doc) {
          emit(doc.field);
        }
      });
      const opts = {include_docs: true};
      await db.bulkDocs({
        docs: [
          {_id: 'doc_0', field: 0},
          {_id: 'doc_1', field: 1},
          {_id: 'doc_2', field: 2},
          {_id: 'doc_empty', field: ''},
          {_id: 'doc_null', field: null},
          {_id: 'doc_undefined' /* field undefined */},
          {_id: 'doc_foo', field: 'foo'}
        ]
      });

        const res = await db.query(queryFun, opts);

        res.rows.should.have.length(7, 'returns all docs');

        opts.keys = [];
        const resEmptyKeys = await db.query(queryFun, opts);

        resEmptyKeys.rows.should.have.length(0, 'returns 0 docs');

        // When passed an empty keys array (above), query mutates opts by deleting the
        // keys array and adding limit = 0. That behavior breaks this test result when
        // implementing limit and skip (#8370); it is correct (and necessary) to clean
        // up that side effect here.
        opts.keys = [0];
        delete opts.limit;
        const resDeletedLimit = await db.query(queryFun, opts);

        resDeletedLimit.rows.should.have.length(1, 'returns one doc');
        resDeletedLimit.rows[0].doc._id.should.equal('doc_0');

        // check that the returned ordering fits opts.keys
        opts.keys = [2, 'foo', 1, 0, null, ''];
        const resWithKeys = await db.query(queryFun, opts);

        resWithKeys.rows.should.have.length(7, 'returns 7 docs in correct order');
        resWithKeys.rows[0].doc._id.should.equal('doc_2');
        resWithKeys.rows[1].doc._id.should.equal('doc_foo');
        resWithKeys.rows[2].doc._id.should.equal('doc_1');
        resWithKeys.rows[3].doc._id.should.equal('doc_0');
        resWithKeys.rows[4].doc._id.should.equal('doc_null');
        resWithKeys.rows[5].doc._id.should.equal('doc_undefined');
        resWithKeys.rows[6].doc._id.should.equal('doc_empty');

        // nonexistent keys just give us holes in the list
        opts.keys = [3, 1, 4, 2];
        const resInclNonExistentKeys = await db.query(queryFun, opts);

        resInclNonExistentKeys.rows.should.have.length(2, 'returns 2 non-empty docs');
        resInclNonExistentKeys.rows[0].key.should.equal(1);
        resInclNonExistentKeys.rows[0].doc._id.should.equal('doc_1');
        resInclNonExistentKeys.rows[1].key.should.equal(2);
        resInclNonExistentKeys.rows[1].doc._id.should.equal('doc_2');

        // with duplicates, we return multiple docs
        opts.keys = [2, 1, 2, 0, 2, 1];
        const resWithDuplicateKeys = await db.query(queryFun, opts);

        resWithDuplicateKeys.rows.should.have.length(6, 'returns 6 docs with duplicates');
        resWithDuplicateKeys.rows[0].doc._id.should.equal('doc_2');
        resWithDuplicateKeys.rows[1].doc._id.should.equal('doc_1');
        resWithDuplicateKeys.rows[2].doc._id.should.equal('doc_2');
        resWithDuplicateKeys.rows[3].doc._id.should.equal('doc_0');
        resWithDuplicateKeys.rows[4].doc._id.should.equal('doc_2');
        resWithDuplicateKeys.rows[5].doc._id.should.equal('doc_1');

        // duplicates and unknowns at the same time, for maximum weirdness
        opts.keys = [2, 1, 2, 3, 2];
        const resWithDuplicateAndUnknownKeys = await db.query(queryFun, opts);

        resWithDuplicateAndUnknownKeys.rows.should.have.length(4, 'returns 2 docs with duplicates/unknowns');
        resWithDuplicateAndUnknownKeys.rows[0].doc._id.should.equal('doc_2');
        resWithDuplicateAndUnknownKeys.rows[1].doc._id.should.equal('doc_1');
        resWithDuplicateAndUnknownKeys.rows[2].doc._id.should.equal('doc_2');
        resWithDuplicateAndUnknownKeys.rows[3].doc._id.should.equal('doc_2');

        opts.keys = [3];
        const resWithUnknownKey = await db.query(queryFun, opts);

        resWithUnknownKey.rows.should.have.length(0, 'returns 0 doc due to unknown key');

        opts.include_docs = false;
        opts.keys = [3, 2];

        const resWithoutDocs = await db.query(queryFun, opts);

        resWithoutDocs.rows.should.have.length(1, 'returns 1 doc due to unknown key');
        resWithoutDocs.rows[0].id.should.equal('doc_2');
        should.not.exist(resWithoutDocs.rows[0].doc, 'no doc, since include_docs=false');
    });

    it('Testing query with multiple keys, multiple docs', async function () {
      const opts = {keys: [0, 1, 2]};

      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map: function (doc) {
          emit(doc.field1);
          emit(doc.field2);
        }
      });

      await db.bulkDocs({
        docs: [
          {_id: '0', field1: 0},
          {_id: '1a', field1: 1},
          {_id: '1b', field1: 1},
          {_id: '1c', field1: 1},
          {_id: '2+3', field1: 2, field2: 3},
          {_id: '4+5', field1: 4, field2: 5},
          {_id: '3+5', field1: 3, field2: 5},
          {_id: '3+4', field1: 3, field2: 4}
        ]
      });

      const res = await db.query(queryFun, opts);

      res.rows.map(row => row.id).should.deep.equal(['0', '1a', '1b', '1c', '2+3']);

      opts.keys = [3, 5, 4, 3];
      const res1 = await db.query(queryFun, opts);

      res1.rows.map(row => row.id).should.deep.equal(
        ['2+3', '3+4', '3+5', '3+5', '4+5', '3+4', '4+5', '2+3', '3+4', '3+5']);
    });

    it('Testing multiple emissions (issue #14)', async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map : function (doc) {
          emit(doc.foo);
          emit(doc.bar);
          emit(doc.foo);
          emit(doc.bar, 'multiple values!');
          emit(doc.bar, 'crayon!');
        }
      });

      await db.bulkDocs({
        docs: [
          {_id: 'doc1', foo : 'foo', bar : 'bar'},
          {_id: 'doc2', foo : 'foo', bar : 'bar'}
        ]
      });

      const opts = {keys: ['foo', 'bar']};
      const res = await db.query(queryFun, opts);

      res.rows.should.have.length(10);

      res.rows[0].key.should.equal('foo');
      res.rows[0].id.should.equal('doc1');
      res.rows[1].key.should.equal('foo');
      res.rows[1].id.should.equal('doc1');

      res.rows[2].key.should.equal('foo');
      res.rows[2].id.should.equal('doc2');
      res.rows[3].key.should.equal('foo');
      res.rows[3].id.should.equal('doc2');

      res.rows[4].key.should.equal('bar');
      res.rows[4].id.should.equal('doc1');
      should.not.exist(res.rows[4].value);
      res.rows[5].key.should.equal('bar');
      res.rows[5].id.should.equal('doc1');
      res.rows[5].value.should.equal('crayon!');
      res.rows[6].key.should.equal('bar');
      res.rows[6].id.should.equal('doc1');
      res.rows[6].value.should.equal('multiple values!');

      res.rows[7].key.should.equal('bar');
      res.rows[7].id.should.equal('doc2');
      should.not.exist(res.rows[7].value);
      res.rows[8].key.should.equal('bar');
      res.rows[8].id.should.equal('doc2');
      res.rows[8].value.should.equal('crayon!');
      res.rows[9].key.should.equal('bar');
      res.rows[9].id.should.equal('doc2');
      res.rows[9].value.should.equal('multiple values!');
    });

    it('Testing multiple emissions (complex keys)', async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map: function () {
          emit(['a'], 1);
          emit(['b'], 3);
          emit(['a'], 2);
        }
      });

      await db.bulkDocs({
        docs: [
          {_id: 'doc1', foo: 'foo', bar: 'bar'}
        ]
      });

      const res = await db.query(queryFun);

      res.rows.should.have.length(3);
      res.rows[0].key.should.eql(['a']);
      res.rows[0].value.should.equal(1);
      res.rows[1].key.should.eql(['a']);
      res.rows[1].value.should.equal(2);
      res.rows[2].key.should.eql(['b']);
      res.rows[2].value.should.equal(3);

    });

    it('Testing empty startkeys and endkeys', async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map : function (doc) {
          emit(doc.field);
        }
      });

      await db.bulkDocs({
        docs: [
          {_id: 'doc_empty', field: ''},
          {_id: 'doc_null', field: null},
          {_id: 'doc_undefined' /* field undefined */},
          {_id: 'doc_foo', field: 'foo'}
        ]
      });

      const opts = {startkey: null, endkey: ''};
      const data = await db.query(queryFun, opts);

      data.rows.map(row => row.id).should.deep.equal(['doc_null', 'doc_undefined', 'doc_empty']);

      const opts1 = {startkey: '', endkey: 'foo'};
      const data1 = await db.query(queryFun, opts1);

      data1.rows.map(row => row.id).should.deep.equal(['doc_empty', 'doc_foo']);

      const opts2 = {startkey: null, endkey: null};
      const data2 = await db.query(queryFun, opts2);

      data2.rows.map(row => row.id).should.deep.equal(['doc_null', 'doc_undefined']);

      opts2.descending = true;
      const data3 = await db.query(queryFun, opts2);

      data3.rows.map(row => row.id).should.deep.equal(['doc_undefined', 'doc_null']);
    });

    it('#238 later non-winning revisions', async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map: function (doc) {
          emit(doc.name);
        }
      });

      await db.bulkDocs([{
        _id: 'doc',
        name: 'zoot',
        _rev: '2-x',
        _revisions: {
          start: 2,
          ids: ['x', 'y']
        }
      }], {new_edits: false});

      const res = await db.query(queryFun);

      res.rows.should.have.length(1);
      res.rows[0].id.should.equal('doc');
      res.rows[0].key.should.equal('zoot');

      await db.bulkDocs([{
        _id: 'doc',
        name: 'suit',
        _rev: '2-w',
        _revisions: {
          start: 2,
          ids: ['w', 'y']
        }
      }], {new_edits: false});

      const res1 = await db.query(queryFun);

      res1.rows.should.have.length(1);
      res1.rows[0].id.should.equal('doc');
      res1.rows[0].key.should.equal('zoot');
    });

    it('#238 later non-winning deleted revisions', async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map: function (doc) {
          emit(doc.name);
        }
      });

      await db.bulkDocs([{
        _id: 'doc',
        name: 'zoot',
        _rev: '2-x',
        _revisions: {
          start: 2,
          ids: ['x', 'y']
        }
      }], {new_edits: false});

      const res = await db.query(queryFun);

      res.rows.should.have.length(1);
      res.rows[0].id.should.equal('doc');
      res.rows[0].key.should.equal('zoot');

      await db.bulkDocs([{
        _id: 'doc',
        name: 'suit',
        _deleted: true,
        _rev: '2-z',
        _revisions: {
          start: 2,
          ids: ['z', 'y']
        }
      }], {new_edits: false});

      const res1 = await db.query(queryFun);

      res1.rows.should.have.length(1);
      res1.rows[0].id.should.equal('doc');
      res1.rows[0].key.should.equal('zoot');
    });

    it('#238 query with conflicts', async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map: function (doc) {
          emit(doc.name);
        }
      });

      await db.bulkDocs([
        {
          _id: 'doc',
          name: 'zab',
          _rev: '2-y',
          _revisions: {
            start: 1,
            ids: ['y']
          }
        }, {
          _id: 'doc',
          name: 'zoot',
          _rev: '2-x',
          _revisions: {
            start: 2,
            ids: ['x', 'y']
          }
        }
      ], {new_edits: false});

      const res = await db.query(queryFun);

      res.rows.should.have.length(1);
      res.rows[0].id.should.equal('doc');
      res.rows[0].key.should.equal('zoot');

      await db.bulkDocs([
        {
          _id: 'doc',
          name: 'suit',
          _rev: '2-w',
          _revisions: {
            start: 2,
            ids: ['w', 'y']
          }
        }, {
          _id: 'doc',
          name: 'zorb',
          _rev: '2-z',
          _revisions: {
            start: 2,
            ids: ['z', 'y']
          }
        }
      ], {new_edits: false});

      const res1 = await db.query(queryFun);

      res1.rows.should.have.length(1);
      res1.rows[0].id.should.equal('doc');
      res1.rows[0].key.should.equal('zorb');
    });

    it('Testing ordering with startkey/endkey/key', async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map : function (doc) {
          emit(doc.field, null);
        }
      });

      await db.bulkDocs({
        docs: [
          {_id: 'h', field: '4'},
          {_id: 'a', field: '1'},
          {_id: 'e', field: '2'},
          {_id: 'c', field: '1'},
          {_id: 'f', field: '3'},
          {_id: 'g', field: '4'},
          {_id: 'd', field: '2'},
          {_id: 'b', field: '1'}
        ]
      });

      const opts = {startkey: '1', endkey: '4'};
      const res = await db.query(queryFun, opts);

      res.rows.map(row => row.id)
        .should.deep.equal(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);

      const opts1 = {key: '1'};
      const res1 = await db.query(queryFun, opts1);

      res1.rows.map(row => row.id)
        .should.deep.equal(['a', 'b', 'c']);

      const opts2 = {key: '2'};
      const res2 = await db.query(queryFun, opts2);

      res2.rows.map(row => row.id)
        .should.deep.equal(['d', 'e']);

      opts2.descending = true;
      const res3 = await db.query(queryFun, opts2);

      res3.rows.map(row => row.id)
        .should.deep.equal(['e', 'd'], 'reverse order');
    });

    it('opts.keys should work with complex keys', async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map: function (doc) {
          emit(doc.foo, doc.foo);
        }
      });

      const keys = [
        {key: 'missing'},
        ['test', 1],
        {key1: 'value1'},
        ['missing'],
        [0, 0]
      ];

      await db.bulkDocs({
        docs: [
          {foo: {key2: 'value2'}},
          {foo: {key1: 'value1'}},
          {foo: [0, 0]},
          {foo: ['test', 1]},
          {foo: [0, false]}
        ]
      });

      const opts = {keys};
      const res = await db.query(queryFun, opts);

      res.rows.should.have.length(3);
      res.rows[0].value.should.deep.equal(keys[1]);
      res.rows[1].value.should.deep.equal(keys[2]);
      res.rows[2].value.should.deep.equal(keys[4]);
    });

    it('Testing ordering with dates', async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map : function (doc) {
          emit(doc.date, null);
        }
      });

      await db.bulkDocs({
        docs: [
          {_id: '1969', date: '1969 was when Space Oddity hit'},
          {_id: '1971', date : new Date('1971-12-17T00:00:00.000Z')}, // Hunky Dory was released
          {_id: '1972', date: '1972 was when Ziggy landed on Earth'},
          {_id: '1977', date: new Date('1977-01-14T00:00:00.000Z')}, // Low was released
          {_id: '1985', date: '1985+ is better left unmentioned'}
        ]
      });

      const data = await db.query(queryFun);

      data.rows.map(row => row.id)
        .should.deep.equal(['1969', '1971', '1972', '1977', '1985']);
    });

    it('should work with a joined doc', async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map: function (doc) {
          if (doc.join) {
            emit(doc.color, {_id : doc.join});
          }
        }
      });

      await db.bulkDocs({
        docs: [
          {_id: 'a', join: 'b', color: 'green'},
          {_id: 'b', val: 'c'},
          {_id: 'd', join: 'f', color: 'red'}
        ]
      });

      const res = await db.query(queryFun, {include_docs: true});
      const firstRow = res.rows[0];
      [firstRow.key, firstRow.doc._id, firstRow.doc.val]
        .should.deep.equal(['green', 'b', 'c']);
    });

    it('should query correctly with a constiety of criteria', async function () {
      const db = new PouchDB(dbName);
      const ddoc = {
        _id: '_design/test',
        views: {
          test: {
            map: function (doc) {
              emit(doc._id);
            }.toString()
          }
        }
      };
      const queryFun = 'test';

      await db.put(ddoc);

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

      const res = await db.bulkDocs({docs});

      docs[3]._deleted = true;
      docs[7]._deleted = true;
      docs[3]._rev = res[3].rev;
      docs[7]._rev = res[7].rev;

      await db.remove(docs[3]);
      await db.remove(docs[7]);

      const queryRes = await db.query(queryFun, {});

      queryRes.rows.should.have.length(8, 'correctly return rows');
      queryRes.total_rows.should.equal(8, 'correctly return total_rows');

      const queryRes1 = await db.query(queryFun, {startkey : '5'});

      queryRes1.rows.should.have.length(4, 'correctly return rows');
      queryRes1.total_rows.should.equal(8, 'correctly return total_rows');

      const queryRes2 = await db.query(queryFun, {startkey : '5', skip : 2, limit : 10});

      queryRes2.rows.should.have.length(2, 'correctly return rows');
      queryRes2.total_rows.should.equal(8, 'correctly return total_rows');

      const queryRes3 = await db.query(queryFun, {startkey : '5', descending : true, skip : 1});

      queryRes3.rows.should.have.length(4, 'correctly return rows');
      queryRes3.total_rows.should.equal(8, 'correctly return total_rows');

      const queryRes4 = await db.query(queryFun, {startkey : '5', endkey : 'z'});

      queryRes4.rows.should.have.length(4, 'correctly return rows');
      queryRes4.total_rows.should.equal(8, 'correctly return total_rows');

      const queryRes5 = await db.query(queryFun, {startkey : '5', endkey : '5'});

      queryRes5.rows.should.have.length(1, 'correctly return rows');
      queryRes5.total_rows.should.equal(8, 'correctly return total_rows');

      const queryRes6 = await db.query(queryFun, {startkey : '5', endkey : '4', descending : true});

      queryRes6.rows.should.have.length(2, 'correctly return rows');
      queryRes6.total_rows.should.equal(8, 'correctly return total_rows');

      const queryRes7 = await db.query(queryFun, {startkey : '3', endkey : '7', descending : false});

      queryRes7.rows.should.have.length(3, 'correctly return rows');
      queryRes7.total_rows.should.equal(8, 'correctly return total_rows');

      const queryRes8 = await db.query(queryFun, {startkey : '7', endkey : '3', descending : true});

      queryRes8.rows.should.have.length(3, 'correctly return rows');
      queryRes8.total_rows.should.equal(8, 'correctly return total_rows');

      const queryRes9 = await db.query(queryFun, {startkey : '', endkey : '0'});

      queryRes9.rows.should.have.length(1, 'correctly return rows');
      queryRes9.total_rows.should.equal(8, 'correctly return total_rows');

      const queryRes10 = await db.query(queryFun, {keys : ['0', '1', '3']});

      queryRes10.rows.should.have.length(2, 'correctly return rows');
      queryRes10.total_rows.should.equal(8, 'correctly return total_rows');

      const queryRes11 = await db.query(queryFun, {keys : ['0', '1', '0', '2', '1', '1']});

      queryRes11.rows.should.have.length(6, 'correctly return rows');
      const resKeys =  queryRes11.rows.map( row => row.key);

      resKeys.should.deep.equal(['0', '1', '0', '2', '1', '1']);
      queryRes11.total_rows.should.equal(8, 'correctly return total_rows');

      const queryRes12 = await db.query(queryFun, {keys : []});

      queryRes12.rows.should.have.length(0, 'correctly return rows');
      queryRes12.total_rows.should.equal(8, 'correctly return total_rows');

      const queryRes13 = await db.query(queryFun, {keys : ['7']});

      queryRes13.rows.should.have.length(0, 'correctly return rows');
      queryRes13.total_rows.should.equal(8, 'correctly return total_rows');

      const queryRes14 = await db.query(queryFun, {key : '3'});

      queryRes14.rows.should.have.length(0, 'correctly return rows');
      queryRes14.total_rows.should.equal(8, 'correctly return total_rows');

      const queryRes15 = await db.query(queryFun, {key : '2'});

      queryRes15.rows.should.have.length(1, 'correctly return rows');
      queryRes15.total_rows.should.equal(8, 'correctly return total_rows');

      const queryRes16 = await db.query(queryFun, {key : 'z'});

      queryRes16.rows.should.have.length(0, 'correctly return rows');
      queryRes16.total_rows.should.equal(8, 'correctly return total_rows');

      try {
        const queryRes17 = await db.query(queryFun, {startkey : '5', endkey : '4'});

        queryRes17.should.not.exist('expected error on reversed start/endkey');
      } catch (err) {
        err.status.should.be.oneOf([400, 500]);
        err.message.should.be.a('string');
      }
    });

    it('should query correctly with skip/limit and multiple keys/values', async function () {
      const db = new PouchDB(dbName);
      const docs = {
        docs: [
          {_id: 'doc1', foo : 'foo', bar : 'bar'},
          {_id: 'doc2', foo : 'foo', bar : 'bar'}
        ]
      };
      const getValues = row => row.value;
      const getIds = row => row.id;

      const queryFun = await createView(db, {
        map : function (doc) {
          emit(doc.foo, 'fooValue');
          emit(doc.foo);
          emit(doc.bar);
          emit(doc.bar, 'crayon!');
          emit(doc.bar, 'multiple values!');
          emit(doc.bar, 'crayon!');
        }
      });

      await db.bulkDocs(docs);

      const queryRes = await db.query(queryFun, {});

      queryRes.rows.should.have.length(12, 'correctly return rows');
      queryRes.total_rows.should.equal(12, 'correctly return total_rows');
      queryRes.rows.map(getValues).should.deep.equal(
        [null, 'crayon!', 'crayon!', 'multiple values!',
          null, 'crayon!', 'crayon!', 'multiple values!',
          null, 'fooValue', null, 'fooValue']);
      queryRes.rows.map(getIds).should.deep.equal(
        ['doc1', 'doc1', 'doc1', 'doc1',
          'doc2', 'doc2', 'doc2', 'doc2',
          'doc1', 'doc1', 'doc2', 'doc2']);

      const queryRes1 = await db.query(queryFun, {startkey : 'foo'});

      queryRes1.rows.should.have.length(4, 'correctly return rows');
      queryRes1.total_rows.should.equal(12, 'correctly return total_rows');
      queryRes1.rows.map(getValues).should.deep.equal(
        [null, 'fooValue', null, 'fooValue']);
      queryRes1.rows.map(getIds).should.deep.equal(
      ['doc1', 'doc1', 'doc2', 'doc2']);

      const queryRes2 = await db.query(queryFun, {startkey : 'foo', endkey : 'foo'});

      queryRes2.rows.should.have.length(4, 'correctly return rows');
      queryRes2.total_rows.should.equal(12, 'correctly return total_rows');

      const queryRes3 = await db.query(queryFun, {startkey : 'bar', endkey : 'bar'});

      queryRes3.rows.should.have.length(8, 'correctly return rows');
      queryRes3.total_rows.should.equal(12, 'correctly return total_rows');

      const queryRes4 = await db.query(queryFun, {startkey : 'foo', limit : 1});

      queryRes4.rows.should.have.length(1, 'correctly return rows');
      queryRes4.total_rows.should.equal(12, 'correctly return total_rows');
      queryRes4.rows.map(getValues).should.deep.equal([null]);
      queryRes4.rows.map(getIds).should.deep.equal(['doc1']);

      const queryRes5 = await db.query(queryFun, {startkey : 'foo', limit : 2});

      queryRes5.rows.should.have.length(2, 'correctly return rows');
      queryRes5.total_rows.should.equal(12, 'correctly return total_rows');

      const queryRes6 = await db.query(queryFun, {startkey : 'foo', limit : 1000});

      queryRes6.rows.should.have.length(4, 'correctly return rows');
      queryRes6.total_rows.should.equal(12, 'correctly return total_rows');

      const queryRes7 = await db.query(queryFun, {startkey : 'foo', skip : 1});

      queryRes7.rows.should.have.length(3, 'correctly return rows');
      queryRes7.total_rows.should.equal(12, 'correctly return total_rows');

      const queryRes8 = await db.query(queryFun, {startkey : 'foo', skip : 3, limit : 0});

      queryRes8.rows.should.have.length(0, 'correctly return rows');
      queryRes8.total_rows.should.equal(12, 'correctly return total_rows');

      const queryRes9 = await db.query(queryFun, {startkey : 'foo', skip : 3, limit : 1});

      queryRes9.rows.should.have.length(1, 'correctly return rows');
      queryRes9.total_rows.should.equal(12, 'correctly return total_rows');
      queryRes9.rows.map(getValues).should.deep.equal(['fooValue']);
      queryRes9.rows.map(getIds).should.deep.equal(['doc2']);

      const queryRes10 = await db.query(queryFun, {startkey : 'quux', skip : 3, limit : 1});

      queryRes10.rows.should.have.length(0, 'correctly return rows');
      queryRes10.total_rows.should.equal(12, 'correctly return total_rows');

      const queryRes11 = await db.query(queryFun, {startkey : 'bar', limit : 2});

      queryRes11.rows.should.have.length(2, 'correctly return rows');
      queryRes11.total_rows.should.equal(12, 'correctly return total_rows');
    });

    it('should query correctly with undefined key/values', async function () {
      const db = new PouchDB(dbName);
      const docs = {
        docs: [
          {_id: 'doc1'},
          {_id: 'doc2'}
        ]
      };
      const queryFun = await createView(db, {
        map : function () {
          emit();
        }
      });

      await db.bulkDocs(docs);

      const res = await db.query(queryFun, {});

      res.total_rows.should.equal(2, 'correctly return total_rows');
      res.rows.should.deep.equal([
        {
          key : null,
          value : null,
          id : 'doc1'
        },
        {
          key : null,
          value : null,
          id : 'doc2'
        }
      ]);
    });

    it('should query correctly with no docs', async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map : function () {
          emit();
        }
      });
      const res = await db.query(queryFun);

      res.total_rows.should.equal(0, 'total_rows');
      res.offset.should.equal(0);
      res.rows.should.deep.equal([]);
    });

    it('should query correctly with no emits', async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map : function () {
        }
      });

      await db.bulkDocs({docs : [
        {_id : 'foo'},
        {_id : 'bar'}
      ]});

      const res = await db.query(queryFun);

      res.total_rows.should.equal(0, 'total_rows');
      res.offset.should.equal(0);
      res.rows.should.deep.equal([]);
    });

    it('should correctly return results when reducing or not reducing', async function () {
      const keyValues = row => ({key: row.key, value: row.value });
      const keys = row => row.key;
      const values = row => row.value;
      const docIds = row => row.doc._id;

      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map : function (doc) {
          emit(doc.name);
        },
        reduce : '_count'
      });

      await db.bulkDocs({docs : [
        {name : 'foo', _id : '1'},
        {name : 'bar', _id : '2'},
        {name : 'foo', _id : '3'},
        {name : 'quux', _id : '4'},
        {name : 'foo', _id : '5'},
        {name : 'foo', _id : '6'},
        {name : 'foo', _id : '7'}
      ]});

      const queryRes = await db.query(queryFun);
      const sortedKeys = Object.keys(queryRes.rows[0]).sort();

      sortedKeys.should.deep.equal(['key', 'value'], 'object only have 2 keys');
      should.not.exist(queryRes.total_rows, 'no total_rows1');
      should.not.exist(queryRes.offset, 'no offset1');
      queryRes.rows.map(keyValues).should.deep.equal([
        {
          key   : null,
          value : 7
        }
      ]);

      const queryRes1 = await db.query(queryFun, {group : true});
      const sortedKeys1 = Object.keys(queryRes1.rows[0]).sort();

      sortedKeys1.should.deep.equal(['key', 'value'], 'object only have 2 keys');
      should.not.exist(queryRes1.total_rows, 'no total_rows2');
      should.not.exist(queryRes1.offset, 'no offset2');
      queryRes1.rows.map(keyValues).should.deep.equal([
        {
          key : 'bar',
          value : 1
        },
        {
          key : 'foo',
          value : 5
        },
        {
          key : 'quux',
          value : 1
        }
      ]);

      const queryRes2 = await db.query(queryFun, {reduce : false});

      const sortedKeys2 = Object.keys(queryRes2.rows[0]).sort();
      sortedKeys2.should.deep.equal(['id', 'key', 'value'], 'object only have 3 keys');
      queryRes2.total_rows.should.equal(7, 'total_rows1');
      queryRes2.offset.should.equal(0, 'offset1');
      queryRes2.rows.map(keys).should.deep.equal([
        'bar', 'foo', 'foo', 'foo', 'foo', 'foo', 'quux'
      ]);
      queryRes2.rows.map(values).should.deep.equal([
        null, null, null, null, null, null, null
      ]);

      const queryRes3 = await db.query(queryFun, {reduce : false, skip : 3});
      const sortedKeys3 = Object.keys(queryRes3.rows[0]).sort();

      sortedKeys3.should.deep.equal(['id', 'key', 'value'], 'object only have 3 keys');
      queryRes3.total_rows.should.equal(7, 'total_rows2');
      queryRes3.offset.should.equal(3, 'offset2');
      queryRes3.rows.map(keys).should.deep.equal(['foo', 'foo', 'foo', 'quux']);

      const queryRes4 = await db.query(queryFun, {reduce : false, include_docs : true});

      const sortedKeys4 = Object.keys(queryRes4.rows[0]).sort();
      sortedKeys4.should.deep.equal(['doc', 'id', 'key', 'value'], 'object only have 4 keys');
      queryRes4.total_rows.should.equal(7, 'total_rows3');
      queryRes4.offset.should.equal(0, 'offset3');
      queryRes4.rows.map(keys).should.deep.equal([
        'bar', 'foo', 'foo', 'foo', 'foo', 'foo', 'quux'
      ]);
      queryRes4.rows.map(values).should.deep.equal([
        null, null, null, null, null, null, null
      ]);
      queryRes4.rows.map(docIds).should.deep.equal([
        '2', '1', '3', '5', '6', '7', '4'
      ]);

      try {
        const queryRes5 = await db.query(queryFun, {include_docs : true});

        should.not.exist(queryRes5);
      } catch (err) {
        err.status.should.be.oneOf([400, 500]);
        err.message.should.be.a('string');
        // include_docs is invalid for reduce
      }
    });

    it('should query correctly after replicating and other ddoc', async function () {
      const db = new PouchDB(dbName);
      const db2 = new PouchDB(testUtils.adapterUrl(dbType, 'local-other'));
      const queryFun = await createView(db, {
        map: function (doc) {
          emit(doc.name);
        }
      });

      await db.bulkDocs({docs: [{name: 'foobar'}]});

      const resBeforeReplicating = await db.query(queryFun);

      resBeforeReplicating.rows.map(x => x.key).should.deep.equal(
        ['foobar'], 'test db before replicating');

      await db.replicate.to(db2);

      const resAfterReplicating = await db.query(queryFun);

      resAfterReplicating.rows.map(x => x.key).should.deep.equal(
        ['foobar'], 'test db after replicating');

      await db.put({
        _id: '_design/other_ddoc',
        views: {
          test: {
            map: "function(doc) { emit(doc._id); }"
          }
        }
      });

      // the random ddoc adds a single change that we don't
      // care about. testing this increases our coverage
      const resAfterAdding = await db.query(queryFun);

      resAfterAdding.rows.map(x => x.key).should.deep.equal(
        ['foobar'], 'test db after adding random ddoc');

      try {
        const resFromDb2 = await db2.query(queryFun);

        resFromDb2.rows.map(x => x.key).should.deep.equal([
          'foobar'
        ], 'test db2');
      } finally {
          await db2.destroy();
      }
    });

    it('should query correctly after many edits', async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map : function (doc) {
          emit(doc.name, doc.likes);
        }
      });

      const docs = [
        { _id: '1', name: 'leonardo' },
        { _id: '2', name: 'michelangelo' },
        { _id: '3', name: 'donatello' },
        { _id: '4', name: 'rafael' },
        { _id: '5', name: 'april o\'neil' },
        { _id: '6', name: 'splinter' },
        { _id: '7', name: 'shredder' },
        { _id: '8', name: 'krang' },
        { _id: '9', name: 'rocksteady' },
        { _id: 'a', name: 'bebop' },
        { _id: 'b', name: 'casey jones' },
        { _id: 'c', name: 'casey jones' },
        { _id: 'd', name: 'baxter stockman' },
        { _id: 'e', name: 'general chaos' },
        { _id: 'f', name: 'rahzar' },
        { _id: 'g', name: 'tokka' },
        { _id: 'h', name: 'usagi yojimbo' },
        { _id: 'i', name: 'rat king' },
        { _id: 'j', name: 'metalhead' },
        { _id: 'k', name: 'slash' },
        { _id: 'l', name: 'ace duck' }
      ];

      for (let i = 0; i < 100; i++) {
        docs.push({
          _id: 'z-' + (i + 1000), // for correct string ordering
          name: 'random foot soldier #' + i
        });
      }

      const byId = Object.fromEntries(docs.map(doc => [doc._id, doc]));

      const update = (res, docFun) => {
        for (let i  = 0; i < res.length; i++) {
          const doc = byId[res[i].id];
          doc._rev = res[i].rev;
          docFun(doc);
        }
        return db.bulkDocs({docs});
      };

      const res = await db.bulkDocs({docs});

      const updated = await update(res, doc => doc.likes = 'pizza');
      const updated1 = await update(updated, doc => doc.knows = 'kung fu');
      const updated2 = await update(updated1, doc =>  doc.likes = 'fighting');
      const updated3 = await update(updated2, doc => doc._deleted = true);
      const updated4 = await update(updated3, doc => doc._deleted = false);
      const updated5 = await update(updated4, doc => doc.name = doc.name + '1');
      const updated6 = await update(updated5, doc => doc.name = doc.name + '2');
      const updated7 = await update(updated6, doc => doc.name = 'nameless');
      const updated8 = await update(updated7, doc => doc._deleted = true);
      const updated9 = await update(updated8, doc => doc.likes = 'turtles');
      const updated10 = await update(updated9, doc => doc._deleted = false);
      const updated11 = await update(updated10, doc => doc.whatever = 'quux');
      const updated12 = await update(updated11, doc => doc.stuff = 'baz');
      await update(updated12, doc => doc.things = 'foo');

      const queryRes = await db.query(queryFun);

      queryRes.total_rows.should.equal(docs.length, 'expected total_rows');
      queryRes.rows.map(row => [row.id, row.key, row.value])
      .should.deep.equal(docs.map(doc => [doc._id, 'nameless', 'turtles'])
      , 'key values match');
    });

    it('should query correctly with staggered seqs', async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map : function (doc) {
          emit(doc.name);
        }
      });

      const docs = [];
      for (let i = 0; i < 200; i++) {
        docs.push({
          _id: 'doc-' + (i + 1000), // for correct string ordering
          name: 'gen1'
        });
      }
      const bulkDocsRes = await db.bulkDocs({docs});

      docs.forEach(doc => {
        doc._rev = bulkDocsRes.find((info) => info.id === doc._id).rev;
        doc.name = 'gen2';
      });
      docs.reverse();

      const bulkDocsRes1 = await db.bulkDocs({docs});

      docs.forEach(doc => {
        doc._rev = bulkDocsRes1.find((info) => info.id === doc._id).rev;
        doc.name = 'gen-3';
      });
      docs.reverse();

      const bulkDocsRes2 = await db.bulkDocs({docs});

      docs.forEach(doc => {
        doc._rev = bulkDocsRes2.find((info) => info.id === doc._id).rev;
        doc.name = 'gen-4-odd';
      });
      const docsToUpdate = docs.filter((doc, i) => {
        return i % 2 === 1;
      });
      docsToUpdate.reverse();

      await db.bulkDocs({docs: docsToUpdate});

      const queryRes = await db.query(queryFun);

      const expected = docs.map((doc, i) => {
        const key = i % 2 === 1 ? 'gen-4-odd' : 'gen-3';
        return {key, id: doc._id, value: null};
      });
      expected.sort((a, b) => {
        if (a.key !== b.key) {
          return a.key < b.key ? -1 : 1;
        }
        return a.id < b.id ? -1 : 1;
      });

      queryRes.rows.should.deep.equal(expected);
    });

    it('should handle removes/undeletes/updates', async function () {
      const doc = {name : 'bar', _id : '1'};
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map: function (doc) {
          emit(doc.name);
        }
      });

      const putDoc = await db.put(doc);
      doc._rev = putDoc.rev;
      const queryRes = await db.query(queryFun);

      queryRes.rows.length.should.equal(1);

      doc._deleted = true;
      const putDeleted = await db.post(doc);
      doc._rev = putDeleted.rev;
      const queryRes1 = await db.query(queryFun);

      queryRes1.rows.length.should.equal(0);

      doc._deleted = false;
      delete doc._rev;
      const putUnDeleted = await db.put(doc);
      doc._rev = putUnDeleted.rev;
      const queryRes2 = await db.query(queryFun);

      queryRes2.rows.length.should.equal(1);

      doc.name = 'foo';
      const postDocWithName = await db.post(doc);
      doc._rev = postDocWithName.rev;
      const queryRes3 = await db.query(queryFun);

      queryRes3.rows.length.should.equal(1);
      queryRes3.rows[0].key.should.equal('foo');

      doc._deleted = true;
      const postDeleted = await db.post(doc);
      doc._rev = postDeleted.rev;
      const queryRes4 = await db.query(queryFun);

      queryRes4.rows.length.should.equal(0);
    });

    it('should return error when multi-key fetch & group=false', async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map: function (doc) { emit(doc._id); },
        reduce: '_sum'
      });

    const keys = ['1', '2'];
    let opts = {
      keys,
      group: false
    };

    try {
      const res = await db.query(queryFun, opts);
      should.not.exist(res);
    } catch (err) {
      err.status.should.be.oneOf([400, 500]);
    }

    try {
      const res = await  db.query(queryFun, opts = {keys});
      should.not.exist(res);
    } catch (err) {
      err.status.should.be.oneOf([400, 500]);
    }

    await db.query(queryFun, opts = {keys, reduce : false}).should.be.fulfilled;
    await db.query(queryFun, opts = {keys, group: true}).should.be.fulfilled;
    });

    it('should handle user errors in map functions', async function () {
      const db = new PouchDB(dbName);
      let err;
      db.on('error', e => err = e);
      const queryFun = await createView(db, {
        map : function (doc) {
          emit(doc.nonexistent.foo);
        }
      });

      await db.put({name : 'bar', _id : '1'});
      const res = await db.query(queryFun);

      res.rows.should.have.length(0);
      if (dbType === 'local') {
        should.exist(err);
      }
    });

    it('should handle user errors in reduce functions', async function () {
      const db = new PouchDB(dbName);
      let err;
      db.on('error', e => err = e);
      const queryFun =  await createView(db, {
        map : function (doc) {
          emit(doc.name);
        },
        reduce : function (keys) {
          return keys[0].foo.bar;
        }
      });

      await db.put({name : 'bar', _id : '1'});

      const resGrouped = await db.query(queryFun, {group: true});

      resGrouped.rows.map(row => row.key).should.deep.equal(['bar']);

      const resNotReduced = await db.query(queryFun, {reduce: false});

      resNotReduced.rows.map(row => row.key).should.deep.equal(['bar']);
      if (dbType === 'local') {
        should.exist(err);
      }
    });

    it('should handle reduce returning undefined', async function () {
      const db = new PouchDB(dbName);
      let err;
      db.on('error', e => err = e);
      const queryFun = await createView(db, {
        map : function (doc) {
          emit(doc.name);
        },
        reduce : function () {
        }
      });

      await db.put({name : 'bar', _id : '1'});

      const resGrouped = await db.query(queryFun, {group: true});

      resGrouped.rows.map(row => row.key).should.deep.equal(['bar']);

      const resNotReduced = await db.query(queryFun, {reduce: false});

      resNotReduced.rows.map(row => row.key).should.deep.equal(['bar']);
      should.not.exist(err);
    });

    it('should properly query custom reduce functions', async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map : function (doc) {
          emit(doc.name, doc.count);
        },
        reduce : function (keys, values, rereduce) {
          // calculate the average count per name
          if (!rereduce) {
            const result = {
              sum : sum(values),
              count : values.length
            };
            result.average = result.sum / result.count;
            return result;
          } else {
            const thisSum = sum(values.map(value => value.sum));
            const thisCount = sum(values.map(value => value.count));
            return {
              sum : thisSum,
              count : thisCount,
              average : (thisSum / thisCount)
            };
          }
        }
      });

      await db.bulkDocs({docs : [
        {name : 'foo', count : 1},
        {name : 'bar', count : 7},
        {name : 'foo', count : 3},
        {name : 'quux', count : 3},
        {name : 'foo', count : 3},
        {name : 'foo', count : 0},
        {name : 'foo', count : 4},
        {name : 'baz', count : 3},
        {name : 'baz', count : 0},
        {name : 'baz', count : 2}
      ]});

      const queryRes = await db.query(queryFun, {group : true});

      queryRes.should.deep.equal({rows : [
        {
          key : 'bar',
          value : { sum: 7, count: 1, average : 7}
        },
        {
          key : 'baz',
          value : { sum: 5, count: 3, average: (5 / 3) }
        },
        {
          key : 'foo',
          value : { sum: 11, count: 5, average: (11 / 5) }
        },
        {
          key : 'quux',
          value : { sum: 3, count: 1, average: 3 }
        }
      ]}, 'all');

      const queryRes1 = await db.query(queryFun, {group : false});

      queryRes1.should.deep.equal({rows : [
        {
          key : null,
          value : { sum: 26, count: 10, average: 2.6 }
        }
      ]}, 'group=false');

      const queryRes2 = await db.query(queryFun, {group : true, startkey : 'bar', endkey : 'baz', skip : 1});

      queryRes2.should.deep.equal({rows : [
        {
          key : 'baz',
          value : { sum: 5, count: 3, average: (5 / 3) }
        }
      ]}, 'bar-baz skip 1');

      const queryRes3 = await db.query(queryFun, {group : true, endkey : 'baz'});

      queryRes3.should.deep.equal({rows : [
        {
          key : 'bar',
          value : { sum: 7, count: 1, average : 7}
        },
        {
          key : 'baz',
          value : { sum: 5, count: 3, average: (5 / 3) }
        }
      ]}, '-baz');

      const queryRes4 = await db.query(queryFun, {group : true, startkey : 'foo'});

      queryRes4.should.deep.equal({rows : [
        {
          key : 'foo',
          value : { sum: 11, count: 5, average: (11 / 5) }
        },
        {
          key : 'quux',
          value : { sum: 3, count: 1, average: 3 }
        }
      ]}, 'foo-');

      const queryRes5 = await db.query(queryFun, {group : true, startkey : 'foo', descending : true});

      queryRes5.should.deep.equal({rows : [
        {
          key : 'foo',
          value : { sum: 11, count: 5, average: (11 / 5) }
        },
        {
          key : 'baz',
          value : { sum: 5, count: 3, average: (5 / 3) }
        },
        {
          key : 'bar',
          value : { sum: 7, count: 1, average : 7}
        }
      ]}, 'foo- descending=true');

      const queryRes6 = await db.query(queryFun, {group : true, startkey : 'quux', skip : 1});

      queryRes6.should.deep.equal({rows : [
      ]}, 'quux skip 1');
      const queryRes7 = await db.query(queryFun, {group : true, startkey : 'quux', limit : 0});

      queryRes7.should.deep.equal({rows : [
      ]}, 'quux limit 0');
      const queryRes8 = await db.query(queryFun, {group : true, startkey : 'bar', endkey : 'baz'});

      queryRes8.should.deep.equal({rows : [
        {
          key : 'bar',
          value : { sum: 7, count: 1, average : 7}
        },
        {
          key : 'baz',
          value : { sum: 5, count: 3, average: (5 / 3) }
        }
      ]}, 'bar-baz');

      const queryRes9 = await db.query(queryFun, {group : true, keys : ['bar', 'baz'], limit : 1});

      queryRes9.should.deep.equal({rows : [
        {
          key : 'bar',
          value : { sum: 7, count: 1, average : 7}
        }
      ]}, 'bar & baz');

      const queryRes10 = await db.query(queryFun, {group : true, keys : ['bar', 'baz'], limit : 0});

      queryRes10.should.deep.equal({rows : [
      ]}, 'bar & baz limit 0');

      const queryRes11 = await db.query(queryFun, {group : true, key : 'bar', limit : 0});

      queryRes11.should.deep.equal({rows : [
      ]}, 'key=bar limit 0');

      const queryRes12 = await db.query(queryFun, {group : true, key : 'bar'});

      queryRes12.should.deep.equal({rows : [
        {
          key : 'bar',
          value : { sum: 7, count: 1, average : 7}
        }
      ]}, 'key=bar');

      const queryRes13 = await db.query(queryFun, {group : true, key : 'zork'});

      queryRes13.should.deep.equal({rows : [
      ]}, 'zork');

      const queryRes14 = await db.query(queryFun, {group : true, keys : []});

      queryRes14.should.deep.equal({rows : [
      ]}, 'keys=[]');

      const queryRes15 = await db.query(queryFun, {group : true, key : null});

      queryRes15.should.deep.equal({rows : [
      ]}, 'key=null');
    });

    it('should handle many doc changes', async function () {
      let docs = [{_id: '0'}, {_id : '1'}, {_id: '2'}];

      const keySets = [
        [1],
        [2, 3],
        [4],
        [5],
        [6, 7, 3],
        [],
        [2, 3],
        [1, 2],
        [],
        [9],
        [9, 3, 2, 1]
      ];

      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map : function (doc) {
          doc.keys.forEach(function (key) {
            emit(key);
          });
        }
      });

      await db.bulkDocs({docs});

      for (let i = 0; i < keySets.length; i++) {
        const expectedResponseKeys = [];
        const res = await db.allDocs({
          keys : ['0', '1', '2'],
          include_docs: true
        });

        docs = res.rows.map(x => x.doc);
        docs.forEach((doc, j) => {
          doc.keys = keySets[(i + j) % keySets.length];
          doc.keys.forEach(key => expectedResponseKeys.push(key));
        });
        expectedResponseKeys.sort();

        await db.bulkDocs({docs});
        const queryRes = await db.query(queryFun);
        const actualKeys = queryRes.rows.map(x => x.key);

        actualKeys.should.deep.equal(expectedResponseKeys);
        }
    });

    //TODO
    it('should handle many doc changes', async function () {
      let docs = [{_id: '0'}, {_id : '1'}, {_id: '2'}];

      const keySets = [
        [1],
        [2, 3],
        [4],
        [5],
        [6, 7, 3],
        [],
        [2, 3],
        [1, 2],
        [],
        [9],
        [9, 3, 2, 1]
      ];

      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map : function (doc) {
          doc.keys.forEach(function (key) {
            emit(key);
          });
        }
      });

      await db.bulkDocs({docs});

      for (let i = 0; i < keySets.length; i++) {
        const expectedResponseKeys = [];

        const res = await db.allDocs({
          keys : ['0', '1', '2'],
          include_docs: true
        });

        docs = res.rows.map(x => x.doc);
        docs.forEach((doc, j) => {
          doc.keys = keySets[(i + j) % keySets.length];
          doc.keys.forEach(key => expectedResponseKeys.push(key));
        });
        expectedResponseKeys.sort((a, b)=>  a - b);

        await db.bulkDocs({docs});
        const queryRes = await db.query(queryFun);
        const actualKeys = queryRes.rows.map(x => x.key);

        actualKeys.should.deep.equal(expectedResponseKeys);
      }
    });

    it('should work with post',async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map: function (doc) { emit(doc._id); }
      });

      await db.bulkDocs({docs: [{_id : 'bazbazbazb'}]});

      const keys = ['bazbazbazb'];
      const res = await db.query(queryFun, {keys});

      res.total_rows.should.equal(1);
      res.rows.should.have.length(1);
      res.rows.every(row => row.id === 'bazbazbazb' && row.key === 'bazbazbazb').should.be.true;
    });

    it("should accept trailing ';' in a map definition (#178)", async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map: "function(doc){};\n"
      });

      const res = await db.query(queryFun);

      res.should.deep.equal({
        offset: 0,
        rows: [],
        total_rows: 0
      });
    });

    it('should throw a 404 when no funcs found in ddoc (#181)', async function () {
      const db = new PouchDB(dbName);
      await db.put({
        _id: '_design/test'
      });

      try {
        await db.query('test/unexisting');
        //shouldn't happen
        true.should.equal(false);
      } catch (err) {
        err.status.should.be.oneOf([404, 500]);
      }
    });

    it('should continue indexing when map eval fails (#214)', async function () {
      const db = new PouchDB(dbName);
      let err;
      db.on('error', e => err = e);
      const view = await createView(db, {
        map: function (doc) {
          emit(doc.foo.bar, doc);
        }
      });

      await db.bulkDocs({docs: [
        {
          foo: {
            bar: "foobar"
          }
        },
        { notfoo: "thisWillThrow" },
        {
          foo: {
            bar: "otherFoobar"
          }
        }
      ]});

      const res = await db.query(view);

      if (dbType === 'local') {
        should.exist(err);
      }

      res.rows.should.have.length(2, 'Ignore the wrongly formatted doc');

      const res1 = await db.query(view);

      res1.rows.should.have.length(2, 'Ignore the wrongly formatted doc');
    });

    it('should continue indexing when map eval fails, ' +
        'even without a listener (#214)', async function () {
      const db = new PouchDB(dbName);
      const view = await createView(db, {
        map: function (doc) {
          emit(doc.foo.bar, doc);
        }
      });

      await db.bulkDocs({docs: [
        {
          foo: {
            bar: "foobar"
          }
        },
        { notfoo: "thisWillThrow" },
        {
          foo: {
            bar: "otherFoobar"
          }
        }
      ]});

      const res = await db.query(view);

      res.rows.should.have.length(2, 'Ignore the wrongly formatted doc');

      const res1 = await db.query(view);

      res1.rows.should.have.length(2, 'Ignore the wrongly formatted doc');
    });

    it('should update the emitted value', async function () {
      const db = new PouchDB(dbName);
      const docs = [];
      for (let i = 0; i < 300; i++) {
        docs.push({
          _id: `${i}`,
          name: 'foo',
          count: 1
        });
      }

      const queryFun = await createView(db, {
        map: "function(doc){emit(doc.name, doc.count);};\n"
      });

      const writeRes = await db.bulkDocs({docs});

      for (let i = 0; i < writeRes.length; i++) {
        docs[i]._rev = writeRes[i].rev;
      }
      const queryRes = await db.query(queryFun);
      const values = queryRes.rows.map(x => x.value);

      values.should.have.length(docs.length);
      values[0].should.equal(1);

      docs.forEach(doc => doc.count = 2);
      await db.bulkDocs({docs});

      const queryRes1 = await db.query(queryFun);

      const values1 = queryRes1.rows.map(x => x.value);
      values1.should.have.length(docs.length);
      values1[0].should.equal(2);
    });

    it('#6230 Test db.query() opts update_seq: false', async function () {
      const db = new PouchDB(dbName);
      const docs = [];
      for (let i = 0; i < 4; i++) {
        docs.push({
          _id: `${i}`,
          name: 'foo',
        });
      }
      const queryFun = await createView(db, {
        map: "function(doc){emit(doc.name);};\n"
      });

      await db.bulkDocs({ docs });
      const res = await db.query(queryFun, { update_seq: false });

      res.rows.should.have.length(4);
      should.not.exist(res.update_seq);
    });


    it('#6230 Test db.query() opts update_seq: true', async function () {
      const normalizeSeq = (seq) => (typeof seq === 'string' && seq.indexOf('-') > 0)
        ? parseInt(seq.substring(0, seq.indexOf('-'))) : seq;

      const db = new PouchDB(dbName);
      const docs = [];
      for (let i = 0; i < 4; i++) {
        docs.push({
          _id: `${i}`,
          name: 'foo',
        });
      }

      await db.bulkDocs({ docs });

      const queryFun = await createView(db, {
        map: "function(doc){emit(doc.name);};\n"
      });

      const result = await db.query(queryFun, { update_seq: true });

      result.rows.should.have.length(4);
      should.exist(result.update_seq);
      ['number', 'string'].should.include(typeof result.update_seq);

      const normSeq = normalizeSeq(result.update_seq);
      normSeq.should.be.a('number');
    });

    it('#6230 Test db.query() opts with update_seq missing', async function () {
      const db = new PouchDB(dbName);
      const docs = [];
      for (let i = 0; i < 4; i++) {
        docs.push({
          _id: `${i}`,
          name: 'foo',
        });
      }
      const queryFun = await createView(db, {
        map: "function(doc){emit(doc.name);};\n"
      });

      await db.bulkDocs({ docs });

      const result = await db.query(queryFun);

      result.rows.should.have.length(4);
      should.not.exist(result.update_seq);
    });

    it("#8370 keys queries should support skip and limit", async function () {
      const db = new PouchDB(dbName);
      const queryFun = await createView(db, {
        map: function (doc) {
          emit(doc.field);
        }
      });

      await db.bulkDocs({
        docs: [
          { _id: "doc_0", field: 0 },
          { _id: "doc_1", field: 1 },
          { _id: "doc_2", field: 2 },
          { _id: "doc_3", field: 3 },
        ]
      });

      const opts = {include_docs: true};
      opts.keys = [1, 0, 3, 2];
      opts.limit = 2;
      const queryRes = await db.query(queryFun, opts);

      queryRes.rows.should.have.length(2, "returns 2 docs due to limit");
      queryRes.rows[0].doc._id.should.equal("doc_1");
      queryRes.rows[1].doc._id.should.equal("doc_0");

      delete opts.limit;
      opts.skip = 2;
      const queryRes1 = await db.query(queryFun, opts);

      queryRes1.rows.should.have.length(2, "returns 2 docs due to skip");
      queryRes1.rows[0].doc._id.should.equal("doc_3");
      queryRes1.rows[1].doc._id.should.equal("doc_2");

      opts.limit = 2;
      opts.skip = 3;
      const queryRes2 = await db.query(queryFun, opts);

      queryRes2.rows.should.have.length(1, "returns 1 doc due to limit and skip");
      queryRes2.rows[0].doc._id.should.equal("doc_2");
    });
  });
}

const mapToRows = (res) => {
  return res.rows.map((x) => ({
    id: x.id,
    key: x.key,
    value: x.value
  }));
};
