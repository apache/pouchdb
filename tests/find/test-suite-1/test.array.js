'use strict';

describe('test.array.js', () => {
  beforeEach(async () => {
    await context.db.bulkDocs([
      { name: 'James', _id: 'james',  favorites: ['Mario', 'Pokemon'], age: 20 },
      { name: 'Mary', _id: 'mary',  favorites: ['Pokemon'], age: 21 },
      { name: 'Link', _id: 'link', favorites: ['Zelda', 'Pokemon'], age: 22},
      { name: 'William', _id: 'william', favorites: ['Mario'], age: 23}
    ]);
    const index = {
      "index": {
        "fields": ["name"]
      },
      "name": "name-index",
      "type": "json"
    };
    await context.db.createIndex(index);
  });

  describe('$in', () => {
      it('should return docs match single value in array', async () => {
        const selector = {
          selector: {
            favorites: {
              $in: ["Mario"]
            }
          },
        };
        const db = context.db;
        const findResp = await db.find(selector);
        const docs = findResp.docs.map((doc) => {
          delete doc._rev;
          return doc;
        });

        docs.should.deep.equal([
          { name: 'James', _id: 'james',  favorites: ['Mario', 'Pokemon'], age: 20},
          { name: 'William', _id: 'william', favorites: ['Mario'], age: 23 }
        ]);

        const explainResp = await db.explain(selector);
        explainResp.index.name.should.deep.equal('_all_docs');
    });

    it('should use name index', async () => {
      const db = context.db;
      const selector = {
          selector: {
            name: {
              $in: ['James', 'Link']
            },
            age: {
              $gt: 21
            }
          },
        };
      const explainResp = await db.explain(selector);
      explainResp.index.name.should.deep.equal('name-index');
      const findResp = await db.find(selector);
      const docs = findResp.docs.map((doc) => {
        delete doc._rev;
        return doc;
      });

      docs.should.deep.equal([
        { name: 'Link', _id: 'link', favorites: ['Zelda', 'Pokemon'], age: 22},
      ]);
    });

    it('should return docs match single value in array with defined index', async () => {
      const db = context.db;
      const index = {
        "index": {
          "fields": ["name", "favorites"]
        },
        "type": "json"
      };
      await db.createIndex(index);
      const resp = await db.find({
        selector: {
          name: {
            $eq: 'James'
          },
          favorites: {
            $in: ["Mario"]
          }
        },
      });
      const docs = resp.docs.map((doc) => {
        delete doc._rev;
        return doc;
      });

      docs.should.deep.equal([
        { name: 'James', _id: 'james',  favorites: ['Mario', 'Pokemon'], age: 20}
      ]);
    });


    it('should return docs match single field that is not an array', async () => {
      const db = context.db;
      const resp = await db.find({
        selector: {
          _id: {
            $gt: 'a'
          },
          name: {
            $in: ['James', 'William']
          }
        },
      });
      const docs = resp.docs.map((doc) => {
        delete doc._rev;
        return doc;
      });

      docs.should.deep.equal([
        { name: 'James', _id: 'james',  favorites: ['Mario', 'Pokemon'], age: 20 },
        { name: 'William', _id: 'william', favorites: ['Mario'], age: 23 }
      ]);
    });

    it('should return docs match single field that is not an array and number', async () => {
      const db = context.db;
      const resp = await db.find({
        selector: {
          age: {
            $in: [20, 23]
          }
        },
      });
      const docs = resp.docs.map((doc) => {
        delete doc._rev;
        return doc;
      });

      docs.should.deep.equal([
        { name: 'James', _id: 'james',  favorites: ['Mario', 'Pokemon'], age: 20 },
        { name: 'William', _id: 'william', favorites: ['Mario'], age: 23 }
      ]);
    });


    it('should return docs match two values in array', async () => {
      const db = context.db;
      const resp = await db.find({
        selector: {
          favorites: {
            $in: ["Mario", "Zelda"]
          }
        },
      });
      const docs = resp.docs.map((doc) => {
        delete doc._rev;
        return doc;
      });

      docs.should.deep.equal([
        { name: 'James', _id: 'james',  favorites: ['Mario', 'Pokemon'], age: 20 },
        { name: 'Link', _id: 'link', favorites: ['Zelda', 'Pokemon'], age: 22},
        { name: 'William', _id: 'william', favorites: ['Mario'], age: 23 }
      ]);
    });

    it('should return no docs for no $in match', async () => {
      const db = context.db;
      const resp = await db.find({
        selector: {
          favorites: {
            $in: ["TMNT"]
          }
        },
      });
      resp.docs.should.have.length(0);
    });
    it('should error for non-array query value', async () => {
      const db = context.db;
      try {
        await db.find({
          selector: {
            favorites: {
              $in: 'a'
            }
          },
        });
        throw new Error('Function should throw');
      } catch (err) {
        err.message.should.eq('Query operator $in must be an array. Received string: a');
      }
    });
    it('should NOT error for "invalid operators" inside', async () => {
      const db = context.db;
      await db.bulkDocs([
        { _id: "1", list: [ { $or: "allowed" } ] }
      ]);
      const resp = await db.find({
        selector: {
          list: { $in: [ { $or: "allowed" } ] },
        },
      });
      resp.docs.map((doc) => {
        return doc._id;
      }).should.deep.equal([ "1" ]);
    });
  });

  describe('$all', () => {
    it('should return docs that match single value in $all array', async () => {
      const db = context.db;
      const resp = await db.find({
        selector: {
          favorites: {
            $all: ["Mario"]
          }
        },
      });
      const docs = resp.docs.map((doc) => {
        delete doc._rev;
        return doc;
      });

      docs.should.deep.equal([
        { name: 'James', _id: 'james',  favorites: ['Mario', 'Pokemon'], age: 20},
        { name: 'William', _id: 'william', favorites: ['Mario'], age: 23}
      ]);
    });

    it('should return docs match two values in $all array', async () => {
      const db = context.db;
      const resp = await db.find({
        selector: {
          favorites: {
            $all: ['Mario', 'Pokemon']
          }
        },
      });
      const docs = resp.docs.map((doc) => {
        delete doc._rev;
        return doc;
      });

      docs.should.deep.equal([
        { name: 'James', _id: 'james',  favorites: ['Mario', 'Pokemon'], age: 20},
      ]);
    });

    it('should return no docs for no match for $all', async () => {
      const db = context.db;
      const resp = await db.find({
        selector: {
          favorites: {
            $all: ["Mario", "Zelda"]
          }
        },
      });
      resp.docs.should.have.length(0);
    });
    it('should error for non-array query value', async () => {
      const db = context.db;
      try {
        await db.find({
          selector: {
            favorites: {
              $all: 'a'
            }
          },
        });
        throw new Error('Function should throw');
      } catch (err) {
        err.message.should.eq('Query operator $all must be an array. Received string: a');
      }
    });
    it('should NOT error for "invalid operators" inside', async () => {
      const db = context.db;
      await db.bulkDocs([
        { _id: "1", list: [ { $or: "allowed" } ] }
      ]);
      const resp = await db.find({
        selector: {
          list: { $all: [ { $or: "allowed" } ] },
        },
      });
      resp.docs.map((doc) => {
        return doc._id;
      }).should.deep.equal([ "1" ]);
    });
  });

  describe('$size', () => {
    it('should return docs with array length 1', async () => {
      const db = context.db;
      const resp = await db.find({
        selector: {
          favorites: {
            $size: 1
          }
        },
      });
      const docs = resp.docs.map((doc) => {
        delete doc._rev;
        return doc;
      });

      docs.should.deep.equal([
        { name: 'Mary', _id: 'mary',  favorites: ['Pokemon'], age: 21 },
        { name: 'William', _id: 'william', favorites: ['Mario'], age: 23 }
      ]);
    });

    it('should return docs array length 2', async () => {
      const db = context.db;
      const resp = await db.find({
        selector: {
          favorites: {
            $size: 2
          }
        },
      });
      const docs = resp.docs.map((doc) => {
        delete doc._rev;
        return doc;
      });

      docs.should.deep.equal([
        { name: 'James', _id: 'james',  favorites: ['Mario', 'Pokemon'], age: 20 },
        { name: 'Link', _id: 'link', favorites: ['Zelda', 'Pokemon'], age: 22 },
      ]);
    });

    it('should return no docs for length 5', async () => {
      const db = context.db;
      const resp = await db.find({
        selector: {
          favorites: {
            $size: 5
          }
        },
      });
      resp.docs.should.have.length(0);
    });
    it('should error on non-int query values', async () => {
      const db = context.db;
      try {
        await db.find({
          selector: {
            favorites: {
              $size: 2.1
            }
          },
        });
        throw new Error('Function should throw');
      } catch (err) {
        err.message.should.eq('Query operator $size must be a integer. Received number: 2.1');
      }
    });

    it('should ignore non-array field values', async () => {
      const db = context.db;
      await context.db.bulkDocs([
        { _id: "string", unknown: "str" },
        { _id: "array", unknown: [ "a", "b", "c" ] },
      ]);
      const resp = await db.find({
        selector: {
          unknown: { $size: 3 }
        },
      });
      const docs = resp.docs.map((doc) => {
        delete doc._rev;
        return doc;
      });

      docs.should.deep.equal([
        { _id: "array", unknown: [ "a", "b", "c" ] },
      ]);
    });
  });

  describe('$nin', () => {
    it('should return docs match single value $nin array', async () => {
      const db = context.db;
      const resp = await db.find({
        selector: {
          favorites: {
            $nin: ["Mario"]
          }
        },
      });
      const docs = resp.docs.map((doc) => {
        delete doc._rev;
        return doc;
      });

      docs.should.deep.equal([
        { name: 'Link', _id: 'link', favorites: ['Zelda', 'Pokemon'], age: 22},
        { name: 'Mary', _id: 'mary',  favorites: ['Pokemon'], age: 21 },
      ]);
    });

    it('should return docs that do not match single field that is not an array', async () => {
      const db = context.db;
      const resp = await db.find({
        selector: {
          name: {
            $nin: ['James', 'William']
          }
        },
      });
      const docs = resp.docs.map((doc) => {
        delete doc._rev;
        return doc;
      });

      docs.should.deep.equal([
        { name: 'Link', _id: 'link', favorites: ['Zelda', 'Pokemon'], age: 22},
        { name: 'Mary', _id: 'mary',  favorites: ['Pokemon'], age: 21 },
      ]);
    });

    it('should return docs with single field that is not an array and number', async () => {
      const db = context.db;
      const resp = await db.find({
        selector: {
          age: {
            $nin: [20, 23]
          }
        },
      });
      const docs = resp.docs.map((doc) => {
        delete doc._rev;
        return doc;
      });

      docs.should.deep.equal([
        { name: 'Link', _id: 'link', favorites: ['Zelda', 'Pokemon'], age: 22},
        { name: 'Mary', _id: 'mary',  favorites: ['Pokemon'], age: 21 },
      ]);
    });

    it('should return docs that do not match two values $nin array', async () => {
      const db = context.db;
      const resp = await db.find({
        selector: {
          favorites: {
            $nin: ["Pokemon", "Zelda"]
          }
        },
      });
      const docs = resp.docs.map((doc) => {
        delete doc._rev;
        return doc;
      });

      docs.should.deep.equal([
        { name: 'William', _id: 'william', favorites: ['Mario'], age: 23 }
      ]);
    });

    it('should return all docs for no match for $nin', async () => {
      const db = context.db;
      const resp = await db.find({
        selector: {
          favorites: {
            $nin: ["TMNT"]
          }
        },
      });
      resp.docs.should.have.length(4);
    });

    it('should work for _id field', async () => {
      const db = context.db;
      const resp = await db.find({
        selector: {
          _id: {
            $nin: ['james', 'mary']
          }
        },
        fields: ["_id"]
      });
      resp.docs.should.deep.equal([
        {_id: 'link'},
        {_id: 'william'},
      ]);
    });

    it('$nin work with complex array #6280', async () => {
      const db = context.db;
      await context.db.bulkDocs([
        {
          _id: 'smith',
          lastName: 'Smith',
          absents: ['10/10/15', '10/10/16'],
          year: 2016,
          type: 'person'
        },
        {
          _id: 'roberts',
          lastName: 'Roberts',
          absents: ['10/10/10', '10/10/16'],
          year: 2017,
          type: 'person'
        },
        {
          _id: 'jones',
          lastName: 'Jones',
          absents: ['10/10/12', '10/10/20'],
          year: 2013,
          type: 'person'
        }
      ]);
      await db.createIndex({
          index: {
              fields: ['lastName','absents','year','type'],
              name: 'myIndex',
              ddoc: 'myIndex'
          }
        });
      const resp = await db.find({
        selector: {
          lastName: {$gt: null},
          year: {$gt: null},
          type: 'person',
          absents: {
            $nin: ['10/10/15']
          }
        },
        fields: ["_id"]
      });
      resp.docs.should.deep.equal([
          {_id: 'jones'},
          {_id: 'roberts'},
        ]);
    });
    it('should error for non-array query value', async () => {
      const db = context.db;
      try {
        await db.find({
          selector: {
            favorites: {
              $nin: 'a'
            }
          },
        });
        throw new Error('Function should throw');
      } catch (err) {
        err.message.should.eq('Query operator $nin must be an array. Received string: a');
      }
    });
    it('should NOT error for "invalid operators" inside', async () => {
      const db = context.db;
      await db.bulkDocs([
        { _id: "1", list: [ { $or: "allowed" } ] },
        { _id: "2", list: [ { $or: "not-allowed" } ] }
      ]);
      const resp = await db.find({
        selector: {
          list: { $nin: [ { $or: "not-allowed" } ] },
        },
      });
      resp.docs.map((doc) => {
        return doc._id;
      }).should.deep.equal([ "1" ]);
    });
  });

  describe("$allMatch", () => {
    it("returns zero docs for field that is not an array", async () => {
      const db = context.db;
      const resp = await db.find({
        selector: {
          name: {
            $allMatch: {
              _id: "mary"
            }
          }
        }
      });
      resp.docs.length.should.equal(0);
    });

    //CouchDB is returing a different result
    it.skip("returns false if field isn't in doc", async () => {
      const docs = [
            {
              "user_id": "a",
              "bang": []
            }
        ];
        const db = context.db;
        await db.bulkDocs(docs);
        const resp = await db.find({
          selector: {
            bang: {
              "$allMatch": {
                "$eq": "Pokemon",
              }
            }
          }
        });
        resp.docs.length.should.equal(0);
    });

    it("matches against array", async () => {
      const db = context.db;
      const resp = await db.find({
        selector: {
          favorites: {
            $allMatch: {
              $eq: "Pokemon"
            }
          }
        },
        fields: ["_id"]
      });
      resp.docs.should.deep.equal([
        {_id: 'mary'},
      ]);
    });

    it("works with object array", async () => {
      const docs = [
            {
              "user_id": "a",
              "bang": [
                {
                    "foo": 1,
                    "bar": 2
                },
                {
                    "foo": 3,
                    "bar": 4
                }
              ]
            },
            {
              "user_id": "b",
              "bang": [
                {
                  "foo": 1,
                  "bar": 2
                },
                {
                  "foo": 4,
                  "bar": 4
                }
              ]
            }
        ];
        const db = context.db;
        await db.bulkDocs(docs);
        const resp = await db.find({
          selector: {
            bang: {
              "$allMatch": {
                "foo": {"$mod": [2,1]},
                "bar": {"$mod": [2,0]}
              }
            }
          },
          fields: ["user_id"]
        });
        resp.docs.should.deep.equal([
          {user_id: "a"}
        ]);
    });
    it('should error for non-object query value', async () => {
      const db = context.db;
      try {
        await db.find({
          selector: {
            bang: {
              "$allMatch": 'a'
            }
          },
        });
        throw new Error('Function should throw');
      } catch (err) {
        err.message.should.eq('Query operator $allMatch must be an object. Received string: a');
      }
    });

    it('with null value in array', async () => {
      const db = context.db;
      const docs = [
        {_id: '1', values: [null, null]},
        {_id: '2', values: [1, null, 3]},
        {_id: '3', values: [1, 2, 3]}
      ];

      await db.bulkDocs(docs);
      const resp = await db.find({
        selector: {
          values: {$allMatch: {$eq: null}},
        },
        fields: ['_id']
      });
      resp.docs.map((doc) => {
        return doc._id;
      }).should.deep.equal(['1']);
    });
  });
});
