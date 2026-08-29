"use strict";

describe("test.issue8389.js", () => {
  const adapter = testUtils.adapterType();
  let db = null;
  let dbName = null;

  const docData = {
    _id: "foobar",
    indexedField: "foobaz",
  };

  const createIndicesAndPutData = () => {
    return Promise.all([
      db.createIndex({
        index: {
          fields: ["indexedField", "_id"],
        },
      }),
      db.put(docData),
    ]);
  };

  const assertLengthOf = async (query, docLen) => {
    const results = await db.find(query);
    const suffix = docLen === 1 ? '' : 's';
    results.docs.length.should.equal(docLen, `find should return ${docLen} doc${suffix}`);
  };

  beforeEach(async () => {
    dbName = testUtils.adapterUrl(adapter, "issue8389");
    db = new PouchDB(dbName);

    await createIndicesAndPutData();
  });

  afterEach((done) => {
    testUtils.cleanup([dbName], done);
  });

  it("Testing issue #8389 _id should work in find index: 0 with nonmatching query", () => {
    const query = {
      selector: {
        indexedField: 'bar',
        _id: 'bar',
      },
    };
    return assertLengthOf(query, 0);
  });

  it("Testing issue #8389 _id should work in find index: 1 with matching query", () => {
    const query = {
      selector: {
        indexedField: 'foobaz',
        _id: 'foobar',
      },
    };
    return assertLengthOf(query, 1);
  });

  it("Testing issue #8389 _id should work in find index: 1/2 with multiple docs", async () => {
    const query = {
      selector: {
        indexedField: 'foobaz',
        _id: 'foobar',
      },
    };
    const otherDoc = {
      _id: "charlie",
      indexedField: "foobaz",
    };
    await db.put(otherDoc);
    await assertLengthOf(query, 1);
  });

  it("Testing issue #8389 _id should work in find index: 2/2 with multiple docs", async () => {
    const query = {
      selector: {
        indexedField: 'foobaz',
        _id: {
          '$gt': 'a',
        }
      },
    };
    const otherDoc = {
      _id: "charlie",
      indexedField: "foobaz",
    };
    await db.put(otherDoc);
    await assertLengthOf(query, 2);
  });
});
