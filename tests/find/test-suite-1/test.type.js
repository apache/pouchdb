'use strict';

describe('test.type.js', () => {
  const sortById = testUtils.sortById;

  beforeEach(async () => {
    const db = context.db;
    await db.bulkDocs([
      {_id: 'a', foo: 'bar'},
      {_id: 'b', foo: 1},
      {_id: 'c', foo: null},
      {_id: 'd', foo: []},
      {_id: 'e', foo: {}},
      {_id: 'f', foo: false}
    ]);
  });

  it('does null', async () => {
    const db = context.db;
    const res = await db.find({
      selector: {
        'foo': {$type: 'null'}
      },
      fields: ['_id']
    });
    res.docs.sort(sortById);
    res.docs.should.deep.equal([{_id: 'c'}]);
  });

  it('does boolean', async () => {
    const db = context.db;
    const res = await db.find({
      selector: {
        'foo': {$type: 'boolean'}
      },
      fields: ['_id']
    });
    res.docs.sort(sortById);
    res.docs.should.deep.equal([{_id: 'f'}]);
  });

  it('does number', async () => {
    const db = context.db;
    const res = await db.find({
      selector: {
        'foo': {$type: 'number'}
      },
      fields: ['_id']
    });
    res.docs.sort(sortById);
    res.docs.should.deep.equal([{_id: 'b'}]);
  });

  it('does string', async () => {
    const db = context.db;
    const res = await db.find({
      selector: {
        'foo': {$type: 'string'}
      },
      fields: ['_id']
    });
    res.docs.sort(sortById);
    res.docs.should.deep.equal([{_id: 'a'}]);
  });

  it('does array', async () => {
    const db = context.db;
    const res = await db.find({
      selector: {
        'foo': {$type: 'array'}
      },
      fields: ['_id']
    });
    res.docs.sort(sortById);
    res.docs.should.deep.equal([{_id: 'd'}]);
  });

  it('does object', async () => {
    const db = context.db;
    const res = await db.find({
      selector: {
        'foo': {$type: 'object'}
      },
      fields: ['_id']
    });
    res.docs.sort(sortById);
    res.docs.should.deep.equal([{_id: 'e'}]);
  });

  it('should error for unsupported query value', async () => {
    const db = context.db;
    try {
      await db.find({
        selector: {
          'foo': {$type: 'made-up'}
        },
        fields: ['_id']
      });
      throw new Error('Function should throw');
    } catch (err) {
      err.message.should.eq('Query operator $type must be a string. Supported values: "null", "boolean", "number", "string", "array", or "object". Received string: made-up');
    }
  });

  it('should error for non-string query value', async () => {
    const db = context.db;
    try {
      await db.find({
        selector: {
          'foo': {$type: 0}
        },
        fields: ['_id']
      });
      throw new Error('Function should throw');
    } catch (err) {
      err.message.should.eq('Query operator $type must be a string. Supported values: "null", "boolean", "number", "string", "array", or "object". Received number: 0');
    }
  });
});
