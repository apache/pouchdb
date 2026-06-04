'use strict';

describe('test.eq.js', () => {
  it('does eq queries', async () => {
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
      { _id: '1', foo: 'eyo'},
      { _id: '2', foo: 'ebb'},
      { _id: '3', foo: 'eba'},
      { _id: '4', foo: 'abo'}
    ]);
    const resp = await db.find({
      selector: {foo: "eba"},
      fields: ["_id", "foo"],
      sort: [{foo: "asc"}]
    });
    resp.docs.should.deep.equal([{_id: '3', foo: 'eba'}]);
  });

  it('does explicit $eq queries', async () => {
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
      { _id: '1', foo: 'eyo'},
      { _id: '2', foo: 'ebb'},
      { _id: '3', foo: 'eba'},
      { _id: '4', foo: 'abo'}
    ]);
    const resp = await db.find({
      selector: {foo: {$eq: "eba"}},
      fields: ["_id", "foo"],
      sort: [{foo: "asc"}]
    });
    resp.docs.should.deep.equal([{ _id: '3', foo: 'eba'}]);
  });

  it('does eq queries, no fields', async () => {
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
      { _id: '1', foo: 'eyo'},
      { _id: '2', foo: 'ebb'},
      { _id: '3', foo: 'eba'},
      { _id: '4', foo: 'abo'}
    ]);
    const resp = await db.find({
      selector: {foo: "eba"},
      sort: [{foo: "asc"}]
    });
    should.exist(resp.docs[0]._rev);
    delete resp.docs[0]._rev;
    resp.docs.should.deep.equal([{_id: '3', foo: 'eba'}]);
  });

  it('does eq queries, no fields or sort', async () => {
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
      { _id: '1', foo: 'eyo'},
      { _id: '2', foo: 'ebb'},
      { _id: '3', foo: 'eba'},
      { _id: '4', foo: 'abo'}
    ]);
    const resp = await db.find({
      selector: {foo: "eba"}
    });
    should.exist(resp.docs[0]._rev);
    delete resp.docs[0]._rev;
    resp.docs.should.deep.equal([{_id: '3', foo: 'eba'}]);
  });

  it.skip('does eq queries, no index name', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": ["foo"]
      }
    };

    await db.createIndex(index);
    await db.bulkDocs([
      { _id: '1', foo: 'eyo'},
      { _id: '2', foo: 'ebb'},
      { _id: '3', foo: 'eba'},
      { _id: '4', foo: 'abo'}
    ]);
    const getResp = await db.getIndexes();
    // this is some kind of auto-generated hash
    getResp.indexes[1].ddoc.should.match(/_design\/.*/);
    const ddocName = getResp.indexes[1].ddoc.split('/')[1];
    getResp.indexes[1].name.should.equal(ddocName);
    delete getResp.indexes[1].ddoc;
    delete getResp.indexes[1].name;
    getResp.should.deep.equal({
      "total_rows":2,
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
    const ddoc = await db.get('_design/' + ddocName);
    const ddocId = ddoc._id.split('/')[1];

    Object.keys(ddoc.views).should.deep.equal([ddocId]);
    delete ddoc._id;
    delete ddoc._rev;
    ddoc.views.theView = ddoc.views[ddocId];
    delete ddoc.views[ddocId];
    delete ddoc.views.theView.options.w;

    ddoc.should.deep.equal({
      "language": "query",
      "views": {
        theView: {
          "map": {
            "fields": {
              "foo": "asc"
            }
          },
          "reduce": "_count",
          "options": {
            "def": {
              "fields": [
                "foo"
              ]
            }
          }
        }
      }
    });

    const findResp = await db.find({
      selector: {foo: "eba"}
    });
    should.exist(findResp.docs[0]._rev);
    delete findResp.docs[0]._rev;
    findResp.should.deep.equal({
      docs: [
        {_id: '3', foo: 'eba'}
      ]
    });
  });

  it('#7 does eq queries 1', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": ["foo"]
      }
    };

    await db.createIndex(index);
    await db.bulkDocs([
      { _id: '1', foo: 'eyo', bar: 'zxy'},
      { _id: '2', foo: 'ebb', bar: 'zxy'},
      { _id: '3', foo: 'eba', bar: 'zxz'},
      { _id: '4', foo: 'abo', bar: 'zxz'}
    ]);
    const resp = await db.find({
      selector: {foo: {$gt: "a"}, bar: {$eq: 'zxy'}},
      fields: ["_id"],
      sort: [{foo: "asc"}]
    });
    resp.docs.should.deep.equal([{ _id: '2'}, { _id: '1'}]);
  });

  it('#7 does eq queries 2', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": ["foo", "bar"]
      }
    };

    await db.createIndex(index);
    await db.bulkDocs([
      {_id: '1', foo: 'eyo', bar: 'zxy'},
      {_id: '2', foo: 'ebb', bar: 'zxy'},
      {_id: '3', foo: 'eba', bar: 'zxz'},
      {_id: '4', foo: 'abo', bar: 'zxz'}
    ]);
    const resp = await db.find({
      selector: {foo: {$gt: "a"}, bar: {$eq: 'zxy'}},
      fields: ["_id"],
      sort: [{foo: "asc"}]
    });
    resp.docs.should.deep.equal([{_id: '2'}, {_id: '1'}]);
  });

  it('#170 does queries with a null value', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": ["field1"]
      }
    };

    await db.createIndex(index);
    await db.bulkDocs([
      {_id: '1', field1: null, field2: null },
      {_id: '2', field1: null, field2: "1" },
      {_id: '3', field1: "1", field2: null },
    ]);
    const resp = await db.find({
      selector: {field1: null},
      fields: ["_id"]
    });
    resp.docs.should.deep.equal([{_id: '1'}, {_id: '2'}]);
  });

  it('#170 does queries with a null value (explicit $eq)', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": ["field1"]
      }
    };

    await db.createIndex(index);
    await db.bulkDocs([
      {_id: '1', field1: null, field2: null },
      {_id: '2', field1: null, field2: "1" },
      {_id: '3', field1: "1", field2: null },
    ]);
    const resp = await db.find({
      selector: {field1: {$eq: null}},
      fields: ["_id"]
    });
    resp.docs.should.deep.equal([{_id: '1'}, {_id: '2'}]);
  });

  it('#170 does queries with multiple null values', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": ["field1"]
      }
    };

    await db.createIndex(index);
    await db.bulkDocs([
      {_id: '1', field1: null, field2: null },
      {_id: '2', field1: null, field2: "1" },
      {_id: '3', field1: "1", field2: null },
    ]);
    const resp = await db.find({
      selector: {field1: null, field2: null},
      fields: ["_id"]
    });
    resp.docs.should.deep.equal([{_id: '1'}]);
  });

  it('#170 does queries with multiple null values - $lte', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": ["field1"]
      }
    };

    await db.createIndex(index);
    await db.bulkDocs([
      {_id: '1', field1: null, field2: null },
      {_id: '2', field1: null, field2: "1" },
      {_id: '3', field1: "1", field2: null },
    ]);
    const resp = await db.find({
      selector: {field1: null, field2: {$lte: null}},
      fields: ["_id"]
    });
    resp.docs.should.deep.equal([{_id: '1'}]);
  });

  it('#170 does queries with multiple null values - $gte', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": ["field1"]
      }
    };

    await db.createIndex(index);
    await db.bulkDocs([
      {_id: '1', field1: null, field2: null },
      {_id: '2', field1: null, field2: "1" },
      {_id: '3', field1: "1", field2: null },
    ]);
    const resp = await db.find({
      selector: {field1: null, field2: {$gte: null}},
      fields: ["_id"]
    });
    resp.docs.should.deep.equal([
      {_id: '1'},
      {_id: '2'}
    ]);
  });

  it('#170 does queries with multiple null values - $ne', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": ["field1"]
      }
    };

    await db.createIndex(index);
    await db.bulkDocs([
      {_id: '1', field1: null, field2: null },
      {_id: '2', field1: null, field2: "1" },
      {_id: '3', field1: "1", field2: null },
    ]);
    const resp = await db.find({
      selector: {field1: null, field2: {$ne: null}},
      fields: ["_id"]
    });
    resp.docs.should.deep.equal([{_id: '2'}]);
  });

  it('#170 does queries with multiple null values - $mod', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": ["field1"]
      }
    };

    await db.createIndex(index);
    await db.bulkDocs([
      {_id: '1', field1: null, field2: null },
      {_id: '2', field1: null, field2: 1 },
      {_id: '3', field1: 1, field2: null },
    ]);
    const resp = await db.find({
      selector: {field1: null, field2: {$mod: [1, 0]}},
      fields: ["_id"]
    });
    resp.docs.should.deep.equal([{_id: '2'}]);
  });

  it('#170 does queries with multiple null values - $mod', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": ["field1"]
      }
    };

    await db.createIndex(index);
    await db.bulkDocs([
      {_id: '1', field1: null, field2: null },
      {_id: '2', field1: null, field2: null },
      {_id: '3', field1: null, field2: null },
    ]);
    const resp = await db.find({
      selector: {field1: null, field2: {$mod: [1, 0]}},
      fields: ["_id"]
    });
    resp.docs.should.deep.equal([]);
  });

  it('does queries with array containing null', async () => {
    const db = context.db;

    await db.put({ _id: '1', field: [null] });

    const resp = await db.find({
      selector: { field: [null] }
    });

    resp.docs.should.have.length(1);
  });

  describe("implicit/explicit $eq", () => {
    it('implicit $eq queries against objects recurse', async () => {
      const db = context.db;
      const index = {
        "index": {
          "fields": [ "field.a" ]
        }
      };

      await db.createIndex(index);
      await db.bulkDocs([
        {_id: '1', field: {a: 1, b: 2}},
        {_id: '2', field: {a: 1, b: {$eq: 1}}},
        {_id: '3', field: {a: 1, b: 1}},
      ]);
      const resp = await db.find({
        selector: { field: {a: 1, b: {$eq: 1}} },
        fields: [ "_id" ]
      });
      resp.docs.should.deep.equal([ {_id: '3'} ]);
    });

    it('implicit $eq queries against objects using dot notation recurse', async () => {
      const db = context.db;
      const index = {
        "index": {
          "fields": [ "field.a" ]
        }
      };

      await db.createIndex(index);
      await db.bulkDocs([
        {_id: '1', field: {sub: {a: 1, b: 2}}},
        {_id: '2', field: {sub: {a: 1, b: {$eq: 1}}}},
        {_id: '3', field: {sub: {a: 1, b: 1}}},
      ]);
      const resp = await db.find({
        selector: {field: {"sub.a": 1, "sub.b": {$eq: 1}}},
        fields: [ "_id" ]
      });
      resp.docs.should.deep.equal([ {_id: '3'} ]);
    });

    it('$allMatch against objects using implicit $eq recurses', async () => {
      const db = context.db;
      const index = {
        "index": {
          "fields": [ "field.a" ]
        }
      };

      await db.createIndex(index);
      await db.bulkDocs([
        {_id: '1', field:[{sub: {a: 1, b: 2}}]},
        {_id: '2', field:[{sub: {a: 1, b: {$eq: 1}}}]},
        {_id: '3', field:[{sub: {a: 1, b: 1}}]},
      ]);
      const resp = await db.find({
        selector: {field:{ $allMatch:{sub: {a: 1, b: {$eq: 1}}}}},
        fields: [ "_id" ]
      });
      resp.docs.should.deep.equal([ {_id: '3'} ]);
    });

    it('explicit $eq queries against objects compare directly', async () => {
      const db = context.db;
      const index = {
        "index": {
          "fields": [ "field.a" ]
        }
      };

      await db.createIndex(index);
      await db.bulkDocs([
        {_id: '1', field: {a: 1, b: 2}},
        {_id: '2', field: {a: 1, b: {$eq: 1}}},
        {_id: '3', field: {a: 1, b: 1}},
      ]);
      const resp = await db.find({
        selector: {field: {$eq: {a: 1, b: {$eq: 1}}}},
        fields: [ "_id" ]
      });
      resp.docs.should.deep.equal([{_id: '2'} ]);
    });

    it('explicit $eq queries against objects using dot notation compare directly', async () => {
      const db = context.db;
      const index = {
        "index": {
          "fields": [ "field.a" ]
        }
      };

      await db.createIndex(index);
      await db.bulkDocs([
        {_id: '1', field: {sub: {a: 1, b: 2}}},
        {_id: '2', field: {"sub.a": 1, "sub.b": {$eq: 1}}},
        {_id: '3', field: {sub: {a: 1, b: 1}}},
      ]);
      const resp = await db.find({
        selector: {field: {$eq: {"sub.a": 1, "sub.b": {$eq: 1}}}},
        fields: [ "_id" ]
      });
      resp.docs.should.deep.equal([ {_id: '2'} ]);
    });

    it('$allMatch against objects using explicit $eq compares directly', async () => {
      const db = context.db;
      const index = {
        "index": {
          "fields": [ "field.a" ]
        }
      };

      await db.createIndex(index);
      await db.bulkDocs([
        {_id: '1', field: [ {sub: {a: 1, b: 2}} ]},
        {_id: '2', field: [ {sub: {a: 1, b: {$eq: 1}}} ]},
        {_id: '3', field: [ {sub: {a: 1, b: 1}} ]},
      ]);
      const resp = await db.find({
        selector: {field: {$allMatch: {sub: {$eq: {a: 1, b: {$eq: 1}}}}}},
        fields: [ "_id" ]
      });
      resp.docs.should.deep.equal([ {_id: '2'} ]);
    });
  });
});
