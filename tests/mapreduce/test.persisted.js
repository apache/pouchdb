'use strict';

describe('test.persisted.js', () => {
  const dbType = testUtils.adapterType();
  const dbName = testUtils.adapterUrl(dbType, 'testdb');

  function setTimeoutPromise(time) {
    return new Promise(function (resolve) {
      setTimeout(function () { resolve(true); }, time);
    });
  }

  const createView = async (db, viewObj) => {
    const storableViewObj = {
      map : `${viewObj.map}`
    };
    if (viewObj.reduce) {
      storableViewObj.reduce = `${viewObj.reduce}`;
    }
    await db.put({
      _id: '_design/theViewDoc',
      views: {
        'theView' : storableViewObj
      }
    });
    return 'theViewDoc/theView';
  };

  afterEach(async () => {
    await new PouchDB(dbName).destroy();
  });

  it('Test destroyed event on auxiliary db', async () => {
    const db = new PouchDB(dbName);
    const putNameView = await db.put({
      _id: '_design/name',
      views: {
        name: {
          map: function (doc) {
            emit(doc.name);
          }.toString()
        }
      }
    });
    const nameViewRev = putNameView.rev;

    await db.bulkDocs([
      {_id: 'foo', name: 'foo', title: 'yo'},
      {_id: 'baz', name: 'bar', title: 'hey'},
      {_id: 'bar', name: 'baz', title: 'wuzzup'}
    ]);

    await db.query('name');
    await db.remove('_design/name', nameViewRev);
    await db.viewCleanup();

    const putTitleView = await db.put({
      _id: '_design/title',
      views: {
        title: {
          map: function (doc) {
            emit(doc.title);
          }.toString()
        }
      }
    });
    const titleViewRev = putTitleView.rev;

    await db.query('title');
    await db.remove('_design/title', titleViewRev);
    await db.viewCleanup();

    const views = ['name', 'title'];

    await Promise.all(views.map((view) => {
      return db.query(view).should.be.rejected;
    }));

    await db.put({
      _id: '_design/name',
      views: {
        name: {
          map: function (doc) {
            emit(doc.name);
          }.toString()
        }
      }
    });

    const queryRes = await db.query('name');

    queryRes.rows.map(row => [row.id, row.key]).should.deep.equal([
      ['baz', 'bar'],
      ['bar', 'baz'],
      ['foo', 'foo']
    ]);
  });


  it('Returns ok for viewCleanup on empty db', async () => {
    const db = new PouchDB(dbName);
    const res = await db.viewCleanup();

    res.ok.should.equal(true);
  });

  it('Returns ok for viewCleanup on empty db, callback style', async () => {
    const db = new PouchDB(dbName);
    const res = await new Promise((resolve, reject) => {
      db.viewCleanup((err, res) => {
        if (err)  {return reject(err);}
        resolve(res);
      });
    });

    res.ok.should.equal(true);
  });

  it('Returns ok for viewCleanup after modifying view', async () => {
    const db = new PouchDB(dbName);
    const ddoc = {
      _id: '_design/myview',
      views: {
        myview: {
          map: function (doc) {
            emit(doc.firstName);
          }.toString()
        }
      }
    };
    const doc = {
      _id: 'foo',
      firstName: 'Foobar',
      lastName: 'Bazman'
    };

    const info = await db.bulkDocs({docs: [ddoc, doc]});
    ddoc._rev = info[0].rev;

    const queryRes = await db.query('myview');

    queryRes.rows.should.deep.equal([
      {id: 'foo', key: 'Foobar', value: null}
    ]);

    ddoc.views.myview.map = function (doc) {
      emit(doc.lastName);
    }.toString();

    await db.put(ddoc);
    const queryResAfterMod = await db.query('myview');

    queryResAfterMod.rows.should.deep.equal([
        {id: 'foo', key: 'Bazman', value: null}
      ]);

    await db.viewCleanup();
  });

  it('Return ok for viewCleanup after modding view, old format', async () => {
    const db = new PouchDB(dbName);
    const ddoc = {
      _id: '_design/myddoc',
      views: {
        myview: {
          map: function (doc) {
            emit(doc.firstName);
          }.toString()
        }
      }
    };
    const doc = {
      _id: 'foo',
      firstName: 'Foobar',
      lastName: 'Bazman'
    };
    const info = await db.bulkDocs({docs: [ddoc, doc]});
    ddoc._rev = info[0].rev;

    const queryRes = await db.query('myddoc/myview');

    queryRes.rows.should.deep.equal([
      {id: 'foo', key: 'Foobar', value: null}
    ]);

    ddoc.views.myview.map = function (doc) {
      emit(doc.lastName);
    }.toString();

    await db.put(ddoc);
    const queryResAfterMod = await db.query('myddoc/myview');

    queryResAfterMod.rows.should.deep.equal([
      {id: 'foo', key: 'Bazman', value: null}
    ]);

    return db.viewCleanup();
  });

  it("Query non existing view throws error", async () => {
    const db = new PouchDB(dbName);
    const doc = {
      _id: '_design/barbar',
      views: {
        scores: {
          map: 'function(doc) { if (doc.score) { emit(null, doc.score); } }'
        }
      }
    };
    await db.post(doc);

    await db.query('barbar/dontExist', {key: 'bar'}).should.be.rejected;
  });

  it("Query non-string view throws error", async () => {
    const db = new PouchDB(dbName);
    const doc = {
      _id: '_design/barbar',
      views: {
        scores: {
          map: 1
        }
      }
    };

    try {
      await db.post(doc);
      await db.query('barbar/scores', {key: 'bar'});
    } catch (err) {
      err.message.should.include('string');
    }
  });

  it('many simultaneous persisted views', async () => {
    const db = new PouchDB(dbName);

    const views = [];
    const doc = {_id: 'foo'};
    for (let i = 0; i < 20; i++) {
      views.push('foo_' + i);
      doc['foo_' + i] = 'bar_' + i;
    }
    await db.put(doc);

    await Promise.all(views.map(async (_, i) => {
      const fun = "function (doc) { emit(doc.foo_" + i + ");}";

      const ddocId = 'theViewDoc_' + i;
      const ddoc = {
        _id: '_design/' + ddocId,
        views: {
          theView : {map: fun}
        }
      };

      const putRes = await db.put(ddoc);
      ddoc._rev = putRes.rev;
      const queryRes = await db.query(ddocId + '/theView');

      queryRes.rows.should.have.length(1);
      queryRes.rows[0].key.should.equal('bar_' + i);
      queryRes.rows[0].id.should.equal('foo');

      await db.remove(ddoc);
      await db.viewCleanup();

      await db.query(ddocId + '/theView').should.be.rejected;
    }));
  }).timeout(120000);

  //ToDo: rm done but keep callback
  it('should error with a callback', function (done) {
    const db = new PouchDB(dbName);
    db.query('fake/thing', function (err) {
      should.exist(err);
      done();
    });
  });

  it('should query correctly when stale', async () => {
    const db = new PouchDB(dbName);
    const queryFun = await createView(db, {
      map : function (doc) {
        emit(doc.name);
      }
    });

    await db.bulkDocs({docs : [
      {name : 'bar', _id : '1'},
      {name : 'foo', _id : '2'}
    ]});

    const resStaleOk = await db.query(queryFun, {stale : 'ok'});

    resStaleOk.total_rows.should.be.within(0, 2);
    resStaleOk.offset.should.equal(0);
    resStaleOk.rows.length.should.be.within(0, 2);

    const resStaleUpdateAfter = await db.query(queryFun, {stale : 'update_after'});

    resStaleUpdateAfter.total_rows.should.be.within(0, 2);
    resStaleUpdateAfter.rows.length.should.be.within(0, 2);

    await setTimeoutPromise(50);
    const resUpdated = await db.query(queryFun, {stale : 'ok'});

    resUpdated.total_rows.should.equal(2);
    resUpdated.rows.length.should.equal(2);

    const doc2 = await db.get('2');
    await db.remove(doc2);
    const resStaleOkRemovedDoc = await db.query(queryFun, {stale : 'ok', include_docs : true});

    resStaleOkRemovedDoc.total_rows.should.be.within(1, 2);
    resStaleOkRemovedDoc.rows.length.should.be.within(1, 2);
    if (resStaleOkRemovedDoc.rows.length === 2) {
      resStaleOkRemovedDoc.rows[1].key.should.equal('foo');
      should.not.exist(resStaleOkRemovedDoc.rows[1].doc,
                        'should not throw if doc removed');
    }

    const resNotStale = await db.query(queryFun);

    resNotStale.total_rows.should.equal(1, 'equals1-1');
    resNotStale.rows.length.should.equal(1, 'equals1-2');

    const doc1 = await db.get('1');
    doc1.name = 'baz';
    await db.post(doc1);

    const resUpdateAfterUpdatedDoc1 = await db.query(queryFun, {stale : 'update_after'});

    resUpdateAfterUpdatedDoc1.rows.length.should.equal(1);
    ['baz', 'bar'].indexOf(resUpdateAfterUpdatedDoc1.rows[0].key).should.be
      .above(-1, 'key might be stale, thats ok');
    await setTimeoutPromise(1000);

    const resUpdatedDoc1 = await db.query(queryFun, {stale : 'ok'});

    resUpdatedDoc1.rows.length.should.equal(1);
    resUpdatedDoc1.rows[0].key.should.equal('baz');
  });

  it('should query correctly with stale update_after', async () => {
    const db = new PouchDB(dbName);

    const queryFun = await createView(db, {map: function (doc) {
      emit(doc.foo);
    }});

    const docs = [];
    for (let i = 0; i < 10; i++) {
      docs.push({foo: 'bar'});
    }
    await db.bulkDocs(docs);

    const resUpdateAfter = await db.query(queryFun, {stale: 'update_after'});

    resUpdateAfter.rows.should.have.length(0, 'query() returned immediately');

    await setTimeoutPromise(1000);
    const resUpdated = await db.query(queryFun, {stale: 'ok'});

    resUpdated.rows.should.have.length(10, 'index was built in background');
  });

  it('should delete duplicate indexes', async () => {
    const db = new PouchDB(dbName);

    const docs = [];
    for (let i = 0; i < 10; i++) {
      docs.push(
        {
          _id : '_design/view' + i,
          views : {
            view : {
              map : "function(doc){emit('foo');}"
            }
          }
        }
      );
    }
    const responses = await db.bulkDocs({docs});

    await Promise.all(docs.map((doc, i) => {
      docs[i]._rev = responses[i].rev;
      return db.query('view' + i + '/view');
    }));

    docs.forEach(doc  => doc._deleted = true);
    await db.bulkDocs({docs});
    await db.viewCleanup();
  });

  if (dbType === 'local' &&
      // can't test this in Node due to the vm
      (typeof process === 'undefined' || process.browser)) {
    it('issue 4967 map() called twice', async () => {
      const db = new PouchDB(dbName);

      const globalObj = (typeof process !== 'undefined' && !process.browser) ?
        global : window;
      globalObj.__mapreduce_called = {};

      const docs = Array.from({length: 5}, (_, i) => ({
          _id: 'doc_' + i,
          data: Math.random().toString(36).slice(2)
        })).concat({
        _id: '_design/test',
        views: {
          test: {
            map: (function (doc) {
              /* global __mapreduce_called */
              __mapreduce_called[doc._id] = __mapreduce_called[doc._id] || 0;
              __mapreduce_called[doc._id]++;
              emit(doc.data, 1);
            }).toString()
          }
        }
      });
      await db.bulkDocs(docs);

      await Promise.all([
        db.query('test', {}),
        db.query('test', {})
      ]);

      globalObj.__mapreduce_called.should.deep.equal({
        doc_0 : 1,
        doc_1 : 1,
        doc_2 : 1,
        doc_3 : 1,
        doc_4 : 1
      });

      delete globalObj.__mapreduce_called;
    });
  }

  it('test docs with reserved IDs', function () {
    const db = new PouchDB(dbName);

    const docs = [
      {_id: 'constructor'},
      {_id: 'isPrototypeOf'},
      {_id: 'hasOwnProperty'},
      {
        _id : '_design/view',
        views : {
          view : {
            map : "function(doc){emit(doc._id);}"
          }
        }
      }
    ];
    return db.bulkDocs(docs).then(function () {
      return db.query('view/view', {include_docs: true});
    }).then(function (res) {
      const rows = res.rows.map(function (row) {
        return {
          id: row.id,
          key: row.key,
          docId: row.doc._id
        };
      });
      assert.deepEqual(rows, [
        { "id": "constructor",
          "key": "constructor",
          "docId": "constructor"
        },
        {
          "id": "hasOwnProperty",
          "key": "hasOwnProperty",
          "docId": "hasOwnProperty"
        },
        {
          "id": "isPrototypeOf",
          "key": "isPrototypeOf",
          "docId": "isPrototypeOf"
        }
      ]);
      return db.viewCleanup();
    }).then(function () {
      return db.get('_design/view');
    }).then(function (doc) {
      return db.remove(doc);
    }).then(function () {
      return db.viewCleanup();
    });
  });

  it('should handle user errors in design doc names', function () {
    const db = new PouchDB(dbName);
    return db.put({
      _id : '_design/theViewDoc'
    }).then(function () {
      return db.query('foo/bar');
    }).then(function (res) {
      should.not.exist(res);
    }).catch(function (err) {
      err.status.should.equal(404);
      return db.put(
        {_id : '_design/void', views : {1 : null}}
      ).then(function () {
        return db.query('void/1');
      }).then(function (res) {
        should.not.exist(res);
      }).catch(function (err) {
        err.status.should.be.a('number');
        // this might throw due to erroneous ddoc, but that's ok
        return db.viewCleanup().catch(function (err) {
          err.status.should.equal(500);
        });
      });
    });
  });

  it('should allow the user to create many design docs', function () {
    function getKey(row) {
      return row.key;
    }
    const db = new PouchDB(dbName);
    return db.put({
      _id : '_design/foo',
      views : {
        byId : { map : function (doc) { emit(doc._id); }.toString()},
        byField : { map : function (doc) { emit(doc.field); }.toString()}
      }
    }).then(function () {
      return db.put({_id : 'myDoc', field : 'myField'});
    }).then(function () {
      return db.query('foo/byId');
    }).then(function (res) {
      res.rows.map(getKey).should.deep.equal(['myDoc']);
      return db.put({
        _id : '_design/bar',
        views : {
          byId : {map : function (doc) { emit(doc._id); }.toString()}
        }
      });
    }).then(function () {
      return db.query('bar/byId');
    }).then(function (res) {
      res.rows.map(getKey).should.deep.equal(['myDoc']);
    }).then(function () {
      return db.viewCleanup();
    }).then(function () {
      return db.query('foo/byId');
    }).then(function (res) {
      res.rows.map(getKey).should.deep.equal(['myDoc']);
      return db.query('foo/byField');
    }).then(function (res) {
      res.rows.map(getKey).should.deep.equal(['myField']);
      return db.query('bar/byId');
    }).then(function (res) {
      res.rows.map(getKey).should.deep.equal(['myDoc']);
      return db.get('_design/bar');
    }).then(function (barDoc) {
      return db.remove(barDoc);
    }).then(function () {
      return db.get('_design/foo');
    }).then(function (fooDoc) {
      delete fooDoc.views.byField;
      return db.put(fooDoc);
    }).then(function () {
      return db.query('foo/byId');
    }).then(function (res) {
      res.rows.map(getKey).should.deep.equal(['myDoc']);
      return db.viewCleanup();
    }).then(function () {
      return db.query('foo/byId');
    }).then(function (res) {
      res.rows.map(getKey).should.deep.equal(['myDoc']);
      return db.query('foo/byField').then(function (res) {
        should.not.exist(res);
      }).catch(function (err) {
        err.status.should.equal(404);
        return db.query('bar/byId').then(function (res) {
          should.not.exist(res);
        }).catch(function (err) {
          err.status.should.equal(404);
          return db.get('_design/foo').then(function (fooDoc) {
            return db.remove(fooDoc).then(function () {
              return db.viewCleanup();
            });
          });
        });
      });
    });
  });

  it('should allow view names without slashes', function () {
    let ddocRev;
    const db = new PouchDB(dbName);
    return db.put({
      _id : '_design/foo',
      views : {
        foo : { map : function (doc) { emit(doc._id); }.toString()}
      }
    }).then(function (info) {
      ddocRev = info.rev;
      return db.bulkDocs({docs : [{_id : 'baz'}, {_id : 'bar'}]});
    }).then(function () {
      return db.query('foo');
    }).then(function (res) {
      res.rows[0].key.should.equal('bar');
      res.rows[1].key.should.equal('baz');
      return db.remove({_id : '_design/foo', _rev : ddocRev});
    });
  });

  it('test 304s in Safari (issue 69)', function () {
    const db = new PouchDB(dbName);
    return createView(db, {
      map : function (doc) {
        emit(doc.name);
      }
    }).then(function (queryFun) {
      return db.bulkDocs({docs : [
        {name : 'foo'}
      ]}).then(function () {
        return db.query(queryFun, {keys : ['foo']});
      }).then(function (res) {
        res.rows.should.have.length(1);
        return db.query(queryFun, {keys : ['foo']});
      }).then(function (res) {
        res.rows.should.have.length(1);
        return db.query(queryFun, {keys : ['foo']});
      }).then(function (res) {
        res.rows.should.have.length(1);
      });
    });
  });

  const isNode = typeof window === 'undefined';
  if (dbType === 'local' && isNode) {
    it('#239 test memdown db', function () {
      const destroyedDBs = [];
      PouchDB.on('destroyed', function (db) {
        destroyedDBs.push(db);
      });

      // make sure prefixed DBs are tied to regular DBs
      const db = new PouchDB(dbName, {db: require('memdown')});
      return testUtils.fin(createView(db, {
        map: function (doc) {
          emit(doc.name);
        }
      }).then(function (queryFun) {
        return db.post({name: 'foo'}).then(function () {
          return db.query(queryFun);
        }).then(function (res) {
          res.rows.should.have.length(1);
          res.rows[0].key.should.equal('foo');
          const ddocId = '_design/' + queryFun.split('/')[0];
          return db.get(ddocId);
        }).then(function (ddoc) {
          return db.remove(ddoc);
        }).then(function () {
          return db.viewCleanup();
        });
      }), function () {
        return db.destroy().then(function () {
          let chain = Promise.resolve();
          // for each of the supposedly destroyed DBs,
          // check that there isn't a normal DB hanging around
          destroyedDBs.forEach(function (dbName) {
            chain = chain.then(function () {
              const db = new PouchDB(dbName);
              const promise = db.info().then(function (info) {
                info.update_seq.should.equal(0);
              });
              return testUtils.fin(promise, function () {
                return db.destroy();
              });
            });
          });
          return chain;
        }).then(function () {
          PouchDB.removeAllListeners('destroyed');
        });
      });
    });

    it('#239 test prefixed db', function () {
      const destroyedDBs = [];
      PouchDB.on('destroyed', function (db) {
        destroyedDBs.push(db);
      });

      // make sure prefixed DBs are tied to regular DBs
      require('fs').mkdirSync('./myprefix_./tmp/', { recursive:true }); // TODO: bit hacky
      const db = new PouchDB(dbName, {prefix: './myprefix_'});
      return testUtils.fin(createView(db, {
        map: function (doc) {
          emit(doc.name);
        }
      }).then(function (queryFun) {
        return db.post({name: 'foo'}).then(function () {
          return db.query(queryFun);
        }).then(function (res) {
          res.rows.should.have.length(1);
          res.rows[0].key.should.equal('foo');
          const ddocId = '_design/' + queryFun.split('/')[0];
          return db.get(ddocId);
        }).then(function (ddoc) {
          return db.remove(ddoc);
        }).then(function () {
          return db.viewCleanup();
        });
      }), function () {
        return db.destroy().then(function () {
          let chain = Promise.resolve();
          // for each of the supposedly destroyed DBs,
          // check that there isn't a normal DB hanging around
          destroyedDBs.forEach(function (dbName) {
            chain = chain.then(function () {
              const db = new PouchDB(dbName);
              const promise = db.info().then(function (info) {
                info.update_seq.should.equal(0);
              });
              return testUtils.fin(promise, function () {
                return db.destroy();
              });
            });
          });
          return chain;
        }).then(function () {
          PouchDB.removeAllListeners('destroyed');
        });
      });
    });
  }
});
