'use strict';

describe('test.sorting.js', () => {
  it('sorts correctly - just _id', async () => {
    const db = context.db;
    await db.bulkDocs([
      {_id: 'a', foo: 'a'},
      {_id: 'b', foo: 'b'}
    ]);
    const resp = await db.find({
      "selector": {"_id": {$gte: "a"}},
      "fields": ["_id", "foo"],
      "sort": [{"_id": "asc"}]
    });
    resp.docs.should.deep.equal([
      {"_id": "a", "foo": "a"},
      {"_id": "b", "foo": "b"}
    ]);
  });

  it('sorts correctly - just _id desc', async () => {
    const db = context.db;
    await db.bulkDocs([
      {_id: 'a', foo: 'a'},
      {_id: 'b', foo: 'b'}
    ]);
    const resp = await db.find({
      "selector": {"_id": {$gte: "a"}},
      "fields": ["_id", "foo"],
      "sort": [{"_id": "desc"}]
    });
    resp.docs.should.deep.equal([
      {"_id": "b", "foo": "b"},
      {"_id": "a", "foo": "a"}
    ]);
  });

  it('sorts correctly - foo desc', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": [{"foo": "desc"}]
      },
      "name": "foo-index",
      "type": "json"
    };
    await db.createIndex(index);
    await db.bulkDocs([
      {_id: 'a', foo: 'b'},
      {_id: 'b', foo: 'a'},
      {_id: 'c', foo: 'c'},
      {_id: '0', foo: 'd'}
    ]);
    const resp = await db.find({
      "selector": {"foo": {$lte: "d"}},
      "fields": ["foo"]
    });
    resp.docs.should.deep.equal([
      {"foo": "a"},
      {"foo": "b"},
      {"foo": "c"},
      {"foo": "d"}
    ]);
  });

  it('sorts correctly - foo desc 2', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": [{"foo": "desc"}]
      },
      "name": "foo-index",
      "type": "json"
    };
    await db.createIndex(index);
    await db.bulkDocs([
      {_id: 'a', foo: 'b'},
      {_id: 'b', foo: 'a'},
      {_id: 'c', foo: 'c'},
      {_id: '0', foo: 'd'}
    ]);
    const resp = await db.find({
      "selector": {"foo": {$lte: "d"}},
      "fields": ["foo"],
      "sort": [{foo: "desc"}]
    });
    resp.docs.should.deep.equal([
      {"foo": "d"},
      {"foo": "c"},
      {"foo": "b"},
      {"foo": "a"}
    ]);
  });


  it.skip('sorts correctly - complex', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": ["foo"]
      },
      "name": "foo-index",
      "type": "json"
    };
    await db.createIndex(index);
    await db.bulkDocs([
      { _id: '1', foo: 'AAA'},
      { _id: '2', foo: 'aAA' },
      { _id: '3', foo: 'BAA'},
      { _id: '4', foo: 'bAA'},
      { _id: '5', foo: '\u0000aAA'},
      { _id: '6', foo: '\u0001AAA'}
    ]);
    const resp = await db.find({
      "selector": {"foo": {"$gt": "\u0000\u0000"}},
      "fields": ["_id", "foo"],
      "sort": [{"foo": "asc"}]
    });
    // ASCII vs ICU ordering. either is okay
    try {
      resp.docs.deep.equal([
        { "_id": "2", "foo": "aAA" },
        { "_id": "5", "foo": "\u0000aAA" },
        { "_id": "1", "foo": "AAA" },
        { "_id": "6", "foo": "\u0001AAA" },
        { "_id": "4", "foo": "bAA" },
        { "_id": "3", "foo": "BAA" }
      ]);
    } catch (e) {
      resp.docs.should.deep.equal([
        { _id: '5', foo: '\u0000aAA' },
        { _id: '6', foo: '\u0001AAA' },
        { _id: '1', foo: 'AAA' },
        { _id: '3', foo: 'BAA' },
        { _id: '2', foo: 'aAA' },
        { _id: '4', foo: 'bAA' }
      ]);
    }
  });


  it('supported mixed sort', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": [
          "foo",
          "bar"
        ]
      },
      "name": "foo-index",
      "type": "json"
    };
    await db.createIndex(index);
    await db.bulkDocs([
      {_id: 'a1', foo: 'a', bar: '1'},
      {_id: 'a2', foo: 'a', bar: '2'},
      {_id: 'b1', foo: 'b', bar: '1'}
    ]);
    const res = await db.find({
      selector: {foo: {$gte: 'a'}}
    });
    res.docs.forEach((doc) => {
      should.exist(doc._rev);
      delete doc._rev;
    });
    res.docs.should.deep.equal([
      {
        "_id": "a1",
        "foo": "a",
        "bar": "1"
      },
      {
        "_id": "a2",
        "foo": "a",
        "bar": "2"
      },
      {
        "_id": "b1",
        "foo": "b",
        "bar": "1"
      }
    ]);
  });

  it('supported mixed sort 2', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": [
          "foo",
          "bar"
        ]
      },
      "name": "foo-index",
      "type": "json"
    };
    await db.createIndex(index);
    await db.bulkDocs([
      {_id: 'a1', foo: 'a', bar: '1'},
      {_id: 'a2', foo: 'a', bar: '2'},
      {_id: 'b1', foo: 'b', bar: '1'}
    ]);
    const res = await db.find({
      selector: {foo: {$gte: 'b'}}
    });
    res.docs.forEach((doc) => {
      should.exist(doc._rev);
      delete doc._rev;
    });
    res.docs.should.deep.equal([
      {
        "_id": "b1",
        "foo": "b",
        "bar": "1"
      }
    ]);
  });

  it('sort error, not an array', async () => {
    const db = context.db;

    await db.createIndex({
      index: {
        fields: ['foo']
      }
    });
    await db.bulkDocs([
      {_id: '1', foo: 1},
      {_id: '2', foo: 2},
      {_id: '3', foo: 3},
      {_id: '4', foo: 4}
    ]);
    try {
      await db.find({
        selector: {foo: {$eq: 1}},
        sort: {}
      });
      throw new Error('expected an error');
    } catch (err) {
      should.exist(err);
    }
  });

  it('#8438 exclude deleted docs', async function () {
    const db = context.db;

    await db.createIndex({
      "index": {
        "fields": ["foo"]
      },
      "name": "foo-index",
      "type": "json"
    });
    await db.bulkDocs([
      {_id: "a1", foo: "a"},
      {_id: "a2", _deleted: true, foo: "c"},
      {_id: "b1", foo: "b"}
    ]);

    const res = await db.find({
      "selector": {"foo": {$gt: null}},
      "fields": ["_id", "foo"],
      "sort": ["foo"]
    });
    res.docs.should.deep.equal([
      {
        "_id": "a1",
        "foo": "a"
      },
      {
        "_id": "b1",
        "foo": "b"
      }
    ]);
  });
});
