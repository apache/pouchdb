'use strict';

const should = require('chai').should();

const adapters = ['local', 'http'];
const repl_adapters = [
  ['local', 'http'],
  ['http', 'http'],
  ['http', 'local'],
  ['local', 'local']
];

const icons = [
  "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"
];

const iconDigests = [
  "md5-Mf8m9ehZnCXC717bPkqkCA==",
  "md5-fdEZBYtnvr+nozYVDzzxpA==",
  "md5-ImDARszfC+GA3Cv9TVW4HA==",
  "md5-hBsgoz3ujHM4ioa72btwow==",
  "md5-jDUyV6ySnTVANn2qq3332g=="
];

const iconLengths = [1047, 789, 967, 527, 1108];

adapters.forEach((adapter) => {
  describe('suite2 test.attachments.js-' + adapter, function () {

    const dbs = {};

    beforeEach(() => {
      dbs.name = testUtils.adapterUrl(adapter, 'testdb');
    });

    afterEach(function (done) {
      testUtils.cleanup([dbs.name], done);
    });

    const binAttDoc = {
      _id: 'bin_doc',
      _attachments: {
        'foo.txt': {
          content_type: 'text/plain',
          data: 'VGhpcyBpcyBhIGJhc2U2NCBlbmNvZGVkIHRleHQ='
        }
      }
    };
    // empty attachment
    const binAttDoc2 = {
      _id: 'bin_doc2',
      _attachments: {
        'foo.txt': {
          content_type: 'text/plain',
          data: ''
        }
      }
    };
    const binAttDocLocal = {
      _id: '_local/bin_doc',
      _attachments: {
        'foo.txt': {
          content_type: 'text/plain',
          data: 'VGhpcyBpcyBhIGJhc2U2NCBlbmNvZGVkIHRleHQ='
        }
      }
    };
    // json string doc
    const jsonDoc = {
      _id: 'json_doc',
      _attachments: {
        'foo.json': {
          content_type: 'application/json',
          data: 'eyJIZWxsbyI6IndvcmxkIn0='
        }
      }
    };
    const pngAttDoc = {
      _id: 'png_doc',
      _attachments: {
        'foo.png': {
          content_type: 'image/png',
          data: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAMFBMVEX+9+' +
                'j+9OD+7tL95rr93qT80YD7x2L6vkn6syz5qRT4ogT4nwD4ngD4nQD4nQD4' +
                'nQDT2nT/AAAAcElEQVQY002OUQLEQARDw1D14f7X3TCdbfPnhQTqI5UqvG' +
                'OWIz8gAIXFH9zmC63XRyTsOsCWk2A9Ga7wCXlA9m2S6G4JlVwQkpw/Ymxr' +
                'UgNoMoyxBwSMH/WnAzy5cnfLFu+dK2l5gMvuPGLGJd1/9AOiBQiEgkzOpg' +
                'AAAABJRU5ErkJggg=='
        }
      }
    };

    it('3357 Attachment names cant start with _', async () => {
      const db = new PouchDB(dbs.name);
      const doc = {_id: 'baz', _attachments: {
        '_text1.txt': {
          content_type: 'text/plain',
          data: testUtils.btoa('text1')
        }
      }};
      try {
        await db.put(doc);
        throw new Error('Should not succeed');
      } catch (err) {
        err.name.should.equal('bad_request');
      }
    });

    it('5736 warning for putAttachment without content_type', async () => {
      const db = new PouchDB(dbs.name);
      await db.putAttachment('bar', 'baz.txt', testUtils.btoa('text'), '');
    });

    it('5736 warning for bulkDocs attachments without content_type', async () => {
      const db = new PouchDB(dbs.name);
      const doc = {
        _attachments: {
          'att.txt': {
            data: testUtils.btoa('well')
          }
        }
      };
      await db.bulkDocs([doc]);
    });

    it('fetch atts with open_revs and missing', async () => {
      const db = new PouchDB(dbs.name);
      const doc = {
        _id: 'frog',
        _rev: '1-x',
        _revisions: {
          start: 1,
          ids: ['x']
        },
        _attachments: {
          'foo.txt': {
            content_type: 'text/plain',
            data: ''
          }
        }
      };
      await db.bulkDocs({
        docs: [doc],
        new_edits: false
      });
      const res = await db.get('frog', {
        revs: true,
        open_revs: ['1-x', '2-fake'],
        attachments: true
      });
      // there should be exactly one "ok" result
      // and one result with attachments
      res.filter((x) => x.ok).should.have.length(1);
      res.filter((x) => x.ok && x.ok._attachments).should.have.length(1);
    });

    it('issue 2803 should throw 412', async () => {
      const db = new PouchDB(dbs.name);
      await db.put(binAttDoc);
      const doc = await db.get(binAttDoc._id);
      doc._attachments['bar.txt'] = {
        stub: true,
        digest: 'md5-sorryIDoNotReallyExist=='
      };
      try {
        const res = await db.put(doc);
        should.not.exist(res, 'should throw');
      } catch (err) {
        should.exist(err.status, 'got improper error: ' + err);
        err.status.should.equal(412);
      }
    });

    it('issue 2803 should throw 412 part 2', async () => {
      const stubDoc = {
        _id: 'stubby',
        "_attachments": {
          "foo.txt": {
            "content_type": "text/plain",
            "digest": "md5-aEI7pOYCRBLTRQvvqYrrJQ==",
            "stub": true
          }
        }
      };
      const db = new PouchDB(dbs.name);
      try {
        const res = await db.put(stubDoc);
        should.not.exist(res, 'should throw');
      } catch (err) {
        should.exist(err.status, 'got improper error: ' + err);
        err.status.should.equal(412, 'got improper error: ' + err);
      }
    });

    it('issue 2803 should throw 412 part 3', async () => {
      const db = new PouchDB(dbs.name);
      await db.put(binAttDoc);
      let doc = await db.get(binAttDoc._id);
      doc._attachments['foo.json'] = jsonDoc._attachments['foo.json'];
      doc = await db.get(binAttDoc._id);
      doc._attachments['bar.txt'] = {
        stub: true,
        digest: 'md5-sorryIDoNotReallyExist=='
      };
      try {
        const res = await db.put(doc);
        should.not.exist(res, 'should throw');
      } catch (err) {
        should.exist(err.status, 'got improper error: ' + err);
        err.status.should.equal(412);
      }
    });

    it('issue 2803 should throw 412 part 4', async () => {
      const db = new PouchDB(dbs.name);
      await db.put(binAttDoc);
      let doc = await db.get(binAttDoc._id);
      doc._attachments['foo.json'] = jsonDoc._attachments['foo.json'];
      doc = await db.get(binAttDoc._id);
      doc._attachments['bar.txt'] = {
        stub: true,
        digest: 'md5-sorryIDoNotReallyExist=='
      };
      doc._attachments['baz.txt'] = {
        stub: true,
        digest: 'md5-yahNoIDoNotExistEither=='
      };
      try {
        const res = await db.put(doc);
        should.not.exist(res, 'should throw');
      } catch (err) {
        should.exist(err.status, 'got improper error: ' + err);
        err.status.should.equal(412);
      }
    });

    it('#2858 {binary: true} in get()', async () => {
      const db = new PouchDB(dbs.name);
      const docs = [binAttDoc, binAttDoc2, pngAttDoc];
      await db.bulkDocs(docs);
      await Promise.all(docs.map(async (doc) => {
        const attName = Object.keys(doc._attachments)[0];
        const expected = doc._attachments[attName];
        const savedDoc = await db.get(doc._id, {
          attachments: true,
          binary: true
        });
        const att = savedDoc._attachments[attName];
        should.not.exist(att.stub);
        should.exist(att.digest);
        att.content_type.should.equal(expected.content_type);
        att.data.should.not.be.a('string');
        att.data.type.should.equal(expected.content_type);
        const bin = await testUtils.readBlobPromise(att.data);
        testUtils.btoa(bin).should.equal(expected.data);
      }));
    });

    it('#2858 {binary: true} in allDocs() 1', async () => {
      const db = new PouchDB(dbs.name);
      const docs = [binAttDoc, binAttDoc2, pngAttDoc, {_id: 'foo'}];
      await db.bulkDocs(docs);
      await Promise.all(docs.map(async (doc) => {
        const atts = doc._attachments;
        const attName = atts && Object.keys(atts)[0];
        const expected = atts && atts[attName];
        const res = await db.allDocs({
          return_docs: true,
          key: doc._id,
          attachments: true,
          binary: true,
          include_docs: true
        });
        res.rows.should.have.length(1);
        const savedDoc = res.rows[0].doc;
        if (!atts) {
          should.not.exist(savedDoc._attachments);
          return;
        }
        const att = savedDoc._attachments[attName];
        should.not.exist(att.stub);
        should.exist(att.digest);
        att.content_type.should.equal(expected.content_type);
        att.data.should.not.be.a('string');
        att.data.type.should.equal(expected.content_type);
        const bin = await testUtils.readBlobPromise(att.data);
        testUtils.btoa(bin).should.equal(expected.data);
      }));
    });

    it('#2858 {binary: true} in allDocs() 2', async () => {
      const db = new PouchDB(dbs.name);
      const docs = [binAttDoc, binAttDoc2, pngAttDoc, {_id: 'foo'}];
      await db.bulkDocs(docs);
      const res = await db.allDocs({
        include_docs: true,
        attachments: true,
        binary: true
      });
      const savedDocs = res.rows.map((x) => x.doc);
      await Promise.all(docs.map(async (doc) => {
        const atts = doc._attachments;
        const attName = atts && Object.keys(atts)[0];
        const expected = atts && atts[attName];
        const savedDoc = savedDocs.filter((x) => x._id === doc._id)[0];
        if (!atts) {
          should.not.exist(savedDoc._attachments);
          return;
        }
        const att = savedDoc._attachments[attName];
        should.not.exist(att.stub);
        should.exist(att.digest);
        att.content_type.should.equal(expected.content_type);
        att.data.should.not.be.a('string');
        att.data.type.should.equal(expected.content_type);
        const bin = await testUtils.readBlobPromise(att.data);
        testUtils.btoa(bin).should.equal(expected.data);
      }));
    });

    it('#2858 {binary: true} in allDocs() 3', async () => {
      const db = new PouchDB(dbs.name);
      const docs = [binAttDoc, binAttDoc2, pngAttDoc,
        {_id: 'bar'},
        {_id: 'foo', _deleted: true}];
      await db.bulkDocs(docs);
      const res = await db.allDocs({
        include_docs: true,
        attachments: true,
        binary: true
      });
      res.rows.should.have.length(4);
      const savedDocs = res.rows.map((x) => x.doc);
      await Promise.all(docs.filter((doc) => !doc._deleted).map(async (doc) => {
        const atts = doc._attachments;
        const attName = atts && Object.keys(atts)[0];
        const expected = atts && atts[attName];
        const savedDoc = savedDocs.filter((x) => x._id === doc._id)[0];
        if (!atts) {
          should.not.exist(savedDoc._attachments);
          return;
        }
        const att = savedDoc._attachments[attName];
        should.not.exist(att.stub);
        should.exist(att.digest);
        att.content_type.should.equal(expected.content_type);
        att.data.should.not.be.a('string');
        att.data.type.should.equal(expected.content_type);
        const bin = await testUtils.readBlobPromise(att.data);
        testUtils.btoa(bin).should.equal(expected.data);
      }));
    });

    it('#2858 {binary: true} in allDocs() 4', async () => {
      const db = new PouchDB(dbs.name);
      const docs = [binAttDoc, binAttDoc2, pngAttDoc,
        {_id: 'bar'},
        {_id: 'foo', _deleted: true}];
      await db.bulkDocs(docs);
      const res = await db.allDocs({
        attachments: true,
        binary: true
      });
      res.rows.should.have.length(4);
      res.rows.forEach((row) => {
        should.not.exist(row.doc);
      });
      const res2 = await db.allDocs({
        binary: true
      });
      res2.rows.should.have.length(4);
      res2.rows.forEach((row) => {
        should.not.exist(row.doc);
      });
    });

    it('#2858 {binary: true} in allDocs() 5', async () => {
      const db = new PouchDB(dbs.name);
      const docs = [binAttDoc, binAttDoc2, pngAttDoc,
        {_id: 'bar'},
        {_id: 'foo', deleted: true}];
      await db.bulkDocs(docs);
      const res = await db.allDocs({
        keys: [
          binAttDoc._id, binAttDoc2._id, pngAttDoc._id, 'foo', 'bar'
        ],
        attachments: true,
        binary: true,
        include_docs: true
      });
      res.rows.should.have.length(5);

      await Promise.all(res.rows.map(async (row, i) => {
        if (docs[i]._deleted) {
          should.not.exist(row.doc);
          return;
        }
        const atts = docs[i]._attachments;
        const attName = atts && Object.keys(atts)[0];
        const expected = atts && atts[attName];
        const savedDoc = row.doc;
        if (!atts) {
          should.not.exist(savedDoc._attachments);
          return;
        }
        const att = savedDoc._attachments[attName];
        should.not.exist(att.stub);
        should.exist(att.digest);
        att.content_type.should.equal(expected.content_type);
        att.data.should.not.be.a('string');
        att.data.type.should.equal(expected.content_type);
        const bin = await testUtils.readBlobPromise(att.data);
        testUtils.btoa(bin).should.equal(expected.data);
      }));
    });

    it('#2858 {binary: true} in allDocs(), many atts', async () => {
      const db = new PouchDB(dbs.name);
      const docs = [
        {_id: 'baz', _attachments: {
          'text1.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text1')
          },
          'text2.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text2')
          }
        }},
        {_id: 'foo', _attachments: {
          'text5.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text5')
          }
        }},
        {_id: 'quux', _attachments: {
          'text3.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text3')
          },
          'text4.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text4')
          }
        }},
        {_id: 'zob', _attachments: {
          'text6.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text3')
          }
        }},
        {_id: 'zorb', _attachments: {
          'text2.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text2')
          },
          'text3.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text3')
          }
        }}
      ];
      await db.bulkDocs(docs);
      const res = await db.allDocs({
        attachments: true,
        binary: true,
        include_docs: true
      });
      res.rows.should.have.length(5);

      await Promise.all(res.rows.map(async (row) => {
        const doc = docs.filter((x) => x._id === row.id)[0];
        const atts = doc._attachments;
        const attNames = Object.keys(atts);
        await Promise.all(attNames.map(async (attName) => {
          const expected = atts && atts[attName];
          const savedDoc = row.doc;
          const att = savedDoc._attachments[attName];
          should.not.exist(att.stub);
          should.exist(att.digest);
          att.content_type.should.equal(expected.content_type);
          att.data.should.not.be.a('string');
          att.data.type.should.equal(expected.content_type);
          const bin = await testUtils.readBlobPromise(att.data);
          testUtils.btoa(bin).should.equal(expected.data);
        }));
      }));
    });

    it('#2858 {binary: true} in allDocs(), mixed atts', async () => {
      const db = new PouchDB(dbs.name);
      const docs = [
        {_id: 'baz', _attachments: {
          'text1.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text1')
          },
          'text2.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text2')
          }
        }},
        {_id: 'foo', _attachments: {
          'text5.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text5')
          }
        }},
        {_id: 'imdeleted', _deleted: true},
        {_id: 'quux', _attachments: {
          'text3.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text3')
          },
          'text4.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text4')
          }
        }},
        {_id: 'imempty'},
        {_id: 'zob', _attachments: {
          'text6.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text3')
          }
        }},

        {_id: 'imempty2'},
        {_id: 'zorb', _attachments: {
          'text2.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text2')
          },
          'text3.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text3')
          }
        }},
        {_id: 'imkindaempty', _attachments: {
          'text0.txt': {
            content_type: 'text/plain',
            data: ''
          }
        }}
      ];
      await db.bulkDocs(docs);
      const res = await db.allDocs({
        attachments: true,
        binary: true,
        include_docs: true
      });
      res.rows.should.have.length(8);

      await Promise.all(res.rows.map(async (row) => {
        const doc = docs.filter((x) => x._id === row.id)[0];
        if (doc._deleted) {
          should.not.exist(row.doc);
          return;
        }
        const atts = doc._attachments;
        if (!atts) {
          should.not.exist(row.doc._attachments);
          return;
        }
        const attNames = Object.keys(atts);
        await Promise.all(attNames.map(async (attName) => {
          const expected = atts && atts[attName];
          const savedDoc = row.doc;
          const att = savedDoc._attachments[attName];
          should.not.exist(att.stub);
          should.exist(att.digest);
          att.content_type.should.equal(expected.content_type);
          att.data.should.not.be.a('string');
          att.data.type.should.equal(expected.content_type);
          const bin = await testUtils.readBlobPromise(att.data);
          testUtils.btoa(bin).should.equal(expected.data);
        }));
      }));
    });

    it('#2858 {binary: true} in changes() non-live', async () => {
      const db = new PouchDB(dbs.name);
      const docs = [binAttDoc, binAttDoc2, pngAttDoc,
        {_id: 'bar'},
        {_id: 'foo', deleted: true}];
      await db.bulkDocs(docs);
      const res = await db.changes({
        return_docs: true,
        attachments: true,
        binary: true,
        include_docs: true
      });
      res.results.should.have.length(5);

      await Promise.all(res.results.map(async (row) => {
        const doc = docs.filter((x) => x._id === row.id)[0];
        if (doc._deleted) {
          should.not.exist(row.doc);
          return;
        }
        const atts = doc._attachments;
        const attName = atts && Object.keys(atts)[0];
        const expected = atts && atts[attName];
        const savedDoc = row.doc;
        if (!atts) {
          should.not.exist(savedDoc._attachments);
          return;
        }
        const att = savedDoc._attachments[attName];
        should.not.exist(att.stub);
        should.exist(att.digest);
        att.content_type.should.equal(expected.content_type);
        att.data.should.not.be.a('string');
        att.data.type.should.equal(expected.content_type);
        const bin = await testUtils.readBlobPromise(att.data);
        testUtils.btoa(bin).should.equal(expected.data);
      }));
    });

    it('#2858 {binary: true} in changes() non-live, many atts', async () => {
      const db = new PouchDB(dbs.name);
      const docs = [
        {_id: 'baz', _attachments: {
          'text1.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text1')
          },
          'text2.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text2')
          }
        }},
        {_id: 'foo', _attachments: {
          'text5.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text5')
          }
        }},
        {_id: 'quux', _attachments: {
          'text3.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text3')
          },
          'text4.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text4')
          }
        }},
        {_id: 'zob', _attachments: {
          'text6.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text3')
          }
        }},
        {_id: 'zorb', _attachments: {
          'text2.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text2')
          },
          'text3.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text3')
          }
        }}
      ];
      await db.bulkDocs(docs);
      const res = await db.changes({
        return_docs: true,
        attachments: true,
        binary: true,
        include_docs: true
      });
      res.results.should.have.length(5);

      await Promise.all(res.results.map(async (row) => {
        const doc = docs.filter((x) => x._id === row.id)[0];
        const atts = doc._attachments;
        const attNames = Object.keys(atts);
        await Promise.all(attNames.map(async (attName) => {
          const expected = atts && atts[attName];
          const savedDoc = row.doc;
          const att = savedDoc._attachments[attName];
          should.not.exist(att.stub);
          should.exist(att.digest);
          att.content_type.should.equal(expected.content_type);
          att.data.should.not.be.a('string');
          att.data.type.should.equal(expected.content_type);
          const bin = await testUtils.readBlobPromise(att.data);
          testUtils.btoa(bin).should.equal(expected.data);
        }));
      }));
    });

    it('#2858 {binary: true} in changes() non-live, mixed atts', async () => {
      const db = new PouchDB(dbs.name);
      const docs = [
        {_id: 'baz', _attachments: {
          'text1.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text1')
          },
          'text2.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text2')
          }
        }},
        {_id: 'foo', _attachments: {
          'text5.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text5')
          }
        }},
        {_id: 'imdeleted', _deleted: true},
        {_id: 'quux', _attachments: {
          'text3.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text3')
          },
          'text4.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text4')
          }
        }},
        {_id: 'imempty'},
        {_id: 'zob', _attachments: {
          'text6.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text3')
          }
        }},

        {_id: 'imempty2'},
        {_id: 'zorb', _attachments: {
          'text2.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text2')
          },
          'text3.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text3')
          }
        }},
        {_id: 'imkindaempty', _attachments: {
          'text0.txt': {
            content_type: 'text/plain',
            data: ''
          }
        }}
      ];
      await db.bulkDocs(docs);
      const res = await db.changes({
        return_docs: true,
        attachments: true,
        binary: true,
        include_docs: true
      });
      res.results.should.have.length(9);

      await Promise.all(res.results.map(async (row) => {
        const doc = docs.filter((x) => x._id === row.id)[0];
        const atts = doc._attachments;
        if (!atts) {
          should.not.exist(row.doc._attachments);
          return;
        }
        const attNames = Object.keys(atts);
        await Promise.all(attNames.map(async (attName) => {
          const expected = atts && atts[attName];
          const savedDoc = row.doc;
          const att = savedDoc._attachments[attName];
          should.not.exist(att.stub);
          should.exist(att.digest);
          att.content_type.should.equal(expected.content_type);
          att.data.should.not.be.a('string');
          att.data.type.should.equal(expected.content_type);
          const bin = await testUtils.readBlobPromise(att.data);
          testUtils.btoa(bin).should.equal(expected.data);
        }));
      }));
    });

    it('#2858 {binary: true} non-live changes, complete event', async () => {
      const db = new PouchDB(dbs.name);
      const docs = [
        {_id: 'baz', _attachments: {
          'text1.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text1')
          },
          'text2.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text2')
          }
        }},
        {_id: 'foo', _attachments: {
          'text5.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text5')
          }
        }},
        {_id: 'imdeleted', _deleted: true},
        {_id: 'quux', _attachments: {
          'text3.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text3')
          },
          'text4.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text4')
          }
        }},
        {_id: 'imempty'},
        {_id: 'zob', _attachments: {
          'text6.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text3')
          }
        }},

        {_id: 'imempty2'},
        {_id: 'zorb', _attachments: {
          'text2.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text2')
          },
          'text3.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text3')
          }
        }},
        {_id: 'imkindaempty', _attachments: {
          'text0.txt': {
            content_type: 'text/plain',
            data: ''
          }
        }}
      ];
      await db.bulkDocs(docs);
      const results = await new Promise((resolve, reject) => {
        db.changes({
          return_docs: true,
          attachments: true,
          binary: true,
          include_docs: true
        }).on('error', reject).on('complete', resolve);
      });
      await Promise.all(results.results.map(async (row) => {
        const doc = docs.filter((x) => x._id === row.id)[0];
        if (row.deleted) {
          should.not.exist(row.doc._attachments);
          return;
        }
        const atts = doc._attachments;
        const savedDoc = row.doc;
        if (!atts) {
          should.not.exist(savedDoc._attachments);
          return;
        }
        const attNames = Object.keys(atts);
        await Promise.all(attNames.map(async (attName) => {
          const expected = atts && atts[attName];
          const att = savedDoc._attachments[attName];
          should.not.exist(att.stub);
          should.exist(att.digest);
          att.content_type.should.equal(expected.content_type);
          att.data.should.not.be.a('string');
          att.data.type.should.equal(expected.content_type);
          const bin = await testUtils.readBlobPromise(att.data);
          testUtils.btoa(bin).should.equal(expected.data);
        }));
      }));
    });

    it('#2858 {binary: true} in live changes', async () => {
      const db = new PouchDB(dbs.name);
      const docs = [binAttDoc, binAttDoc2, pngAttDoc,
        {_id: 'bar'},
        {_id: 'foo', deleted: true}];
      await db.bulkDocs(docs);
      await new Promise((resolve, reject) => {
        const ret = db.changes({
          return_docs: true,
          attachments: true,
          binary: true,
          include_docs: true,
          live: true
        }).on('error', reject)
          .on('change', handleChange)
          .on('complete', resolve);

        let promise = Promise.resolve();
        let done = 0;

        function doneWithDoc() {
          if (++done === 5 && changes === 5) {
            ret.cancel();
          }
        }

        let changes = 0;
        function handleChange(change) {
          changes++;
          promise = (async () => {
            await promise;
            const doc = docs.filter((x) => x._id === change.id)[0];
            if (change.deleted) {
              should.not.exist(change.doc);
              return doneWithDoc();
            }
            const atts = doc._attachments;
            const attName = atts && Object.keys(atts)[0];
            const expected = atts && atts[attName];
            const savedDoc = change.doc;
            if (!atts) {
              should.not.exist(savedDoc._attachments);
              return doneWithDoc();
            }
            const att = savedDoc._attachments[attName];
            should.not.exist(att.stub);
            should.exist(att.digest);
            att.content_type.should.equal(expected.content_type);
            att.data.should.not.be.a('string');
            att.data.type.should.equal(expected.content_type);
            const bin = await testUtils.readBlobPromise(att.data);
            testUtils.btoa(bin).should.equal(expected.data);
            doneWithDoc();
          })().catch(reject);
        }
      });
    });

    it('#2858 {binary: true} in live changes, mixed atts', async () => {
      const db = new PouchDB(dbs.name);
      const docs = [
        {_id: 'baz', _attachments: {
          'text1.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text1')
          },
          'text2.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text2')
          }
        }},
        {_id: 'foo', _attachments: {
          'text5.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text5')
          }
        }},
        {_id: 'imdeleted', _deleted: true},
        {_id: 'quux', _attachments: {
          'text3.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text3')
          },
          'text4.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text4')
          }
        }},
        {_id: 'imempty'},
        {_id: 'zob', _attachments: {
          'text6.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text3')
          }
        }},

        {_id: 'imempty2'},
        {_id: 'zorb', _attachments: {
          'text2.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text2')
          },
          'text3.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('text3')
          }
        }},
        {_id: 'imkindaempty', _attachments: {
          'text0.txt': {
            content_type: 'text/plain',
            data: ''
          }
        }}
      ];
      await db.bulkDocs(docs);
      await new Promise((resolve, reject) => {
        const ret = db.changes({
          return_docs: true,
          attachments: true,
          binary: true,
          include_docs: true,
          live: true
        }).on('error', reject)
          .on('change', handleChange)
          .on('complete', resolve);

        let promise = Promise.resolve();
        let done = 0;

        function doneWithDoc() {
          if (++done === 9 && changes === 9) {
            ret.cancel();
          }
        }

        let changes = 0;
        function handleChange(change) {
          changes++;
          promise = (async () => {
            await promise;
            const doc = docs.filter((x) => x._id === change.id)[0];
            if (change.deleted) {
              should.not.exist(change.doc._attachments);
              return doneWithDoc();
            }
            const atts = doc._attachments;
            const savedDoc = change.doc;
            if (!atts) {
              should.not.exist(savedDoc._attachments);
              return doneWithDoc();
            }
            const attNames = Object.keys(atts);
            await Promise.all(attNames.map(async (attName) => {
              const expected = atts && atts[attName];
              const att = savedDoc._attachments[attName];
              should.not.exist(att.stub);
              should.exist(att.digest);
              att.content_type.should.equal(expected.content_type);
              att.data.should.not.be.a('string');
              att.data.type.should.equal(expected.content_type);
              const bin = await testUtils.readBlobPromise(att.data);
              testUtils.btoa(bin).should.equal(expected.data);
            }));
            doneWithDoc();
          })().catch(reject);
        }
      });
    });

    it('#2858 {binary: true} in live+retry changes', async () => {
      const db = new PouchDB(dbs.name);
      const docs = [binAttDoc, binAttDoc2, pngAttDoc,
        {_id: 'bar'},
        {_id: 'foo', deleted: true}];
      await db.bulkDocs(docs);
      await new Promise((resolve, reject) => {
        const ret = db.changes({
          return_docs: true,
          attachments: true,
          binary: true,
          include_docs: true,
          live: true
        }).on('error', reject)
          .on('change', handleChange)
          .on('complete', resolve);

        let promise = Promise.resolve();
        let done = 0;

        function doneWithDoc() {
          if (++done === 5 && changes === 5) {
            ret.cancel();
          }
        }

        let changes = 0;
        function handleChange(change) {
          changes++;
          promise = (async () => {
            await promise;
            const doc = docs.filter((x) => x._id === change.id)[0];
            if (change.deleted) {
              should.not.exist(change.doc);
              return doneWithDoc();
            }
            const atts = doc._attachments;
            const attName = atts && Object.keys(atts)[0];
            const expected = atts && atts[attName];
            const savedDoc = change.doc;
            if (!atts) {
              should.not.exist(savedDoc._attachments);
              return doneWithDoc();
            }
            const att = savedDoc._attachments[attName];
            should.not.exist(att.stub);
            should.exist(att.digest);
            att.content_type.should.equal(expected.content_type);
            att.data.should.not.be.a('string');
            att.data.type.should.equal(expected.content_type);
            const bin = await testUtils.readBlobPromise(att.data);
            testUtils.btoa(bin).should.equal(expected.data);
            doneWithDoc();
          })().catch(reject);
        }
      });
    });

    it('#2858 {binary: true} in live changes, attachments:false', async () => {
      const db = new PouchDB(dbs.name);
      const docs = [binAttDoc, binAttDoc2, pngAttDoc,
        {_id: 'bar'},
        {_id: 'foo', deleted: true}];
      await db.bulkDocs(docs);
      await new Promise((resolve, reject) => {
        const ret = db.changes({
          include_docs: true,
          binary: true,
          live: true
        }).on('error', reject)
          .on('change', handleChange)
          .on('complete', resolve);

        let promise = Promise.resolve();
        let done = 0;

        function doneWithDoc() {
          if (++done === 5 && changes === 5) {
            ret.cancel();
          }
        }

        let changes = 0;
        function handleChange(change) {
          changes++;
          promise = (async () => {
            await promise;
            const doc = docs.filter((x) => x._id === change.id)[0];
            if (change.deleted) {
              should.not.exist(change.doc);
              return doneWithDoc();
            }
            const atts = doc._attachments;
            const attName = atts && Object.keys(atts)[0];
            const expected = atts && atts[attName];
            const savedDoc = change.doc;
            if (!atts) {
              should.not.exist(savedDoc._attachments);
              return doneWithDoc();
            }
            const att = savedDoc._attachments[attName];
            att.stub.should.equal(true);
            should.exist(att.digest);
            att.content_type.should.equal(expected.content_type);
            should.not.exist(att.data);
            doneWithDoc();
          })().catch(reject);
        }
      });
    });

    it('#2858 {binary: true} in live changes, include_docs:false', async () => {
      const db = new PouchDB(dbs.name);
      const docs = [binAttDoc, binAttDoc2, pngAttDoc,
        {_id: 'bar'},
        {_id: 'foo', deleted: true}];
      await db.bulkDocs(docs);
      await new Promise((resolve, reject) => {
        const ret = db.changes({
          attachments: true,
          binary: true,
          live: true
        }).on('error', reject)
          .on('change', handleChange)
          .on('complete', resolve);

        let promise = Promise.resolve();
        let done = 0;

        function doneWithDoc() {
          if (++done === 5 && changes === 5) {
            ret.cancel();
          }
        }

        let changes = 0;
        function handleChange(change) {
          changes++;
          promise = (async () => {
            await promise;
            should.not.exist(change.doc);
            doneWithDoc();
          })().catch(reject);
        }
      });
    });

    it('#6736 {binary: true} in bulkGet()', async () => {
      const db = new PouchDB(dbs.name);
      const docs = [binAttDoc];
      const response = await db.bulkDocs(docs);
      const attName = Object.keys(binAttDoc._attachments)[0];
      const expected = binAttDoc._attachments[attName];
      const bulkResponse = await db.bulkGet({
        docs: response,
        attachments: true,
        binary: true
      });
      const result = bulkResponse.results[0];
      const att = result.docs[0].ok._attachments[attName];
      should.not.exist(att.stub);
      should.exist(att.digest);
      att.content_type.should.equal(expected.content_type);
      att.data.should.not.be.a('string');
      att.data.type.should.equal(expected.content_type);
      const bin = await testUtils.readBlobPromise(att.data);
      testUtils.btoa(bin).should.equal(expected.data);
    });

    it('Measures length correctly after put()', async () => {
      const db = new PouchDB(dbs.name);
      await db.put(binAttDoc);
      const doc = await db.get(binAttDoc._id);
      delete doc._attachments["foo.txt"].revpos;

      // because of libicu vs. ascii
      const digest = doc._attachments["foo.txt"].digest;
      const validDigests = [
        "md5-qUUYqS41RhwF0TrCsTAxFg==",
        "md5-aEI7pOYCRBLTRQvvqYrrJQ==",
        "md5-jeLnIuUvK7d+6gya044lVA=="
      ];
      validDigests.indexOf(digest).should.not.equal(-1,
        'expected ' + digest  + ' to be in: ' +
          JSON.stringify(validDigests));
      delete doc._attachments["foo.txt"].digest;
      doc._attachments.should.deep.equal({
        "foo.txt": {
          "content_type": "text/plain",
          "stub": true,
          length: 29
        }
      });
    });

    it('#3074 non-live changes()', async () => {
      const db = new PouchDB(dbs.name);
      const docs = [];
      for (let i = 0; i < 5; i++) {
        docs.push({
          _id: i.toString(),
          _attachments: {
            'foo.png': {
              data: icons[i],
              content_type: 'image/png'
            }
          }
        });
      }
      await db.bulkDocs(docs);
      let res = await db.changes({
        return_docs: true,
        include_docs: true,
        attachments: true
      });
      let attachments = res.results.sort((left, right) => {
        return left.id < right.id ? -1 : 1;
      }).map((change) => {
        const doc = change.doc;
        delete doc._attachments['foo.png'].revpos;
        return doc._attachments;
      });
      attachments.should.deep.equal(icons.map((icon, i) => {
        return {
          "foo.png": {
            "content_type": "image/png",
            "data": icon,
            "digest": iconDigests[i]
          }
        };
      }), 'when attachments=true');
      res = await db.changes({return_docs: true, include_docs: true});
      attachments = res.results.sort((left, right) => {
        return left.id < right.id ? -1 : 1;
      }).map((change) => {
        const doc = change.doc;
        delete doc._attachments['foo.png'].revpos;
        return doc._attachments['foo.png'];
      });
      attachments.should.deep.equal(icons.map((icon, i) => {
        return {
          "content_type": "image/png",
          stub: true,
          "digest": iconDigests[i],
          length: iconLengths[i]
        };
      }), 'when attachments=false');
      res = await db.changes({return_docs: true, attachments: true});
      res.results.should.have.length(5);
      res.results.forEach((row) => {
        should.not.exist(row.doc,
          'no doc when attachments=true but include_docs=false');
      });
      res = await db.changes({return_docs: true});
      res.results.should.have.length(5);
      res.results.forEach((row) => {
        should.not.exist(row.doc,
          'no doc when attachments=false and include_docs=false');
      });
    });

    it('#3074 live changes()', async () => {
      const db = new PouchDB(dbs.name);

      function liveChangesPromise(opts) {
        opts.live = true;
        return new Promise((resolve, reject) => {
          const retChanges = {results: []};
          const changes = db.changes(opts)
            .on('change', (change) => {
              retChanges.results.push(change);
              if (retChanges.results.length === 5) {
                changes.cancel();
                resolve(retChanges);
              }
            }).on('error', reject);
        });
      }

      const docs = [];
      for (let i = 0; i < 5; i++) {
        docs.push({
          _id: i.toString(),
          _attachments: {
            'foo.png': {
              data: icons[i],
              content_type: 'image/png'
            }
          }
        });
      }
      await db.bulkDocs(docs);
      let res = await liveChangesPromise({
        return_docs: true,
        include_docs: true,
        attachments: true
      });
      let attachments = res.results.sort((left, right) => {
        return left.id < right.id ? -1 : 1;
      }).map((change) => {
        const doc = change.doc;
        delete doc._attachments['foo.png'].revpos;
        return doc._attachments;
      });
      attachments.should.deep.equal(icons.map((icon, i) => {
        return {
          "foo.png": {
            "content_type": "image/png",
            "data": icon,
            "digest": iconDigests[i]
          }
        };
      }), 'when attachments=true');
      res = await liveChangesPromise({include_docs: true});
      attachments = res.results.sort((left, right) => {
        return left.id < right.id ? -1 : 1;
      }).map((change) => {
        const doc = change.doc;
        delete doc._attachments['foo.png'].revpos;
        return doc._attachments['foo.png'];
      });
      attachments.should.deep.equal(icons.map((icon, i) => {
        return {
          "content_type": "image/png",
          stub: true,
          "digest": iconDigests[i],
          length: iconLengths[i]
        };
      }), 'when attachments=false');
      res = await liveChangesPromise({attachments: true});
      res.results.should.have.length(5);
      res.results.forEach((row) => {
        should.not.exist(row.doc,
          'no doc when attachments=true but include_docs=false');
      });
      res = await liveChangesPromise({});
      res.results.should.have.length(5);
      res.results.forEach((row) => {
        should.not.exist(row.doc,
          'no doc when attachments=false and include_docs=false');
      });
    });

    it('#3074 non-live changes(), no attachments', async () => {
      const db = new PouchDB(dbs.name);
      const docs = [];
      for (let i = 0; i < 5; i++) {
        docs.push({
          _id: i.toString()
        });
      }
      await db.bulkDocs(docs);
      let res = await db.changes({
        include_docs: true,
        attachments: true,
        return_docs: true
      });
      let attachments = res.results.sort((left, right) => {
        return left.id < right.id ? -1 : 1;
      }).map((change) => {
        const doc = change.doc;
        return !!doc._attachments;
      });
      attachments.should.deep.equal(icons.map(() => false), 'when attachments=true');
      res = await db.changes({include_docs: true, return_docs: true});
      attachments = res.results.sort((left, right) => {
        return left.id < right.id ? -1 : 1;
      }).map((change) => {
        const doc = change.doc;
        return !!doc._attachments;
      });
      attachments.should.deep.equal(icons.map(() => false), 'when attachments=false');
      res = await db.changes({attachments: true, return_docs: true});
      res.results.should.have.length(5);
      res.results.forEach((row) => {
        should.not.exist(row.doc,
          'no doc when attachments=true but include_docs=false');
      });
      res = await db.changes({return_docs: true});
      res.results.should.have.length(5);
      res.results.forEach((row) => {
        should.not.exist(row.doc,
          'no doc when attachments=false and include_docs=false');
      });
    });

    it('#3074 live changes(), no attachments', async () => {
      const db = new PouchDB(dbs.name);

      function liveChangesPromise(opts) {
        opts.live = true;
        opts.return_docs = true;
        return new Promise((resolve, reject) => {
          const retChanges = {results: []};
          const changes = db.changes(opts)
            .on('change', (change) => {
              retChanges.results.push(change);
              if (retChanges.results.length === 5) {
                changes.cancel();
                resolve(retChanges);
              }
            }).on('error', reject);
        });
      }

      const docs = [];
      for (let i = 0; i < 5; i++) {
        docs.push({
          _id: i.toString()
        });
      }
      await db.bulkDocs(docs);
      let res = await liveChangesPromise({
        return_docs: true,
        include_docs: true,
        attachments: true
      });
      let attachments = res.results.sort((left, right) => {
        return left.id < right.id ? -1 : 1;
      }).map((change) => {
        const doc = change.doc;
        return !!doc._attachments;
      });
      attachments.should.deep.equal(icons.map(() => false), 'when attachments=true');
      res = await liveChangesPromise({include_docs: true});
      attachments = res.results.sort((left, right) => {
        return left.id < right.id ? -1 : 1;
      }).map((change) => {
        const doc = change.doc;
        return !!doc._attachments;
      });
      attachments.should.deep.equal(icons.map(() => false), 'when attachments=false');
      res = await liveChangesPromise({attachments: true});
      res.results.should.have.length(5);
      res.results.forEach((row) => {
        should.not.exist(row.doc,
          'no doc when attachments=true but include_docs=false');
      });
      res = await liveChangesPromise({});
      res.results.should.have.length(5);
      res.results.forEach((row) => {
        should.not.exist(row.doc,
          'no doc when attachments=false and include_docs=false');
      });
    });

    it('#3881 filter extraneous keys from _attachments', async () => {
      const db = new PouchDB(dbs.name);
      await db.put({
        _id: 'foo',
        _attachments: {
          'foo.txt': {
            data: '',
            content_type: 'text/plain',
            follows: false,
            foo: 'bar',
            baz: true,
            quux: 1
          }
        }
      });
      const doc = await db.get('foo', {attachments: true});
      const keys = Object.keys(doc._attachments['foo.txt']).filter((x) => {
        return x !== 'revpos'; // not supported by PouchDB right now
      }).sort();
      keys.should.deep.equal(['content_type', 'data', 'digest']);
    });

    it('#2771 allDocs() 1, single attachment', async () => {
      const db = new PouchDB(dbs.name);
      await db.put(binAttDoc);
      let res = await db.allDocs({key: binAttDoc._id, include_docs: true});
      let doc = res.rows[0].doc;
      delete doc._attachments["foo.txt"].revpos;

      // because of libicu vs. ascii
      const digest = doc._attachments["foo.txt"].digest;
      const validDigests = [
        "md5-qUUYqS41RhwF0TrCsTAxFg==",
        "md5-aEI7pOYCRBLTRQvvqYrrJQ==",
        "md5-jeLnIuUvK7d+6gya044lVA=="
      ];
      validDigests.indexOf(digest).should.not.equal(-1,
        'expected ' + digest  + ' to be in: ' +
        JSON.stringify(validDigests));
      delete doc._attachments["foo.txt"].digest;
      doc._attachments.should.deep.equal({
        "foo.txt": {
          "content_type": "text/plain",
          "stub": true,
          length: 29
        }
      });
      res = await db.allDocs({
        key: binAttDoc._id,
        include_docs: true,
        attachments: true
      });
      doc = res.rows[0].doc;
      doc._attachments['foo.txt'].content_type.should.equal(
        binAttDoc._attachments['foo.txt'].content_type);
      doc._attachments['foo.txt'].data.should.equal(
        binAttDoc._attachments['foo.txt'].data);
    });

    it('#2771 allDocs() 2, many docs same att', async () => {
      const db = new PouchDB(dbs.name);
      const docs = [];
      for (let i = 0; i < 5; i++) {
        docs.push({
          _id: i.toString(),
          _attachments: {
            'foo.txt': {
              data: 'VGhpcyBpcyBhIGJhc2U2NCBlbmNvZGVkIHRleHQ=',
              content_type: 'text/plain'
            }
          }
        });
      }
      await db.bulkDocs(docs);
      const res = await db.allDocs({include_docs: true, attachments: true});
      const attachments = res.rows.map((row) => {
        const doc = row.doc;
        delete doc._attachments['foo.txt'].revpos;
        should.exist(doc._attachments['foo.txt'].digest);
        delete doc._attachments['foo.txt'].digest;
        return doc._attachments;
      });
      attachments.should.deep.equal([1, 2, 3, 4, 5].map(() => {
        return {
          "foo.txt": {
            "content_type": "text/plain",
            "data": "VGhpcyBpcyBhIGJhc2U2NCBlbmNvZGVkIHRleHQ="
          }
        };
      }));
    });

    it('#2771 allDocs() 3, many docs diff atts', async () => {
      const db = new PouchDB(dbs.name);
      const docs = [];
      for (let i = 0; i < 5; i++) {
        docs.push({
          _id: i.toString(),
          _attachments: {
            'foo.png': {
              data: icons[i],
              content_type: 'image/png'
            }
          }
        });
      }
      await db.bulkDocs(docs);
      let res = await db.allDocs({include_docs: true, attachments: true});
      let attachments = res.rows.map((row) => {
        const doc = row.doc;
        delete doc._attachments['foo.png'].revpos;
        return doc._attachments;
      });
      attachments.should.deep.equal(icons.map((icon, i) => {
        return {
          "foo.png": {
            "content_type": "image/png",
            "data": icon,
            "digest": iconDigests[i]
          }
        };
      }));
      res = await db.allDocs({include_docs: true});
      attachments = res.rows.map((row) => {
        const doc = row.doc;
        delete doc._attachments['foo.png'].revpos;
        return doc._attachments['foo.png'];
      });
      attachments.should.deep.equal(icons.map((icon, i) => {
        return {
          "content_type": "image/png",
          stub: true,
          "digest": iconDigests[i],
          length: iconLengths[i]
        };
      }));
    });

    it('#2771 allDocs() 4, mix of atts and no atts', async () => {
      const db = new PouchDB(dbs.name);
      const docs = [];
      for (let i = 0; i < 5; i++) {
        const doc = {
          _id: i.toString()
        };
        if (i % 2 === 1) {
          doc._attachments = {
            'foo.png': {
              data: icons[i],
              content_type: 'image/png'
            }
          };
        }
        docs.push(doc);
      }
      await db.bulkDocs(docs);
      let res = await db.allDocs({include_docs: true, attachments: true});
      let attachments = res.rows.map((row, i) => {
        const doc = row.doc;
        if (i % 2 === 1) {
          delete doc._attachments['foo.png'].revpos;
          return doc._attachments;
        }
        return null;
      });
      attachments.should.deep.equal(icons.map((icon, i) => {
        if (i % 2 === 0) {
          return null;
        }
        return {
          "foo.png": {
            "content_type": "image/png",
            "data": icon,
            "digest": iconDigests[i]
          }
        };
      }));
      res = await db.allDocs({include_docs: true});
      attachments = res.rows.map((row, i) => {
        const doc = row.doc;
        if (i % 2 === 1) {
          delete doc._attachments['foo.png'].revpos;
          return doc._attachments['foo.png'];
        }
        return null;
      });
      attachments.should.deep.equal(icons.map((icon, i) => {
        if (i % 2 === 0) {
          return null;
        }
        return {
          "content_type": "image/png",
          stub: true,
          "digest": iconDigests[i],
          length: iconLengths[i]
        };
      }));
    });

    it('#2771 allDocs() 5, no atts', async () => {
      const db = new PouchDB(dbs.name);
      const docs = [];
      for (let i = 0; i < 5; i++) {
        const doc = {
          _id: i.toString()
        };
        docs.push(doc);
      }
      await db.bulkDocs(docs);
      let res = await db.allDocs({include_docs: true, attachments: true});
      res.rows.should.have.length(5);
      res.rows.forEach((row) => {
        should.exist(row.doc);
        should.not.exist(row.doc._attachments);
      });
      res = await db.allDocs({include_docs: true});
      res.rows.should.have.length(5);
      res.rows.forEach((row) => {
        should.exist(row.doc);
        should.not.exist(row.doc._attachments);
      });
    });

    it('#2771 allDocs() 6, no docs', async () => {
      const db = new PouchDB(dbs.name);
      const docs = [];
      for (let i = 0; i < 5; i++) {
        const doc = {
          _id: i.toString()
        };
        docs.push(doc);
      }
      await db.bulkDocs(docs);
      let res = await db.allDocs({
        include_docs: true,
        attachments: true,
        keys: []
      });
      res.rows.should.have.length(0);
      res = await db.allDocs({include_docs: true, keys: []});
      res.rows.should.have.length(0);
    });

    it('#2771 allDocs() 7, revisions and deletions', async () => {
      const db = new PouchDB(dbs.name, {auto_compaction: false});
      let doc = {
        _id: 'doc',
        _attachments: {
          'foo.txt': {
            content_type: 'text/plain',
            data: 'Zm9vYmFy' // 'foobar'
          }
        }
      };
      let rev;
      await db.put(doc);
      let res = await db.allDocs({keys: ['doc'], attachments: true, include_docs: true});
      doc = res.rows[0].doc;
      doc._attachments['foo.txt'].data.should.equal('Zm9vYmFy');
      rev = doc._rev;
      doc._attachments['foo.txt'] = {
        content_type: 'text/plain',
        data: 'dG90bw=='
      }; // 'toto'
      await db.put(doc);
      res = await db.allDocs({keys: ['doc'], attachments: true, include_docs: true});
      doc = res.rows[0].doc;
      doc._attachments['foo.txt'].data.should.equal('dG90bw==');
      const removeRes = await db.remove(doc);
      rev = removeRes.rev;
      res = await db.allDocs({keys: ['doc'], attachments: true, include_docs: true});
      // technically CouchDB sets this to null, but we won't adhere strictly to that
      should.not.exist(res.rows[0].doc);
      delete res.rows[0].doc;
      res.rows.should.deep.equal([
        {
          id: "doc",
          key: "doc",
          value: {
            rev,
            deleted: true
          }
        }
      ]);
    });

    it('#2771 allDocs() 8, empty attachment', async () => {
      const db = new PouchDB(dbs.name);
      await db.put(binAttDoc2);
      let res = await db.allDocs({key: binAttDoc2._id, include_docs: true});
      let doc = res.rows[0].doc;
      delete doc._attachments["foo.txt"].revpos;

      // because of libicu vs. ascii
      const digest = doc._attachments["foo.txt"].digest;
      const validDigests = [
        'md5-1B2M2Y8AsgTpgAmY7PhCfg==',
        'md5-cCkGbCesb17xjWYNV0GXmg==',
        'md5-3gIs+o2eJiHrXZqziQZqBA=='
      ];
      validDigests.indexOf(digest).should.not.equal(-1,
        'expected ' + digest  + ' to be in: ' +
        JSON.stringify(validDigests));
      delete doc._attachments["foo.txt"].digest;
      delete doc._attachments["foo.txt"].digest;
      doc._attachments.should.deep.equal({
        "foo.txt": {
          "content_type": "text/plain",
          "stub": true,
          length: 0
        }
      });
      res = await db.allDocs({
        key: binAttDoc2._id,
        include_docs: true,
        attachments: true
      });
      doc = res.rows[0].doc;
      doc._attachments['foo.txt'].content_type.should.equal(
        binAttDoc2._attachments['foo.txt'].content_type);
      doc._attachments['foo.txt'].data.should.equal(
        binAttDoc2._attachments['foo.txt'].data);
    });

    it('No length for non-stubs', async () => {
      const db = new PouchDB(dbs.name);
      await db.put(binAttDoc);
      const doc = await db.get(binAttDoc._id, {attachments: true});
      should.not.exist(doc._attachments['foo.txt'].stub);
      should.not.exist(doc._attachments['foo.txt'].length);
    });

    it('Test some attachments', async () => {
      const db = new PouchDB(dbs.name);
      await db.put(binAttDoc);
      const doc = await db.get('bin_doc');
      should.exist(doc._attachments, 'doc has attachments field');
      should.exist(doc._attachments['foo.txt'], 'doc has attachment');
      doc._attachments['foo.txt'].stub.should.equal(true);
      doc._attachments['foo.txt'].content_type.should.equal('text/plain');

      let res = await db.getAttachment('bin_doc', 'foo.txt');
      res.type.should.equal('text/plain');
      let data = await testUtils.readBlobPromise(res);
      data.should.equal('This is a base64 encoded text');

      const rev = await db.put(binAttDoc2);
      res = await db.getAttachment('bin_doc2', 'foo.txt');
      res.type.should.equal('text/plain');
      data = await testUtils.readBlobPromise(res);
      data.should.equal('', 'Correct data returned');

      const blob = testUtils.makeBlob('This is no base64 encoded text');
      const info = await db.putAttachment('bin_doc2', 'foo2.txt', rev.rev, blob, 'text/plain');
      info.ok.should.equal(true);
      res = await db.getAttachment('bin_doc2', 'foo2.txt');
      res.type.should.equal('text/plain');
      data = await testUtils.readBlobPromise(res);
      should.exist(data);
      const docRes = await db.get('bin_doc2', { attachments: true });
      should.exist(docRes._attachments, 'Result has attachments field');
      should.not.exist(docRes._attachments['foo2.txt'].stub, 'stub is false');
      docRes._attachments['foo2.txt'].data.should
        .equal('VGhpcyBpcyBubyBiYXNlNjQgZW5jb2RlZCB0ZXh0');
      docRes._attachments['foo2.txt'].content_type.should
        .equal('text/plain');
      docRes._attachments['foo.txt'].data.should.equal('');
    });

    it('Test getAttachment', async () => {
      const db = new PouchDB(dbs.name);
      await db.put(binAttDoc);
      const res = await db.getAttachment('bin_doc', 'foo.txt');
      res.type.should.equal('text/plain');
      const data = await testUtils.readBlobPromise(res);
      data.should.equal('This is a base64 encoded text', 'correct data');
    });

    it('Test getAttachment for _local doc - should not return attachment', async () => {
      const db = new PouchDB(dbs.name);
      await db.put(binAttDocLocal);

      let res, err;
      try {
        res = await db.getAttachment('_local/bin_doc', 'foo.txt');
      } catch (caughtErr) {
        err = caughtErr;
      }
      should.not.exist(res);

      if (adapter === 'local') {
        err.message.should.equal('missing');
        // TODO indexeddb errors should probably have .reason set
        if (db.adapter !== 'indexeddb') {
          err.reason.should.equal('missing');
        }
      } else if (adapter === 'http') {
        const serverType = await testUtils.getServerType();
        if (serverType === 'couchdb') {
          err.status.should.equal(400);
          const body = await err.json();
          body.reason.should.equal('_local documents do not accept attachments.');
        } else if (serverType === 'pouchdb-express-router' || serverType === 'express-pouchdb') {
          err.status.should.equal(404);
          const body = await err.json();
          body.reason.should.equal('missing');
        } else {
          throw new Error(`No handling for server type: '${serverType}'`);
        }
      } else {
        throw new Error(`No handling for adapter: '${adapter}'`);
      }
    });

    it('Test getAttachment for _local doc - should not return non-existent attachment', async () => {
      const db = new PouchDB(dbs.name);
      await db.put(binAttDocLocal);

      let res, err;
      try {
        res = await db.getAttachment('_local/bin_doc', 'not-real.txt');
      } catch (caughtErr) {
        err = caughtErr;
      }
      should.not.exist(res);

      if (adapter === 'local') {
        err.message.should.equal('missing');
        // TODO indexeddb errors should probably have .reason set
        if (db.adapter !== 'indexeddb') {
          err.reason.should.equal('missing');
        }
      } else if (adapter === 'http') {
        const serverType = await testUtils.getServerType();
        if (serverType === 'couchdb') {
          err.status.should.equal(400);
          const body = await err.json();
          body.reason.should.equal('_local documents do not accept attachments.');
        } else if (serverType === 'pouchdb-express-router' || serverType === 'express-pouchdb') {
          err.status.should.equal(404);
          const body = await err.json();
          body.reason.should.equal('missing');
        } else {
          throw new Error(`No handling for server type: '${serverType}'`);
        }
      } else {
        throw new Error(`No handling for adapter: '${adapter}'`);
      }
    });

    it('Test getAttachment for _local doc - should not return attachment on non-existent doc', async () => {
      const db = new PouchDB(dbs.name);
      await db.put(binAttDocLocal);

      let res, err;
      try {
        res = await db.getAttachment('_local/not_a_doc', 'not-real.txt');
      } catch (caughtErr) {
        err = caughtErr;
      }
      should.not.exist(res);

      if (adapter === 'local') {
        err.message.should.equal('missing');
        // TODO indexeddb errors should probably have .reason set
        if (db.adapter !== 'indexeddb') {
          err.reason.should.equal('missing');
        }
      } else if (adapter === 'http') {
        const serverType = await testUtils.getServerType();
        if (serverType === 'couchdb') {
          err.status.should.equal(400);
          const body = await err.json();
          body.reason.should.equal('_local documents do not accept attachments.');
        } else if (serverType === 'pouchdb-express-router' || serverType === 'express-pouchdb') {
          err.status.should.equal(404);
          const body = await err.json();
          body.reason.should.equal('missing');
        } else {
          throw new Error(`No handling for server type: '${serverType}'`);
        }
      } else {
        throw new Error(`No handling for adapter: '${adapter}'`);
      }
    });

    it('Test attachments:true for _local doc', async () => {
      const db = new PouchDB(dbs.name);
      await db.put(binAttDocLocal);

      const doc = await db.get('_local/bin_doc', { attachments: true });

      if (adapter === 'local') {
        doc._attachments['foo.txt'].content_type.should.equal('text/plain');
        doc._attachments['foo.txt'].data.should.equal('VGhpcyBpcyBhIGJhc2U2NCBlbmNvZGVkIHRleHQ=');
      } else if (adapter === 'http') {
        const serverType = await testUtils.getServerType();

        if (serverType === 'couchdb') {
          should.not.exist(doc._attachments);
        } else if (serverType === 'pouchdb-express-router' || serverType === 'express-pouchdb') {
          doc._attachments['foo.txt'].content_type.should.equal('text/plain');
          JSON.parse(decodeBase64(doc._attachments['foo.txt'].data)).should.deep.equal({
            error: 'not_found',
            reason: 'missing',
          });
        } else {
          throw new Error(`No handling for server type: '${serverType}'`);
        }
      } else {
        throw new Error(`No handling for adapter: '${adapter}'`);
      }
    });

    it('Test getAttachment with stubs', async () => {
      const db = new PouchDB(dbs.name);
      await db.put({
        _id: 'doc',
        _attachments: {
          '1': {
            content_type: 'application/octet-stream',
            data: testUtils.btoa('1\u00002\u00013\u0002')
          }
        }
      });
      let doc = await db.get('doc');
      doc._attachments['2'] = {
        content_type: 'application/octet-stream',
        data: testUtils.btoa('3\u00002\u00011\u0002')
      };
      await db.put(doc);
      let att = await db.getAttachment('doc', '1');
      att.type.should.equal('application/octet-stream');
      let bin = await testUtils.readBlobPromise(att);
      bin.should.equal('1\u00002\u00013\u0002');
      att = await db.getAttachment('doc', '2');
      att.type.should.equal('application/octet-stream');
      bin = await testUtils.readBlobPromise(att);
      bin.should.equal('3\u00002\u00011\u0002');
    });

    it('Test get() with binary:true and stubs', async () => {
      const db = new PouchDB(dbs.name);
      await db.put({
        _id: 'doc',
        _attachments: {
          '1': {
            content_type: 'application/octet-stream',
            data: testUtils.btoa('1\u00002\u00013\u0002')
          }
        }
      });
      let doc = await db.get('doc');
      doc._attachments['2'] = {
        content_type: 'application/octet-stream',
        data: testUtils.btoa('3\u00002\u00011\u0002')
      };
      await db.put(doc);
      doc = await db.get('doc', {attachments: true, binary: true});
      const att1 = doc._attachments['1'].data;
      const att2 = doc._attachments['2'].data;
      att1.type.should.equal('application/octet-stream');
      att2.type.should.equal('application/octet-stream');
      const bin1 = await testUtils.readBlobPromise(att1);
      bin1.should.equal('1\u00002\u00013\u0002');
      const bin2 = await testUtils.readBlobPromise(att2);
      bin2.should.equal('3\u00002\u00011\u0002');
    });

    it('Test attachments in allDocs/changes', async () => {
      const db = new PouchDB(dbs.name);
      const docs = [
        { _id: 'doc0' },
        {
          _id: 'doc1',
          _attachments: {
            'att0': {
              data: 'YXR0YWNobWVudDA=',
              content_type: 'text/plain'
            }
          }
        },
        {
          _id: 'doc2',
          _attachments: {
            'att0': {
              data: 'YXR0YWNobWVudDA=',
              content_type: 'text/plain'
            },
            'att1': {
              data: 'YXR0YWNobWVudDE=',
              content_type: 'text/plain'
            }
          }
        },
        {
          _id: 'doc3',
          _attachments: {
            'att0': {
              data: 'YXR0YWNobWVudDA=',
              content_type: 'text/plain'
            }
          }
        }
      ];
      function sort(a, b) {
        return a.id.localeCompare(b.id);
      }
      await db.bulkDocs({ docs });
      const res = await db.allDocs({ include_docs: true });
      for (let i = 0; i < docs.length; i++) {
        const attachmentsNb = typeof docs[i]._attachments !== 'undefined' ?
          Object.keys(docs[i]._attachments).length : 0;
        for (let j = 0; j < attachmentsNb; j++) {
          res.rows[i].doc._attachments['att' + j].stub.should
            .equal(true, '(allDocs) doc' + i + ' contains att' + j +
                   ' stub');
        }
      }
      should.not.exist(res.rows[0].doc._attachments,
                       '(allDocs) doc0 contains no attachments');
      await new Promise((resolve, reject) => {
        db.changes({
          return_docs: true,
          include_docs: true
        }).on('change', (change) => {
          const i = +change.id.slice(3);
          if (i === 0) {
            should.not.exist(res.rows[0].doc._attachments,
                             '(onChange) doc0 contains no attachments');
          } else {
            const attachmentsNb =
              typeof docs[i]._attachments !== 'undefined' ?
              Object.keys(docs[i]._attachments).length : 0;
            for (let j = 0; j < attachmentsNb; j++) {
              res.rows[i].doc._attachments['att' + j].stub.should
                .equal(true, '(onChange) doc' + i + ' contains att' + j +
                       ' stub');
            }
          }
        }).on('complete', (changesRes) => {
          try {
            let attachmentsNb = 0;
            changesRes.results.sort(sort);
            for (let i = 0; i < 3; i++) {
              attachmentsNb = typeof docs[i]._attachments !== 'undefined' ?
                Object.keys(docs[i]._attachments).length : 0;
              for (let j = 0; j < attachmentsNb; j++) {
                changesRes.results[i].doc._attachments['att' + j].stub.should
                  .equal(true, '(complete) doc' + i + ' contains att' + j +
                         ' stub');
              }
            }
            should.not.exist(changesRes.results[0].doc._attachments,
                             '(complete) doc0 contains no attachments');
            resolve();
          } catch (err) {
            reject(err);
          }
        }).on('error', reject);
      });
    });

    it('Test putAttachment with base64 plaintext', async () => {
      const db = new PouchDB(dbs.name);
      await db.putAttachment('doc', 'att', null, 'Zm9v', 'text/plain');
      const blob = await db.getAttachment('doc', 'att');
      const data = await new Promise((resolve) => {
        testUtils.base64Blob(blob, (data) => {
          resolve(data);
        });
      });
      data.should.equal('Zm9v', 'should get the correct base64 back');
    });

    it('Test putAttachment with invalid base64', async () => {
      const db = new PouchDB(dbs.name);
      try {
        await db.putAttachment('doc', 'att', null, '\u65e5\u672c\u8a9e', 'text/plain');
        throw new Error('Should not succeed');
      } catch (err) {
        err.should.have.property("message", "Some query argument is invalid");
      }
    });

    it('Test getAttachment with empty text', async () => {
      const db = new PouchDB(dbs.name);
      await db.put(binAttDoc2);
      const res = await db.getAttachment('bin_doc2', 'foo.txt');
      (typeof res).should.equal('object', 'res is object, ' +
        'not a string');
      const data = await new Promise((resolve) => {
        testUtils.base64Blob(res, (data) => resolve(data));
      });
      data.should.equal('', 'correct data');
      const doc = await db.get(binAttDoc2._id);
      const att = doc._attachments['foo.txt'];
      att.stub.should.equal(true);
      // both ascii and libicu
      const validDigests = [
        'md5-1B2M2Y8AsgTpgAmY7PhCfg==',
        'md5-cCkGbCesb17xjWYNV0GXmg==',
        'md5-3gIs+o2eJiHrXZqziQZqBA=='
      ];
      validDigests.indexOf(att.digest).should.be.above(-1);
      att.content_type.should.equal('text/plain');
      att.length.should.equal(0);
    });

    it('Test getAttachment with normal text', async () => {
      const db = new PouchDB(dbs.name);
      await db.put(binAttDoc);
      const res = await db.getAttachment('bin_doc', 'foo.txt');
      (typeof res).should.equal('object', 'res is object, ' +
        'not a string');
      const data = await new Promise((resolve) => {
        testUtils.base64Blob(res, (data) => resolve(data));
      });
      data.should.equal(
        binAttDoc._attachments['foo.txt'].data, 'correct data');
    });

    it('Test getAttachment with PNG', async () => {
      const db = new PouchDB(dbs.name);
      await db.put(pngAttDoc);
      const res = await db.getAttachment('png_doc', 'foo.png');
      (typeof res).should.equal('object', 'res is object, ' +
        'not a string');
      const data = await new Promise((resolve) => {
        testUtils.base64Blob(res, (data) => resolve(data));
      });
      data.should
        .equal(pngAttDoc._attachments['foo.png'].data, 'correct data');
    });

    it('Test getAttachment with PNG using bulkDocs', async () => {
      const db = new PouchDB(dbs.name);
      await db.bulkDocs([pngAttDoc]);
      const res = await db.getAttachment('png_doc', 'foo.png');
      const data = await new Promise((resolve) => {
        testUtils.base64Blob(res, (data) => resolve(data));
      });
      data.should
        .equal(pngAttDoc._attachments['foo.png'].data, 'correct data');
    });

    it('Test getAttachment with PNG using post', async () => {
      const db = new PouchDB(dbs.name);
      await db.post(pngAttDoc);
      const res = await db.getAttachment('png_doc', 'foo.png');
      const data = await new Promise((resolve) => {
        testUtils.base64Blob(res, (data) => resolve(data));
      });
      data.should
        .equal(pngAttDoc._attachments['foo.png'].data, 'correct data');
    });

    it('Test postAttachment with PNG then bulkDocs', async () => {
      const db = new PouchDB(dbs.name);
      await db.put({ _id: 'foo' });
      const doc = await db.get('foo');
      const data = pngAttDoc._attachments['foo.png'].data;
      const blob = testUtils.binaryStringToBlob(testUtils.atob(data),
        'image/png');
      await db.putAttachment('foo', 'foo.png', doc._rev, blob, 'image/png');
      await db.bulkDocs([{}]);
    });

    it('proper stub behavior', async () => {
      const db = new PouchDB(dbs.name);
      await db.put(binAttDoc);
      let doc = await db.get(binAttDoc._id);
      await db.putAttachment(doc._id, 'foo.json', doc._rev,
        jsonDoc._attachments['foo.json'].data,
        jsonDoc._attachments['foo.json'].content_type);
      doc = await db.get(binAttDoc._id);
      Object.keys(doc._attachments).forEach((filename) => {
        const att = doc._attachments[filename];
        should.not.exist(att.data);
        att.stub.should.equal(true);
        should.exist(att.digest);
        should.exist(att.content_type);
      });
      doc = await db.get(binAttDoc._id, {attachments: true});
      Object.keys(doc._attachments).forEach((filename) => {
        const att = doc._attachments[filename];
        should.exist(att.data);
        should.not.exist(att.stub);
        should.exist(att.digest);
        should.exist(att.content_type);
      });
    });

    it('Testing with invalid docs', async () => {
      const db = new PouchDB(dbs.name);
      const invalidDoc = {
        '_id': '_invalid',
        foo: 'bar'
      };
      try {
        await db.bulkDocs({
          docs: [
            invalidDoc,
            binAttDoc
          ]
        });
        throw new Error('Should not succeed');
      } catch (err) {
        should.exist(err, 'bad request');
      }
    });

    it('Test create attachment and doc in one go', async () => {
      const db = new PouchDB(dbs.name);
      const blob = testUtils.makeBlob('Mytext');
      const res = await db.putAttachment('anotherdoc', 'mytext', blob, 'text/plain');
      should.exist(res.ok);
    });

    it('Test create attachment and doc in one go without callback',
      async () => {
      const db = new PouchDB(dbs.name);
      await new Promise((resolve, reject) => {
        const changes = db.changes({
          live: true
        }).on('complete', (result) => {
          try {
            result.status.should.equal('cancelled');
            resolve();
          } catch (err) {
            reject(err);
          }
        }).on('change', (change) => {
          if (change.id === 'anotherdoc2') {
            change.id.should.equal('anotherdoc2', 'Doc has been created');
            db.get(change.id, { attachments: true }, (err, doc) => {
              doc._attachments.should.be
                .an('object', 'doc has attachments object');
              should.exist(doc._attachments.mytext,
                           'doc has attachments attachment');
              doc._attachments.mytext.data.should
                .equal('TXl0ZXh0', 'doc has attachments attachment');
              changes.cancel();
            });
          }
        }).on('error', reject);
        const blob = testUtils.makeBlob('Mytext');
        db.putAttachment('anotherdoc2', 'mytext', blob, 'text/plain');
      });
    });

    it('Test create attachment without callback', async () => {
      const db = new PouchDB(dbs.name);
      const resp = await db.put({ _id: 'anotherdoc3' });
      const info = await db.info();
      await new Promise((resolve, reject) => {
        const changes = db.changes({
          since: info.update_seq,
          live: true,
          include_docs: true
        }).on('complete', (result) => {
          try {
            result.status.should.equal('cancelled');
            resolve();
          } catch (err) {
            reject(err);
          }
        }).on('change', (change) => {
          if (change.id === 'anotherdoc3') {
            db.get(change.id, { attachments: true }, (err, doc) => {
              doc._attachments.should.be.an('object',
                                          'doc has attachments object');
              should.exist(doc._attachments.mytext);
              doc._attachments.mytext.data.should.equal('TXl0ZXh0');
              changes.cancel();
            });
          }
        }).on('error', reject);
        const blob = testUtils.makeBlob('Mytext');
        db.putAttachment('anotherdoc3', 'mytext', resp.rev, blob,
          'text/plain');
      });
    });

    it('Test put attachment on a doc without attachments', async () => {
      const db = new PouchDB(dbs.name);
      const resp = await db.put({ _id: 'mydoc' });
      const blob = testUtils.makeBlob('Mytext');
      const res = await db.putAttachment('mydoc', 'mytext', resp.rev, blob, 'text/plain');
      should.exist(res.ok);
    });

    it('Test put attachment with unencoded name', async () => {
      const db = new PouchDB(dbs.name);
      const resp = await db.put({ _id: 'mydoc' });
      const blob = testUtils.makeBlob('Mytext');
      await db.putAttachment('mydoc', 'my/text?@', resp.rev, blob, 'text/plain');
      const res = await db.get('mydoc', { attachments: true });
      should.exist(res._attachments['my/text?@']);
      const attachment = await db.getAttachment('mydoc', 'my/text?@');
      attachment.type.should.equal('text/plain');
      const data = await testUtils.readBlobPromise(attachment);
      data.should.eql('Mytext');
    });

    it('3963 length property on stubs', async () => {
      const db = new PouchDB(dbs.name);

      async function checkAttachments() {
        let doc = await db.get('bin_doc');
        doc._attachments['foo.txt'].stub.should.equal(true);
        doc._attachments['foo.txt'].length.should.equal(29);
        let res = await db.changes({return_docs: true, include_docs: true});
        doc = res.results[0].doc;
        doc._attachments['foo.txt'].stub.should.equal(true);
        doc._attachments['foo.txt'].length.should.equal(29);
        res = await db.allDocs({return_docs: true, include_docs: true});
        doc = res.rows[0].doc;
        doc._attachments['foo.txt'].stub.should.equal(true);
        doc._attachments['foo.txt'].length.should.equal(29);
        const change = await new Promise((resolve, reject) => {
          let change;
          const changes = db.changes({include_docs: true, live: true})
            .on('change', (x) => {
              change = x;
              changes.cancel();
            })
            .on('error', reject)
            .on('complete', () => {
              resolve(change);
            });
        });
        doc = change.doc;
        doc._attachments['foo.txt'].stub.should.equal(true);
        doc._attachments['foo.txt'].length.should.equal(29);
      }

      await db.put(binAttDoc);
      await checkAttachments();
      let doc = await db.get('bin_doc');
      await db.put(doc);
      await checkAttachments();
    });

    it('Testing with invalid rev', async () => {
      const db = new PouchDB(dbs.name);
      const doc = { _id: 'adoc' };
      const resp = await db.put(doc);
      doc._rev = resp.rev;
      doc.foo = 'bar';
      await db.put(doc);
      const blob = testUtils.makeBlob('bar');
      try {
        await db.putAttachment('adoc', 'foo.txt', doc._rev, blob, 'text/plain');
        throw new Error('Should not succeed');
      } catch (err) {
        should.exist(err, 'Attachment has not been saved');
        err.name.should.equal('conflict', 'error is a conflict');
      }
    });

    it('Test put another attachment on a doc with attachments',
      async () => {
      const db = new PouchDB(dbs.name);
      const res1 = await db.put({ _id: 'mydoc' });
      const blob = testUtils.makeBlob('Mytext');
      const res2 = await db.putAttachment('mydoc', 'mytext', res1.rev, blob, 'text/plain');
      const res3 = await db.putAttachment('mydoc', 'mytext2', res2.rev, blob, 'text/plain');
      should.exist(res3.ok);
    });

    it('Test get with attachments: true if empty attachments', async () => {
      const db = new PouchDB(dbs.name);
      await db.put({
        _id: 'foo',
        _attachments: {}
      });
      const res = await db.get('foo', { attachments: true });
      res._id.should.equal('foo');
    });

    it('Test delete attachment from a doc', async () => {
      const db = new PouchDB(dbs.name);
      const putRes = await db.put({
        _id: 'mydoc',
        _attachments: {
          'mytext1': {
            content_type: 'text/plain',
            data: 'TXl0ZXh0MQ=='
          },
          'mytext2': {
            content_type: 'text/plain',
            data: 'TXl0ZXh0Mg=='
          }
        }
      });
      const rev = putRes.rev;
      let res = await db.get('mydoc', { attachments: true });
      res._attachments.should.include.keys('mytext1', 'mytext2');
      try {
        await db.removeAttachment('mydoc', 'mytext1', 0);
        throw new Error('Should not succeed');
      } catch (err) {
        should.exist(err, 'removal should fail due to broken rev');
      }
      await db.removeAttachment('mydoc', 'mytext1', rev);
      res = await db.get('mydoc', { attachments: true });
      res._attachments.should.not.include.keys('mytext1');
      res._attachments.should.include.keys('mytext2');
      const finalRes = await db.removeAttachment('mydoc', 'mytext2', res._rev);
      should.not.exist(finalRes._attachments);
    });

    it('Test a document with a json string attachment', async () => {
      const db = new PouchDB(dbs.name);
      const results = await db.put(jsonDoc);
      const doc = await db.get(results.id);
      should.exist(doc._attachments, 'doc has attachments field');
      doc._attachments.should.include.keys('foo.json');
      doc._attachments['foo.json'].content_type.should
        .equal('application/json', 'doc has correct content type');
      const attachment = await db.getAttachment(results.id, 'foo.json');
      attachment.type.should.equal('application/json');
      await testUtils.readBlobPromise(attachment);
      jsonDoc._attachments['foo.json'].data.should
        .equal('eyJIZWxsbyI6IndvcmxkIn0=', 'correct data');
    });

    it('Test remove doc with attachment', async () => {
      const db = new PouchDB(dbs.name);
      const resp = await db.put({ _id: 'mydoc' });
      const blob = testUtils.makeBlob('Mytext');
      const res = await db.putAttachment('mydoc', 'mytext', resp.rev, blob, 'text/plain');
      should.exist(res.ok);
      const doc = await db.get('mydoc', { attachments: false });
      const removeRes = await db.remove(doc);
      should.exist(removeRes.ok);
    });

    it('Try to insert a doc with unencoded attachment', async () => {
      const db = new PouchDB(dbs.name);
      const doc = {
        _id: 'foo',
        _attachments: {
          'foo.txt': {
            content_type: 'text/plain',
            data: 'this should have been encoded!'
          }
        }
      };
      try {
        await db.put(doc);
        throw new Error('Should not succeed');
      } catch (err) {
        should.exist(err);
      }
    });

    it('Try to get attachment of unexistent doc', async () => {
      const db = new PouchDB(dbs.name);
      try {
        await db.getAttachment('unexistent', 'attachment');
        throw new Error('Should not succeed');
      } catch (err) {
        should.exist(err, 'Correctly returned error');
      }
    });

    it('Test synchronous putAttachment with text data', async () => {
      const db = new PouchDB(dbs.name);
      const blob = testUtils.makeBlob('foobaz', 'text/plain');
      await db.putAttachment('a', 'foo2.txt', '', blob, 'text/plain');
      const doc = await db.get('a', { attachments: true });
      doc._attachments['foo2.txt'].data.should.equal('Zm9vYmF6');
      doc._attachments['foo2.txt'].content_type.should.equal('text/plain');
    });

    it('Test synchronous putAttachment with no text data', async () => {
      const db = new PouchDB(dbs.name);
      await db.putAttachment('a', 'foo2.txt', '', '', 'text/plain');
      const doc = await db.get('a', { attachments: true });
      doc._attachments['foo2.txt'].data.should.equal('');
      // firefox 3 appends charset=utf8
      // see http://forums.mozillazine.org/viewtopic.php?p=6318215#p6318215
      doc._attachments['foo2.txt'].content_type.indexOf('text/plain')
        .should.equal(0, 'expected content-type to start with text/plain');
    });

    it('Test put with partial stubs', async () => {
      const db = new PouchDB(dbs.name);
      let doc = {
        _id: 'doc',
        _attachments: {
          'foo.txt': {
            content_type: 'text/plain',
            data: 'Zm9v'
          },
          'bar.txt': {
            content_type: 'text/plain',
            data: 'Zm9v'
          }
        }
      };
      await db.put(doc);
      doc = await db.get(doc._id);
      doc._attachments['baz.txt'] = {
        content_type: 'text/plain',
        data: 'Zm9v'
      };
      // at this point, foo and bar are stubs, but baz is not
      await db.put(doc);
      doc = await db.get(doc._id, {attachments: true});
      doc._rev.should.not.equal('2-x');
      Object.keys(doc._attachments).should.have.length(3);
      Object.keys(doc._attachments).forEach((key) => {
        const att = doc._attachments[key];
        att.data.should.equal('Zm9v');
        att.content_type.should.equal('text/plain');
      });
    });

    it('Test put with attachments and new_edits=false', async () => {
      const db = new PouchDB(dbs.name);
      const doc = {
        _id: 'doc',
        _rev: '2-x',
        _attachments: {
          'foo.txt': {
            content_type: 'text/plain',
            data: 'Zm9v'
          },
          'bar.txt': {
            content_type: 'text/plain',
            data: 'Zm9v'
          },
          'baz.txt': {
            content_type: 'text/plain',
            data: 'Zm9v'
          }
        },
        _revisions: {
          'start': 2,
          'ids': ['x', 'a']
        }
      };
      await db.bulkDocs([doc], {new_edits: false});
      await db.get(doc._id);
      // at this point, foo and bar are stubs, but baz is not
      await db.bulkDocs([doc], {new_edits: false});
      const fetchedDoc = await db.get(doc._id, {attachments: true});
      fetchedDoc._rev.should.equal('2-x');
      Object.keys(fetchedDoc._attachments).should.have.length(3);
      Object.keys(fetchedDoc._attachments).forEach((key) => {
        const att = fetchedDoc._attachments[key];
        att.data.should.equal('Zm9v');
        att.content_type.should.equal('text/plain');
      });
    });

    it('Test getAttachment with specific rev', async () => {
      const db = new PouchDB(dbs.name, {auto_compaction: false});

      let doc = {
        _id: 'a'
      };
      let rev1;
      let rev2;
      let rev3;
      let res = await db.put(doc);
      doc._rev = rev1 = res.rev;
      doc._attachments = {
        'foo.txt': {
          content_type: 'text/plain',
          data: 'Zm9v'
        }
      };
      res = await db.put(doc);
      doc._rev = rev2 = res.rev;

      delete doc._attachments;
      res = await db.put(doc);
      doc._rev = rev3 = res.rev;

      const blob = await db.getAttachment('a', 'foo.txt', {rev: rev2});
      should.exist(blob);

      await Promise.all([
        db.getAttachment('a', 'foo.txt', {rev: rev1}),
        db.getAttachment('a', 'foo.txt', {rev: '3-fake'}),
        db.getAttachment('a', 'foo.txt'),
        db.getAttachment('a', 'foo.txt', {}),
        db.getAttachment('a', 'foo.txt', {rev: rev3})
      ].map((promise) => {
        return promise.then(() => {
          throw new Error('expected an error');
        }, (err) => {
          should.exist(err);
          err.status.should.equal(404);
        });
      }));
    });

    it('Test getAttachment with diff revs and content', async () => {
      const db = new PouchDB(dbs.name, {auto_compaction: false});

      let doc = {
        _id: 'a',
        _attachments: {
          'foo.txt': {
            content_type: 'text/plain',
            data: 'Zm9v'
          }
        }
      };
      let rev1;
      let rev2;
      let rev3;
      let res = await db.put(doc);
      doc._rev = rev1 = res.rev;
      doc._attachments = {
        'foo.txt': {
          content_type: 'text/plain',
          data: 'YmFy'
        }
      };
      res = await db.put(doc);
      doc._rev = rev2 = res.rev;
      doc._attachments = {
        'foo.txt': {
          content_type: 'text/plain',
          data: 'YmF6'
        }
      };
      res = await db.put(doc);
      doc._rev = rev3 = res.rev;

      const testCases = [
        [db.getAttachment('a', 'foo.txt'), 'baz'],
        [db.getAttachment('a', 'foo.txt', {rev: rev3}), 'baz'],
        [db.getAttachment('a', 'foo.txt', {rev: rev2}), 'bar'],
        [db.getAttachment('a', 'foo.txt', {rev: rev1}), 'foo']
      ];

      await Promise.all(testCases.map(async (testCase) => {
        const promise = testCase[0];
        const expected = testCase[1];
        const blob = await promise;
        blob.type.should.equal('text/plain');
        const bin = await testUtils.readBlobPromise(blob);
        bin.should.equal(expected, 'didn\'t get blob we expected for rev');
      }));
    });

    it('Test stubs', async () => {
      const db = new PouchDB(dbs.name);
      await db.putAttachment('a', 'foo2.txt', '', '', 'text/plain');
      const docs = await db.allDocs({ include_docs: true });
      should.not.exist(docs.rows[0].stub, 'no stub');
    });

    it('Try to get unexistent attachment of some doc', async () => {
      const db = new PouchDB(dbs.name);
      await db.put({ _id: 'foo' });
      try {
        await db.getAttachment('foo', 'unexistentAttachment');
        throw new Error('Should not succeed');
      } catch (err) {
        should.exist(err, 'Correctly returned error');
      }
    });

    it('putAttachment and getAttachment with plaintext', async () => {
      const db = new PouchDB(dbs.name);
      await db.put({ _id: 'foo' });
      const doc = await db.get('foo');
      const data = binAttDoc._attachments['foo.txt'].data;
      const blob = testUtils.binaryStringToBlob(testUtils.atob(data),
        'text/plain');
      await db.putAttachment('foo', 'foo.txt', doc._rev, blob, 'text/plain');
      const attBlob = await db.getAttachment('foo', 'foo.txt');
      attBlob.type.should.equal('text/plain');
      const returnedData = await testUtils.readBlobPromise(attBlob);
      testUtils.btoa(returnedData).should.equal(data);
      const fetchedDoc = await db.get('foo');
      delete fetchedDoc._attachments["foo.txt"].revpos;

      // couchdb encodes plaintext strings differently from us
      // because of libicu vs. ascii. that's okay
      const digest = fetchedDoc._attachments["foo.txt"].digest;
      const validDigests = [
        "md5-qUUYqS41RhwF0TrCsTAxFg==",
        "md5-aEI7pOYCRBLTRQvvqYrrJQ==",
        "md5-jeLnIuUvK7d+6gya044lVA=="
      ];
      validDigests.indexOf(digest).should.not.equal(-1,
        'expected ' + digest  + ' to be in: ' +
          JSON.stringify(validDigests));
      delete fetchedDoc._attachments["foo.txt"].digest;
      fetchedDoc._attachments.should.deep.equal({
        "foo.txt": {
          "content_type": "text/plain",
          "stub": true,
          length: 29
        }
      });
    });

    it('putAttachment and getAttachment with png data', async () => {
      const db = new PouchDB(dbs.name);
      await db.put({ _id: 'foo' });
      const doc = await db.get('foo');
      const data = pngAttDoc._attachments['foo.png'].data;
      const blob = testUtils.binaryStringToBlob(testUtils.atob(data),
        'image/png');
      await db.putAttachment('foo', 'foo.png', doc._rev, blob, 'image/png');
      const attBlob = await db.getAttachment('foo', 'foo.png');
      attBlob.type.should.equal('image/png');
      const returnedData = await testUtils.readBlobPromise(attBlob);
      testUtils.btoa(returnedData).should.equal(data);
      const fetchedDoc = await db.get('foo');
      delete fetchedDoc._attachments["foo.png"].revpos;
      fetchedDoc._attachments.should.deep.equal({
        "foo.png": {
          "content_type": "image/png",
          "digest": "md5-c6eA+rofKUsstTNQBKUc8A==",
          "stub": true,
          length: 229
        }
      });
    });

    it('putAttachment in new doc with base64', async () => {
      const db = new PouchDB(dbs.name, {auto_compaction: false});
      await db.putAttachment('foo', 'att', 'Zm9v', 'text/plain');
      const doc = await db.get('foo', {attachments: true});
      doc._attachments['att'].content_type.should.match(/^text\/plain/);
      doc._attachments['att'].data.should.equal('Zm9v');
    });

    it('#2818 - save same attachment in different revs', async () => {
      const db = new PouchDB(dbs.name, {auto_compaction: false});
      const res = await db.put({_id: 'foo'});
      await db.putAttachment('foo', 'att', res.rev, 'Zm9v', 'text/plain');
      let doc = await db.get('foo', {attachments: true});
      doc._attachments['att'].content_type.should.match(/^text\/plain/);
      should.exist(doc._attachments['att'].data);
      doc = await db.get('foo');
      await db.put(doc);
      await db.compact();
      doc = await db.get('foo', {attachments: true});
      doc._attachments['att'].content_type.should.match(/^text\/plain/);
      doc._attachments['att'].data.length.should.be.above(0, 'attachment exists');
    });

    it('#2818 - save same attachment many times in parallel', async () => {
      const db = new PouchDB(dbs.name);
      const docs = [];

      for (let i  = 0; i < 50; i++) {
        docs.push({
          _id: 'doc' + i,
          _attachments: {
            'foo.txt': {
              content_type: 'text/plain',
              data: 'Zm9vYmFy' // 'foobar'
            }
          }
        });
      }
      return db.bulkDocs(docs);
    });

    it('#2818 - revisions keep attachments (no compaction)', async () => {
      const db = new PouchDB(dbs.name, {auto_compaction: false});
      const doc = {
        _id: 'doc',
        _attachments: {
          'foo.txt': {
            content_type: 'text/plain',
            data: 'Zm9vYmFy' // 'foobar'
          }
        }
      };
      await db.put(doc);
      let fetchedDoc = await db.get('doc');
      const rev = fetchedDoc._rev;
      //delete fetchedDoc._attachments['foo.txt'];
      fetchedDoc._attachments['foo.txt'] = {
        content_type: 'text/plain',
        data: 'dG90bw=='
      }; // 'toto'
      await db.put(fetchedDoc);
      fetchedDoc = await db.get('doc', {attachments: true});
      fetchedDoc._attachments['foo.txt'].data.should.equal('dG90bw==');
      fetchedDoc = await db.get('doc', {rev, attachments: true});
      fetchedDoc._attachments['foo.txt'].data.should.equal('Zm9vYmFy');
    });

    it('#2818 - doesn\'t throw 409 if same filename', async () => {
      const db = new PouchDB(dbs.name, {auto_compaction: false});
      const doc = {
        _id: 'doc',
        _attachments: {
          'foo.txt': {
            content_type: 'text/plain',
            data: 'Zm9vYmFy' // 'foobar'
          }
        }
      };
      const res = await db.put(doc);
      doc._rev = res.rev;
      doc._attachments['foo.txt'].data = 'dG90bw=='; // 'toto'
      await db.put(doc);
    });

    it('#3008 test correct encoding/decoding of \\u0000 etc.', async () => {

      const base64 =
        'iVBORw0KGgoAAAANSUhEUgAAAhgAAAJLCAYAAAClnu9J' +
        'AAAgAElEQVR4Xuy9B7ylZXUu/p62T5nOMAPM0BVJICQi' +
        'ogjEJN5ohEgQ';

      const db = new PouchDB(dbs.name);
      await db.putAttachment('foo', 'foo.bin', base64, 'image/png');
      const blob = await db.getAttachment('foo', 'foo.bin');
      blob.type.should.equal('image/png');
      const bin = await testUtils.readBlobPromise(blob);
      testUtils.btoa(bin).should.equal(base64);
    });


    if (!testUtils.isSafari()) {
      // skip in safari/ios because of size limit popup
      it('putAttachment and getAttachment with big png data', async () => {

        function getData(cb) {
          if (typeof process !== 'undefined' && !process.browser) {
            const bigimage = require('./deps/bigimage.js');
            cb(null, bigimage);
          } else { // browser
            testUtils.asyncLoadScript('deps/bigimage.js')
                .then(() => cb(null, window.bigimage))
                .catch(err => cb(err));
          }
        }

        const db = new PouchDB(dbs.name);
        await db.put({ _id: 'foo' });
        const doc = await db.get('foo');
        const data = await new Promise((resolve, reject) => {
          getData((err, data) => {
            if (err) { return reject(err); }
            resolve(data);
          });
        });
        const blob = testUtils.binaryStringToBlob(
            testUtils.atob(data), 'image/png');
        await db.putAttachment('foo', 'foo.png', doc._rev, blob, 'image/png');
        const attBlob = await db.getAttachment('foo', 'foo.png');
        attBlob.type.should.equal('image/png');
        const returnedData = await testUtils.readBlobPromise(attBlob);
        testUtils.btoa(returnedData).should.equal(data);
        const fetchedDoc = await db.get('foo');
        delete fetchedDoc._attachments["foo.png"].revpos;
        fetchedDoc._attachments.should.deep.equal({
          "foo.png": {
            "content_type": "image/png",
            "digest": "md5-kqr2YcdElgDs3RkMn1Ygbw==",
            "stub": true,
            length: 678010
          }
        });
      });
    }

    it('#2709 `revpos` with putAttachment', async () => {
      const db = new PouchDB(dbs.name);
      await db.putAttachment('a', 'one', '', testUtils.btoa('one'), 'text/plain');
      let doc = await db.get('a');
      should.exist(doc._attachments.one.revpos);
      doc._attachments.one.revpos.should.equal(1);
      await db.putAttachment('a', 'two', doc._rev, testUtils.btoa('two'), 'text/plain');
      doc = await db.get('a');
      should.exist(doc._attachments.two.revpos);
      doc._attachments.two.revpos.should.equal(2);
      doc._attachments.one.revpos.should.equal(1);
      await db.putAttachment('a', 'one', doc._rev, testUtils.btoa('one-changed'), 'text/plain');
      doc = await db.get('a');
      doc._attachments.one.revpos.should.equal(3);
      doc._attachments.two.revpos.should.equal(2);
    });

    it('#2709 `revpos` with inline attachment', async () => {
      const db = new PouchDB(dbs.name);
      const doc = {
        _id: 'a',
        _attachments: {
          one: {
            content_type: 'text/plain',
            data: testUtils.btoa('one')
          }
        }
      };
      await db.put(doc);
      let fetchedDoc = await db.get('a');
      should.exist(fetchedDoc._attachments.one.revpos);
      fetchedDoc._attachments.one.revpos.should.equal(1);
      fetchedDoc._attachments.two = {
        content_type: 'text/plain',
        data: testUtils.btoa('two')
      };
      await db.put(fetchedDoc);
      fetchedDoc = await db.get('a');
      should.exist(fetchedDoc._attachments.two.revpos);
      fetchedDoc._attachments.two.revpos.should.equal(2);
      fetchedDoc._attachments.one.revpos.should.equal(1);
      delete fetchedDoc._attachments.one.stub;
      fetchedDoc._attachments.one.data = testUtils.btoa('one-changed');
      await db.put(fetchedDoc);
      fetchedDoc = await db.get('a');
      fetchedDoc._attachments.one.revpos.should.equal(3);
      fetchedDoc._attachments.two.revpos.should.equal(2);
    });

    it('#2709 `revpos` with allDocs', async () => {
      const db = new PouchDB(dbs.name);
      await db.putAttachment('a', 'one', '', testUtils.btoa('one'), 'text/plain');
      const docs = await db.allDocs({ keys: ['a'], include_docs: true });
      const doc = docs.rows[0].doc;
      should.exist(doc._attachments.one.revpos);
      doc._attachments.one.revpos.should.equal(1);
    });

    it('#7403 {attachments: true, binary: true, include_docs: true} in allDocs with one missing doc', async () => {
      const docs = [binAttDoc];
      const db = new PouchDB(dbs.name);
      await db.bulkDocs(docs);
      const keys = ['bin_doc', 'thisDocIsNotInDB'];
      const result = await db.allDocs({
        keys,
        attachments: true,
        binary: true,
        include_docs: true
      });
      should.exist(result.rows[0].doc._attachments);
      result.rows[1].error.should.equal('not_found');
    });

    it('Test rev purge with attachment', async () => {
      const db = new PouchDB(dbs.name);

      if (typeof db._purge === 'undefined') {
        console.log('purge is not implemented for adapter', db.adapter);
        return;
      }

      const doc = { _id: 'foo' };
      const base64 =
        'iVBORw0KGgoAAAANSUhEUgAAAhgAAAJLCAYAAAClnu9J' +
        'AAAgAElEQVR4Xuy9B7ylZXUu/p62T5nOMAPM0BVJICQi' +
        'ogjEJN5ohEgQ';

      const res = await db.put(doc);
      await db.putAttachment('foo', 'foo.bin', res.rev, base64, 'image/png');
      const _doc = await db.get(doc._id);
      await db.purge(doc._id, _doc._rev);
      try {
        await db.getAttachment(doc._id, 'foo.bin');
        assert.fail('attachment should not exist');
      } catch (err) {
        if (!err.status) {
          throw err;
        }
        err.status.should.equal(404, 'attachment should not exist');
      }
    });

  });
});

repl_adapters.forEach((adapters) => {
  describe('suite2 test.attachments.js- ' + adapters[0] + ':' + adapters[1],
    function () {

    const dbs = {};

    beforeEach(function (done) {
      dbs.name = testUtils.adapterUrl(adapters[0], 'testdb');
      dbs.remote = testUtils.adapterUrl(adapters[1], 'test_attach_remote');
      testUtils.cleanup([dbs.name, dbs.remote], done);
    });

    afterEach(function (done) {
      testUtils.cleanup([dbs.name, dbs.remote], done);
    });

    it('Attachments replicate back and forth', async () => {
      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);

      const doc = {
        _id: 'doc',
        _attachments: {
          'foo.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('foo')
          }
        }
      };

      await db.bulkDocs({ docs: [doc] });
      await db.replicate.to(remote);
      doc._id = 'doc2';
      await remote.put(doc);
      doc._id = 'doc3';
      await db.put(doc);
      await db.sync(remote);
      await Promise.all([db, remote].map(async (pouch) => {
        const res = await pouch.allDocs({
          include_docs: true,
          attachments: true
        });
        res.rows.should.have.length(3);
        res.rows.forEach((row) => {
          Object.keys(row.doc._attachments).should.have.length(1);
          const att = row.doc._attachments['foo.txt'];
          att.content_type.should.equal('text/plain');
          att.data.should.equal(testUtils.btoa('foo'));
          att.digest.should.be.a('string');
          should.not.exist(att.length);
          should.not.exist(att.stub);
        });
      }));
    });

    it('Replicate same doc, same atts', async () => {
      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);

      let doc = {
        _id: 'doc',
        _attachments: {
          'foo.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('foo')
          }
        }
      };

      let res = await remote.put(doc);
      doc._rev = res.rev;
      await db.replicate.from(remote);
      res = await db.put(doc);
      doc._rev = res.rev;
      await db.replicate.to(remote);
      await remote.put(doc);
      await db.sync(remote);
      await Promise.all([db, remote].map(async (pouch) => {
        const res = await pouch.allDocs({
          include_docs: true,
          attachments: true
        });
        res.rows.should.have.length(1);
        res.rows.forEach((row) => {
          Object.keys(row.doc._attachments).should.have.length(1);
          const att = row.doc._attachments['foo.txt'];
          att.content_type.should.equal('text/plain');
          att.data.should.equal(testUtils.btoa('foo'));
          att.digest.should.be.a('string');
          should.not.exist(att.length);
          should.not.exist(att.stub);
        });
      }));
    });

    it('Replicate same doc, same atts 2', async () => {
      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);

      let doc = {
        _id: 'doc',
        _attachments: {
          'foo.txt': {
            content_type: 'text/plain',
            data: testUtils.btoa('foo')
          }
        }
      };

      let res = await db.put(doc);
      doc._rev = res.rev;
      await db.replicate.to(remote);
      res = await remote.put(doc);
      doc._rev = res.rev;
      await db.replicate.from(remote);
      await db.put(doc);
      await db.sync(remote);
      await Promise.all([db, remote].map(async (pouch) => {
        const res = await pouch.allDocs({
          include_docs: true,
          attachments: true
        });
        res.rows.should.have.length(1);
        res.rows.forEach((row) => {
          Object.keys(row.doc._attachments).should.have.length(1);
          const att = row.doc._attachments['foo.txt'];
          att.content_type.should.equal('text/plain');
          att.data.should.equal(testUtils.btoa('foo'));
          att.digest.should.be.a('string');
          should.not.exist(att.length);
          should.not.exist(att.stub);
        });
      }));
    });

    it('Attachments replicate', async () => {
      const binAttDoc = {
        _id: 'bin_doc',
        _attachments: {
          'foo.txt': {
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
      const doc = await db.get('bin_doc', { attachments: true });
      binAttDoc._attachments['foo.txt'].data.should
        .equal(doc._attachments['foo.txt'].data);
    });

    it('Attachment types replicate', async () => {
      const binAttDoc = {
        _id: 'bin_doc',
        _attachments: {
          'foo.txt': {
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
      const doc = await db.get('bin_doc', {attachments: true, binary: true});
      const blob = doc._attachments['foo.txt'].data;
      blob.type.should.equal('text/plain');
      const bin = await testUtils.readBlobPromise(blob);
      bin.should.equal(testUtils.atob(
        'VGhpcyBpcyBhIGJhc2U2NCBlbmNvZGVkIHRleHQ='));
    });

    it('Many many attachments replicate', async () => {
      const doc = {_id: 'foo'};

      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);

      const data = testUtils.btoa('foobar');
      const blob = testUtils.binaryStringToBlob(
        testUtils.atob(data), 'text/plain');

      doc._attachments = {};
      const expectedKeys = [];
      for (let i = 0; i < 50; i++) {
        doc._attachments[i + '.txt'] = {
          content_type: 'text/plain',
          data: blob
        };
        expectedKeys.push(i + '.txt');
      }
      await db.put(doc);
      await db.replicate.to(remote);
      const fetchedDoc = await remote.get('foo', {attachments: true});
      const keys = Object.keys(fetchedDoc._attachments);
      keys.sort();
      keys.should.deep.equal(expectedKeys.sort());
      fetchedDoc._attachments[keys[0]].data.should.equal(data);
    });

    it('Many many png attachments replicate', async () => {
      const doc = {_id: 'foo'};

      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);

      const data = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAMFBMVEX+9+' +
        'j+9OD+7tL95rr93qT80YD7x2L6vkn6syz5qRT4ogT4nwD4ngD4nQD4nQD4' +
        'nQDT2nT/AAAAcElEQVQY002OUQLEQARDw1D14f7X3TCdbfPnhQTqI5UqvG' +
        'OWIz8gAIXFH9zmC63XRyTsOsCWk2A9Ga7wCXlA9m2S6G4JlVwQkpw/Ymxr' +
        'UgNoMoyxBwSMH/WnAzy5cnfLFu+dK2l5gMvuPGLGJd1/9AOiBQiEgkzOpg' +
        'AAAABJRU5ErkJggg==';
      const blob = testUtils.binaryStringToBlob(testUtils.atob(data),
          'image/png');

      doc._attachments = {};
      const expectedKeys = [];
      for (let i = 0; i < 50; i++) {
        doc._attachments[i + '.txt'] = {
          content_type: 'image/png',
          data: blob
        };
        expectedKeys.push(i + '.txt');
      }
      await db.put(doc);
      await db.replicate.to(remote);
      const fetchedDoc = await remote.get('foo', {attachments: true});
      const keys = Object.keys(fetchedDoc._attachments);
      keys.sort();
      keys.should.deep.equal(expectedKeys.sort());
      fetchedDoc._attachments[keys[0]].data.should.equal(data);
    });

    it('Multiple attachments replicate', async () => {
      const doc = {_id: 'foo'};

      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);

      const data = 'VGhpcyBpcyBhIGJhc2U2NCBlbmNvZGVkIHRleHQ=';
      let rev;
      const info = await db.put(doc);
      rev = info.rev;
      await db.replicate.to(remote);
      let revInfo = await db.putAttachment(doc._id, 'foo1.txt', rev, data, 'text/plain');
      rev = revInfo.rev;
      revInfo = await db.putAttachment(doc._id, 'foo2.txt', rev, data, 'text/plain');
      rev = revInfo.rev;
      await db.putAttachment(doc._id, 'foo3.txt', rev, data, 'text/plain');
      await db.replicate.to(remote);
      const fetchedDoc = await remote.get('foo', {attachments: true});
      const keys = Object.keys(fetchedDoc._attachments);
      keys.sort();
      keys.should.deep.equal(['foo1.txt', 'foo2.txt', 'foo3.txt']);
    });

    it('#3961 Many attachments on same doc', async () => {
      const doc = {_id: 'foo', _attachments: {}};

      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);

      for (let i = 0; i < 100; i++) {
        doc._attachments[i + '.txt'] = {
          data: testUtils.btoa(i.toString()),
          content_type: 'text/plain'
        };
      }

      await db.put(doc);
      await db.replicate.to(remote);
      await Promise.all([
        db, remote
      ].map(async (pouch) => {
        let fetchedDoc = await pouch.get('foo', {attachments: true});
        let atts = fetchedDoc._attachments;
        Object.keys(atts).length.should.equal(100);
        for (let i = 0; i < 100; i++) {
          const att = atts[i + '.txt'];
          should.not.exist(att.stub);
          att.data.should.equal(testUtils.btoa(i.toString()));
          att.content_type.should.equal('text/plain');
        }
        fetchedDoc = await pouch.get('foo');
        atts = fetchedDoc._attachments;
        Object.keys(atts).length.should.equal(100);
        for (let i = 0; i < 100; i++) {
          const att = atts[i + '.txt'];
          att.stub.should.equal(true);
          att.content_type.should.equal('text/plain');
          att.length.should.equal(i.toString().length);
          should.exist(att.digest);
        }
      }));
    });

    it('Multiple attachments replicate, different docs (#2698)', async () => {
      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);
      const docs = [];
      for (let i = 0; i < 5; i++) {
        docs.push({
          _id: i.toString(),
          _attachments: {
            'foo.txt': {
              data: 'VGhpcyBpcyBhIGJhc2U2NCBlbmNvZGVkIHRleHQ=',
              content_type: 'text/plain'
            }
          }
        });
      }
      await remote.bulkDocs(docs);
      await remote.replicate.to(db);
      const res = await db.allDocs();
      const fetchedDocs = await Promise.all(res.rows.map((row) => {
        return db.get(row.id, {attachments: true});
      }));
      const attachments = fetchedDocs.map((doc) => {
        delete doc._attachments['foo.txt'].revpos;
        delete doc._attachments['foo.txt'].digest;
          return doc._attachments;
      });
      attachments.should.deep.equal([1, 2, 3, 4, 5].map(() => {
        return {
          "foo.txt": {
            "content_type": "text/plain",
            "data": "VGhpcyBpcyBhIGJhc2U2NCBlbmNvZGVkIHRleHQ="
          }
        };
      }));
    });

    it('Multiple attachments replicate, different docs png (#2698)', async () => {
      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);
      const docs = [];
      for (let i = 0; i < 5; i++) {
        docs.push({
          _id: i.toString(),
          _attachments: {
            'foo.png': {
              data: icons[i],
              content_type: 'image/png'
            }
          }
        });
      }
      await remote.bulkDocs(docs);
      await remote.replicate.to(db);
      const res = await db.allDocs();
      let fetchedDocs = await Promise.all(res.rows.map((row) => {
        return db.get(row.id, {attachments: true});
      }));
      const attachments = fetchedDocs.map((doc) => {
        delete doc._attachments['foo.png'].revpos;
        return doc._attachments;
      });
      attachments.should.deep.equal(icons.map((icon, i) => {
        return {
          "foo.png": {
            "content_type": "image/png",
            "data": icon,
            "digest": iconDigests[i]
          }
        };
      }));

      fetchedDocs = await Promise.all(fetchedDocs.map((doc) => {
        return db.get(doc._id);
      }));
      const stubAttachments = fetchedDocs.map((doc) => {
        delete doc._attachments['foo.png'].revpos;
        return doc._attachments['foo.png'];
      });
      stubAttachments.should.deep.equal(icons.map((icon, i) => {
        return {
          "content_type": "image/png",
          stub: true,
          "digest": iconDigests[i],
          length: iconLengths[i]
        };
      }));
    });

    it('#3932 attachments with tricky revpos', async () => {
      const db = new PouchDB(dbs.name);
      const remote = new PouchDB(dbs.remote);

      let rev;

      await remote.put({
        _id:"test1",
        type:"XX",
        name: "Test1",
        _attachments:{
          "1.txt":{ content_type:"text/plain", data: "Wlpa"} }
      });
      await db.replicate.from(remote);
      let doc = await db.get('test1');
      const res = await db.put(doc);
      rev = res.rev;
      await db.replicate.to(remote);
      await remote.putAttachment('test1', '2.txt', rev,
        'Wlpa', 'text/plain');
      await remote.replicate.to(db);
      await db.get('test1', {attachments: true});
      doc = await remote.get('test1', {attachments: true});
      doc._attachments = {
        "1.txt": {content_type: "text/plain", data: "Wlpa"},
        "2.txt": {content_type: "text/plain", data: "Wlpa"}
      };
      await db.put(doc);
      doc = await db.get("test1", {attachments:true});
      await db.put(doc);
      await db.replicate.to(remote);
      await Promise.all([db, remote].map(async (pouch) => {
        const fetchedDoc = await pouch.get('test1', {attachments: true});
        const filenames = Object.keys(fetchedDoc._attachments);
        filenames.should.have.length(2);
        filenames.forEach((filename) => {
          const data = fetchedDoc._attachments[filename].data;
          data.should.equal('Wlpa');
        });
      }));
    });

    it('replication with changing attachments', function () {
      var attachment = {
        content_type: 'text/plain',
        data: 'VGhpcyBpcyBhIGJhc2U2NCBlbmNvZGVkIHRleHQ='
      };
      var attachment2 = {
        content_type: 'text/plain',
        data: ''
      };
      var binAttDoc = {
        _id: 'bin_doc',
        _attachments: {
          'foo.txt': attachment
        }
      };
      var db = new PouchDB(dbs.name);
      var remote = new PouchDB(dbs.remote);
      return db.put(binAttDoc).then(function () {
        return db.get(binAttDoc._id);
      }).then(function (doc) {
        should.exist(doc);
        return db.get(binAttDoc._id);
      }).then(function (doc) {
        doc._attachments['bar.txt'] = attachment2;
        return db.put(doc);
      }).then(function () {
        return db.get(binAttDoc._id);
      }).then(function (doc) {
        should.exist(doc);
        return db.get(binAttDoc._id, {attachments: true});
      }).then(function (doc) {
        should.not.exist(doc._attachments['foo.txt'].stub);
        should.not.exist(doc._attachments['bar.txt'].stub);
        return db.replicate.to(remote);
      }).then(function () {
        return remote.get(binAttDoc._id, {attachments: true});
      }).then(function (doc) {
        should.not.exist(doc._attachments['foo.txt'].stub);
        doc._attachments['baz.txt'] = doc._attachments['foo.txt'];
        return remote.put(doc);
      }).then(function () {
        return remote.replicate.to(db);
      }).then(function () {
        return db.get(binAttDoc._id, {attachments: true});
      }).then(function (doc) {
        should.not.exist(doc._attachments['foo.txt'].stub);
        should.not.exist(doc._attachments['bar.txt'].stub);
        should.not.exist(doc._attachments['baz.txt'].stub);
        return db.get(binAttDoc._id);
      }).then(function (doc) {
        should.exist(doc);
      });
    });

    it('3955 race condition in put', function (done) {

      var db = new PouchDB(dbs.name);
      var btoa = testUtils.btoa;
      var srcdata = ['', '', ''];

      for (var i = 0; i < 50; i++) {
        srcdata[0] += 'AAA';
        srcdata[1] += 'BBB';
        srcdata[2] += 'CCC';
      }

      var doc = {
        _id: 'x',
        type: 'testdoc',
        _attachments:{
          'a.txt': {
            content_type: 'text/plain',
            data:btoa(srcdata[0])
          },
          'b.txt': {
            content_type: 'text/plain',
            data:btoa(srcdata[1])
          },
          'c.txt': {
            content_type: 'text/plain',
            data:btoa(srcdata[2])
          },
          'zzz.txt': {
            content_type: 'text/plain',
            data:btoa('ZZZ')
          }
        }
      };

      db.put(doc).then(function () {
        return db.get('x');
      }).then(function (doc) {
        var digests = Object.keys(doc._attachments).map(function (a) {
          return doc._attachments[a].digest;
        });
        if (isUnique(digests)) {
          done();
        } else {
          done('digests are not unique');
        }
      });

      doc._attachments['c.txt'].data = btoa('ZZZ');
      doc._attachments['b.txt'].data = btoa('ZZZ');

      function isUnique(arr) {
        arr.sort();
        for (var i = 1; i < arr.length; i++ ) {
          if (arr[i-1] === arr[i]) {
            return false;
          }
        }
        return true;
      }
    });

    it('#8456 bad attachment rev after replication', function (done) {
      var db = new PouchDB(dbs.name, {});
      var remote = new PouchDB(dbs.remote, {});
      var doc_1a, doc_2a, doc_3a, doc_2b, attachment;

      db.put({ _id: 'doc', key: '1a' }).then(function (res) {
        doc_1a = res;
        return PouchDB.sync(db, remote);
      }).then(function () {
        return db.put({
          _id: 'doc',
          _rev: doc_1a.rev,
          key: '2a',
        });
      }).then(function (res) {
        doc_2a = res;
        return db.put({
          _id: 'doc',
          _rev: doc_2a.rev,
          key: '3a',
          _attachments: {
            'attachment.txt': {
              content_type: 'text/plain',
              data: 'VGhpcyBpcyBhIGJhc2U2NCBlbmNvZGVkIHRleHQ=',
            },
          },
        });
      }).then(function (res) {
        doc_3a = res;
        return remote.put({
          _id: 'doc',
          _rev: doc_1a.rev,
          key: '2-b',
        });
      }).then(function (res) {
        doc_2b = res;
        return PouchDB.sync(db, remote);
      }).then(function () {
        return db.get('doc', { attachments: true });
      }).then(function (doc) {
        attachment = doc._attachments['attachment.txt'];
        return db.remove('doc', doc_3a.rev);
      }).then(function () {
        return db.compact();
      }).then(function () {
        db.put({
          _id: 'doc',
          _rev: doc_2b.rev,
          key: '3-b',
          _attachments: {
            'attachment.txt': {
              stub: true,
              digest: attachment.digest,
              content_type: attachment.content_type,
              length: attachment.data.length,
              revpos: attachment.revpos,
            },
          },
        }, function (err) {
          if (!err || err.status !== 412) {
            done('error 412 is expected to be thrown (attachment should not exist)');
          } else {
            done();
          }
        });
      }).catch(function (err) {
        done(err);
      });
    });
  });
});

function decodeBase64(str) {
  // Polyfill for node14 - currently used in CI :'(
  if (!globalThis.atob) {
    return Buffer.from(str, 'base64').toString();
  }
  return atob(str);
}
