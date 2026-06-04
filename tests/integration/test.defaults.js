'use strict';
if (!process.env.LEVEL_ADAPTER &&
    !process.env.LEVEL_PREFIX &&
    !process.env.AUTO_COMPACTION &&
    !process.env.ADAPTERS) {
  // these tests don't make sense for anything other than default leveldown
  const path = require('path');
  const { mkdirSync } = require('fs');
  const rimraf = require('rimraf');

  describe('defaults', () => {

    beforeEach(async () => {
      await new PouchDB('mydb').destroy();
      await new PouchDB('mydb', {db: require('memdown')}).destroy();
    });

    afterEach(() => {
      rimraf.sync('./tmp/_pouch_.');
      rimraf.sync('./tmp/path');
    });

    it('should allow prefixes', async () => {
      const prefix = './tmp/path/to/db/1/';
      const dir = path.join(prefix, '/tmp/');
      const dir2 = path.join('./tmp/_pouch_./', prefix);
      const dir3 = path.join(dir2, './tmp/_pouch_mydb');
      mkdirSync(dir, { recursive:true });
      mkdirSync(dir2, { recursive:true });
      mkdirSync(dir3, { recursive:true });

      const db = new PouchDB('mydb', {prefix});
      const info1 = await db.info();
      info1.db_name.should.equal('mydb');
      await db.destroy();
    });

    it('Defaults leaks eventEmitters', () => {
      PouchDB.defaults({db: require('memdown') });
      PouchDB.defaults({db: require('memdown') });
      PouchDB.defaults({db: require('memdown') });
      PouchDB.defaults({db: require('memdown') });
    });

    it('should allow us to set a prefix by default', async () => {
      const prefix = './tmp/path/to/db/2/';
      const dir = path.join(prefix, '/tmp/');
      const dir2 = path.join('./tmp/_pouch_./', prefix);
      const dir3 = path.join(dir2, './tmp/_pouch_mydb');
      mkdirSync(dir, { recursive:true });
      mkdirSync(dir2, { recursive:true });
      mkdirSync(dir3, { recursive:true });

      const CustomPouch = PouchDB.defaults({
        prefix
      });
      const db = CustomPouch({name: 'mydb'});
      const info1 = await db.info();
      info1.db_name.should.equal('mydb');
      await db.destroy();
    });

    it('should allow us to use memdown', async () => {
      const opts = { name: 'mydb', db: require('memdown') };
      const db = new PouchDB(opts);
      await db.put({_id: 'foo'});
      const otherDB = new PouchDB('mydb');
      const info1 = await db.info();
      const info2 = await otherDB.info();
      info1.doc_count.should.not.equal(info2.doc_count);
      await otherDB.destroy();
      await db.destroy();
    });

    it('should allow us to destroy memdown', async () => {
      const opts = {db: require('memdown') };
      const db = new PouchDB('mydb', opts);
      await db.put({_id: 'foo'});
      const otherDB = new PouchDB('mydb', opts);
      const info1 = await db.info();
      const info2 = await otherDB.info();
      info1.doc_count.should.equal(info2.doc_count);
      await otherDB.destroy();
      const db3 = new PouchDB('mydb', opts);
      const info = await db3.info();
      info.doc_count.should.equal(0);
      await db3.destroy();
    });

    it('should allow us to use memdown by default', async () => {
      const CustomPouch = PouchDB.defaults({db: require('memdown')});
      const db = new CustomPouch('mydb');
      await db.put({_id: 'foo'});
      const otherDB = new PouchDB('mydb');
      const info1 = await db.info();
      const info2 = await otherDB.info();
      info1.doc_count.should.not.equal(info2.doc_count);
      await otherDB.destroy();
      await db.destroy();
    });


    it('should inform us when using memdown', async () => {
      const opts = { name: 'mydb', db: require('memdown') };
      const db = new PouchDB(opts);
      const info = await db.info();
      info.backend_adapter.should.equal('MemDOWN');
    });

    it('constructor emits destroyed when using defaults', async () => {
      const CustomPouch = PouchDB.defaults({db: require('memdown')});

      const db = new CustomPouch('mydb');
      await new Promise((resolve) => {
        CustomPouch.once('destroyed', (name) => {
          name.should.equal('mydb');
          resolve();
        });
        db.destroy();
      });
    });

    it('db emits destroyed when using defaults', async () => {
      const CustomPouch = PouchDB.defaults({db: require('memdown')});

      const db = new CustomPouch('mydb');
      const destroyedPromise = new Promise((resolve) => db.once('destroyed', resolve));
      db.destroy();
      await destroyedPromise;
    });

    it('constructor emits creation event', async () => {
      const CustomPouch = PouchDB.defaults({db: require('memdown')});

      const eventPromise = new Promise((resolve) => {
        CustomPouch.once('created', (name) => {
          name.should.equal('mydb', 'should be same thing');
          resolve();
        });
      });
      new PouchDB('mydb');
      await eventPromise;
    });

    // somewhat odd behavior (CustomPouch constructor always mirrors PouchDB),
    // but better to test it explicitly
    it('PouchDB emits destroyed when using defaults', async () => {
      const CustomPouch = PouchDB.defaults({db: require('memdown')});

      const db = new CustomPouch('mydb');
      await new Promise((resolve) => {
        PouchDB.once('destroyed', (name) => {
          name.should.equal('mydb');
          resolve();
        });
        db.destroy();
      });
    });

    // somewhat odd behavior (CustomPouch constructor always mirrors PouchDB),
    // but better to test it explicitly
    it('PouchDB emits created when using defaults', async () => {
      const CustomPouch = PouchDB.defaults({db: require('memdown')});

      const eventPromise = new Promise((resolve) => {
        PouchDB.once('created', (name) => {
          name.should.equal('mydb', 'should be same thing');
          resolve();
        });
      });
      new CustomPouch('mydb');
      await eventPromise;
    });

    it('should be transitive (#5922)', async () => {
      const CustomPouch = PouchDB
        .defaults({db: require('memdown')})
        .defaults({});

      const db = new CustomPouch('mydb');
      const info = await db.info();
      info.backend_adapter.should.equal('MemDOWN');
    });
  });
}
