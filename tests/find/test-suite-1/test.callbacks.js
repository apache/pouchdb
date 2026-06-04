'use strict';

describe('test.callbacks.js', () => {
  it('should create an index', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": ["foo"]
      },
      "name": "foo-index",
      "type": "json"
    };
    const createResp = await new Promise((resolve, reject) => {
      db.createIndex(index, (err, res) => {
        if (err) {
          return reject(err);
        }
        resolve(res);
      });
    });
    createResp.id.should.match(/^_design\//);
    createResp.name.should.equal('foo-index');
    createResp.result.should.equal('created');
    const existsResp = await new Promise((resolve, reject) => {
      db.createIndex(index, (err, res) => {
        if (err) {
          return reject(err);
        }
        resolve(res);
      });
    });
    existsResp.id.should.match(/^_design\//);
    existsResp.name.should.equal('foo-index');
    existsResp.result.should.equal('exists');
  });

  it.skip('should find existing indexes', async () => {
    const db = context.db;
    const initialResp = await new Promise((resolve, reject) => {
      db.getIndexes((err, response) => {
        if (err) {
          return reject(err);
        }
        resolve(response);
      });
    });
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
});
