'use strict';

describe('test.errors.js', () => {
  it('error: gimme some args', async () => {
    const db = context.db;
    try {
      await db.find();
      throw Error('should not be here');
    } catch (err) {
      should.exist(err);
    }
  });

  it('error: missing required key selector', async () => {
    const db = context.db;
    try {
      await db.find({});
      throw Error('should not be here');
    } catch (err) {
      should.exist(err);
    }
  });

  it('error: unsupported mixed sort', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": [
          {"foo": "desc"},
          "bar"
        ]
      },
      "name": "foo-index",
      "type": "json"
    };
    try {
      await db.createIndex(index);
      throw new Error('should not be here');
    } catch (err) {
      should.exist(err);
    }
  });

  it('error: invalid sort json', async () => {
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
    try {
      await db.find({
        selector: {foo: {"$lte": "eba"}},
        fields: ["_id", "foo"],
        sort: {foo: "asc"}
      });
      throw new Error('shouldnt be here');
    } catch (err) {
      should.exist(err);
    }
  });

  it.skip('error: conflicting sort and selector', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": ["foo"]
      },
      "name": "foo-index",
      "type": "json"
    };
    await db.createIndex(index);
    const res = await db.find({
      "selector": {"foo": {"$gt": "\u0000\u0000"}},
      "fields": ["_id", "foo"],
      "sort": [{"_id": "asc"}]
    });
    res.warning.should.match(/no matching index found/);
  });

  it('error - no selector', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": ["foo"]
      },
      "name": "foo-index",
      "type": "json"
    };
    await db.createIndex(index);
    try {
      await db.find({
        "fields": ["_id", "foo"],
        "sort": [{"foo": "asc"}]
      });
      throw new Error('shouldnt be here');
    } catch (err) {
      should.exist(err);
    }
  });

  it('invalid ddoc', async () => {
    const db = context.db;

    const index = {
      "index": {
        "fields": ["foo"]
      },
      "name": "foo-index",
      "ddoc": "myddoc",
      "type": "json"
    };

    await db.put({
      _id: '_design/myddoc',
      views: {
        'foo-index': {
          map: "function (){emit(1)}"
        }
      }
    });
    try {
      await db.createIndex(index);
      throw new Error('expected an error');
    } catch (err) {
      should.exist(err);
    }
  });

  it('non-logical errors with no other selector', async () => {
    const db = context.db;

    await db.createIndex({
      index: {
        fields: ['foo']
      }
    });
    await db.bulkDocs([
      {_id: '1', foo: 1},
      {_id: '2', foo: 2},
      {_id: '3', foo: 3},
      {_id: '4', foo: 4}
    ]);
    try {
      await db.find({
        selector: {
          foo: {$mod: {gte: 3}}
        }
      });
      throw new Error('expected an error');
    } catch (err) {
      should.exist(err);
    }
  });

  it('should throw an instance of error if createIndex throws', async () => {
    const db = context.db;

    try {
      await db.createIndex({});
    } catch (exception) {
      //! FIXME check for instance of PouchError if available
      exception.should.be.instanceOf(Error);
    }
  });

  it('should throw an instance of error if find throws', async () => {
    const db = context.db;

    try {
      await db.find({ selector: [] });
    } catch (exception) {
      //! FIXME check for instance of PouchError if available
      exception.should.be.instanceOf(Error);
    }
  });

  it('should throw an instance of error if explain throws', async () => {
    const db = context.db;

    try {
      await db.explain({});
    } catch (exception) {
      //! FIXME check for instance of PouchError if available
      exception.should.be.instanceOf(Error);
    }
  });

  it('should throw an instance of error if deleteIndex throws', async () => {
    const db = context.db;

    try {
      await db.deleteIndex({
        ddoc: "foo",
        name: "bar"
      });
    }
    catch (exception) {
      //! FIXME check for instance of PouchError if available
      exception.should.be.instanceOf(Error);
    }
  });
});
