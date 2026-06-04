'use strict';

describe('test.fields.js', () => {
  const sortById = testUtils.sortById;

  it('does 2-field queries', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": ["foo", "bar"]
      },
      "name": "foo-index",
      "type": "json"
    };
    await db.createIndex(index);
    await db.bulkDocs([
      { _id: '1', foo: 'a', bar: 'a'},
      { _id: '2', foo: 'b', bar: 'b'},
      { _id: '3', foo: 'a', bar: 'a'},
      { _id: '4', foo: 'c', bar: 'a'},
      { _id: '5', foo: 'b', bar: 'a'},
      { _id: '6', foo: 'a', bar: 'b'}
    ]);
    const resp = await db.find({
      "selector": {
        "foo": {"$eq": "b"},
        "bar": {"$eq": "b"}
      },
      "fields": ["_id", "foo"]
    });
    resp.docs.should.deep.equal([{ "_id": "2", "foo": "b"}]);
  });

  it('does 2-field queries eq/gte', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": ["foo", "bar"]
      },
      "name": "foo-index",
      "type": "json"
    };
    await db.createIndex(index);
    await db.bulkDocs([
      { _id: '1', foo: 'a', bar: 'a'},
      { _id: '2', foo: 'a', bar: 'b'},
      { _id: '3', foo: 'a', bar: 'c'},
      { _id: '4', foo: 'b', bar: 'a'},
      { _id: '5', foo: 'b', bar: 'b'},
      { _id: '6', foo: 'c', bar: 'a'}
    ]);
    const resp = await db.find({
      "selector": {
        "foo": {"$eq": "a"},
        "bar": {"$gte": "b"}
      },
      "fields": ["_id"]
    });
    resp.docs.sort(sortById);
    resp.docs.should.deep.equal([
      { _id: '2' },
      { _id: '3' }
    ]);
  });

  it('does 2-field queries gte/gte', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": ["foo", "bar"]
      },
      "name": "foo-index",
      "type": "json"
    };
    await db.createIndex(index);
    await db.bulkDocs([
      { _id: '1', foo: 'a', bar: 'a'},
      { _id: '2', foo: 'a', bar: 'b'},
      { _id: '3', foo: 'a', bar: 'c'},
      { _id: '4', foo: 'b', bar: 'a'},
      { _id: '5', foo: 'b', bar: 'b'},
      { _id: '6', foo: 'c', bar: 'a'}
    ]);
    const resp = await db.find({
      "selector": {
        "foo": {"$gte": "b"},
        "bar": {"$gte": "a"}
      },
      "fields": ["_id"]
    });
    resp.docs.sort(sortById);
    resp.docs.should.deep.equal([
      { _id: '4' },
      { _id: '5' },
      { _id: '6' }
    ]);
  });

  it('does 2-field queries gte/lte', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": ["foo", "bar"]
      },
      "name": "foo-index",
      "type": "json"
    };
    await db.createIndex(index);
    await db.bulkDocs([
      { _id: '1', foo: 'a', bar: 'a'},
      { _id: '2', foo: 'a', bar: 'b'},
      { _id: '3', foo: 'a', bar: 'c'},
      { _id: '4', foo: 'b', bar: 'a'},
      { _id: '5', foo: 'b', bar: 'b'},
      { _id: '6', foo: 'c', bar: 'a'}
    ]);
    const resp = await db.find({
      "selector": {
        "foo": {"$gte": "b"},
        "bar": {"$lte": "b"}
      },
      "fields": ["_id"]
    });
    resp.docs.sort(sortById);
    resp.docs.should.deep.equal([
      { _id: '4' },
      { _id: '5' },
      { _id: '6' }
    ]);
  });

  it('does 3-field queries eq/eq/eq 3-field index', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": ["foo", "bar", "baz"]
      },
      "name": "foo-index",
      "type": "json"
    };
    await db.createIndex(index);
    await db.bulkDocs([
      { _id: '1', foo: 'a', bar: 'a', baz: 'z'},
      { _id: '2', foo: 'a', bar: 'b', baz: 'z'},
      { _id: '3', foo: 'a', bar: 'c', baz: 'z'},
      { _id: '4', foo: 'b', bar: 'a', baz: 'z'},
      { _id: '5', foo: 'b', bar: 'b', baz: 'z'},
      { _id: '6', foo: 'c', bar: 'a', baz: 'z'}
    ]);
    const resp = await db.find({
      "selector": {
        foo: 'b',
        bar: 'b',
        baz: 'z'
      },
      "fields": ["_id"]
    });
    resp.docs.sort(sortById);
    resp.docs.should.deep.equal([
      { _id: '5' }
    ]);
  });

  it('does 1-field queries eq/eq 2-field index', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": ["foo", "bar"]
      },
      "name": "foo-index",
      "type": "json"
    };
    await db.createIndex(index);
    await db.bulkDocs([
      { _id: '1', foo: 'a', bar: 'a', baz: 'z'},
      { _id: '2', foo: 'a', bar: 'b', baz: 'z'},
      { _id: '3', foo: 'a', bar: 'c', baz: 'z'},
      { _id: '4', foo: 'b', bar: 'a', baz: 'z'},
      { _id: '5', foo: 'b', bar: 'b', baz: 'z'},
      { _id: '6', foo: 'c', bar: 'a', baz: 'z'}
    ]);
    const resp = await db.find({
      "selector": {
        foo: 'b'
      },
      "fields": ["_id"]
    });
    resp.docs.sort(sortById);
    resp.docs.should.deep.equal([
      { _id: '4' },
      { _id: '5' }
    ]);
  });

  it('does 2-field queries eq/eq 3-field index', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": ["foo", "bar", "baz"]
      },
      "name": "foo-index",
      "type": "json"
    };
    await db.createIndex(index);
    await db.bulkDocs([
      { _id: '1', foo: 'a', bar: 'a', baz: 'z'},
      { _id: '2', foo: 'a', bar: 'b', baz: 'z'},
      { _id: '3', foo: 'a', bar: 'c', baz: 'z'},
      { _id: '4', foo: 'b', bar: 'a', baz: 'z'},
      { _id: '5', foo: 'b', bar: 'b', baz: 'z'},
      { _id: '6', foo: 'c', bar: 'a', baz: 'z'}
    ]);
    const resp = await db.find({
      "selector": {
        foo: 'b',
        bar: 'b'
      },
      "fields": ["_id"]
    });
    resp.docs.sort(sortById);
    resp.docs.should.deep.equal([
      { _id: '5' }
    ]);
  });

  it('does return all fields of overlapping paths', async () => {
    const db = context.db;
    await db.bulkDocs([
      { _id: '1', foo: { bar: 'a', baz: 'b', qux: 'q'} },
      { _id: '2', foo: { bar: 'a', baz: 'z', qux: 'q'} },
    ]);
    const resp = await db.find({
      "selector": {
        _id: '1'
      },
      "fields": ["_id", "foo.bar", "foo.baz"]
    });
    resp.docs.sort(sortById);
    resp.docs.should.deep.equal([
      { _id: '1', foo: { bar: 'a', baz: 'b'} }
    ]);
  });
});
