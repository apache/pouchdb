'use strict';

describe('test.deep-fields.js', () => {
  it('deep fields', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": [
          "foo.bar"
        ]
      },
      "name": "foo-index",
      "type": "json"
    };
    await db.createIndex(index);
    await db.bulkDocs([
      {_id: 'doc', foo: {bar: 'a'}},
    ]);
    const res = await db.find({
      selector: {'foo.bar': 'a'},
      fields: ['_id']
    });
    res.docs.should.deep.equal([{"_id": "doc"}]);
  });

  it('deeper fields', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": [
          "foo.bar.baz"
        ]
      },
      "name": "foo-index",
      "type": "json"
    };
    await db.createIndex(index);
    await db.bulkDocs([
      {_id: 'doc', foo: {bar: {baz: 'a'}}},
    ]);
    const res = await db.find({
      selector: {'foo.bar.baz': 'a'},
      fields: ['_id']
    });
    res.docs.should.deep.equal([{"_id": "doc"}]);
  });

  it('should create a deep multi mapper', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": [
          "foo.bar", "bar.baz"
        ]
      }
    };
    await db.createIndex(index);
    await db.bulkDocs([
      {_id: 'a', foo: {bar: 'yo'}, bar: {baz: 'hey'}},
      {_id: 'b', foo: {bar: 'sup'}, bar: {baz: 'dawg'}}
    ]);
    const res1 = await db.find({
      selector: {"foo.bar": 'yo', "bar.baz": 'hey'},
      fields: ['_id']
    });
    res1.docs.should.deep.equal([{_id: 'a'}]);
    const res2 = await db.find({
      selector: {"foo.bar": 'yo', "bar.baz": 'sup'},
      fields: ['_id']
    });
    res2.docs.should.have.length(0);
    const res3 = await db.find({
      selector: {"foo.bar": 'bruh', "bar.baz": 'nah'},
      fields: ['_id']
    });
    res3.docs.should.have.length(0);
  });

  it('should create a deep multi mapper, tricky docs', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": [
          "foo.bar", "bar.baz"
        ]
      }
    };
    await db.createIndex(index);
    await db.bulkDocs([
      {_id: 'a', foo: {bar: 'yo'}, bar: {baz: 'hey'}},
      {_id: 'b', foo: {bar: 'sup'}, bar: {baz: 'dawg'}},
      {_id: 'c', foo: true, bar: "yo"},
      {_id: 'd', foo: null, bar: []}
    ]);
    const res1 = await db.find({
      selector: {"foo.bar": 'yo', "bar.baz": 'hey'},
      fields: ['_id']
    });
    res1.docs.should.deep.equal([{_id: 'a'}]);
    const res2 = await db.find({
      selector: {"foo.bar": 'yo', "bar.baz": 'sup'},
      fields: ['_id']
    });
    res2.docs.should.have.length(0);
    const res3 = await db.find({
      selector: {"foo.bar": 'bruh', "bar.baz": 'nah'},
      fields: ['_id']
    });
    res3.docs.should.have.length(0);
  });
});
