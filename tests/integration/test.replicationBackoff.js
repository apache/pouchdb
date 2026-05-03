'use strict';

const adapters = [
  ['local', 'http']
];

adapters.forEach((adapters) => {
  const suiteName = `test.replicationBackoff.js-${adapters[0]}-${adapters[1]}`;
  describe(suiteName, () => {

    const dbs = {};

    beforeEach(() => {
      dbs.name = testUtils.adapterUrl(adapters[0], 'testdb');
      dbs.remote = testUtils.adapterUrl(adapters[1], 'test_repl_remote');
    });

    afterEach(async () => {
      await new Promise(resolve => testUtils.cleanup([dbs.name, dbs.remote], resolve));
    });

    it('Issue 5402 should not keep adding event listeners when backoff is firing', async function () {
      this.timeout(1500);
      const remote = new PouchDB(dbs.remote, {
        fetch: () => {
          throw new Error('flunking you');
        }
      });
      const db = new PouchDB(dbs.name);
      let backOffCount = 0;
      let numberOfActiveListeners = 0;

      const replication = db.sync(remote, {
        live: true,
        retry: true,
        heartbeat: 1,
        timeout: 1,
        back_off_function: () => {
          numberOfActiveListeners = replication.pull.listeners("active").length;
          ++backOffCount;
          if (backOffCount > 15 || numberOfActiveListeners > 3) {
            replication.cancel();
          }
          return 1;
        }
      });

      await new Promise((resolve, reject) => {
        replication.on("complete", () => {
          if (numberOfActiveListeners > 3) {
            reject(new Error(`Number of 'active' listeners shouldn't grow larger than one.
              Currently at ${numberOfActiveListeners}`));
          } else {
            resolve();
          }
        });
      });
    });
  });
});
