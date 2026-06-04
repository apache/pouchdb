'use strict';

describe('test.ltgt.js', () => {
  it('does gt queries', async () => {
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
    const resp = await db.find({
      selector: {foo: {"$gt": "eb"}},
      fields: ["_id", "foo"],
      sort: [{foo: "asc"}]
    });
    resp.docs.should.deep.equal([
      {_id: '3', foo: 'eba'},
      {_id: '2', foo: 'ebb'},
      {_id: '1', foo: 'eyo'}
    ]);
  });

  it('does gt queries exactly', async () => {
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
      { _id: '4', foo: 'abo'},
      { _id: '5', foo: 'eb'},
    ]);
    const resp = await db.find({
      selector: {foo: {"$gt": "eb"}},
      fields: ["_id", "foo"],
      sort: [{foo: "asc"}]
    });
    resp.docs.should.deep.equal([
      {_id: '3', foo: 'eba'},
      {_id: '2', foo: 'ebb'},
      {_id: '1', foo: 'eyo'}
    ]);
  });

  it('does lt queries', async () => {
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
    const resp = await db.find({
      selector: {foo: {"$lt": "eb"}},
      fields: ["_id", "foo"]
    });
    resp.docs.should.deep.equal([{_id: '4', foo: 'abo'}]);
  });

  it('does lt queries exactly', async () => {
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
      { _id: '4', foo: 'abo'},
      { _id: '5', foo: 'eb'},
    ]);
    const resp = await db.find({
      selector: {foo: {"$lt": "eb"}},
      fields: ["_id", "foo"]
    });
    resp.docs.should.deep.equal([{_id: '4', foo: 'abo'}]);
  });

  it('does gte queries', async () => {
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
    const resp = await db.find({
      selector: {foo: {"$gte": "ebb"}},
      fields: ["_id", "foo"],
      sort: [{foo: "asc"}]
    });
    resp.docs.should.deep.equal([
      {_id: '2', foo: 'ebb'},
      {_id: '1', foo: 'eyo'}
    ]);
  });

  it('does lte queries', async () => {
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
    const resp = await db.find({
      selector: {foo: {"$lte": "eba"}},
      fields: ["_id", "foo"],
      sort: [{foo: "asc"}]
    });
    resp.docs.should.deep.equal([
      {_id: '4', foo: 'abo'},
      {_id: '3', foo: 'eba'},
    ]);
  });

  it('#20 - lt queries with sort descending return correct number of docs', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": ["debut"]
      },
      "name": "foo-index",
      "type": "json"
    };

    await db.createIndex(index);
    await db.bulkDocs([
      { _id: '1', debut: 1983},
      { _id: '2', debut: 1981},
      { _id: '3', debut: 1989},
      { _id: '4', debut: 1990}
    ]);
    const resp = await db.find({
      selector: {debut: {$lt: 1990}},
      sort: [{debut: 'desc'}]
    });
    const docs = resp.docs.map((x) => { delete x._rev; return x; });
    docs.should.deep.equal([
      { _id: '3', debut: 1989},
      { _id: '1', debut: 1983},
      { _id: '2', debut: 1981}
    ]);
  });

  it('#41 another complex multifield query', async () => {
    const db = context.db;
    const index = {
      "index": {
        "fields": ["datetime"]
      }
    };

    await db.createIndex(index);
    await db.bulkDocs([
      {_id: '1',
        datetime: 1434054640000,
        glucoseType: 'fasting',
        patientId: 1
      },
      {_id: '2',
        datetime: 1434054650000,
        glucoseType: 'fasting',
        patientId: 1
      },
      {_id: '3',
        datetime: 1434054660000,
        glucoseType: 'fasting',
        patientId: 1
      },
      {_id: '4',
        datetime: 1434054670000,
        glucoseType: 'fasting',
        patientId: 1
      }
    ]);
    const res = await db.find({
      selector: {
        datetime: { "$lt": 1434054660000 },
        glucoseType: { "$eq": 'fasting' },
        patientId: { "$eq": 1 }
      }
    });
    const docs = res.docs.map((x) => { delete x._rev; return x; });
    docs.should.deep.equal([
      {
        "_id": "1",
        "datetime": 1434054640000,
        "glucoseType": "fasting",
        "patientId": 1
      },
      {
        "_id": "2",
        "datetime": 1434054650000,
        "glucoseType": "fasting",
        "patientId": 1
      }
    ]);
  });

  it('does gt queries, desc sort', async () => {
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
    const resp = await db.find({
      selector: {foo: {"$gt": "eb"}},
      fields: ["_id", "foo"],
      sort: [{foo: "desc"}]
    });
    resp.docs.should.deep.equal([
      {_id: '1', foo: 'eyo'},
      {_id: '2', foo: 'ebb'},
      {_id: '3', foo: 'eba'}
    ]);
  });

  it('#38 $gt with dates', async () => {
    const db = context.db;

    const startDate = "2015-05-25T00:00:00.000Z";
    const endDate = "2015-05-26T00:00:00.000Z";

    await db.createIndex({
      index: {
        fields: ['docType', 'logDate']
      }
    });
    await db.bulkDocs([
      {_id: '1', docType: 'log', logDate: "2015-05-24T00:00:00.000Z"},
      {_id: '2', docType: 'log', logDate: "2015-05-25T00:00:00.000Z"},
      {_id: '3', docType: 'log', logDate: "2015-05-26T00:00:00.000Z"},
      {_id: '4', docType: 'log', logDate: "2015-05-27T00:00:00.000Z"}
    ]);
    const result1 = await db.find({
      selector: {docType: 'log'}
    });
    result1.docs.map((x) => { delete x._rev; return x; }).should.deep.equal([
      {
        "_id": "1",
        "docType": "log",
        "logDate": "2015-05-24T00:00:00.000Z"
      },
      {
        "_id": "2",
        "docType": "log",
        "logDate": "2015-05-25T00:00:00.000Z"
      },
      {
        "_id": "3",
        "docType": "log",
        "logDate": "2015-05-26T00:00:00.000Z"
      },
      {
        "_id": "4",
        "docType": "log",
        "logDate": "2015-05-27T00:00:00.000Z"
      }
    ], 'test 1');
    const result2 = await db.find({
      selector: {docType: 'log', logDate: {$gt: startDate}}
    });
    result2.docs.map((x) => { delete x._rev; return x; }).should.deep.equal([
      {
        "_id": "3",
        "docType": "log",
        "logDate": "2015-05-26T00:00:00.000Z"
      },
      {
        "_id": "4",
        "docType": "log",
        "logDate": "2015-05-27T00:00:00.000Z"
      }
    ], 'test 2');
    const result3 = await db.find({
      selector: {docType: 'log', logDate: {$gte: startDate}}
    });
    result3.docs.map((x) => { delete x._rev; return x; }).should.deep.equal([
      {
        "_id": "2",
        "docType": "log",
        "logDate": "2015-05-25T00:00:00.000Z"
      },
      {
        "_id": "3",
        "docType": "log",
        "logDate": "2015-05-26T00:00:00.000Z"
      },
      {
        "_id": "4",
        "docType": "log",
        "logDate": "2015-05-27T00:00:00.000Z"
      }
    ], 'test 3');
    const result4 = await db.find({
      selector: {
        docType: 'log',
        logDate: {$gte: startDate, $lte: endDate}
      }
    });
    result4.docs.map((x) => { delete x._rev; return x; }).should.deep.equal([
      {
        "_id": "2",
        "docType": "log",
        "logDate": "2015-05-25T00:00:00.000Z"
      },
      {
        "_id": "3",
        "docType": "log",
        "logDate": "2015-05-26T00:00:00.000Z"
      }
    ], 'test 4');
  });

  it('$gt on nested field', async () => {
    const db = context.db;
    await db.createIndex({
      name: 'nestedIndex',
      ddoc: 'nestedIndex',
      index: {
          fields: ['nes.ted']
      }
    });
    await db.createIndex({
      name: 'topLevelIndex',
      ddoc: 'topLevelIndex',
      index: {
          fields: ['nr']
      }
    });
    await db.put({
      _id: 'ninetynine',
      nr: 99,
      nes: {
          ted: 99
      }
    });
    await db.put({
      _id: 'hundred',
      nr: 100,
      nes: {
          ted: 100
      }
    });
    await db.put({
      _id: 'hundredOne',
      nr: 101,
      nes: {
          ted: 101
      }
    });
    const topLevelResult = await db.find({
      selector: {
          nr: {
              $gt: 100
          }
      },
      sort: [{ nr: 'asc' }]
    });
    topLevelResult.docs[0].nes.ted.should.equal(101);
    const subLevelResult = await db.find({
      selector: {
          'nes.ted': {
              $gt: 100
          }
      },
      sort: [{ 'nes.ted': 'asc' }]
    });
    subLevelResult.docs[0].nes.ted.should.equal(101);
  });

  it('bunch of equivalent queries', async () => {
    const db = context.db;

    const normalize = (res) => {
      return res.docs.map((x) => {
        return x._id;
      }).sort();
    };

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
    let res;
    res = await db.find({
      selector: { $and: [{foo: {$gt: 2}}, {foo: {$gte: 2}}]}
    });
    normalize(res).should.deep.equal(['3', '4']);
    res = await db.find({
      selector: { $and: [{foo: {$eq: 2}}, {foo: {$gte: 2}}]}
    });
    normalize(res).should.deep.equal(['2']);
    res = await db.find({
      selector: { $and: [{foo: {$eq: 2}}, {foo: {$lte: 2}}]}
    });
    normalize(res).should.deep.equal(['2']);
    res = await db.find({
      selector: { $and: [{foo: {$lte: 3}}, {foo: {$lt: 3}}]}
    });
    normalize(res).should.deep.equal(['1', '2']);
    res = await db.find({
      selector: { $and: [{foo: {$eq: 4}}, {foo: {$gte: 2}}]}
    });
    normalize(res).should.deep.equal(['4']);
    res = await db.find({
      selector: { $and: [{foo: {$lte: 3}}, {foo: {$eq: 1}}]}
    });
    normalize(res).should.deep.equal(['1']);
    res = await db.find({
      selector: { $and: [{foo: {$eq: 4}}, {foo: {$gt: 2}}]}
    });
    normalize(res).should.deep.equal(['4']);
    res = await db.find({
      selector: { $and: [{foo: {$lt: 3}}, {foo: {$eq: 1}}]}
    });
    normalize(res).should.deep.equal(['1']);
  });

  it('bunch of equivalent queries 2', async () => {
    const db = context.db;

    const normalize = (res) => {
      return res.docs.map((x) => {
        return x._id;
      }).sort();
    };

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
    let res;
    res = await db.find({
      selector: { $and: [{foo: {$gt: 2}}, {foo: {$gte: 1}}]}
    });
    normalize(res).should.deep.equal(['3', '4']);
    res = await db.find({
      selector: { $and: [{foo: {$lt: 3}}, {foo: {$lte: 4}}]}
    });
    normalize(res).should.deep.equal(['1', '2']);
    res = await db.find({
      selector: { $and: [{foo: {$gt: 2}}, {foo: {$gte: 3}}]}
    });
    normalize(res).should.deep.equal(['3', '4']);
    res = await db.find({
      selector: { $and: [{foo: {$lt: 3}}, {foo: {$lte: 1}}]}
    });
    normalize(res).should.deep.equal(['1']);
    res = await db.find({
      selector: { $and: [{foo: {$gte: 2}}, {foo: {$gte: 1}}]}
    });
    normalize(res).should.deep.equal(['2', '3', '4']);
    res = await db.find({
      selector: { $and: [{foo: {$lte: 3}}, {foo: {$lte: 4}}]}
    });
    normalize(res).should.deep.equal(['1', '2', '3']);
    res = await db.find({
      selector: { $and: [{foo: {$gt: 2}}, {foo: {$gt: 3}}]}
    });
    normalize(res).should.deep.equal(['4']);
    res = await db.find({
      selector: { $and: [{foo: {$lt: 3}}, {foo: {$lt: 2}}]}
    });
    normalize(res).should.deep.equal(['1']);
  });

  it('bunch of equivalent queries 3', async () => {
    const db = context.db;

    const normalize = (res) => {
      return res.docs.map((x) => {
        return x._id;
      }).sort();
    };

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
    let res;
    res = await db.find({
      selector: { $and: [{foo: {$gte: 1}}, {foo: {$gt: 2}}]}
    });
    normalize(res).should.deep.equal(['3', '4']);
    res = await db.find({
      selector: { $and: [{foo: {$lte: 4}}, {foo: {$lt: 3}}]}
    });
    normalize(res).should.deep.equal(['1', '2']);
    res = await db.find({
      selector: { $and: [{foo: {$gte: 3}}, {foo: {$gt: 2}}]}
    });
    normalize(res).should.deep.equal(['3', '4']);
    res = await db.find({
      selector: { $and: [{foo: {$lte: 1}}, {foo: {$lt: 3}}]}
    });
    normalize(res).should.deep.equal(['1']);
    res = await db.find({
      selector: { $and: [{foo: {$gte: 1}}, {foo: {$gte: 2}}]}
    });
    normalize(res).should.deep.equal(['2', '3', '4']);
    res = await db.find({
      selector: { $and: [{foo: {$lte: 4}}, {foo: {$lte: 3}}]}
    });
    normalize(res).should.deep.equal(['1', '2', '3']);
    res = await db.find({
      selector: { $and: [{foo: {$gt: 3}}, {foo: {$gt: 2}}]}
    });
    normalize(res).should.deep.equal(['4']);
    res = await db.find({
      selector: { $and: [{foo: {$lt: 2}}, {foo: {$lt: 3}}]}
    });
    normalize(res).should.deep.equal(['1']);
  });
});
