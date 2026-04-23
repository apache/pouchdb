'use strict';

describe('test.elem-match.js', () => {
  if (testUtils.adapterType() === 'http') { return; }

  beforeEach(async () => {
    await context.db.bulkDocs([
      {'_id': 'peach', eats: ['cake', 'turnips', 'sweets'], results: [ 82, 85, 88 ]},
      {'_id': 'sonic', eats: ['chili dogs'], results: [ 75, 88, 89 ]},
      {'_id': 'fox',   eats: []},
      {'_id': 'mario', eats: ['cake', 'mushrooms']},
      {'_id': 'samus', eats: ['pellets']},
      {'_id': 'kirby', eats: 'anything', results: [ 82, 86, 10 ]}
    ]);
  });

  it('basic test', async () => {
    const db = context.db;
    const resp = await db.find({
      selector: {
        _id: {$gt: 'a'},
        eats: {$elemMatch: {$eq: 'cake'}}
      }
    });
    resp.docs.map((doc) => {
      return doc._id;
    }).sort().should.deep.equal(['mario', 'peach']);
  });

  it('basic test with two operators', async () => {
    const db = context.db;
    const resp = await db.find({
      selector: {
        _id: {$gt: 'a'},
        results: {$elemMatch: {$gte: 80, $lt: 85}}
      }
    });
    resp.docs.map((doc) => {
      return doc._id;
    }).should.deep.equal(['kirby', 'peach']);
  });

  it('with object in array', async () => {
    const db = context.db;
    const docs = [
      {_id: '1', events: [{eventId: 1, status: 'completed'}, {eventId: 2, status: 'started'}]},
      {_id: '2', events: [{eventId: 1, status: 'pending'}, {eventId: 2, status: 'finished'}]},
      {_id: '3', events: [{eventId: 1, status: 'pending'}, {eventId: 2, status: 'started'}]},
    ];

    await db.bulkDocs(docs);
    const resp = await db.find({
      selector: {
        events: {$elemMatch: {"status": {$eq: 'pending'}, "eventId": {$eq: 1}}},
      },
      fields: ['_id']
    });
    resp.docs.map((doc) => {
      return doc._id;
    }).should.deep.equal(['2', '3']);
  });

  it('with object in array couchdb style', async () => {
    const db = context.db;
    const docs = [
      {_id: '1', events: [{eventId: 1, status: 'completed'}, {eventId: 2, status: 'started'}]},
      {_id: '2', events: [{eventId: 1, status: 'pending'}, {eventId: 2, status: 'finished'}]},
      {_id: '3', events: [{eventId: 1, status: 'pending'}, {eventId: 2, status: 'started'}]},
    ];

    await db.bulkDocs(docs);
    const resp = await db.find({
      selector: {
        events: {$elemMatch: {"status": 'pending', "eventId": 1}},
      },
      fields: ['_id']
    });
    resp.docs.map((doc) => {
      return doc._id;
    }).should.deep.equal(['2', '3']);
  });

  it('should error for non-object query value', async () => {
    const db = context.db;
    try {
      await db.find({
        selector: {
          events: { $elemMatch: null },
        },
      });
      throw new Error('Function should throw');
    } catch (err) {
      err.message.should.eq('Query operator $elemMatch must be an object. Received : null');
    }
  });

  it('with null value in array', async () => {
    const db = context.db;
    const docs = [
      {_id: '1', values: [null]},
      {_id: '2', values: [1, null, 3]},
      {_id: '3', values: [1, 2, 3]}
    ];

    await db.bulkDocs(docs);
    const resp = await db.find({
      selector: {
        values: {$elemMatch: {$eq: null}},
      },
      fields: ['_id']
    });
    resp.docs.map((doc) => {
      return doc._id;
    }).should.deep.equal(['1', '2']);
  });
});
