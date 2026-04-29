"use strict";

describe("test.issue7810.js", () => {
  const adapter = testUtils.adapterType();
  const dbs = {};

  const docData = {
    _id: "foobar",
    indexedField: "foobaz",
    numericField: 1337,
    indexedPairOne: 'foo',
    indexedPairTwo: 'bar'
  };

  const findInDbs = async (query) => {
    const withIndexResults = await dbs.withIndex.find(query);
    const withoutIndexResults = await dbs.withoutIndex.find(query);
    return { withIndexResults, withoutIndexResults };
  };

  const createIndicesAndPutData = () => {
    return Promise.all([
      dbs.withIndex.createIndex({
        index: {
          fields: ["indexedField"],
        },
      }),
      dbs.withIndex.createIndex({
        index: {
          fields: [
            'indexedPairOne',
            'indexedPairTwo',
          ],
        },
      }),
      dbs.withIndex.put(docData),
      dbs.withoutIndex.put(docData),
    ]);
  };

  const assertWithAndWithoutLengthOf = (results, docLen) => {
    const { withIndexResults, withoutIndexResults } = results;
    const withIndexDocs = withIndexResults.docs.length;
    const withoutIndexDocs = withoutIndexResults.docs.length;
    assert.deepEqual(
      withIndexResults.docs,
      withoutIndexResults.docs,
      "indexed and non-indexed should return same results"
    );
    const suffix = docLen === 1 ? '' : 's';
    withIndexDocs.should.equal(docLen, `indexed should return ${docLen} doc${suffix}`);
    withoutIndexDocs.should.equal(docLen, `non-indexed should return ${docLen} doc${suffix}`);
  };

  beforeEach(async () => {
    dbs.withIndexName = testUtils.adapterUrl(adapter, "with_index");
    dbs.withoutIndexName = testUtils.adapterUrl(adapter, "without_index");
    dbs.withIndex = new PouchDB(dbs.withIndexName);
    dbs.withoutIndex = new PouchDB(dbs.withoutIndexName);

    await createIndicesAndPutData();
  });

  afterEach((done) => {
    testUtils.cleanup([dbs.withIndexName, dbs.withoutIndexName], done);
  });

  it("Testing issue #7810 with selector {} - should return 1 doc", async () => {
    const query = {
      selector: {},
      limit: 1,
    };
    const results = await findInDbs(query);
    assertWithAndWithoutLengthOf(results, 1);
  });

  it("Testing issue #7810 with selector { _id: {} } - should return 0 docs", async () => {
    const query = {
      selector: {
        _id: {},
      },
      limit: 1,
    };
    const results = await findInDbs(query);
    assertWithAndWithoutLengthOf(results, 0);
  });

  it("Testing issue #7810 with selector { indexedField: {} } - should return 0 docs", async () => {
    const query = {
      selector: {
        indexedField: {},
      },
      limit: 1,
    };
    const results = await findInDbs(query);
    assertWithAndWithoutLengthOf(results, 0);
  });

  it("Testing issue #7810 with selector { _id: 'foobar'} - should return 1 doc", async () => {
    const query = {
      selector: {
        _id: "foobar",
      },
      limit: 1,
    };
    const results = await findInDbs(query);
    assertWithAndWithoutLengthOf(results, 1);
  });

  it("Testing issue #7810 with selector { indexedField: 'foobaz' } - should return 1 doc", async () => {
    const query = {
      selector: {
        indexedField: "foobaz",
      },
      limit: 1,
    };
    const results = await findInDbs(query);
    assertWithAndWithoutLengthOf(results, 1);
  });

  it("Testing issue #7810 with selector { numericField: 1337} - should return 1 doc", async () => {
    const query = {
      selector: {
        numericField: 1337,
      },
      limit: 1,
    };
    const results = await findInDbs(query);
    assertWithAndWithoutLengthOf(results, 1);
  });

  it("Testing issue #7810 with selector { numericField: 404 } - should return 0 docs", async () => {
    const query = {
      selector: {
        numericField: 404,
      },
      limit: 1,
    };
    const results = await findInDbs(query);
    assertWithAndWithoutLengthOf(results, 0);
  });


  it("Testing issue #7810 with selector { indexedPairOne: 'foo' } - should return 1 docs", async () => {
    const query = {
      selector: {
        indexedPairOne: 'foo',
      },
      limit: 1,
    };
    const results = await findInDbs(query);
    assertWithAndWithoutLengthOf(results, 1);
  });

  it("Testing issue #7810 with selector { indexedPairOne: 'baz' } - should return 0 docs", async () => {
    const query = {
      selector: {
        indexedPairOne: 'baz'
      },
      limit: 1,
    };
    const results = await findInDbs(query);
    assertWithAndWithoutLengthOf(results, 0);
  });

  it("Testing issue #7810 with selector {} - should return 1 out of 2 docs", async () => {
    const query = {
      selector: {},
      limit: 1,
    };
    const otherDoc = {
      _id: "charlie",
      indexedField: "alics",
      numericField: 420,
      indexedPairOne: 'bob',
      indexedPairTwo: 'david'
    };
    await Promise.all([
      dbs.withIndex.put(otherDoc),
      dbs.withoutIndex.put(otherDoc)
    ]);
    const results = await findInDbs(query);
    assertWithAndWithoutLengthOf(results, 1);
  });
});
