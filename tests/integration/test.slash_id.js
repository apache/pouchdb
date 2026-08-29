'use strict';

const adapters = ['local', 'http'];
const repl_adapters = [
  ['local', 'http'],
  ['http', 'http'],
  ['http', 'local'],
  ['local', 'local']
];

adapters.forEach((adapter) => {
  describe(`test.slash_ids.js-${adapter}`, () => {

    const dbs = {};

    beforeEach(() => {
      dbs.name = testUtils.adapterUrl(adapter, 'testdb');
    });

    afterEach((done) => {
      testUtils.cleanup([dbs.name], done);
    });

    it('Insert a doc, putAttachment and get', async () => {
      const db = new PouchDB(dbs.name);
      const docId = 'doc/with/slashes';
      const attachmentId = 'attachment/with/slashes';
      const blobData = 'attachment content';
      const blob = testUtils.makeBlob(blobData);
      const doc = {_id: docId, test: true};
      const info = await db.put(doc);
      info.id.should.equal('doc/with/slashes', 'id is the same as inserted');
      await db.putAttachment(docId, attachmentId, info.rev, blob, 'text/plain');
      const res = await db.getAttachment(docId, attachmentId);
      const data = await testUtils.readBlobPromise(res);
      data.should.equal(blobData);
      const getRes = await db.get(docId);
      getRes._id.should.equal(docId);
      getRes._attachments.should.include.keys(attachmentId);
    });

    it('BulkDocs and changes', async () => {
      const db = new PouchDB(dbs.name);
      const docs = [
        {_id: 'part/doc1', int: 1},
        {_id: 'part/doc2', int: 2, _attachments: {
          'attachment/with/slash': {
            content_type: 'text/plain',
            data: 'c29tZSBkYXRh'
          }
        }},
        {_id: 'part/doc3', int: 3}
      ];
      const res = await db.bulkDocs({ docs });
      for (let i = 0; i < 3; i++) {
        res[i].ok.should.equal(true, `correctly inserted ${docs[i]._id}`);
      }
      const allDocsRes = await db.allDocs({
        include_docs: true,
        attachments: true
      });
      allDocsRes.rows.sort((a, b) => a.doc.int - b.doc.int);
      for (let i = 0; i < 3; i++) {
        allDocsRes.rows[i].doc._id.should
          .equal(docs[i]._id, `(allDocs) correctly inserted ${docs[i]._id}`);
      }
      allDocsRes.rows[1].doc._attachments.should.include
        .keys('attachment/with/slash');
      const changesRes = await new Promise((resolve, reject) => {
        db.changes({return_docs: true}).on('complete', resolve).on('error', reject);
      });
      changesRes.results.sort((a, b) => a.id.localeCompare(b.id));
      for (let i = 0; i < 3; i++) {
        changesRes.results[i].id.should
          .equal(docs[i]._id, 'correctly inserted');
      }
    });

  });
});


repl_adapters.forEach((adapters) => {
  describe(`test.slash_ids.js-${adapters[0]}-${adapters[1]}`, () => {

    const dbs = {};

    beforeEach((done) => {
      dbs.name = testUtils.adapterUrl(adapters[0], 'test_slash_ids');
      dbs.remote = testUtils.adapterUrl(adapters[1], 'test_slash_ids_remote');
      testUtils.cleanup([dbs.name, dbs.remote], done);
    });

    afterEach((done) => {
      testUtils.cleanup([dbs.name, dbs.remote], done);
    });


    it('Attachments replicate', async () => {
      const binAttDoc = {
        _id: 'bin_doc/with/slash',
        _attachments: {
          'foo/with/slash.txt': {
            content_type: 'text/plain',
            data: 'VGhpcyBpcyBhIGJhc2U2NCBlbmNvZGVkIHRleHQ='
          }
        }
      };
      const docs1 = [
        binAttDoc,
        {_id: '0', integer: 0},
        {_id: '1', integer: 1},
        {_id: '2', integer: 2},
        {_id: '3', integer: 3}
      ];
      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);
      await remote.bulkDocs({ docs: docs1 });
      await db.replicate.from(remote);
      const doc = await db.get('bin_doc/with/slash', { attachments: true });
      binAttDoc._attachments['foo/with/slash.txt'].data.should
        .equal(doc._attachments['foo/with/slash.txt'].data);
    });
  });
});
