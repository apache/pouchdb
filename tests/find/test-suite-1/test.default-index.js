'use strict';

describe('test.default-index.js', () => {
  it('uses all_docs with warning if no index found simple query 1', async () => {
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
    const resp =  await db.find({
        selector: {
          series: 'mario'
        },
      fields: ["_id"],
    });
    resp.docs.should.deep.equal([
      {_id: 'dk'},
      {_id: 'luigi'},
      {_id: 'mario'},
      {_id: 'yoshi'}
    ]);
  });


  it('uses all_docs with warning if no index found simple query 2', async () => {
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
    const resp =  await db.find({
        selector: {
          debut: {
            $gt: 1992,
            $lte: 1996
          },
          rank: {
            $gte: 3,
            $lte: 8
          }
        },
      fields: ["_id"],
    });
    resp.docs.should.deep.equal([{_id: 'fox'}, {_id: 'puff'}]);
  });

  it('works with complex query', async () => {
    const db = context.db;
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
      },
      fields: ["_id"],
    });
    resp.docs.should.deep.equal([
      { _id: '2'},
      { _id: '3'},
      { _id: '4'}
    ]);
  });

  it('throws an error if a sort is required', async () => {
    const db = context.db;

    await db.bulkDocs([
      { _id: '1', foo: 'eyo'},
      { _id: '2', foo: 'ebb'},
      { _id: '3', foo: 'eba'},
      { _id: '4', foo: 'abo'}
    ]);
    try {
      await db.find({
        selector: {foo: {$ne: "eba"}},
        fields: ["_id", "foo"],
        sort: [{"foo": "asc"}]
      });
      throw new Error('should have thrown an error');
    } catch (err) {
      should.exist(err);
    }
  });

  it.skip('sorts ok if _id used', async () => {
    const db = context.db;

    await db.bulkDocs([
      { _id: '1', foo: 'eyo'},
      { _id: '2', foo: 'ebb'},
      { _id: '3', foo: 'eba'},
      { _id: '4', foo: 'abo'}
    ]);
    const resp = await db.find({
      selector: {foo: {$ne: "eba"}},
      fields: ["_id"],
      sort: ["_id"]
    });
    resp.docs.should.deep.equal([
      { _id: '1'},
      { _id: '2'},
      { _id: '4'}
    ]);
  });
});

it('$in works with default operator', async () => {
  const db = context.db;

  await db.bulkDocs([
    { _id: '1', foo: 'eyo'},
    { _id: '2', foo: 'ebb'},
    { _id: '3', foo: 'eba'},
    { _id: '4', foo: 'abo'}
  ]);
  const resp = await db.find({
    selector: {foo: {$in: ["eba", "ebb"]}},
    fields: ["_id"],
  });
  // console.log(resp);
  // resp.should.deep.equal({
  //   warning: 'No matching index found, create an index to optimize query time.',
  //   docs: [
  //     { _id: '2'},
  //     { _id: '3'}
  //   ]
  // });
  resp.warning.should.be.oneOf(
    [
      'no matching index found, create an index to optimize query time',
      'No matching index found, create an index to optimize query time.'
    ]
  );
  resp.docs.should.deep.equal([
    { _id: '2'},
    { _id: '3'}
  ]);
});

//bug in mango its not sorting this on Foo but actually sorting on _id
it.skip('ne query will work and sort', async () => {
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
    { _id: '1', foo: 4},
    { _id: '2', foo: 3},
    { _id: '3', foo: 2},
    { _id: '4', foo: 1}
  ]);
  const resp = await db.find({
    selector: {foo: {$ne: "eba"}},
    fields: ["_id", "foo"],
    sort: [{foo: "desc"}]
  });
  resp.warning.should.be.oneOf(
    [
      'no matching index found, create an index to optimize query time',
      'No matching index found, create an index to optimize query time.'
    ]
  );
  resp.docs.should.deep.equal(
    [
      { _id: '4' },
      { _id: '2' },
      { _id: '1' }
    ]
  );
});

//need to find out what the correct response for this is
it.skip('$and empty selector returns empty docs', async () => {
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
  const resp = await db.find({
    selector: {
      $and: [{}, {}]
    },
    fields: ['_id']
  });
  resp.warning.should.be.oneOf(
    [
      'no matching index found, create an index to optimize query time',
      'No matching index found, create an index to optimize query time.'
    ]
  );
  resp.docs.should.deep.equal([]);
});

it.skip('empty selector returns empty docs', async () => {
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
  const resp = await db.find({
    selector: {
    },
    fields: ['_id']
  });
  resp.warning.should.be.oneOf(
    [
      'no matching index found, create an index to optimize query time',
      'No matching index found, create an index to optimize query time.'
    ]
  );
  resp.docs.should.deep.equal([
      {_id: '1'},
      {_id: '2'},
      {_id: '3'},
      {_id: '4'}
    ]
  );
});

it('$elemMatch works with no other index', async () => {
  const db = context.db;

  await db.createIndex({
    index: {
      fields: ['foo']
    }
  });
  await db.bulkDocs([
    {_id: '1', foo: [1]},
    {_id: '2', foo: [2]},
    {_id: '3', foo: [3]},
    {_id: '4', foo: [4]}
  ]);
  const resp = await db.find({
    selector: {
      foo: {$elemMatch: {$gte: 3}}
    },
    fields: ['_id']
  });
  resp.docs.should.deep.equal([
    { _id: "3" },
    { _id: "4" }
  ]);
});

it.skip('error - no usable index', async () => {
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
      "selector": {"foo": "$exists"},
      "fields": ["_id", "foo"],
      "sort": [{"bar": "asc"}]
    });
    throw new Error('shouldnt be here');
  } catch (err) {
    should.exist(err);
  }
});

it('handles just regex selector', async () => {
  const db = context.db;
  await db.bulkDocs([
      {_id: '1', foo: 1},
      {_id: '2', foo: 2},
      {_id: '3', foo: 3},
      {_id: '4', foo: 4}
    ]);
    const resp = await db.find({
      selector: {
        _id: {$regex: "1"}
      },
      fields: ['_id']
    });
    resp.docs.should.deep.equal([{ _id: "1" }]);
});

it('handles zero as a valid index value', async () => {
  const db = context.db;
  await db.createIndex({
      index: {
          fields: ['foo']
      }
  });
  await db.bulkDocs([
      {_id: '1', foo: 0},
      {_id: '2', foo: 1},
      {_id: '3', foo: 2},
      {_id: '4', foo: 3}
  ]);
  const resp = await db.find({
      selector: {
          foo: {$eq: 0}
      },
      fields: ['_id']
  });
  resp.docs.should.deep.equal([{_id: "1"}]);
});

it('handles null as a valid index value', async () => {
    const db = context.db;
    await db.createIndex({
        index: {
            fields: ['foo']
        }
    });
    await db.bulkDocs([
        {_id: '1', foo: null},
        {_id: '2', foo: 1},
        {_id: '3', foo: 2},
        {_id: '4', foo: 3}
    ]);
    const resp = await db.find({
        selector: {
            foo: {$eq: null}
        },
        fields: ['_id']
    });
    resp.docs.should.deep.equal([{_id: "1"}]);
});

it('null values are indexed', async () => {
    const db = context.db;
    await db.createIndex({
        index: {
            fields: ['foo']
        }
    });
    await db.bulkDocs([
        {_id: '1', foo: null},
        {_id: '2', foo: 1},
        {_id: '3', foo: 2},
        {_id: '4', foo: 3}
    ]);
    const resp = await db.find({
        selector: {
            foo: {$lt: 2}
        },
        fields: ['_id']
    });
    resp.docs.should.deep.equal([
      {_id: "1"},
      {_id: "2"},
    ]);
});

it('handles booleans as a valid index value', async () => {
    const db = context.db;
    await db.createIndex({
        index: {
            fields: ['foo']
        }
    });
    await db.bulkDocs([
        {_id: '1', foo: true},
        {_id: '2', foo: false},
        {_id: '3', foo: 2},
        {_id: '4', foo: 3}
    ]);
    const resp = await db.find({
        selector: {
            foo: {$eq: true}
        },
        fields: ['_id']
    });
    resp.docs.should.deep.equal([{_id: '1'}]);
});

it('boolean values are indexed', async () => {
    const db = context.db;
    await db.createIndex({
        index: {
            fields: ['foo']
        }
    });
    await db.bulkDocs([
        {_id: '1', foo: true},
        {_id: '2', foo: false},
        {_id: '3', foo: 2},
        {_id: '4', foo: 3}
    ]);
    const resp = await db.find({
        selector: {
            foo: {$lt: 2}
        },
        fields: ['_id']
    });
    resp.docs.should.deep.equal([
      {_id: '2'},
      {_id: '1'}
    ]);
});
