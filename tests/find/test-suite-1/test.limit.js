'use strict';

describe('test.limit.js', () => {
  const sortById = testUtils.sortById;

  beforeEach(async () => {
    await context.db.bulkDocs([
      { name: 'Mario', _id: 'mario', rank: 5, series: 'Mario', debut: 1981 },
      { name: 'Jigglypuff', _id: 'puff', rank: 8, series: 'Pokemon', debut: 1996 },
      { name: 'Link', rank: 10, _id: 'link', series: 'Zelda', debut: 1986 },
      { name: 'Donkey Kong', rank: 7, _id: 'dk', series: 'Mario', debut: 1981 },
      { name: 'Pikachu', series: 'Pokemon', _id: 'pikachu', rank: 1, debut: 1996 },
      { name: 'Captain Falcon', _id: 'falcon', rank: 4, series: 'F-Zero', debut: 1990 },
      { name: 'Luigi', rank: 11, _id: 'luigi', series: 'Mario', debut: 1983 },
      { name: 'Fox', _id: 'fox', rank: 3, series: 'Star Fox', debut: 1993 },
      { name: 'Ness', rank: 9, _id: 'ness', series: 'Earthbound', debut: 1994 },
      { name: 'Samus', rank: 12, _id: 'samus', series: 'Metroid', debut: 1986 },
      { name: 'Yoshi', _id: 'yoshi', rank: 6, series: 'Mario', debut: 1990 },
      { name: 'Kirby', _id: 'kirby', series: 'Kirby', rank: 2, debut: 1992 }
    ]);
  });

  it('should work with $and 1 limit 0', async () => {
    const db = context.db;
    await db.createIndex({
      "index": {
        "fields": ["series"]
      }
    });
    await db.createIndex({
      "index": {
        "fields": ["debut"]
      }
    });
    const res = await db.find({
      selector: {
        $and: [
          {series: 'Mario'},
          {debut: {$gte: 1982}}
        ]
      },
      fields: ['_id'],
      limit: 0
    });
    res.docs.sort(sortById);
    res.docs.should.deep.equal([]);
  });

  it('should work with $and 1 limit 1', async () => {
    const db = context.db;
    await db.createIndex({
      "index": {
        "fields": ["series"]
      }
    });
    await db.createIndex({
      "index": {
        "fields": ["debut"]
      }
    });
    const res = await db.find({
      selector: {
        $and: [
          {series: 'Mario'},
          {debut: {$gte: 1982}}
        ]
      },
      fields: ['_id'],
      limit: 1
    });
    res.docs.sort(sortById);
    res.docs.should.deep.equal([{_id: 'luigi'}]);
  });

  it('should work with $and 1 limit 2', async () => {
    const db = context.db;
    await db.createIndex({
      "index": {
        "fields": ["series"]
      }
    });
    await db.createIndex({
      "index": {
        "fields": ["debut"]
      }
    });
    const res = await db.find({
      selector: {
        $and: [
          {series: 'Mario'},
          {debut: {$gte: 1982}}
        ]
      },
      fields: ['_id'],
      limit: 2
    });
    res.docs.sort(sortById);
    res.docs.should.deep.equal([{_id: 'luigi'}, {_id: 'yoshi'}]);
  });

  it('should work with $and 2, same index limit 0', async () => {
    const db = context.db;
    await db.createIndex({
      "index": {
        "fields": ["series", "debut"]
      }
    });
    const res = await db.find({
      selector: {
        $and: [
          {series: 'Mario'},
          {debut: {$gte: 1982}}
        ]
      },
      fields: ['_id'],
      limit: 0
    });
    res.docs.sort(sortById);
    res.docs.should.deep.equal([]);
  });

  it('should work with $and 2, same index limit 1', async () => {
    const db = context.db;
    await db.createIndex({
      "index": {
        "fields": ["series", "debut"]
      }
    });
    const res = await db.find({
      selector: {
        $and: [
          {series: 'Mario'},
          {debut: {$gte: 1982}}
        ]
      },
      fields: ['_id'],
      limit: 1
    });
    res.docs.sort(sortById);
    res.docs.should.deep.equal([{_id: 'luigi'}]);
  });

  it('should work with $and 2, same index limit 2', async () => {
    const db = context.db;
    await db.createIndex({
      "index": {
        "fields": ["series", "debut"]
      }
    });
    const res = await db.find({
      selector: {
        $and: [
          {series: 'Mario'},
          {debut: {$gte: 1982}}
        ]
      },
      fields: ['_id'],
      limit: 2
    });
    res.docs.sort(sortById);
    res.docs.should.deep.equal([{_id: 'luigi'}, {_id: 'yoshi'}]);
  });

  it('should work with $and 3, index/no-index limit 0', async () => {
    const db = context.db;
    await db.createIndex({
      "index": {
        "fields": ["series"]
      }
    });
    await db.createIndex({
      "index": {
        "fields": ["rank"]
      }
    });
    const res = await db.find({
      selector: {
        $and: [
          {series: 'Mario'},
          {debut: {$gte: 1982}}
        ]
      },
      fields: ['_id'],
      limit: 0
    });
    res.docs.sort(sortById);
    res.docs.should.deep.equal([]);
  });

  it('should work with $and 3, index/no-index limit 1', async () => {
    const db = context.db;
    await db.createIndex({
      "index": {
        "fields": ["series"]
      }
    });
    await db.createIndex({
      "index": {
        "fields": ["rank"]
      }
    });
    const res = await db.find({
      selector: {
        $and: [
          {series: 'Mario'},
          {debut: {$gte: 1982}}
        ]
      },
      fields: ['_id'],
      limit: 1
    });
    res.docs.sort(sortById);
    res.docs.should.deep.equal([{_id: 'luigi'}]);
  });

  it('should work with $and 3, index/no-index limit 2', async () => {
    const db = context.db;
    await db.createIndex({
      "index": {
        "fields": ["series"]
      }
    });
    await db.createIndex({
      "index": {
        "fields": ["rank"]
      }
    });
    const res = await db.find({
      selector: {
        $and: [
          {series: 'Mario'},
          {debut: {$gte: 1983}}
        ]
      },
      fields: ['_id'],
      limit: 2
    });
    res.docs.sort(sortById);
    res.docs.should.deep.equal([{_id: 'luigi'}, {_id: 'yoshi'}]);
  });

  it('should work with $and 4, wrong index', async () => {
    const db = context.db;
    await db.createIndex({
      "index": {
        "fields": ["rank"]
      }
    });
    const resp = await db.find({
      selector: {
        $and: [
          {series: 'Mario'},
          {debut: {$gte: 1990}}
        ]
      },
      fields: ['_id'],
      limit: 1
    });
    resp.docs.should.deep.equal([{_id: 'yoshi'}]);
  });

  it('should have default limit of 25', async () => {
    const  extraDocs = Array
      .from({ length: 30 }, (_, i) => ({ name: `Test${i}`, series: 'Test' }));
    await context.db.bulkDocs(extraDocs);

    const { docs } = await context.db.find({
      selector: { series: 'Test' }
    });

    docs.length.should.equal(25);
  });
});
