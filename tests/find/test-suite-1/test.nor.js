'use strict';

describe('test.nor.js', () => {
  beforeEach(async () => {
    await context.db.bulkDocs([
      { name: 'Mario', _id: 'mario', rank: 5, series: 'Mario', debut: 1981, awesome: true },
      { name: 'Jigglypuff', _id: 'puff', rank: 8, series: 'Pokemon', debut: 1996,
        awesome: false },
      { name: 'Link', rank: 10, _id: 'link', series: 'Zelda', debut: 1986, awesome: true },
      { name: 'Donkey Kong', rank: 7, _id: 'dk', series: 'Mario', debut: 1981, awesome: false },
      { name: 'Pikachu', series: 'Pokemon', _id: 'pikachu', rank: 1, debut: 1996, awesome: true },
      { name: 'Luigi', rank: 11, _id: 'luigi', series: 'Mario', debut: 1983, awesome: false },
      { name: 'Yoshi', _id: 'yoshi', rank: 6, series: 'Mario', debut: 1990, awesome: true }
    ]);
  });

  it('#6366 should do a basic $nor', async () => {
    const db = context.db;
    const res = await db.find({
      selector: {
        "$nor": [
          { "series": "Mario" },
          { "series": "Pokemon" }
        ]
      }
    });
    const docs = res.docs.map((doc) => {
      return {
        _id: doc._id
      };
    });
    docs.should.deep.equal([
      {'_id': 'link'}
    ]);
  });

  it('#6366 should do a basic $nor, with explicit $eq', async () => {
    const db = context.db;
    const res = await db.find({
      selector: {
        "$nor": [
          { "series": {$eq: "Mario"} },
          { "series": {$eq: "Pokemon"} }
        ]
      }
    });
    const docs = res.docs.map((doc) => {
      return {
        _id: doc._id
      };
    });
    docs.should.deep.equal([
      {'_id': 'link'}
    ]);
  });
});
