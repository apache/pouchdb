'use strict';

describe('test.escaping.js', () => {
  it('period can be escaped', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": [
          "foo\\.bar"
        ]
      },
      "name": "foo-index",
      "type": "json"
    };
    await db.bulkDocs([
      {_id: 'doc1', foo: {bar: 'a'}},
      {_id: 'doc2', 'foo.bar': 'a'}
    ]);
    await db.createIndex(index);
    const res = await db.find({
      selector: {'foo\\.bar': 'a'},
      fields: ['_id']
    });
    res.docs.should.deep.equal([{ "_id": "doc2"}]);
  });

  it('space can be escaped', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": [
          "foo bar"
        ]
      },
      "name": "foo-index",
      "type": "json"
    };
    await db.bulkDocs([
      {_id: 'doc', 'foo bar': 'a'}
    ]);
    await db.createIndex(index);
    const res = await db.find({
      selector: {'foo bar': 'a'},
      fields: ['_id']
    });
    res.docs.should.deep.equal([{ "_id": "doc"}]);
  });

  it('dash can be escaped', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": [
          "foo-bar"
        ]
      },
      "name": "foo-index",
      "type": "json"
    };
    await db.bulkDocs([
      {_id: 'doc', 'foo-bar': 'a'}
    ]);
    await db.createIndex(index);
    const res = await db.find({
      selector: {'foo-bar': 'a'},
      fields: ['_id']
    });
    res.docs.should.deep.equal([{ "_id": "doc"}]);
  });

  it('initial digits can be escaped', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": [
          "0foobar"
        ]
      },
      "name": "foo-index",
      "type": "json"
    };
    await db.bulkDocs([
      {_id: 'doc', '0foobar': 'a'}
    ]);
    await db.createIndex(index);
    const res = await db.find({
      selector: {'0foobar': 'a'},
      fields: ['_id']
    });
    res.docs.should.deep.equal([{ "_id": "doc"}]);
  });

  it('initial dollar sign can be escaped', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": [
          "$foobar"
        ]
      },
      "name": "foo-index",
      "type": "json"
    };
    await db.bulkDocs([
      {_id: 'doc', '$foobar': 'a'}
    ]);
    await db.createIndex(index);
    const res = await db.find({
      selector: {'\\$foobar': 'a'},
      fields: ['_id']
    });
    res.docs.should.deep.equal([{ "_id": "doc"}]);
  });

  it('unicode can be escaped', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": [
          "授人以鱼不如授人以渔。"
        ]
      },
      "name": "foo-index",
      "type": "json"
    };
    await db.bulkDocs([
      {_id: 'doc', '授人以鱼不如授人以渔。': 'a'}
    ]);
    await db.createIndex(index);
    const res = await db.find({
      selector: {'授人以鱼不如授人以渔。': 'a'},
      fields: ['_id']
    });
    res.docs.should.deep.equal([{ "_id": "doc"}]);
  });

  it('deeper values can be escaped', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": [
          "foo.bar.0foobar"
        ]
      },
      "name": "foo-index",
      "type": "json"
    };
    const doc = {
      _id: 'doc',
      foo: {
        bar: {
          '0foobar': 'a'
        },
        "0baz": false,
        just: {
          normal: "stuff"
        }
      }
    };
    await db.bulkDocs([doc]);
    await db.createIndex(index);
    const res = await db.find({
      selector: {'foo.bar.0foobar': 'a'},
      fields: ['_id', 'foo']
    });
    res.docs.should.deep.equal([doc]);
  });

  it('internal digits are not escaped', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": [
          "foo0bar"
        ]
      },
      "name": "foo-index",
      "type": "json"
    };
    await db.bulkDocs([
      {_id: 'doc', 'foo0bar': 'a'}
    ]);
    await db.createIndex(index);
    const res = await db.find({
      selector: {'foo0bar': 'a'},
      fields: ['_id', 'foo0bar']
    });
    res.docs.should.deep.equal([{ "_id": "doc", "foo0bar": "a" }]);
  });

  it('handles escape patterns', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": [
          "foo_c46_bar"
        ]
      },
      "name": "foo-index",
      "type": "json"
    };
    await db.bulkDocs([
      {_id: 'doc', 'foo_c46_bar': 'a'}
    ]);
    await db.createIndex(index);
    const res = await db.find({
      selector: {'foo_c46_bar': 'a'},
      fields: ['_id', 'foo_c46_bar']
    });
    res.docs.should.deep.equal([{ "_id": "doc", "foo_c46_bar": "a" }]);
  });

  it('#8808 handles escape patterns without collisions (with indexes)', async () => {
    const db = context.db;
    const index1 = {
      "index": {
        "fields": [
          "foo/bar"
        ]
      },
      "name": "foo-index-1",
      "type": "json"
    };
    const index2 = {
      "index": {
        "fields": [
          "foo_c47_bar"
        ]
      },
      "name": "foo-index-2",
      "type": "json"
    };
    await db.bulkDocs([
      {_id: 'doc1', 'foo/bar': 'a'},
      {_id: 'doc2', 'foo_c47_bar': 'a'},
    ]);
    await db.createIndex(index1);
    await db.createIndex(index2);
    const res1 = await db.find({
      selector: {'foo/bar': 'a'},
      fields: ['_id', 'foo/bar', 'foo_c47_bar']
    });
    res1.docs.should.deep.equal([{ _id: 'doc1', 'foo/bar': 'a' }]);
    const res2 = await db.find({
      selector: {'foo_c47_bar': 'a'},
      fields: ['_id', 'foo/bar', 'foo_c47_bar']
    });
    res2.docs.should.deep.equal([{ _id: 'doc2', foo_c47_bar: 'a' }]);
  });

  it('#8808 handles escape patterns without collisions (no indexes)', async () => {
    const db = context.db;
    await db.bulkDocs([
      {_id: 'doc1', 'foo/bar': 'a'},
      {_id: 'doc2', 'foo_c47_bar': 'a'},
    ]);
    const res1 = await db.find({
      selector: {'foo/bar': 'a'},
      fields: ['_id', 'foo/bar', 'foo_c47_bar']
    });
    res1.docs.should.deep.equal([{ _id: 'doc1', 'foo/bar': 'a' }]);
    const res2 = await db.find({
      selector: {'foo_c47_bar': 'a'},
      fields: ['_id', 'foo/bar', 'foo_c47_bar']
    });
    res2.docs.should.deep.equal([{ _id: 'doc2', foo_c47_bar: 'a' }]);
  });

  it('#8808 bulk docs id escaping collisions in same doc (with indexes)', async () => {
    const db = context.db;
    const docs = [ { _id: 'doc', 'foo/bar': -1, foo_c47_bar: 2 } ];
    const index1 = {
      "index": {
        "fields": [
          "foo/bar"
        ]
      },
      "name": "foo-index-1",
      "type": "json"
    };
    const index2 = {
      "index": {
        "fields": [
          "foo_c47_bar"
        ]
      },
      "name": "foo-index-2",
      "type": "json"
    };
    const results = await db.bulkDocs(docs);
    results.should.have.length(1, 'results length did not match');
    results[0].ok.should.equal(true);
    const allDocsResults = await db.allDocs({ include_docs: true });
    allDocsResults.rows.should.have.length(1, 'results length did not match');

    allDocsResults.rows[0].doc._id.should.equal('doc');
    allDocsResults.rows[0].doc['foo/bar'].should.equal(-1);
    allDocsResults.rows[0].doc['foo_c47_bar'].should.equal(2);
    await db.createIndex(index1);
    await db.createIndex(index2);
    const res1 = await db.find({ selector: {'foo/bar': {$gt: 0}}, fields: ['_id', 'foo/bar', 'foo_c47_bar'] });
    res1.docs.length.should.equal(0, 'foo/bar should not be greater than 0');
    const res2 = await db.find({ selector: {'foo/bar': {$lt: 0}}, fields: ['_id', 'foo/bar', 'foo_c47_bar'] });
    res2.docs.should.deep.equal([{ _id: 'doc', 'foo/bar': -1, foo_c47_bar: 2 }]);
    const res3 = await db.find({ selector: {'foo_c47_bar': {$lt: 0}}, fields: ['_id', 'foo/bar', 'foo_c47_bar'] });
    res3.docs.length.should.equal(0, 'foo_c47_bar should not be less than 0');
    const res4 = await db.find({ selector: {'foo_c47_bar': {$gt: 0}}, fields: ['_id', 'foo/bar', 'foo_c47_bar'] });
    res4.docs.should.deep.equal([{ _id: 'doc', 'foo/bar': -1, foo_c47_bar: 2 } ]);
  });

  it('#8808 bulk docs id escaping collisions in same doc (no indexes)', async () => {
    const db = context.db;
    const docs = [ { _id: 'doc', 'foo/bar': -1, foo_c47_bar: 2 } ];
    const results = await db.bulkDocs(docs);
    results.should.have.length(1, 'results length did not match');
    results[0].ok.should.equal(true);
    const allDocsResults = await db.allDocs({ include_docs: true });
    allDocsResults.rows.should.have.length(1, 'results length did not match');

    allDocsResults.rows[0].doc._id.should.equal('doc');
    allDocsResults.rows[0].doc['foo/bar'].should.equal(-1);
    allDocsResults.rows[0].doc['foo_c47_bar'].should.equal(2);
    const res1 = await db.find({ selector: {'foo/bar': {$gt: 0}}, fields: ['_id', 'foo/bar', 'foo_c47_bar'] });
    res1.docs.length.should.equal(0, 'foo/bar should not be greater than 0');
    const res2 = await db.find({ selector: {'foo/bar': {$lt: 0}}, fields: ['_id', 'foo/bar', 'foo_c47_bar'] });
    res2.docs.should.deep.equal([ { _id: 'doc', 'foo/bar': -1, foo_c47_bar: 2 } ]);
    const res3 = await db.find({ selector: {'foo_c47_bar': {$lt: 0}}, fields: ['_id', 'foo/bar', 'foo_c47_bar'] });
    res3.docs.length.should.equal(0, 'foo_c47_bar should not be less than 0');
    const res4 = await db.find({ selector: {'foo_c47_bar': {$gt: 0}}, fields: ['_id', 'foo/bar', 'foo_c47_bar'] });
    res4.docs.should.deep.equal([ { _id: 'doc', 'foo/bar': -1, foo_c47_bar: 2 } ]);
  });

  it('#9002: query works without rewrite in nested object', async () => {
    const db = context.db;
    await db.bulkDocs([{ _id: "issue9002", foo: { bar: "baz" }, 2: "value"}]);
    await db.createIndex({ index: { "fields": ["foo.bar"] }});
    const resp = await context.db.find({
      selector: { "foo.bar": "baz" },
      fields: ["_id"]
    });
    resp.docs.should.deep.equal([{ _id: "issue9002"}]);
  });

  it('#9003 index works with rewrite in later field', async () => {
    const db = context.db;
    await db.bulkDocs([ { _id: "issue9003", anobject: { without: "need to rewrite" }, year: { 2024: [] }} ]);
    await db.createIndex({ index: { "fields": ["year.2024"] }});
    const resp = await context.db.find({
      selector: { "year.2024": { $exists: true }},
      fields: ["_id"]
    });
    resp.docs.should.deep.equal([{ _id: "issue9003"}]);
  });
});
