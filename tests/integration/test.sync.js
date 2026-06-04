'use strict';

const adapters = [
  ['local', 'http'],
  ['http', 'http'],
  ['http', 'local'],
  ['local', 'local']
];

adapters.forEach((adapters) => {
  describe(`test.sync.js-${adapters[0]}-${adapters[1]}`, () => {

    const dbs = {};

    beforeEach(() => {
      dbs.name = testUtils.adapterUrl(adapters[0], 'testdb');
      dbs.remote = testUtils.adapterUrl(adapters[1], 'test_repl_remote');
    });

    afterEach((done) => {
      testUtils.cleanup([dbs.name, dbs.remote], done);
    });

    it('PouchDB.sync event', async () => {
      const doc1 = {
          _id: 'adoc',
          foo: 'bar'
        };
      const doc2 = {
          _id: 'anotherdoc',
          foo: 'baz'
        };
      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);
      await db.put(doc1);
      await remote.put(doc2);
      const result = await PouchDB.sync(db, remote);
      result.pull.ok.should.equal(true);
      result.pull.docs_read.should.equal(1);
      result.pull.docs_written.should.equal(1);
      result.pull.errors.should.have.length(0);
    });

    it('sync throws errors in promise', async () => {
      const doc1 = {
        _id: 'adoc',
        foo: 'bar'
      };
      const doc2 = {
        _id: 'anotherdoc',
        foo: 'baz'
      };
      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);

      // intentionally throw an error during replication
      remote.bulkGet = () => Promise.reject(new Error('flunking you'));

      await db.put(doc1);
      await remote.put(doc2);
      try {
        await db.sync(remote);
        throw new Error('expected an error');
      } catch (err) {
        if (err.message === 'expected an error') {
          throw err;
        }
        should.exist(err);
        err.should.be.instanceof(Error);
      }
    });

    it('sync throws errors in promise catch()', async () => {
      const doc1 = {
        _id: 'adoc',
        foo: 'bar'
      };
      const doc2 = {
        _id: 'anotherdoc',
        foo: 'baz'
      };
      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);

      // intentionally throw an error during replication
      remote.bulkGet = () => Promise.reject(new Error('flunking you'));

      let landedInCatch = false;
      await db.put(doc1);
      await remote.put(doc2);
      try {
        await db.sync(remote);
      } catch (err) {
        landedInCatch = true;
        should.exist(err);
        err.should.be.instanceof(Error);
      }
      if (!landedInCatch) {
        throw new Error('expected catch(), not then()');
      }
    });

    it('sync throws errors in error listener', async () => {
      const doc1 = {
        _id: 'adoc',
        foo: 'bar'
      };
      const doc2 = {
        _id: 'anotherdoc',
        foo: 'baz'
      };
      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);

      // intentionally throw an error during replication
      remote.bulkGet = () => Promise.reject(new Error('flunking you'));

      await db.put(doc1);
      await remote.put(doc2);
      const err = await new Promise((resolve) => {
        db.sync(remote).on('error', resolve);
      });
      should.exist(err);
      err.should.be.instanceof(Error);
    });

    it('sync throws errors in callback', async () => {
      const doc1 = {
        _id: 'adoc',
        foo: 'bar'
      };
      const doc2 = {
        _id: 'anotherdoc',
        foo: 'baz'
      };
      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);

      // intentionally throw an error during replication
      remote.bulkGet = () => Promise.reject(new Error('flunking you'));

      await db.put(doc1);
      await remote.put(doc2);
      const err = await new Promise((resolve) => {
        db.sync(remote, (err) => {
          resolve(err);
        }).catch(() => {
          // avoid annoying chrome warning about uncaught (in promise)
        });
      });
      should.exist(err);
      err.should.be.instanceof(Error);
    });

    it('sync returns result in callback', async () => {
      const doc1 = {
        _id: 'adoc',
        foo: 'bar'
      };
      const doc2 = {
        _id: 'anotherdoc',
        foo: 'baz'
      };
      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);

      await db.put(doc1);
      await remote.put(doc2);
      const res = await new Promise((resolve, reject) => {
        db.sync(remote, (err, res) => {
          if (err) {
            return reject(err);
          }
          resolve(res);
        });
      });
      should.exist(res);
    });

    it('PouchDB.sync callback', async () => {
      const doc1 = {
          _id: 'adoc',
          foo: 'bar'
        };
      const doc2 = {
          _id: 'anotherdoc',
          foo: 'baz'
        };
      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);
      await db.put(doc1);
      await remote.put(doc2);
      const result = await new Promise((resolve) => {
        PouchDB.sync(db, remote, (err, result) => {
          resolve(result);
        });
      });
      result.pull.ok.should.equal(true);
      result.pull.docs_read.should.equal(1);
      result.pull.docs_written.should.equal(1);
      result.pull.errors.should.have.length(0);
    });

    it('PouchDB.sync promise', async () => {
      const doc1 = {
          _id: 'adoc',
          foo: 'bar'
        };
      const doc2 = {
          _id: 'anotherdoc',
          foo: 'baz'
        };
      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);
      await db.put(doc1);
      await remote.put(doc2);
      const result = await PouchDB.sync(db, remote);
      result.pull.ok.should.equal(true);
      result.pull.docs_read.should.equal(1);
      result.pull.docs_written.should.equal(1);
      result.pull.errors.should.have.length(0);
    });

    it('db.sync event', async () => {
      const doc1 = {
          _id: 'adoc',
          foo: 'bar'
        };
      const doc2 = {
          _id: 'anotherdoc',
          foo: 'baz'
        };
      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);
      await db.put(doc1);
      await remote.put(doc2);
      const result = await db.sync(remote);
      result.pull.ok.should.equal(true);
      result.pull.docs_read.should.equal(1);
      result.pull.docs_written.should.equal(1);
      result.pull.errors.should.have.length(0);
    });

    it('db.sync callback', async () => {
      const doc1 = {
          _id: 'adoc',
          foo: 'bar'
        };
      const doc2 = {
          _id: 'anotherdoc',
          foo: 'baz'
        };
      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);
      await db.put(doc1);
      await remote.put(doc2);
      const result = await new Promise((resolve) => {
        db.sync(remote, (err, result) => {
          resolve(result);
        });
      });
      result.pull.ok.should.equal(true);
      result.pull.docs_read.should.equal(1);
      result.pull.docs_written.should.equal(1);
      result.pull.errors.should.have.length(0);
    });

    it('db.sync promise', async () => {
      const doc1 = {
          _id: 'adoc',
          foo: 'bar'
        };
      const doc2 = {
          _id: 'anotherdoc',
          foo: 'baz'
        };
      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);
      await db.put(doc1);
      await remote.put(doc2);
      const result = await db.sync(remote);
      result.pull.ok.should.equal(true);
      result.pull.docs_read.should.equal(1);
      result.pull.docs_written.should.equal(1);
      result.pull.errors.should.have.length(0);
    });

    it.skip('Test sync cancel', async () => {
      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);
      await new Promise((resolve) => {
        const replications = db.sync(remote).on('complete', resolve);
        should.exist(replications);
        replications.cancel();
      });
    });

    it.skip('Test sync cancel called twice', async () => {
      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);
      await new Promise((resolve) => {
        const replications = db.sync(remote).on('complete', () => {
          setTimeout(resolve); // let cancel() get called twice before finishing
        });
        should.exist(replications);
        replications.cancel();
        replications.cancel();
      });
    });

    it('Test syncing two endpoints (issue 838)', async () => {
      const doc1 = {
          _id: 'adoc',
          foo: 'bar'
        };
      const doc2 = {
          _id: 'anotherdoc',
          foo: 'baz'
        };
      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);
      await db.put(doc1);
      await remote.put(doc2);
      await new Promise((resolve, reject) => {
        db.sync(remote).on('complete', resolve).on('error', reject);
      });
      // Replication isn't finished until onComplete has been called twice
      const res1 = await db.allDocs();
      const res2 = await remote.allDocs();
      res1.total_rows.should.equal(res2.total_rows);
    });

    it.skip('3894 re-sync after immediate cancel', async () => {

      let db = new PouchDB(dbs.name);
      let remote = new PouchDB(dbs.remote);

      db.setMaxListeners(100);
      remote.setMaxListeners(100);

      const syncThenCancel = async () => {
        db = new PouchDB(dbs.name);
        remote = new PouchDB(dbs.remote);
        await new Promise((resolve, reject) => {
          const sync = db.sync(remote)
            .on('error', reject)
            .on('complete', resolve);
          sync.cancel();
        });
        await Promise.all([
          db.destroy(),
          remote.destroy()
        ]);
      };

      for (let i = 0; i < 5; i++) {
        await syncThenCancel();
      }
    });

    it('Syncing should stop if one replication fails (issue 838)',
      async () => {
      const doc1 = {_id: 'adoc', foo: 'bar'};
      const doc2 = {_id: 'anotherdoc', foo: 'baz'};
      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);
      const replications = db.sync(remote, {live: true});

      let changes = 0;
      replications.on('change', () => {
        changes++;
        if (changes === 1) {
          replications.pull.cancel();
        }
      });

      db.put(doc1);

      await new Promise((resolve) => {
        replications.on('complete', async () => {
          await remote.put(doc2);
          changes.should.equal(1);
          resolve();
        });
      });
    });

    it('Push and pull changes both fire (issue 2555)', async () => {
      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);
      let correct = false;
      await db.post({});
      await remote.post({});

      let numChanges = 0;
      let lastChange;
      const sync = db.sync(remote);

      await new Promise((resolve) => {
        sync.on('change', (change) => {
          ['push', 'pull'].should.contain(change.direction);
          change.change.docs_read.should.equal(1);
          change.change.docs_written.should.equal(1);
          if (!lastChange) {
            lastChange = change.direction;
          } else {
            lastChange.should.not.equal(change.direction);
          }
          if (++numChanges === 2) {
            correct = true;
            sync.cancel();
          }
        }).on('complete', () => {
          correct.should.equal(true, 'things happened right');
          resolve();
        });
      });
    });

    it('Change event should be called exactly once per listener (issue 5479)', async () => {
      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);
      await db.post({});

      let counter = 0;
      const sync = db.sync(remote);
      const increaseCounter = () => {
        counter++;
      };

      await new Promise((resolve) => {
        sync.on('change', increaseCounter)
            .on('change', increaseCounter)
            .on('complete', () => {
              counter.should.equal(2);
              resolve();
            });
      });
    });

    it('Remove an event listener', async () => {
      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);

      await db.bulkDocs([{}, {}, {}]);
      await remote.bulkDocs([{}, {}, {}]);

      let changeCalled = false;
      const changesCallback = () => {
        changeCalled = true;
      };

      const sync = db.replicate.to(remote);
      sync.on('change', changesCallback);
      sync.removeListener('change', changesCallback);
      sync.on('error', () => {});

      await new Promise((resolve) => {
        sync.on('complete', () => {
          setTimeout(() => {
            Object.keys(sync._events).should.have.length(0);
            changeCalled.should.equal(false);
            resolve();
          });
        });
      });
    });

    it('Remove an invalid event listener', async () => {
      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);

      await db.bulkDocs([{}, {}, {}]);
      await remote.bulkDocs([{}, {}, {}]);

      const otherCallback = () => {};
      let changeCalled = false;
      const realCallback = () => {
        changeCalled = true;
      };

      const sync = db.replicate.to(remote);
      sync.on('change', realCallback);
      sync.removeListener('change', otherCallback);
      sync.on('error', () => {});

      await new Promise((resolve) => {
        sync.on('complete', () => {
          setTimeout(() => {
            Object.keys(sync._events).should.have.length(0);
            changeCalled.should.equal(true);
            resolve();
          });
        });
      });
    });

    it('Doesn\'t have a memory leak (push)', async () => {
      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);

      await db.bulkDocs([{}, {}, {}]);
      await remote.bulkDocs([{}, {}, {}]);

      const sync = db.replicate.to(remote);
      sync.on('change', () => {});
      sync.on('error', () => {});

      await new Promise((resolve) => {
        sync.on('complete', () => {
          setTimeout(() => {
            Object.keys(sync._events).should.have.length(0);
            resolve();
          });
        });
      });
    });

    it('Doesn\'t have a memory leak (pull)', async () => {
      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);

      await db.bulkDocs([{}, {}, {}]);
      await remote.bulkDocs([{}, {}, {}]);

      const sync = db.replicate.from(remote);
      sync.on('change', () => {});
      sync.on('error', () => {});

      await new Promise((resolve) => {
        sync.on('complete', () => {
          setTimeout(() => {
            Object.keys(sync._events).should.have.length(0);
            resolve();
          });
        });
      });
    });

    it('Doesn\'t have a memory leak (bi)', async () => {
      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);

      await db.bulkDocs([{}, {}, {}]);
      await remote.bulkDocs([{}, {}, {}]);

      const sync = db.sync(remote);
      sync.on('change', () => {});
      sync.on('error', () => {});

      await new Promise((resolve) => {
        sync.on('complete', () => {
          setTimeout(() => {
            Object.keys(sync._events).should.have.length(0);
            resolve();
          });
        });
      });
    });

    it('PouchDB.sync with strings for dbs', async () => {
      const doc1 = {
          _id: 'adoc',
          foo: 'bar'
        };
      const doc2 = {
          _id: 'anotherdoc',
          foo: 'baz'
        };
      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);
      await db.put(doc1);
      await remote.put(doc2);
      const result = await PouchDB.sync(dbs.name, dbs.remote);
      result.pull.ok.should.equal(true);
      result.pull.docs_read.should.equal(1);
      result.pull.docs_written.should.equal(1);
      result.pull.errors.should.have.length(0);
    });

    it('#3270 triggers "denied" events',
        async () => {
      const isCouchDB = await new Promise((resolve) => testUtils.isCouchDB(resolve));
      if (/*adapters[1] !== 'http' || */!isCouchDB) {
        return;
      }
      if (adapters[0] !== 'local' || adapters[1] !== 'http') {
        return;
      }

      const deniedErrors = [];
      const ddoc = {
        "_id": "_design/validate",
        "validate_doc_update": function (newDoc) {
          if (newDoc.foo) {
            throw { unauthorized: 'go away, no picture' };
          }
        }.toString()
      };

      const remote = new PouchDB(dbs.remote);
      const db = new PouchDB(dbs.name);

      await remote.put(ddoc);
      const docs = [
        {_id: 'foo1', foo: 'string'},
        {_id: 'nofoo'},
        {_id: 'foo2', foo: 'object'}
      ];
      await db.bulkDocs({docs});
      const sync = db.sync(dbs.remote);
      sync.on('denied', (error) => {
        deniedErrors.push(error);
      });
      await sync;
      deniedErrors.length.should.equal(2);
      deniedErrors[0].doc.name.should.equal('unauthorized');
      deniedErrors[1].doc.name.should.equal('unauthorized');
      deniedErrors[0].direction.should.equal('push');
    });

    it('#3270 triggers "denied" events, reverse direction',
      async () => {
        const isCouchDB = await new Promise((resolve) => testUtils.isCouchDB(resolve));
        if (/*adapters[1] !== 'http' || */!isCouchDB) {
          return;
        }
        if (adapters[0] !== 'local' || adapters[1] !== 'http') {
          return;
        }

        const deniedErrors = [];
        const ddoc = {
          "_id": "_design/validate",
          "validate_doc_update": function (newDoc) {
            if (newDoc.foo) {
              throw { unauthorized: 'go away, no picture' };
            }
          }.toString()
        };

        const remote = new PouchDB(dbs.remote);
        const db = new PouchDB(dbs.name);

        await remote.put(ddoc);
        const docs = [
          {_id: 'foo1', foo: 'string'},
          {_id: 'nofoo'},
          {_id: 'foo2', foo: 'object'}
        ];
        await db.bulkDocs({docs});
        const sync = remote.sync(db);
        sync.on('denied', (error) => {
          deniedErrors.push(error);
        });
        await sync;
        deniedErrors.length.should.equal(2);
        deniedErrors[0].doc.name.should.equal('unauthorized');
        deniedErrors[1].doc.name.should.equal('unauthorized');
        deniedErrors[0].direction.should.equal('pull');
      });

    it('#3270 triggers "change" events with .docs property', async () => {
      let syncedDocs = [];
      const db = new PouchDB(dbs.name);
      const docs = [
        {_id: '1'},
        {_id: '2'},
        {_id: '3'}
      ];

      await db.bulkDocs({ docs }, {});
      const sync = db.sync(dbs.remote);
      sync.on('change', (change) => {
        syncedDocs = syncedDocs.concat(change.change.docs);
      });
      await sync;

      syncedDocs.sort((a, b) => a._id > b._id ? 1 : -1);

      syncedDocs.length.should.equal(3);
      syncedDocs[0]._id.should.equal('1');
      syncedDocs[1]._id.should.equal('2');
      syncedDocs[2]._id.should.equal('3');
    });

    it('4791 Single filter', async () => {

      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);

      const localDocs = [{_id: '0'}, {_id: '1'}];
      const remoteDocs = [{_id: 'a'}, {_id: 'b'}];

      await remote.bulkDocs(remoteDocs);
      await db.bulkDocs(localDocs);
      await db.sync(remote, {
        filter: (doc) => doc._id !== '0' && doc._id !== 'a'
      });
      const localResult = await db.allDocs();
      localResult.total_rows.should.equal(3);
      const remoteResult = await remote.allDocs();
      remoteResult.total_rows.should.equal(3);
    });


    it('4791 Single filter, live/retry', async () => {

      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);

      const localDocs = [{_id: '0'}, {_id: '1'}];
      const remoteDocs = [{_id: 'a'}, {_id: 'b'}];

      await remote.bulkDocs(remoteDocs);
      await db.bulkDocs(localDocs);
      await new Promise((resolve, reject) => {
        const filter = (doc) => doc._id !== '0' && doc._id !== 'a';
        let changes = 0;
        const onChange = (c) => {
          changes += c.change.docs.length;
          if (changes === 2) {
            sync.cancel();
          }
        };
        const sync = db.sync(remote, {filter, live: true, retry: true})
          .on('error', reject)
          .on('change', onChange)
          .on('complete', resolve);
      });
      const localResult = await db.allDocs();
      localResult.total_rows.should.equal(3);
      const remoteResult = await remote.allDocs();
      remoteResult.total_rows.should.equal(3);
    });

    it('4289 Separate to / from filters', async () => {

      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);

      const localDocs = [{_id: '0'}, {_id: '1'}];
      const remoteDocs = [{_id: 'a'}, {_id: 'b'}];

      await remote.bulkDocs(remoteDocs);
      await db.bulkDocs(localDocs);
      await db.sync(remote, {
        push: {filter: (doc) => doc._id === '0'},
        pull: {filter: (doc) => doc._id === 'a'}
      });
      const localResult = await db.allDocs();
      localResult.total_rows.should.equal(3);
      const remoteResult = await remote.allDocs();
      remoteResult.total_rows.should.equal(3);
    });

    it('5007 sync 2 databases', async function () {
      if (testUtils.isSafari()) {
        // FIXME this test fails consistently on webkit.  It needs to be
        // investigated, but for now it would be better to have the rest of the
        // tests running on webkit.
        return this.skip();
      }

      const db = new PouchDB(dbs.name);

      const remote1 = new PouchDB(dbs.remote);
      let remote2 = new PouchDB(dbs.remote + '_2');

      const remote2docs = await remote2.allDocs();
      if (remote2docs.total_rows > 0) {
        await remote2.destroy();
        remote2 = new PouchDB(dbs.remote + '_2');
      }

      const sync1 = db.sync(remote1, { live: true });
      const sync2 = db.sync(remote2, { live: true });

      const changes1 = remote1.changes({ live: true });
      const changes2 = remote2.changes({ live: true });

      return new Promise((resolve, reject) => {
        let numChanges = 0;
        const onChange = () => {
          if (++numChanges === 2) {
            resolve();
          }
        };
        sync1.on('error', reject);
        sync2.on('error', reject);
        changes1.on('change', onChange);
        changes2.on('change', onChange);

        db.post({ foo: 'bar' }).catch(reject);
      })
        .then(() => {
          for (const cancelable of [changes1, changes2, sync1, sync2]) {
            cancelable.cancel();
          }
        })
        .finally(() => {
          return remote2.destroy();
        });
    });

    it('5782 sync rev-1 conflicts', async () => {
      const local = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);

      const update = async (a, id) => {
        const doc = await a.get(id);
        doc.updated = Date.now();
        return a.put(doc);
      };

      const remove = async (a, id) => {
        const doc = await a.get(id);
        return a.remove(doc);
      };

      const conflict = async (docTemplate) => {
        await local.put(docTemplate);
        docTemplate.baz = 'fubar';
        return remote.put(docTemplate);
      };

      const doc1 = {
        _id: `random-${Date.now()}`,
        foo: 'bar'
      };

      const doc2 = {
        _id: `random2-${Date.now()}`,
        foo: 'bar'
      };

      await conflict(doc2);
      await local.replicate.to(remote);
      await update(local, doc2._id);
      await remove(local, doc2._id);
      await local.replicate.to(remote);
      await conflict(doc1);
      await update(remote, doc2._id);
      await local.replicate.to(remote);
      await remove(local, doc1._id);
      await local.sync(remote);
      const res = await Promise.all([
        local.allDocs({include_docs: true}),
        remote.allDocs({include_docs: true})
      ]);
      res[0].should.deep.equal(res[1]);
    });
  });
});
