'use strict';

const adapters = [
  ['local', 'http'],
  ['http', 'http'],
  ['http', 'local'],
  ['local', 'local']
];

adapters.forEach((adapters) => {
  const suiteName = `test.retry.js-${adapters[0]}-${adapters[1]}`;
  describe(suiteName, () => {

    const dbs = {};

    beforeEach(() => {
      dbs.name = testUtils.adapterUrl(adapters[0], 'testdb');
      dbs.remote = testUtils.adapterUrl(adapters[1], 'test_repl_remote');
    });

    afterEach(async () => {
      await new Promise(resolve => testUtils.cleanup([dbs.name, dbs.remote], resolve));
    });

    it('retry stuff', async () => {
      const remote = new PouchDB(dbs.remote);
      const bulkGet = remote.bulkGet;

      // Reject attempting to write 'foo' 3 times, then let it succeed
      let i = 0;
      remote.bulkGet = function (opts) {
        if (opts.docs[0].id === 'foo') {
          if (++i !== 3) {
            return Promise.reject(new Error('flunking you'));
          }
        }
        return bulkGet.apply(remote, arguments);
      };

      const db = new PouchDB(dbs.name);
      const rep = db.replicate.from(remote, {
        live: true,
        retry: true,
        back_off_function: () => { return 0; }
      });

      let paused = 0;
      rep.on('paused', async (e) => {
        const currentPaused = ++paused;
        // The first paused event is the replication up to date
        // and waiting on changes (no error)
        if (currentPaused === 1) {
          should.not.exist(e);
          await remote.put({_id: 'foo'});
          await remote.put({_id: 'bar'});
        }
        // Second paused event is due to failed writes, should
        // have an error
        if (currentPaused === 2) {
          should.exist(e);
        }
      });

      let active = 0;
      rep.on('active', () => {
        ++active;
      });

      let numChanges = 0;
      rep.on('change', (c) => {
        numChanges += c.docs_written;
        if (numChanges === 3) {
          rep.cancel();
        }
      });

      remote.put({_id: 'hazaa'});

      await new Promise((resolve, reject) => {
        rep.on('complete', () => {
          try {
            active.should.be.at.least(2);
            paused.should.be.at.least(2);
            resolve();
          } catch (err) {
            reject(err);
          }
        });

        rep.catch(reject);
      });
    });

    it('#3687 active event only fired once...', async () => {

      const remote = new PouchDB(dbs.remote);
      const db = new PouchDB(dbs.name);
      const rep = db.replicate.from(remote, {
        live: true,
        retry: true,
        back_off_function: () => { return 0; }
      });

      let paused = 0;
      let error;
      rep.on('paused', async (e) => {
        const currentPaused = ++paused;
        // The first paused event is the replication up to date
        // and waiting on changes (no error)
        try {
          should.not.exist(e);
        } catch (err) {
          error = err;
          rep.cancel();
        }
        if (currentPaused === 1) {
          await remote.put({_id: 'foo'});
        } else {
          rep.cancel();
        }
      });

      let active = 0;
      rep.on('active', () => {
        ++active;
      });

      let numChanges = 0;
      rep.on('change', () => {
        ++numChanges;
      });

      remote.put({_id: 'hazaa'});

      await new Promise((resolve, reject) => {
        rep.on('complete', () => {
          try {
            active.should.be.within(1, 2);
            paused.should.equal(2);
            numChanges.should.equal(2);
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          } catch (err) {
            reject(err);
          }
        });

        rep.catch(reject);
      });
    });

    it('source doesn\'t leak "destroyed" event listener', async () => {

      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);

      const bulkGet = remote.bulkGet;
      let i = 0;
      remote.bulkGet = function () {
        // Reject three times, every 5th time
        if ((++i % 5 === 0) && i <= 15) {
          return Promise.reject(new Error('flunking you'));
        }
        return bulkGet.apply(remote, arguments);
      };

      const rep = db.replicate.from(remote, {
        live: true,
        retry: true,
        back_off_function: () => { return 0; }
      });

      const numDocsToWrite = 10;

      await remote.post({});
      let originalNumListeners;
      let posted = 0;

      await new Promise((resolve, reject) => {

        let error;
        const cleanup = (err) => {
          if (err) {
            error = err;
          }
          rep.cancel();
        };
        const finish = () => {
          if (error) {
            return reject(error);
          }
          resolve();
        };

        rep.on('complete', finish).on('error', cleanup);
        rep.on('change', async () => {
          if (++posted < numDocsToWrite) {
            remote.post({}).catch(cleanup);
          } else {
            try {
              const info = await db.info();
              if (info.doc_count === numDocsToWrite) {
                cleanup();
              }
            } catch (err) {
              cleanup(err);
            }
          }

          try {
            const numListeners = db.listeners('destroyed').length;
            if (typeof originalNumListeners !== 'number') {
              originalNumListeners = numListeners;
            } else {
              numListeners.should.equal(originalNumListeners,
                'numListeners should never increase');
            }
          } catch (err) {
            cleanup(err);
          }
        });
      });
    });

    it('target doesn\'t leak "destroyed" event listener', async function () {

      if (testUtils.isChrome() && testUtils.adapters()[0] === 'indexeddb') {
        // FIXME this test fails very frequently on chromium+indexeddb.  Skipped
        // here because it's making it very hard to get a green build, but
        // really the problem should be understood and addressed.
        // See: https://github.com/pouchdb/pouchdb/issues/8689
        this.skip();
      }

      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);

      const remoteBulkGet = remote.bulkGet;
      let i = 0;
      remote.bulkGet = function () {
        // Reject three times, every 5th time
        if ((++i % 5 === 0) && i <= 15) {
          return Promise.reject(new Error('flunking you'));
        }
        return remoteBulkGet.apply(remote, arguments);
      };

      const rep = db.replicate.from(remote, {
        live: true,
        retry: true,
        back_off_function: () => { return 0; }
      });

      const numDocsToWrite = 10;

      await remote.post({});
      let originalNumListeners;
      let posted = 0;

      await new Promise((resolve, reject) => {

        let error;
        const cleanup = (err) => {
          if (err) {
            error = err;
          }
          rep.cancel();
        };
        const finish = () => {
          if (error) {
            return reject(error);
          }
          resolve();
        };

        rep.on('complete', finish).on('error', cleanup);
        rep.on('change', async () => {
          if (++posted < numDocsToWrite) {
            remote.post({}).catch(cleanup);
          } else {
            try {
              const info = await db.info();
              if (info.doc_count === numDocsToWrite) {
                cleanup();
              }
            } catch (err) {
              cleanup(err);
            }
          }

          try {
            const numListeners = remote.listeners('destroyed').length;
            if (typeof originalNumListeners !== 'number') {
              originalNumListeners = numListeners;
            } else {
              // special case for "destroy" - because there are
              // two Changes() objects for local databases,
              // there can briefly be one extra listener or one
              // fewer listener. The point of this test is to ensure
              // that the listeners don't grow out of control.
              numListeners.should.be.within(
                originalNumListeners - 1,
                originalNumListeners + 1,
                'numListeners should never increase by +1/-1');
            }
          } catch (err) {
            cleanup(err);
          }
        });
      });
    });

    [
      'complete', 'error', 'paused', 'active',
      'change', 'cancel'
    ].forEach((event) => {
      it(`returnValue doesn't leak "${event}" event listener`, async () => {

        const db = new PouchDB(dbs.name);
        const remote = new PouchDB(dbs.remote);

        const remoteBulkGet = remote.bulkGet;
        let i = 0;
        remote.bulkGet = function () {
          // Reject three times, every 5th time
          if ((++i % 5 === 0) && i <= 15) {
            return Promise.reject(new Error('flunking you'));
          }
          return remoteBulkGet.apply(remote, arguments);
        };

        const rep = db.replicate.from(remote, {
          live: true,
          retry: true,
          back_off_function: () => { return 0; }
        });

        const numDocsToWrite = 10;

        await remote.post({});
        let originalNumListeners;
        let posted = 0;

        await new Promise((resolve, reject) => {

          let error;
          const cleanup = (err) => {
            if (err) {
              error = err;
            }
            rep.cancel();
          };
          const finish = () => {
            if (error) {
              return reject(error);
            }
            resolve();
          };

          rep.on('complete', finish).on('error', cleanup);
          rep.on('change', async () => {
            if (++posted < numDocsToWrite) {
              remote.post({}).catch(cleanup);
            } else {
              try {
                const info = await db.info();
                if (info.doc_count === numDocsToWrite) {
                  cleanup();
                }
              } catch (err) {
                cleanup(err);
              }
            }

            try {
              const numListeners = rep.listeners(event).length;
              if (typeof originalNumListeners !== 'number') {
                originalNumListeners = numListeners;
              } else {
                if (event === "paused") {
                  Math.abs(numListeners -  originalNumListeners).should.be.at.most(1);
                } else {
                  Math.abs(numListeners -  originalNumListeners).should.be.eql(0);
                }
              }
            } catch (err) {
              cleanup(err);
            }
          });
        });
      });
    });

    it('returnValue doesn\'t leak "change" event listener w/ onChange', async () => {

      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);

      const remoteBulkGet = remote.bulkGet;
      let i = 0;
      remote.bulkGet = function () {
        // Reject three times, every 5th time
        if ((++i % 5 === 0) && i <= 15) {
          return Promise.reject(new Error('flunking you'));
        }
        return remoteBulkGet.apply(remote, arguments);
      };

      const rep = db.replicate.from(remote, {
        live: true,
        retry: true,
        back_off_function: () => { return 0; }
      }).on('change', () => {});

      const numDocsToWrite = 10;

      await remote.post({});
      let originalNumListeners;
      let posted = 0;

      await new Promise((resolve, reject) => {

        let error;
        const cleanup = (err) => {
          if (err) {
            error = err;
          }
          rep.cancel();
        };
        const finish = () => {
          if (error) {
            return reject(error);
          }
          resolve();
        };

        rep.on('complete', finish).on('error', cleanup);
        rep.on('change', async () => {
          if (++posted < numDocsToWrite) {
            remote.post({}).catch(cleanup);
          } else {
            try {
              const info = await db.info();
              if (info.doc_count === numDocsToWrite) {
                cleanup();
              }
            } catch (err) {
              cleanup(err);
            }
          }

          try {
            const numListeners = rep.listeners('change').length;
            if (typeof originalNumListeners !== 'number') {
              originalNumListeners = numListeners;
            } else {
              numListeners.should.equal(originalNumListeners,
                'numListeners should never increase');
            }
          } catch (err) {
            cleanup(err);
          }
        });
      });
    });

    it('retry many times, no leaks on any events', async function () {
      this.timeout(200000);
      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);

      let flunked = 0;
      const remoteBulkGet = remote.bulkGet;
      let i = 0;
      remote.bulkGet = function () {
        // Reject five times, every 5th time
        if ((++i % 5 === 0) && i <= 25) {
          flunked++;
          return Promise.reject(new Error('flunking you'));
        }
        return remoteBulkGet.apply(remote, arguments);
      };

      const rep = db.replicate.from(remote, {
        live: true,
        retry: true,
        back_off_function: () => { return 0; }
      });

      let active = 0;
      let paused = 0;
      const numDocsToWrite = 50;

      await remote.post({});
      let originalNumListeners;
      let posted = 0;

      await new Promise((resolve, reject) => {

        let error;
        const cleanup = (err) => {
          if (err) {
            error = err;
          }
          rep.cancel();
        };
        const finish = () => {
          if (error) {
            return reject(error);
          }
          resolve();
        };
        const getTotalListeners = () => {
          const events = ['complete', 'error', 'paused', 'active',
            'change', 'cancel'];
          return events.map((event) => {
            return rep.listeners(event).length;
          }).reduce((a, b) => { return a + b; }, 0);
        };

        rep.on('complete', finish)
          .on('error', cleanup)
          .on('active', () => {
          active++;
        }).on('paused', () => {
          paused++;
        }).on('change', async () => {
          if (++posted < numDocsToWrite) {
            remote.post({}).catch(cleanup);
          } else {
            try {
              const info = await db.info();
              if (info.doc_count === numDocsToWrite) {
                cleanup();
              }
            } catch (err) {
              cleanup(err);
            }
          }

          try {
            const numListeners = getTotalListeners();
            if (typeof originalNumListeners !== 'number') {
              originalNumListeners = numListeners;
            } else {
              Math.abs(numListeners -  originalNumListeners).should.be.at.most(1);
            }
          } catch (err) {
            cleanup(err);
          }
        });
      });

      flunked.should.equal(5);
      active.should.be.at.least(5);
      paused.should.be.at.least(5);
    });


    it('4049 retry while starting offline', async () => {

      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);

      const ajax = remote._ajax;
      let _called = 0;
      let startFailing = false;

      remote._ajax = function (opts, cb) {
        if (!startFailing || ++_called > 3) {
          ajax.apply(this, arguments);
        } else {
          cb(new Error('flunking you'));
        }
      };

      await remote.post({a: 'doc'});
      startFailing = true;
      const rep = db.replicate.from(remote, {live: true, retry: true})
        .on('change', () => { rep.cancel(); });

      await new Promise((resolve) => {
        rep.on('complete', () => {
          remote._ajax = ajax;
          resolve();
        });
      });
    });

    it('#5157 replicate many docs with live+retry', async () => {
      const numDocs = 512; // uneven number
      const docs = [];
      for (let i = 0; i < numDocs; i++) {
        // mix of generation-1 and generation-2 docs
        if (i % 2 === 0) {
          docs.push({
            _id: testUtils.uuid(),
            _rev: '1-x',
            _revisions: { start: 1, ids: ['x'] }
          });
        } else {
          docs.push({
            _id: testUtils.uuid(),
            _rev: '2-x',
            _revisions: { start: 2, ids: ['x', 'y'] }
          });
        }
      }
      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);
      await db.bulkDocs({
        docs,
        new_edits: false
      });

      const replicatePromise = (fromDB, toDB) => {
        return new Promise((resolve, reject) => {
          const replication = fromDB.replicate.to(toDB, {
            live: true,
            retry: true,
            batches_limit: 10,
            batch_size: 20
          }).on('paused', (err) => {
            if (!err) {
              replication.cancel();
            }
          }).on('complete', resolve)
            .on('error', reject);
        });
      };

      await Promise.all([
        replicatePromise(db, remote),
        replicatePromise(remote, db)
      ]);

      const info = await remote.info();
      info.doc_count.should.equal(numDocs);
    });

    it('6510 no changes live+retry does not call backoff function', async () => {
      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);
      let called = false;
      let replication;

      const replicatePromise = (fromDB, toDB) => {
        return new Promise((resolve, reject) => {
          replication = fromDB.replicate.to(toDB, {
            live: true,
            retry: true,
            heartbeat: 5,
            back_off_function: () => {
              called = true;
              replication.cancel();
            }
          }).on('complete', resolve)
            .on('error', reject);
        });
      };

      setTimeout(() => {
        if (replication) {
          replication.cancel();
        }
      }, 2000);

      await replicatePromise(remote, db);
      called.should.equal(false);
    });

  });
});
