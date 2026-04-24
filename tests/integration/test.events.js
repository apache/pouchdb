'use strict';

const adapters = ['local', 'http'];

adapters.forEach((adapter) => {
  describe(`test.events.js-${adapter}`, () => {

    const dbs = {};

    beforeEach(() => {
      dbs.name = testUtils.adapterUrl(adapter, 'testdb');
    });

    afterEach(async () => {
      await new Promise((resolve, reject) => testUtils.cleanup([dbs.name], (err) => {
        return err ? reject(err) : resolve();
      }));
    });

    it('PouchDB emits creation event', async () => {
      const eventPromise = new Promise((resolve) => {
        PouchDB.once('created', (name) => {
          name.should.equal(dbs.name, 'should be same thing');
          resolve();
        });
      });
      new PouchDB(dbs.name);
      await eventPromise;
    });

    it('PouchDB emits destruction event', async () => {
      const db = new PouchDB(dbs.name);
      const destroyedPromise = new Promise((resolve) => db.once('destroyed', resolve));
      db.destroy();
      await destroyedPromise;
    });

    it('PouchDB emits destruction event on PouchDB object', async () => {
      const eventPromise = new Promise((resolve) => {
        PouchDB.once('destroyed', (name) => {
          name.should.equal(dbs.name, 'should have the same name');
          resolve();
        });
      });
      new PouchDB(dbs.name).destroy();
      await eventPromise;
    });

    it('PouchDB emits destroyed when using {name: foo}', async () => {
      const db = new PouchDB({name: 'testdb'});
      await new Promise((resolve) => {
        PouchDB.once('destroyed', (name) => {
          name.should.equal('testdb');
          resolve();
        });
        db.destroy();
      });
    });

    it('db emits destroyed on all DBs', async () => {
      const db1 = new PouchDB('testdb');
      const db2 = new PouchDB('testdb');

      await new Promise((resolve) => {
        let called = 0;
        const checkDone = () => {
          if (++called === 2) {
            resolve();
          }
        };
        db1.once('destroyed', checkDone);
        db2.once('destroyed', checkDone);
        db1.destroy();
      });
    });

    it('3900 db emits destroyed event', async () => {
      const db = new PouchDB('testdb');
      await new Promise((resolve) => {
        db.once('destroyed', resolve);
        db.destroy();
      });
    });

    it('3900 db emits destroyed event 2', async () => {
      const db = new PouchDB('testdb');
      await new Promise((resolve) => {
        db.once('destroyed', resolve);
        db.destroy();
      });
    });

    it('emit creation event', async () => {
      await new Promise((resolve) => {
        const db = new PouchDB(dbs.name).on('created', (newDB) => {
          db.should.equal(newDB, 'should be same thing');
          resolve();
        });
      });
    });

    it('#4168 multiple constructor calls don\'t leak listeners', () => {
      for (let i = 0; i < 50; i++) {
        new PouchDB(dbs.name);
      }
    });

    it('4922 Destroyed is not called twice', async () => {
      let count = 0;
      await new Promise((resolve) => {
        const destroyed = () => {
          count++;
          if (count === 1) {
            setTimeout(() => {
              count.should.equal(1);
              PouchDB.removeListener('destroyed', destroyed);
              resolve();
            }, 50);
          }
        };
        PouchDB.on('destroyed', destroyed);
        new PouchDB(dbs.name).destroy();
      });
    });

  });
});
