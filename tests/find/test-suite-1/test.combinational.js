'use strict';

describe('test.combinational.js', () => {
  describe('$or', () => {

    it('does $or queries', async () => {
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
          $and:[
            {age:{$gte: 75}},
            {$or: [
              {"name.first": "Nancy"},
              {"name.first": "Mick"}
            ]}
          ]
        }
      });
      const docs = resp.docs.map((doc) => {
        delete doc._rev;
        return doc;
      });

      docs.should.deep.equal([
          { _id: '1', age: 75, name: {first: 'Nancy', surname: 'Sinatra'}},
          { _id: '4', age: 76, name: {first: 'Mick', surname: 'Jagger'}}
        ]);
    });

    it('does $or queries 2', async () => {
      const db = context.db;
      const index = {
        "index": {
          "fields": ["_id"]
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
        { _id: '5', age: 40, name: {first: 'Dave', surname: 'Grohl'}}
      ]);
      const resp = await db.find({
        selector: {
          $and:[
            {_id:{$gte: '0'}},
            {$or: [
              {"name.first": "Nancy"},
              {age : {$lte: 40}}
            ]}
          ]
        }
      });
      const docs = resp.docs.map((doc) => {
        delete doc._rev;
        return doc;
      });

      docs.should.deep.equal([
          { _id: '1', age: 75, name: {first: 'Nancy', surname: 'Sinatra'}},
          { _id: '2', age: 40, name: {first: 'Eddie', surname: 'Vedder'}},
          { _id: '5', age: 40, name: {first: 'Dave', surname: 'Grohl'}}
        ]);
    });

  });

  describe('$nor', () => {

    it('does $nor queries', async () => {
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
          $and:[
            {age:{$gte: 75}},
            {$nor: [
              {"name.first": "Nancy"},
              {"name.first": "Mick"}
            ]}
          ]
        }
      });
      const docs = resp.docs.map((doc) => {
        delete doc._rev;
        return doc;
      });

      docs.should.deep.equal([
          { _id: '3', age: 80, name: {first: 'John', surname: 'Fogerty'}},
        ]);
    });

    it('does $nor queries 2', async () => {
      const db = context.db;
      const index = {
        "index": {
          "fields": ["_id"]
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
        { _id: '5', age: 40, name: {first: 'Dave', surname: 'Grohl'}}
      ]);
      const resp = await db.find({
        selector: {
          $and:[
            {_id:{$lte: '6'}},
            {$nor: [
              {"name.first": "Nancy"},
              {age : {$lte: 40}}
            ]}
          ]
        }
      });
      const docs = resp.docs.map((doc) => {
        delete doc._rev;
        return doc;
      });

      docs.should.deep.equal([
          { _id: '3', age: 80, name: {first: 'John', surname: 'Fogerty'}},
          { _id: '4', age: 76, name: {first: 'Mick', surname: 'Jagger'}},
        ]);
    });

    it('handles $or/$nor typos', async () => {
      const db = context.db;
      const index = {
        "index": {
          "fields": ["_id"]
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
        { _id: '5', age: 40, name: {first: 'Dave', surname: 'Grohl'}}
      ]);
      try {
        await db.find({
          selector: {
            $and:[
              {_id:{$lte: '6'}},
              {$noor: [
                {"name.first": "Nancy"},
                {age : {$lte: 40}}
              ]}
            ]
          }
        });
        throw new Error('expected an error');
      } catch (err) {
        should.exist(err);
      }
    });

  });
});
