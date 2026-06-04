'use strict';

describe('test.not.js', () => {
  it('works with simple syntax', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": ["age"]
      },
      "name": "age-index",
    "type": "json"
    };

    await db.createIndex(index);
    await db.bulkDocs([
      { _id: '1', age: 75, name: {first: 'Nancy', surname: 'Sinatra'}},
      { _id: '2', age: 40, name: {first: 'Eddie', surname: 'Vedder'}},
      { _id: '3', age: 80, name: {first: 'John', surname: 'Fogerty'}},
      { _id: '4', age: 76, name: {first: 'Mick', surname: 'Jagger'}},
    ]);
    const resp = await db.find({
      selector: {
        age:{$gte: 40},
        $not:{age: 75},
      }
    });
    const docs = resp.docs.map((doc) => {
      delete doc._rev;
      return doc;
    });

    docs.should.deep.equal([
        { _id: '2', age: 40, name: {first: 'Eddie', surname: 'Vedder'}},
        { _id: '4', age: 76, name: {first: 'Mick', surname: 'Jagger'}},
        { _id: '3', age: 80, name: {first: 'John', surname: 'Fogerty'}}
    ]);
  });

  it('works with $and', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": ["age"]
      },
      "name": "age-index",
    "type": "json"
    };

    await db.createIndex(index);
    await db.bulkDocs([
      { _id: '1', age: 75, name: {first: 'Nancy', surname: 'Sinatra'}},
      { _id: '2', age: 40, name: {first: 'Eddie', surname: 'Vedder'}},
      { _id: '3', age: 80, name: {first: 'John', surname: 'Fogerty'}},
      { _id: '4', age: 76, name: {first: 'Mick', surname: 'Jagger'}},
    ]);
    const resp = await db.find({
      selector: {
        $and: [
          {age:{$gte: 40}},
          {$not:{age: {$eq: 75}}},
        ]
      }
    });
    const docs = resp.docs.map((doc) => {
      delete doc._rev;
      return doc;
    });

    docs.should.deep.equal([
        { _id: '2', age: 40, name: {first: 'Eddie', surname: 'Vedder'}},
        { _id: '4', age: 76, name: {first: 'Mick', surname: 'Jagger'}},
        { _id: '3', age: 80, name: {first: 'John', surname: 'Fogerty'}}
    ]);
  });

  it('works with another combinational field', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": ["age"]
      },
      "name": "age-index",
    "type": "json"
    };

    await db.createIndex(index);
    await db.bulkDocs([
      { _id: '1', age: 75, name: {first: 'Nancy', surname: 'Sinatra'}},
      { _id: '2', age: 40, name: {first: 'Eddie', surname: 'Vedder'}},
      { _id: '3', age: 80, name: {first: 'John', surname: 'Fogerty'}},
      { _id: '4', age: 76, name: {first: 'Mick', surname: 'Jagger'}},
    ]);
    const resp = await db.find({
      selector: {
        $and: [
          {age:{$gte: 0}},
          {$not:{age: {$eq: 75}}},
          {$or: [
            {"name.first": "Eddie"},
          ]}
        ]
      }
    });
    const docs = resp.docs.map((doc) => {
      delete doc._rev;
      return doc;
    });

    docs.should.deep.equal([
        { _id: '2', age: 40, name: {first: 'Eddie', surname: 'Vedder'}},
    ]);
  });
});
