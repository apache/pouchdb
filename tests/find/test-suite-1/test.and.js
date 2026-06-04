'use strict';

describe('test.and.js', () => {
  it('does and for _id', async () => {
    const db = context.db;
    await db.bulkDocs([
      { name: 'mario', _id: 'mario', rank: 5, series: 'mario', debut: 1981 },
      { name: 'jigglypuff', _id: 'puff', rank: 8, series: 'pokemon', debut: 1996 },
      { name: 'link', rank: 10, _id: 'link', series: 'zelda', debut: 1986 },
      { name: 'donkey kong', rank: 7, _id: 'dk', series: 'mario', debut: 1981 },
      { name: 'pikachu', series: 'pokemon', _id: 'pikachu', rank: 1, debut: 1996 },
      { name: 'captain falcon', _id: 'falcon', rank: 4, series: 'f-zero', debut: 1990 },
      { name: 'luigi', rank: 11, _id: 'luigi', series: 'mario', debut: 1983 },
      { name: 'fox', _id: 'fox', rank: 3, series: 'star fox', debut: 1993 },
      { name: 'ness', rank: 9, _id: 'ness', series: 'earthbound', debut: 1994 },
      { name: 'samus', rank: 12, _id: 'samus', series: 'metroid', debut: 1986 },
      { name: 'yoshi', _id: 'yoshi', rank: 6, series: 'mario', debut: 1990 },
      { name: 'kirby', _id: 'kirby', series: 'kirby', rank: 2, debut: 1992 }
    ]);
    const resp = await db.find({
      selector: {$and: [
        {_id: {$in: ['pikachu', 'puff', 'yoshi']}},
        {_id: {$gt: 'ppp'}}
      ]},
      fields: ["_id"],
    });
    resp.docs.should.deep.equal([
      {_id: 'puff'},
      {_id: 'yoshi'},
    ]);
  });

  it('does and for index', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": ["debut"]
      }
    };
    await db.createIndex(index);
    await db.bulkDocs([
      { name: 'mario', _id: 'mario', rank: 5, series: 'mario', debut: 1981 },
      { name: 'jigglypuff', _id: 'puff', rank: 8, series: 'pokemon', debut: 1996 },
      { name: 'link', rank: 10, _id: 'link', series: 'zelda', debut: 1986 },
      { name: 'donkey kong', rank: 7, _id: 'dk', series: 'mario', debut: 1981 },
      { name: 'pikachu', series: 'pokemon', _id: 'pikachu', rank: 1, debut: 1996 },
      { name: 'captain falcon', _id: 'falcon', rank: 4, series: 'f-zero', debut: 1997 },
      { name: 'luigi', rank: 11, _id: 'luigi', series: 'mario', debut: 1983 },
      { name: 'fox', _id: 'fox', rank: 3, series: 'star fox', debut: 1993 },
      { name: 'ness', rank: 9, _id: 'ness', series: 'earthbound', debut: 1994 },
      { name: 'samus', rank: 12, _id: 'samus', series: 'metroid', debut: 1986 },
      { name: 'yoshi', _id: 'yoshi', rank: 6, series: 'mario', debut: 1990 },
      { name: 'kirby', _id: 'kirby', series: 'kirby', rank: 2, debut: 1992 }
    ]);
    const resp = await db.find({
      selector: {$and: [
        {debut: {$gt: 1995}},
        {debut: {$lt: 2000}}
      ]},
      fields: ["_id"],
    });
    resp.docs.should.deep.equal([
      {_id: 'pikachu'},
      {_id: 'puff'},
      {_id: 'falcon'},
    ]);
  });

  it('does nested and for _id', async () => {
    const db = context.db;
    await db.bulkDocs([
      { name: 'mario', _id: 'mario', rank: 5, series: 'mario', debut: 1981 },
      { name: 'jigglypuff', _id: 'puff', rank: 8, series: 'pokemon', debut: 1996 },
      { name: 'link', rank: 10, _id: 'link', series: 'zelda', debut: 1986 },
      { name: 'donkey kong', rank: 7, _id: 'dk', series: 'mario', debut: 1981 },
      { name: 'pikachu', series: 'pokemon', _id: 'pikachu', rank: 1, debut: 1996 },
      { name: 'captain falcon', _id: 'falcon', rank: 4, series: 'f-zero', debut: 1990 },
      { name: 'luigi', rank: 11, _id: 'luigi', series: 'mario', debut: 1983 },
      { name: 'fox', _id: 'fox', rank: 3, series: 'star fox', debut: 1993 },
      { name: 'ness', rank: 9, _id: 'ness', series: 'earthbound', debut: 1994 },
      { name: 'samus', rank: 12, _id: 'samus', series: 'metroid', debut: 1986 },
      { name: 'yoshi', _id: 'yoshi', rank: 6, series: 'mario', debut: 1990 },
      { name: 'kirby', _id: 'kirby', series: 'kirby', rank: 2, debut: 1992 }
    ]);
    const resp = await db.find({
      selector: {$and: [
        {debut: {$eq: 1996}},
        {$and: [
          {rank: {$eq: 8}},
          {name: {$eq: 'jigglypuff'}}
        ]}
      ]},
      fields: ["_id"],
    });
    resp.docs.should.deep.equal([
      {_id: 'puff'},
    ]);
  });

  it('does nested and for index', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": ["debut"]
      }
    };
    await db.createIndex(index);
    await db.bulkDocs([
      { name: 'mario', _id: 'mario', rank: 5, series: 'mario', debut: 1981 },
      { name: 'jigglypuff', _id: 'puff', rank: 8, series: 'pokemon', debut: 1996 },
      { name: 'link', rank: 10, _id: 'link', series: 'zelda', debut: 1986 },
      { name: 'donkey kong', rank: 7, _id: 'dk', series: 'mario', debut: 1981 },
      { name: 'pikachu', series: 'pokemon', _id: 'pikachu', rank: 1, debut: 1996 },
      { name: 'captain falcon', _id: 'falcon', rank: 4, series: 'f-zero', debut: 1990 },
      { name: 'luigi', rank: 11, _id: 'luigi', series: 'mario', debut: 1983 },
      { name: 'fox', _id: 'fox', rank: 3, series: 'star fox', debut: 1993 },
      { name: 'ness', rank: 9, _id: 'ness', series: 'earthbound', debut: 1994 },
      { name: 'samus', rank: 12, _id: 'samus', series: 'metroid', debut: 1986 },
      { name: 'yoshi', _id: 'yoshi', rank: 6, series: 'mario', debut: 1990 },
      { name: 'kirby', _id: 'kirby', series: 'kirby', rank: 2, debut: 1992 }
    ]);
    const resp = await db.find({
      selector: {$and: [
        {debut: {$eq: 1996}},
        {$and: [
          {rank: {$eq: 8}},
          {name: {$eq: 'jigglypuff'}}
        ]}
      ]},
      fields: ["_id"],
    });
    resp.docs.should.deep.equal([
      {_id: 'puff'},
    ]);
  });
});
