'use strict';

const adapters = ['http', 'local'];

adapters.forEach((adapter) => {
  describe(`test.bulk_get.js-${adapter}`, () => {

    const dbs = {};

    beforeEach(() => {
      dbs.name = testUtils.adapterUrl(adapter, 'testdb');
    });

    afterEach((done) => {
      testUtils.cleanup([dbs.name], done);
    });

    it('test bulk get with rev specified', async () => {
      const db = new PouchDB(dbs.name);
      const putResponse = await db.put({_id: 'foo', val: 1});
      const rev = putResponse.rev;
      const response = await db.bulkGet({
        docs: [{id: 'foo', rev}]
      });
      const result = response.results[0];
      result.id.should.equal("foo");
      result.docs[0].ok._rev.should.equal(rev);
    });

    it('test bulk get with latest=true', async () => {
      const db = new PouchDB(dbs.name);
      const info = await db.post({ version: 'first' });
      const first = info.rev;
      const info2 = await db.put({
        _id: info.id, _rev: info.rev, version: 'second'
      });
      const response = await db.bulkGet({
        docs: [{id: info2.id, rev: first }], latest: true
      });
      const result = response.results[0];
      result.docs[0].ok.version.should.equal('second');
    });

    it('test bulk get with no rev specified', async () => {
      const db = new PouchDB(dbs.name);
      const putResponse = await db.put({_id: 'foo', val: 1});
      const rev = putResponse.rev;
      const response = await db.bulkGet({
        docs: [{id: 'foo'}]
      });
      const result = response.results[0];
      result.id.should.equal("foo");
      result.docs[0].ok._rev.should.equal(rev);
    });

    it('_revisions is not returned by default', async () => {
      const db = new PouchDB(dbs.name);
      const putResponse = await db.put({_id: 'foo', val: 1});
      const rev = putResponse.rev;
      const response = await db.bulkGet({
        docs: [{id: 'foo', rev}]
      });
      const result = response.results[0];
      should.not.exist(result.docs[0].ok._revisions);
    });

    it('#5886 bulkGet with reserved id', async () => {
      const db = new PouchDB(dbs.name);
      const putResponse = await db.put({_id: 'constructor', val: 1});
      const rev = putResponse.rev;
      const response = await db.bulkGet({
        docs: [{id: 'constructor', rev}]
      });
      const result = response.results[0];
      result.docs[0].ok._id.should.equal('constructor');
      should.not.exist(result.docs[0].ok._revisions);
    });

    it('_revisions is returned when specified', async () => {
      const db = new PouchDB(dbs.name);
      const putResponse = await db.put({_id: 'foo', val: 1});
      const rev = putResponse.rev;
      const response = await db.bulkGet({
        docs: [{id: 'foo', rev}], revs: true
      });
      const result = response.results[0];
      result.docs[0].ok._revisions.ids[0].should.equal(rev.substring(2));
    });

    it('_revisions is returned when specified, using implicit rev',
    async () => {
      const db = new PouchDB(dbs.name);
      const putResponse = await db.put({_id: 'foo', val: 1});
      const rev = putResponse.rev;
      const response = await db.bulkGet({
        docs: [{id: 'foo'}], revs: true
      });
      const result = response.results[0];
      result.docs[0].ok._revisions.ids[0].should.equal(rev.substring(2));
    });

    it('attachments are not included by default', async () => {
      const db = new PouchDB(dbs.name);
      const putResponse = await db.put({
        _id: 'foo',
        _attachments: {
          'foo.txt': {
            content_type: 'text/plain',
            data: 'VGhpcyBpcyBhIGJhc2U2NCBlbmNvZGVkIHRleHQ='
          }
        }
      });
      const rev = putResponse.rev;
      const response = await db.bulkGet({
        docs: [{id: 'foo', rev}]
      });
      const result = response.results[0];
      result.docs[0].ok._attachments['foo.txt'].stub.should.equal(true);
    });

    it('attachments are included when specified', async () => {
      const db = new PouchDB(dbs.name);
      const putResponse = await db.put({
        _id: 'foo',
        _attachments: {
          'foo.txt': {
            content_type: 'text/plain',
            data: 'VGhpcyBpcyBhIGJhc2U2NCBlbmNvZGVkIHRleHQ='
          }
        }
      });
      const rev = putResponse.rev;
      const response = await db.bulkGet({
        docs: [{id: 'foo', rev}], attachments: true
      });
      const result = response.results[0];
      result.docs[0].ok._attachments['foo.txt'].data
        .should.equal("VGhpcyBpcyBhIGJhc2U2NCBlbmNvZGVkIHRleHQ=");
    });

    it('attachments are included when specified, using implicit rev',
    async () => {
      const db = new PouchDB(dbs.name);
      await db.put({
        _id: 'foo',
        _attachments: {
          'foo.txt': {
            content_type: 'text/plain',
            data: 'VGhpcyBpcyBhIGJhc2U2NCBlbmNvZGVkIHRleHQ='
          }
        }
      });
      const response = await db.bulkGet({
        docs: [{id: 'foo'}], attachments: true
      });
      const result = response.results[0];
      result.docs[0].ok._attachments['foo.txt'].data
        .should.equal("VGhpcyBpcyBhIGJhc2U2NCBlbmNvZGVkIHRleHQ=");
    });
  });
});
