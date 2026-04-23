'use strict';

describe('test.basic.js', () => {
  it('should create an index', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": ["foo"]
      },
      "name": "foo-index",
      "type": "json"
    };
    const createResp = await db.createIndex(index);
    createResp.id.should.match(/^_design\//);
    createResp.name.should.equal('foo-index');
    createResp.result.should.equal('created');
    const existsResp = await db.createIndex(index);
    existsResp.id.should.match(/^_design\//);
    existsResp.name.should.equal('foo-index');
    existsResp.result.should.equal('exists');
  });

  it('should not update an existing index', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": ["foo"]
      },
      "name": "foo-index",
      "type": "json"
    };
    const createResp = await db.createIndex(index);
    createResp.id.should.match(/^_design\//);
    createResp.name.should.equal('foo-index');
    createResp.result.should.equal('created');
    const existsResp = await db.createIndex(index);
    existsResp.id.should.match(/^_design\//);
    existsResp.name.should.equal('foo-index');
    existsResp.result.should.equal('exists');
    const doc = await db.get(existsResp.id);
    doc._rev.slice(0, 1).should.equal('1');
  });

  it('throws an error for an invalid index creation', async () => {
    const db = context.db;
    try {
      await db.createIndex('yo yo yo');
      throw new Error('expected an error');
    } catch (err) {
      should.exist(err);
    }
  });

  it('throws an error for an invalid index deletion', async () => {
    const db = context.db;
    try {
      await db.deleteIndex('yo yo yo');
      throw new Error('expected an error');
    } catch (err) {
      should.exist(err);
    }
  });

  it('should not recognize duplicate indexes', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": ["foo"]
      },
      "name": "foo-index",
      "type": "json"
    };
    const index2 = {
      "index": {
        "fields": ["foo"]
      },
      "name": "bar-index",
      "type": "json"
    };

    const fooResp = await db.createIndex(index);
    fooResp.id.should.match(/^_design\//);
    fooResp.name.should.equal('foo-index');
    fooResp.result.should.equal('created');
    const barResp = await db.createIndex(index2);
    barResp.id.should.match(/^_design\//);
    barResp.name.should.equal('bar-index');
    barResp.result.should.equal('created');
    const res = await db.getIndexes();
    res.indexes.should.have.length(3);
    const ddoc1 = res.indexes[1].ddoc;
    const ddoc2 = res.indexes[2].ddoc;
    ddoc1.should.not.equal(ddoc2,
      `essentially duplicate indexes are not md5summed to the` +
      `same ddoc`);
  });

  it.skip('should find existing indexes', async () => {
    const db = context.db;
    const initialResp = await db.getIndexes();
    initialResp.should.deep.equal({
      "total_rows": 1,
      indexes: [{
        ddoc: null,
        name: '_all_docs',
        type: 'special',
        def: {fields: [{_id: 'asc'}]}
      }]
    });
    const index = {
      "index": {
        "fields": ["foo"]
      },
      "name": "foo-index",
      "type": "json"
    };
    await db.createIndex(index);
    const resp = await db.getIndexes();
    const ddoc = resp.indexes[1].ddoc;
    ddoc.should.match(/_design\/.+/);
    delete resp.indexes[1].ddoc;
    console.log(JSON.stringify(resp));
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

  it.skip('should create ddocs automatically', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": ["foo"]
      },
      "name": "foo-index",
      "type": "json"
    };
    await db.createIndex(index);
    const indexesResp = await db.getIndexes();
    const ddocId = indexesResp.indexes[1].ddoc;
    const ddoc = await db.get(ddocId);
    ddoc._id.should.equal(ddocId);
    should.exist(ddoc._rev);
    delete ddoc._id;
    delete ddoc._rev;
    delete ddoc.views['foo-index'].options.w; // wtf is this?
    ddoc.should.deep.equal({
      "language": "query",
      "views": {
        "foo-index": {
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
  });

  it.skip('should create ddocs automatically 2', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": [{"foo": "asc"}]
      },
      "name": "foo-index",
      "type": "json"
    };
    await db.createIndex(index);
    const indexesResp = await db.getIndexes();
    const ddocId = indexesResp.indexes[1].ddoc;
    const ddoc = await db.get(ddocId);
    ddoc._id.should.equal(ddocId);
    should.exist(ddoc._rev);
    delete ddoc._id;
    delete ddoc._rev;
    delete ddoc.views['foo-index'].options.w; // wtf is this?
    ddoc.should.deep.equal({
      "language": "query",
      "views": {
        "foo-index": {
          "map": {
            "fields": {
              "foo": "asc"
            }
          },
          "reduce": "_count",
          "options": {
            "def": {
              "fields": [
                {"foo": "asc"}
              ]
            }
          }
        }
      }
    });
  });

  it.skip('should create ddocs automatically 3', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": [
          {"foo": "asc"},
          "bar"
        ]
      },
      "name": "foo-index",
      "type": "json"
    };
    await db.createIndex(index);
    const indexesResp = await db.getIndexes();
    const ddocId = indexesResp.indexes[1].ddoc;
    const ddoc = await db.get(ddocId);
    ddoc._id.should.equal(ddocId);
    should.exist(ddoc._rev);
    delete ddoc._id;
    delete ddoc._rev;
    delete ddoc.views['foo-index'].options.w; // wtf is this?
    ddoc.should.deep.equal({
      "language": "query",
      "views": {
        "foo-index": {
          "map": {
            "fields": {
              "foo": "asc",
              "bar": "asc"
            }
          },
          "reduce": "_count",
          "options": {
            "def": {
              "fields": [
                {"foo": "asc"},
                "bar"
              ]
            }
          }
        }
      }
    });
  });

  it.skip('deletes indexes, callback style', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": ["foo"]
      },
      "name": "foo-index",
      "type": "json"
    };
    await new Promise((resolve, reject) => {
      db.createIndex(index, (err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
    const getResp = await db.getIndexes();
    const deleteResp = await new Promise((resolve, reject) => {
      db.deleteIndex(getResp.indexes[1], (err, resp) => {
        if (err) {
          return reject(err);
        }
        resolve(resp);
      });
    });
    deleteResp.should.deep.equal({ok: true});
    const finalResp = await db.getIndexes();
    finalResp.should.deep.equal({
      "total_rows": 1,
      "indexes":[{
        "ddoc": null,
        "name":"_all_docs",
        "type":"special",
        "def":{ "fields": [{"_id": "asc"}] }
      }]
    });
  });

  it('deletes indexes', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": ["foo"]
      },
      "name": "foo-index",
      "type": "json"
    };
    await db.createIndex(index);
    const getResp = await db.getIndexes();
    const deleteResp = await db.deleteIndex(getResp.indexes[1]);
    deleteResp.should.deep.equal({ok: true});
    const finalResp = await db.getIndexes();
    finalResp.should.deep.equal({
      "total_rows": 1,
        "indexes":[{
          "ddoc": null,
          "name":"_all_docs",
            "type":"special",
            "def":{ "fields": [{"_id": "asc"}] }
        }]
    });
  });

  it.skip('deletes indexes, no type', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": ["foo"]
      },
      "name": "foo-index"
    };
    await db.createIndex(index);
    const getResp = await db.getIndexes();
    delete getResp.indexes[1].type;
    const deleteResp = await db.deleteIndex(getResp.indexes[1]);
    deleteResp.should.deep.equal({ok: true});
    const finalResp = await db.getIndexes();
    finalResp.should.deep.equal({
      "total_rows": 1,
      "indexes":[{
        "ddoc": null,
        "name":"_all_docs",
        "type":"special",
        "def":{ "fields": [{"_id": "asc"}] }
      }]
    });
  });

  it('deletes indexes, no ddoc', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": ["foo"]
      },
      "name": "foo-index"
    };
    await db.createIndex(index);
    const getResp = await db.getIndexes();
    delete getResp.indexes[1].ddoc;
    try {
      await db.deleteIndex(getResp.indexes[1]);
      throw new Error('expected an error due to no ddoc');
    } catch (err) {
      should.exist(err);
    }
  });

  it('deletes indexes, no name', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": ["foo"]
      },
      "name": "foo-index"
    };
    await db.createIndex(index);
    const getResp = await db.getIndexes();
    delete getResp.indexes[1].name;
    try {
      await db.deleteIndex(getResp.indexes[1]);
      throw new Error('expected an error due to no name');
    } catch (err) {
      should.exist(err);
    }
  });

  it('deletes indexes, one name per ddoc', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": ["foo"]
      },
      "name": "myname",
      "ddoc": "myddoc"
    };
    await db.createIndex(index);
    const getResp = await db.getIndexes();
    await db.deleteIndex(getResp.indexes[1]);
    try {
      await db.get('_design/myddoc');
      throw new Error('expected an error');
    } catch (err) {
      should.exist(err);
    }
  });

  it('deletes indexes, many names per ddoc', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": ["foo"]
      },
      "name": "myname",
      "ddoc": "myddoc"
    };
    const index2 = {
      "index": {
        "fields": ["bar"]
      },
      "name": "myname2",
      "ddoc": "myddoc"
    };
    await db.createIndex(index);
    await db.createIndex(index2);
    const getResp = await db.getIndexes();
    await db.deleteIndex(getResp.indexes[1]);
    const ddoc = await db.get('_design/myddoc');
    Object.keys(ddoc.views).should.deep.equal(['myname2']);
  });
});
