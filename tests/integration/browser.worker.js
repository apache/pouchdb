'use strict';

// Historically:
// only running in Chrome and Firefox due to various bugs.
// IE: https://connect.microsoft.com/IE/feedback/details/866495
// Safari: doesn't have IndexedDB or WebSQL in a WW
// NodeWebkit: not sure what the issue is
// Now:
// skipped everywhere, as they weren't being run anyway.
// See: https://github.com/pouchdb/pouchdb/issues/8680
// TODO re-introduce these tests in environments where they are appropriate.
describe.skip('browser.worker.js', () => {

  let worker;
  const dbs = {};

  before(() => {
    worker = new Worker('worker.js');

    worker.postMessage(['source', testUtils.pouchdbSrc()]);
  });

  function workerPromise(message) {
    return new Promise((resolve, reject) => {
      worker.onerror = (e) => {
        reject(new Error(`${e.message}: ${e.filename}: ${e.lineno}`));
      };
      worker.onmessage = (e) => {
        resolve(e.data);
      };
      worker.postMessage(message);
    });
  }

  beforeEach((done) => {
    dbs.name = testUtils.adapterUrl('local', 'testdb');
    dbs.remote = testUtils.adapterUrl('http', 'test_repl_remote');
    testUtils.cleanup([dbs.name, dbs.remote], done);
  });

  after((done) => {
    worker.terminate();
    testUtils.cleanup([dbs.name, dbs.remote], done);
  });

  it('create it', async () => {
    const data = await workerPromise('ping');
    data.should.equal('pong');
  });

  it('check pouch version', async () => {
    const data = await workerPromise('version');
    PouchDB.version.should.equal(data);
  });

  it('create remote db', async () => {
    const data = await workerPromise(['create', dbs.remote]);
    data.should.equal('lala');
  });

  it('create local db', async () => {
    const data = await workerPromise(['create', dbs.name]);
    data.should.equal('lala');
  });

  it('add doc with blob attachment', async () => {
    const data = await workerPromise(['postAttachmentThenAllDocs', dbs.name]);
    data.title.should.equal('lalaa');
  });

  it('put an attachment', async () => {
    const blob = new Blob(['foobar'], {type: 'text/plain'});
    const message = ['putAttachment', dbs.name, 'doc', 'att.txt', blob,
      'text/plain'];
    const result = await workerPromise(message);
    result.type.should.equal('text/plain');
    result.size.should.equal(6);
  });

  it('total_rows consistent between worker and main thread', async () => {
    const db = new PouchDB(dbs.name);

    // this test only makes sense for idb
    if (db.adapter !== 'idb') {
      return;
    }

    // both threads agree the count is 0
    const [res1, workerRes1] = await Promise.all([
      db.allDocs(),
      workerPromise(['allDocs', dbs.name])
    ]);
    res1.total_rows.should.equal(0);
    workerRes1.total_rows.should.equal(0);

    // post a doc
    await db.post({});

    // both threads agree the count is 1
    const [res2, workerRes2] = await Promise.all([
      db.allDocs(),
      workerPromise(['allDocs', dbs.name])
    ]);
    res2.total_rows.should.equal(1);
    workerRes2.total_rows.should.equal(1);
  });
});
