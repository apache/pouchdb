'use strict';

describe('test.ddoc.js', () => {
  it.skip('should create an index', async () => {
    const db = context.db;
    const index = {
      index: {
        fields: ["foo"]
      },
      name: "foo-index",
      type: "json",
      ddoc: 'foo'
    };
    const createResp = await db.createIndex(index);
    createResp.id.should.match(/^_design\//);
    createResp.name.should.equal('foo-index');
    createResp.result.should.equal('created');
    const existsResp = await db.createIndex(index);
    existsResp.id.should.match(/^_design\//);
    existsResp.name.should.equal('foo-index');
    existsResp.result.should.equal('exists');
    const resp = await db.getIndexes();
    resp.should.deep.equal({
      "total_rows": 2,
      "indexes": [
        {
          "ddoc": null,
          "name": "_all_docs",
          "type": "special",
          "def": {
            "fields": [
              {
                "_id": "asc"
              }
            ]
          }
        },
        {
          "ddoc": "_design/foo",
          "name": "foo-index",
          "type": "json",
          "def": {
            "fields": [
              {
                "foo": "asc"
              }
            ]
          }
        }
      ]
    });
  });

  it.skip('should create an index, existing ddoc', async () => {
    const db = context.db;
    const index = {
      index: {
        fields: ["foo"]
      },
      name: "foo-index",
      type: "json",
      ddoc: 'foo'
    };
    await db.put({
      _id: '_design/foo',
      "language": "query"
    });
    const createResp = await db.createIndex(index);
    createResp.id.should.match(/^_design\//);
    createResp.name.should.equal('foo-index');
    createResp.result.should.equal('created');
    const existsResp = await db.createIndex(index);
    existsResp.id.should.match(/^_design\//);
    existsResp.name.should.equal('foo-index');
    existsResp.result.should.equal('exists');
    const resp = await db.getIndexes();
    resp.should.deep.equal({
      "total_rows": 2,
      "indexes": [
        {
          "ddoc": null,
          "name": "_all_docs",
          "type": "special",
          "def": {
            "fields": [
              {
                "_id": "asc"
              }
            ]
          }
        },
        {
          "ddoc": "_design/foo",
          "name": "foo-index",
          "type": "json",
          "def": {
            "fields": [
              {
                "foo": "asc"
              }
            ]
          }
        }
      ]
    });
  });

  it.skip('should create an index, reused ddoc', async () => {
    const db = context.db;
    const index = {
      index: {
        fields: ["foo"]
      },
      name: "foo-index",
      type: "json",
      ddoc: 'myddoc'
    };
    const index2 = {
      index: {
        fields: ['bar']
      },
      name: "bar-index",
      ddoc: 'myddoc'
    };
    const fooCreateResp = await db.createIndex(index);
    fooCreateResp.id.should.match(/^_design\//);
    fooCreateResp.name.should.equal('foo-index');
    fooCreateResp.result.should.equal('created');
    const fooExistsResp = await db.createIndex(index);
    fooExistsResp.id.should.match(/^_design\//);
    fooExistsResp.name.should.equal('foo-index');
    fooExistsResp.result.should.equal('exists');
    const barCreateResp = await db.createIndex(index2);
    barCreateResp.id.should.match(/^_design\//);
    barCreateResp.name.should.equal('bar-index');
    barCreateResp.result.should.equal('created');
    const barExistsResp = await db.createIndex(index2);
    barExistsResp.id.should.match(/^_design\//);
    barExistsResp.name.should.equal('bar-index');
    barExistsResp.result.should.equal('exists');
    const resp = await db.getIndexes();
    resp.should.deep.equal({
      "total_rows":3,
      "indexes": [
        {
          "ddoc": null,
          "name": "_all_docs",
          "type": "special",
          "def": {
            "fields": [
              {
                "_id": "asc"
              }
            ]
          }
        },
        {
          "ddoc": "_design/myddoc",
          "name": "bar-index",
          "type": "json",
          "def": {
            "fields": [
              {
                "bar": "asc"
              }
            ]
          }
        },
        {
          "ddoc": "_design/myddoc",
          "name": "foo-index",
          "type": "json",
          "def": {
            "fields": [
              {
                "foo": "asc"
              }
            ]
          }
        }
      ]
    });
  });

  it('Error: invalid ddoc lang', async () => {
    const db = context.db;
    const index = {
      index: {
        fields: ["foo"]
      },
      name: "foo-index",
      type: "json",
      ddoc: 'foo'
    };
    await db.put({
      _id: '_design/foo'
    });
    try {
      await db.createIndex(index);
      throw new Error('shouldnt be here');
    } catch (err) {
      should.exist(err);
    }
  });

  it('handles ddoc with no views and ignores it', async () => {
    const db = context.db;

    await db.put({
      _id: '_design/missing-view',
      language: 'query'
    });
    const resp = await db.getIndexes();
    resp.indexes.length.should.equal(1);
  });

  it('supports creating many indexes at the same time', async function () {
    // This will time out in IDBNext. This happens because an index creation
    // also queries the view to "warm" it. This triggers our code to decide
    // that the idb handle needs to be dropped and re-created. This is fine if
    // it's done one by one, but if you're doing multiple at the same time
    // they aren't getting queued one after the other and their handles are
    // getting invalidated.
    //
    // We could fix this by being better with how we hold idb handles, or by
    // making sure createIndex (and mango and view queries, since it's the
    // same problem) are queued and don't run in parallel.
    this.timeout(5000);

    await Promise.all([
      context.db.createIndex({index: {fields: ['rank']}}),
      context.db.createIndex({index: {fields: ['series']}}),
      context.db.createIndex({index: {fields: ['debut']}}),
      context.db.createIndex({index: {fields: ['name']}}),
      context.db.createIndex({index: {fields: ['name', 'rank']}}),
      context.db.createIndex({index: {fields: ['name', 'series']}}),
      context.db.createIndex({index: {fields: ['series', 'debut', 'rank']}}),
      context.db.createIndex({index: {fields: ['rank', 'debut']}})
    ]);
    // At time of writing the createIndex implentation also performs a
    // search to "warm" the indexes. If this changes to happen async, or not
    // at all, these queries will force the collision to be tested.
    await Promise.all([
      context.db.find({selector: {rank: 'foo'}}),
      context.db.find({selector: {series: 'foo'}}),
      context.db.find({selector: {debut: 'foo'}}),
      context.db.find({selector: {name: 'foo'}}),
      context.db.find({selector: {name: 'foo', rank: 'foo'}}),
      context.db.find({selector: {name: 'foo', series: 'foo'}}),
      context.db.find({selector: {series: 'foo', debut: 'foo', rank: 'foo'}}),
      context.db.find({selector: {rank: 'foo', debut: 'foo'}}),
    ]);
  });
});
