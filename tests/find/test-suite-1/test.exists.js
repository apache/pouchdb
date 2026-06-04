'use strict';

describe('test.exists.js', () => {
  const sortById = testUtils.sortById;

  it('does $exists queries - true', async () => {
    const db = context.db;
    await db.bulkDocs([
      {_id: 'a', foo: 'bar'},
      {_id: 'b', foo: {yo: 'dude'}},
      {_id: 'c', foo: null},
      {_id: 'd'}
    ]);
    const res = await db.find({
      selector: {
        'foo': {'$exists': true}
      },
      fields: ['_id']
    });
    res.docs.sort(sortById);
    res.docs.should.deep.equal([
      {"_id": "a"},
      {"_id": "b"},
      {"_id": "c"}
    ]);
  });

  it('does $exists queries - false', async () => {
    const db = context.db;
    await db.bulkDocs([
      {_id: 'a', foo: 'bar'},
      {_id: 'b', foo: {yo: 'dude'}},
      {_id: 'c', foo: null},
      {_id: 'd'}
    ]);
    const res = await db.find({
      selector: {
        'foo': {'$exists': false}
      },
      fields: ['_id']
    });
    res.docs.sort(sortById);
    res.docs.should.deep.equal([
      {"_id": "d"}
    ]);
  });

  it('does $exists queries - true/undef (multi-field)', async () => {
    const db = context.db;
    await db.bulkDocs([
      {_id: 'a', foo: 'bar', bar: 'baz'},
      {_id: 'b', foo: {yo: 'dude'}},
      {_id: 'c', foo: null, bar: 'quux'},
      {_id: 'd'}
    ]);
    const res = await db.find({
      selector: {
        'foo': {'$exists': true}
      },
      fields: ['_id']
    });
    res.docs.sort(sortById);
    res.docs.should.deep.equal([
      {"_id": "a"},
      {"_id": "b"},
      {"_id": "c"}
    ]);
  });

  it('does $exists queries - $eq/true (multi-field)', async () => {
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
      {_id: 'a', foo: 'bar', bar: 'baz'},
      {_id: 'b', foo: 'bar', bar: {yo: 'dude'}},
      {_id: 'c', foo: null, bar: 'quux'},
      {_id: 'd'}
    ]);
    const res = await db.find({
      selector: {'foo': 'bar', bar: {$exists: true}},
      fields: ['_id']
    });
    res.docs.sort(sortById);
    res.docs.should.deep.equal([
      {"_id": "a"},
      {"_id": "b"}
    ]);
  });

  it('does $exists queries - $eq/false (multi-field)', async () => {
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
      {_id: 'a', foo: 'bar', bar: 'baz'},
      {_id: 'b', foo: 'bar', bar: {yo: 'dude'}},
      {_id: 'c', foo: 'bar', bar: 'yo'},
      {_id: 'd', foo: 'bar'}
    ]);
    const res = await db.find({
      selector: {'foo': 'bar', bar: {$exists: false}},
      fields: ['_id']
    });
    res.docs.sort(sortById);
    res.docs.should.deep.equal([
      {"_id": "d"}
    ]);
  });

  it('does $exists queries - true/true (multi-field)', async () => {
    const db = context.db;
    await db.bulkDocs([
      {_id: 'a', foo: 'bar', bar: 'baz'},
      {_id: 'b', foo: {yo: 'dude'}},
      {_id: 'c', foo: null, bar: 'quux'},
      {_id: 'd'}
    ]);
    const res = await db.find({
      selector: {
        foo: {'$exists': true},
        bar: {$exists: true}
      },
      fields: ['_id']
    });
    res.docs.sort(sortById);
    res.docs.should.deep.equal([
      {"_id": "a"},
      {"_id": "c"}
    ]);
  });

  it('does $exists queries - true/false (multi-field)', async () => {
    const db = context.db;
    await db.bulkDocs([
      {_id: 'a', foo: 'bar', bar: 'baz'},
      {_id: 'b', foo: {yo: 'dude'}},
      {_id: 'c', foo: null, bar: 'quux'},
      {_id: 'd'}
    ]);
    const res = await db.find({
      selector: {
        foo: {'$exists': true},
        bar: {$exists: false}
      },
      fields: ['_id']
    });
    res.docs.sort(sortById);
    res.docs.should.deep.equal([
      {"_id": "b"}
    ]);
  });

  it('should error for non-boolean query value', async () => {
    const db = context.db;
    try {
      await db.find({
        selector: {
          foo: { '$exists': 'true' },
        },
      });
      throw new Error('Function should throw');
    } catch (err) {
      err.message.should.eq('Query operator $exists must be a boolean. Received string: true');
    }
  });
});
