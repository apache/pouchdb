'use strict';

const adapters = [
  ['local', 'http'],
  ['http', 'http'],
  ['http', 'local'],
  ['local', 'local']
];

adapters.forEach((adapters) => {
  const title = `test.sync_events.js-${adapters[0]}-${adapters[1]}`;
  describe(`suite2 ${title}`, () => {

    const dbs = {};

    beforeEach(() => {
      dbs.name = testUtils.adapterUrl(adapters[0], 'testdb');
      dbs.remote = testUtils.adapterUrl(adapters[1], 'test_repl_remote');
    });

    afterEach((done) => {
      testUtils.cleanup([dbs.name, dbs.remote], done);
    });

    it('#4251 Should fire paused and active on sync', async () => {

      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);

      await db.bulkDocs([{_id: 'a'}, {_id: 'b'}]);

      await new Promise((resolve) => {
        const repl = db.sync(remote, {retry: true, live: true});
        let counter = 0;

        repl.on('complete', resolve);

        repl.on('active', () => {
          counter++;
          if (counter === 1) {
            // We are good, initial replication
          } else if (counter === 3) {
            remote.bulkDocs([{_id: 'e'}, {_id: 'f'}]);
          }
        });

        repl.on('paused', () => {
          counter++;
          if (counter === 1) {
            // Maybe a bug, if we have data should probably
            // call active first
            counter--;
          } if (counter === 2) {
            db.bulkDocs([{_id: 'c'}, {_id: 'd'}]);
          } else if (counter === 4) {
            repl.cancel();
          }
        });
      });

    });

    it('#5710 Test pending property support', async () => {

      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);
      let docId = 0;
      const numDocs = 10;

      const generateDocs = (n) => {
        return Array.apply(null, new Array(n)).map(() => {
          docId += 1;
          return {
            _id: docId.toString(),
            foo: Math.random().toString()
          };
        });
      };

      await remote.bulkDocs(generateDocs(numDocs));

      await new Promise((resolve) => {
        const repl = db.sync(remote, { retry: true, live: false, batch_size: 4 });
        let pendingSum = 0;

        repl.on('change', (info) => {
          if (typeof info.change.pending === 'number') {
            pendingSum += info.change.pending;
            if (info.change.pending === 0) {
              pendingSum += info.change.docs.length;
            }
          }
        });

        repl.on('complete', () => {
          if (pendingSum > 0) {
            pendingSum.should.equal(numDocs);
          }
          resolve();
        });
      });
    });
  });
});
