"use strict";

describe("test.issue9183.js", function () {
  var adapter = testUtils.adapterType();
  var db = null;
  var dbName = null;

  beforeEach(function () {
    dbName = testUtils.adapterUrl(adapter, "issue9183");
    db = new PouchDB(dbName);
    return db.bulkDocs([
      { _id: "doc1", name: "Mario" },
      { _id: "doc2" }, // Missing 'name' field
    ]);
  });

  afterEach(function (done) {
    testUtils.cleanup([dbName], done);
  });

  it("should not throw a null pointer exception when a document is missing the indexed field", function () {
    return db
      .createIndex({
        index: { fields: ["name"] }
      })
      .then(function () {
        return db.find({
          selector: {
            name: { $gt: null } // Try $gt instead of $gte
          }
        });
      })
      .then(function (res) {
        res.docs.should.have.length(1);
        res.docs[0]._id.should.equal("doc1");
      });
  });
});
