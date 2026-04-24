'use strict';

describe('test.pick-fields.js', () => {
  it('should pick shallow fields', async () => {
    const db = context.db;
    await db.bulkDocs([
      { name: 'Mario', _id: 'mario', series: 'Mario', debut: {year: 1981, month: 'May'}  },
      { name: 'Jigglypuff', _id: 'puff', series: 'Pokemon', debut: {year: 1996, month: 'June'} },
      { name: 'Link', _id: 'link', series: 'Zelda', debut: {year: 1986, month: 'July'} },
      { name: 'Donkey Kong', _id: 'dk', series: 'Mario', debut: {year: 1981, month: 'April'} },
      { name: 'Pikachu', series: 'Pokemon', _id: 'pikachu',
        debut: {year: 1996, month: 'September'} },
      { name: 'Captain Falcon', _id: 'falcon', series: 'F-Zero',
        debut: {year: 1990, month: 'December'} }
    ]);
    const res = await db.find({
      selector: {_id: {$gt: null}},
      sort: ['_id'],
      fields: ['name']
    });
    res.docs.should.deep.equal([
      { name: 'Donkey Kong' },
      { name: 'Captain Falcon' },
      { name: 'Link' },
      { name: 'Mario' },
      { name: 'Pikachu' },
      { name: 'Jigglypuff' } ]);
  });

  it('should pick deep fields', async () => {
    const db = context.db;
    await db.bulkDocs([
      {_id: 'a', foo: {bar: 'yo'}, bar: {baz: 'hey'}},
      {_id: 'b', foo: {bar: 'sup'}, bar: {baz: 'dawg'}},
      {_id: 'c', foo: true, bar: "yo"},
      {_id: 'd', foo: null, bar: []}
    ]);
    const res = await db.find({
      selector: {_id: {$gt: null}},
      sort: ['_id'],
      fields: ['_id', 'bar.baz']
    });
    res.docs.should.deep.equal([
      { _id: 'a', bar: { baz: 'hey' } },
      { _id: 'b', bar: { baz: 'dawg' } },
      { _id: 'c' },
      { _id: 'd' } ]);
  });

  it('should pick really deep fields with escape', async () => {
    const db = context.db;
    await db.bulkDocs([
      {_id: 'a', really: {deeply: {nested: {'escaped.field': 'You found me!'}}}}
    ]);
    const res = await db.find({
      selector: {_id: {$gt: null}},
      fields: ['really.deeply.nested.escaped\\.field']
    });
    res.docs.should.deep.equal([
      { really: { deeply: { nested: { 'escaped.field': 'You found me!' } } } }
    ]);
  });
});
