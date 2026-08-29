'use strict';

const adapters = ['http', 'local'];

adapters.forEach(adapter => {

  describe(`test.basics.js-${adapter}`, () => {

    const dbs = {};

    beforeEach(() => {
      dbs.name = testUtils.adapterUrl(adapter, 'testdb');
    });

    afterEach(done => {
      testUtils.cleanup([dbs.name], done);
    });

    it('Create a pouch without new keyword', () => {
      const db = PouchDB(dbs.name);
      db.should.be.an.instanceof(PouchDB);
    });

    it('Name is accessible via instance', () => {
      const db = new PouchDB(dbs.name);
      db.name.should.equal(dbs.name);
    });

    it('4314 Create a pouch with + in name', async () => {
      const db = new PouchDB(`${dbs.name}+suffix`);
      await db.info();
      await db.destroy();
    });

    it('Creating Pouch without name will throw', done => {
      try {
        new PouchDB();
        done('Should have thrown');
      } catch (err) {
        should.equal(err instanceof Error, true, 'should be an error');
        done();
      }
    });

    it('4314 Create a pouch with urlencoded name', async () => {
      const db = new PouchDB(`${dbs.name}some%2Ftest`);
      await db.info();
      await db.destroy();
    });

    it('4219 destroy a pouch', () => new PouchDB(dbs.name).destroy({}));

    it('4339 throw useful error if method called on stale instance', async () => {
      const db = new PouchDB(dbs.name);

      await db.put({
        _id: 'cleanTest'
      });
      await db.destroy();
      try {
        await db.get('cleanTest');
        throw new Error('.get should return an error');
      } catch (err) {
        should.equal(err instanceof Error, true, 'should be an error');
      }
    });

    it('[4595] should reject xhr errors', done => {
      const invalidUrl = 'http:///';
      new PouchDB(dbs.name).replicate.to(invalidUrl, {}).catch(() => {
        done();
      });

    });

    it('[4595] should emit error event on xhr error', done => {
      const invalidUrl = 'http:///';
      new PouchDB(dbs.name).replicate.to(invalidUrl, {})
        .on('error', () => { done(); });
    });

    it('Add a doc', async () => {
      const db = new PouchDB(dbs.name);
      await db.post({test: 'somestuff'});
    });

    it('Get invalid id', async () => {
      const db = new PouchDB(dbs.name);
      try {
        await db.get(1234);
        throw new Error('should not be here');
      } catch (err) {
        should.exist(err);
      }
    });

    it('Missing doc should contain ID in error object', async () => {
      const db = new PouchDB(dbs.name);
      try {
        await db.get('abc-123');
        throw new Error('should not be here');
      } catch (err) {
        should.exist(err);
        err.docId.should.equal('abc-123');
      }
    });

    it('PUTed Conflicted doc should contain ID in error object', async () => {
      const db = new PouchDB(dbs.name);
      const info = await db.post({});
      const savedDocId = info.id;
      try {
        await db.put({
          _id: savedDocId,
        });
        throw new Error('should not be here');
      } catch (err) {
        err.should.have.property('status', 409);
        err.docId.should.equal(savedDocId);
      }
    });

    it('POSTed Conflicted doc should contain ID in error object', async () => {
      const db = new PouchDB(dbs.name);
      const info = await db.post({});
      const savedDocId = info.id;
      try {
        await db.post({
          _id: savedDocId,
        });
        throw new Error('should not be here');
      } catch (err) {
        err.should.have.property('status', 409);
        err.docId.should.equal(savedDocId);
      }
    });

    it('Add a doc with a promise', async () => {
      const db = new PouchDB(dbs.name);
      await db.post({ test: 'somestuff' });
    });

    it('Add a doc with opts object', async () => {
      const db = new PouchDB(dbs.name);
      await db.post({ test: 'somestuff' }, {});
    });

    it('Modify a doc', async () => {
      const db = new PouchDB(dbs.name);
      const info = await db.post({ test: 'somestuff' });
      const info2 = await db.put({
        _id: info.id,
        _rev: info.rev,
        another: 'test'
      });
      info.rev.should.not.equal(info2.rev);
    });

    it('Modifying a doc that has rewritten content', async () => {
      const db = new PouchDB(dbs.name);
      // To index all these below, indexeddb needs to rewrite this data, as:
      //  - true, false and null are not indexable values
      //  - keypaths need to consist only of keys that could also be JS var names
      //
      // This test makes sure we don't refer to these rewritten values when updating
      const doc = {
        _id: 'foo',
        'something.that': null,
        'needs-to-be': false,
        'rewritten!': true
      };

      const info = await db.put(doc);
      doc._rev = info.rev;
      doc.foo = 'bar';
      const info2 = await db.put(doc);
      doc._rev = info2.rev;
      const dbDoc = await db.get('foo');
      dbDoc.should.deep.equal(doc);
    });

    it('Modify a doc with a promise', async () => {
      const db = new PouchDB(dbs.name);
      const info = await db.post({ test: 'promisestuff' });
      const info2 = await db.put({
        _id: info.id,
        _rev: info.rev,
        another: 'test'
      });
      info.rev.should.not.equal(info2.rev);
    });

    it('Read db id', async () => {
      const db = new PouchDB(dbs.name);
      const id = await db.id();
      id.should.be.a('string');
    });

    it('Read db id with promise', async () => {
      const db = new PouchDB(dbs.name);
      const id = await db.id();
      id.should.be.a('string');
    });

    it('Close db', async () => {
      const db = new PouchDB(dbs.name);
      await db.info();
      await db.close();
    });

    it('Close db with a promise', () => {
      const db = new PouchDB(dbs.name);
      return db.close();
    });

    it('Read db id after closing Close', async () => {
      let db = new PouchDB(dbs.name);
      await db.close();
      db = new PouchDB(dbs.name);
      const id = await db.id();
      id.should.be.a('string');
    });

    it('Modify a doc with incorrect rev', async () => {
      const db = new PouchDB(dbs.name);
      const info = await db.post({ test: 'somestuff' });
      const nDoc = {
        _id: info.id,
        _rev: `${info.rev}broken`,
        another: 'test'
      };
      try {
        await db.put(nDoc);
        throw new Error('should have thrown');
      } catch (err) {
        should.exist(err);
      }
    });

    [
      () => '-format',
      () => 'bad-format',
      () => '1-ok-bad',
      () => ({}),
      () => ({ toString:'2-abc' }),
      () => ({ toString:'2-abc', indexOf:777 }),
      () => ({ toString:'2-abc', indexOf:() => -1000 }),
      () => ({ toString:'2-abc', indexOf:() => -1000, substring:'hi' }),
      () => ({ toString:'2-abc', indexOf:() => -1000, substring:() => 'hi' }),
      () => ({ toString:() => '2-abc' }),
      () => ({ toString:() => '2-abc', indexOf:777 }),
      () => ({ toString:() => '2-abc', indexOf:() => 12 }),
      () => ({ toString:() => '2-abc', indexOf:() => 12, substring:'hi' }),
      () => ({ toString:() => '2-abc', indexOf:() => 12, substring:() => 'hi' }),
      ({ rev }) => ({ toString:rev }),
      ({ rev }) => ({ toString:rev, indexOf:777 }),
      ({ rev }) => ({ toString:rev, indexOf:() => -1000 }),
      ({ rev }) => ({ toString:rev, indexOf:() => -1000, substring:'hi' }),
      ({ rev }) => ({ toString:rev, indexOf:() => -1000, substring:() => 'hi' }),
      ({ rev }) => ({ toString:() => rev }),
      ({ rev }) => ({ toString:() => rev, indexOf:777 }),
      ({ rev }) => ({ toString:() => rev, indexOf:() => 12 }),
      ({ rev }) => ({ toString:() => rev, indexOf:() => 12, substring:'hi' }),
      ({ rev }) => ({ toString:() => rev, indexOf:() => 12, substring:() => 'hi' }),
    ].forEach((generateRev, idx) => {
      it(`post doc with illegal rev value #${idx}`, async () => {
        const db = new PouchDB(dbs.name);

        let threw;
        try {
          await db.post({
            _rev: generateRev({ rev:'1-valid' }),
            another: 'test'
          });
        } catch (err) {
          threw = true;
          err.message.should.equal('Invalid rev format'); // TODO should be err.reason?
        }

        if (!threw) {
          throw new Error('db.put() should have thrown.');
        }
      });

      it(`Modify a doc with illegal rev value #${idx}`, async () => {
        const db = new PouchDB(dbs.name);

        const info = await db.post({ test: 'somestuff' });

        let threw;
        try {
          await db.put({
            _id: info.id,
            _rev: generateRev(info),
            another: 'test'
          });
        } catch (err) {
          threw = true;
          err.message.should.equal('Invalid rev format'); // TODO should be err.reason?
        }

        if (!threw) {
          throw new Error('db.put() should have thrown.');
        }
      });

      it(`bulkDocs with illegal rev value #${idx} (existing doc)`, async () => {
        const db = new PouchDB(dbs.name);

        const info = await db.post({ test: 'somestuff' });

        let threw;
        try {
          await db.bulkDocs({
            docs: [ {
              _id: info.id,
              _rev: generateRev(info),
              another: 'test'
            } ],
          });
        } catch (err) {
          threw = true;
          err.message.should.equal('Invalid rev format'); // TODO should be err.reason?
        }

        if (!threw) {
          throw new Error('db.put() should have thrown.');
        }
      });

      it(`bulkDocs with illegal rev value #${idx} (new doc)`, async () => {
        const db = new PouchDB(dbs.name);

        let threw;
        try {
          await db.bulkDocs({
            docs: [ {
              _id: '1',
              _rev: generateRev({ rev:'1_valid' }),
              another: 'test'
            } ],
          });
        } catch (err) {
          threw = true;
          err.message.should.equal('Invalid rev format'); // TODO should be err.reason?
        }

        if (!threw) {
          throw new Error('db.put() should have thrown.');
        }
      });
    });

    it('Remove doc', async () => {
      const db = new PouchDB(dbs.name);
      const info = await db.post({ test: 'somestuff' });
      await db.remove({
        test: 'somestuff',
        _id: info.id,
        _rev: info.rev
      });
      try {
        await db.get(info.id);
        throw new Error('should have thrown');
      } catch (err) {
        should.exist(err.error);
      }
    });

    it('Remove doc with a promise', async () => {
      const db = new PouchDB(dbs.name);
      const info = await db.post({ test: 'someotherstuff' });
      await db.remove({
        test: 'someotherstuff',
        _id: info.id,
        _rev: info.rev
      });
      try {
        await db.get(info.id);
        throw new Error('should have thrown');
      } catch (err) {
        should.exist(err.error);
      }
    });

    it('Remove doc with new syntax', async () => {
      const db = new PouchDB(dbs.name);
      const info = await db.post({ test: 'somestuff' });
      await db.remove(info.id, info.rev);
      try {
        await db.get(info.id);
        throw new Error('should have thrown');
      } catch (err) {
        should.exist(err);
      }
    });

    it('Remove doc with new syntax and a promise', async () => {
      const db = new PouchDB(dbs.name);
      const info = await db.post({ test: 'someotherstuff' });
      const id = info.id;
      await db.remove(info.id, info.rev);
      try {
        await db.get(id);
        throw new Error('should have thrown');
      } catch (err) {
        should.exist(err.error);
      }
    });

    it('Doc removal leaves only stub', async () => {
      const db = new PouchDB(dbs.name);
      await db.put({ _id: 'foo', value: 'test' });
      const doc = await db.get('foo');
      const res = await db.remove(doc);
      const doc2 = await db.get('foo', { rev: res.rev });
      doc2.should.deep.equal({
        _id: res.id,
        _rev: res.rev,
        _deleted: true
      });
    });

    it('Remove doc twice with specified id', async () => {
      const db = new PouchDB(dbs.name);
      await db.put({ _id: 'specifiedId', test: 'somestuff' });
      let doc = await db.get('specifiedId');
      await db.remove(doc);
      await db.put({
        _id: 'specifiedId',
        test: 'somestuff2'
      });
      doc = await db.get('specifiedId');
      await db.remove(doc);
    });

    it('Remove doc, no callback', done => {
      const db = new PouchDB(dbs.name);
      const changes = db.changes({
        live: true,
        include_docs: true
      }).on('change', change => {
        if (change.doc._deleted) {
          changes.cancel();
        }
      }).on('complete', result => {
        result.status.should.equal('cancelled');
        done();
      }).on('error', done);
      db.post({ _id: 'somestuff' }, (err, res) => {
        db.remove({
          _id: res.id,
          _rev: res.rev
        });
      });
    });

    it('Delete document without id', async () => {
      const db = new PouchDB(dbs.name);
      try {
        await db.remove({ test: 'ing' });
        throw new Error('should have thrown');
      } catch (err) {
        should.exist(err);
      }
    });

    it('Delete document with many args', async () => {
      const db = new PouchDB(dbs.name);
      const doc = { _id: 'foo' };
      const info = await db.put(doc);
      await db.remove(doc._id, info.rev, {});
    });

    it('Delete document with many args, callback style', async () => {
      const db = new PouchDB(dbs.name);
      const doc = {_id: 'foo'};
      const info = await db.put(doc);
      await db.remove(doc._id, info.rev, {});
    });

    it('Delete doc with id + rev + no opts', async () => {
      const db = new PouchDB(dbs.name);
      const doc = {_id: 'foo'};
      const info = await db.put(doc);
      await db.remove(doc._id, info.rev);
    });

    it('Delete doc with id + rev + no opts, callback style', async () => {
      const db = new PouchDB(dbs.name);
      const doc = {_id: 'foo'};
      const info = await db.put(doc);
      await db.remove(doc._id, info.rev);
    });

    it('Delete doc with doc + opts', async () => {
      const db = new PouchDB(dbs.name);
      const doc = {_id: 'foo'};
      const info = await db.put(doc);
      doc._rev = info.rev;
      await db.remove(doc, {});
    });

    it('Delete doc with doc + opts, callback style', async () => {
      const db = new PouchDB(dbs.name);
      const doc = { _id: 'foo' };
      const info = await db.put(doc);
      doc._rev = info.rev;
      await db.remove(doc, {});
    });

    it('Delete doc with rev in opts', async () => {
      const db = new PouchDB(dbs.name);
      const doc = { _id: 'foo' };
      const info = await db.put(doc);
      await db.remove(doc, { rev: info.rev });
    });

    it('Bulk docs', async () => {
      const db = new PouchDB(dbs.name);
      const infos = await db.bulkDocs({
        docs: [
          { test: 'somestuff' },
          { test: 'another' }
        ]
      });
      infos.length.should.equal(2);
      infos[0].ok.should.equal(true);
      infos[1].ok.should.equal(true);
    });

    it('Bulk docs with a promise', async () => {
      const db = new PouchDB(dbs.name);
      const infos = await db.bulkDocs({
        docs: [
          { test: 'somestuff' },
          { test: 'another' }
        ]
      });
      infos.length.should.equal(2);
      infos[0].ok.should.equal(true);
      infos[1].ok.should.equal(true);
    });

    it('Basic checks', async () => {
      const db = new PouchDB(dbs.name);
      let info = await db.info();
      const updateSeq = info.update_seq;
      const doc = {_id: '0', a: 1, b: 1};
      info.doc_count.should.equal(0);
      const res = await db.put(doc);
      res.ok.should.equal(true);
      res.should.have.property('id');
      res.should.have.property('rev');
      info = await db.info();
      info.doc_count.should.equal(1);
      info.update_seq.should.not.equal(updateSeq);
      let dbDoc = await db.get(doc._id);
      dbDoc._id.should.equal(res.id);
      dbDoc._rev.should.equal(res.rev);
      dbDoc = await db.get(doc._id, { revs_info: true });
      dbDoc._revs_info[0].status.should.equal('available');
    });

    it('update with invalid rev', async () => {
      const db = new PouchDB(dbs.name);
      const info = await db.post({test: 'somestuff'});
      try {
        await db.put({
          _id: info.id,
          _rev: 'undefined',
          another: 'test'
        });
        throw new Error('should have thrown');
      } catch (err) {
        should.exist(err);
        err.name.should.equal('bad_request');
      }
    });

    it('Doc validation', async () => {
      const bad_docs = [
        {'_zing': 4},
        {'_zoom': 'hello'},
        {'zane': 'goldfish',
         '_fan': 'something smells delicious'},
        {'_bing': {'wha?': 'soda can'}}
      ];
      const db = new PouchDB(dbs.name);
      try {
        await db.bulkDocs({ docs: bad_docs });
        throw new Error('should have thrown');
      } catch (err) {
        err.name.should.equal('doc_validation');
        err.message.should.equal(`${testUtils.errors.DOC_VALIDATION.message}: _zing`,
          'correct error message returned');
      }
    });

    it('Replication fields (#2442)', async () => {
      const doc = {
        '_replication_id': 'test',
        '_replication_state': 'triggered',
        '_replication_state_time': 1,
        '_replication_stats': {}
      };
      const db = new PouchDB(dbs.name);
      const resp = await db.post(doc);
      const doc2 = await db.get(resp.id);
      doc2._replication_id.should.equal('test');
      doc2._replication_state.should.equal('triggered');
      doc2._replication_state_time.should.equal(1);
      doc2._replication_stats.should.eql({});
    });

    if (adapter === 'local') {
      // This test fails in the http adapter, if it is used with CouchDB version <3
      // or PouchDB-Server. Which is expected.
      it('Allows _access field in documents (#8171)', async () => {
        const doc = {
          '_access': ['alice']
        };
        const db = new PouchDB(dbs.name);
        const resp = await db.post(doc);
        const doc2 = await db.get(resp.id);
        doc2._access.should.eql(['alice']);
      });
    }

    it('Testing issue #48', done => {
      const docs = [
        {'_id': '0'}, {'_id': '1'}, {'_id': '2'},
        {'_id': '3'}, {'_id': '4'}, {'_id': '5'}
      ];
      const TO_SEND = 5;
      let sent = 0;
      let complete = 0;
      let timer;

      const db = new PouchDB(dbs.name);

      const bulkCallback = err => {
        should.not.exist(err);
        if (++complete === TO_SEND) {
          done();
        }
      };

      const save = () => {
        if (++sent === TO_SEND) {
          clearInterval(timer);
        }
        db.bulkDocs({docs}, bulkCallback);
      };

      timer = setInterval(save, 10);
    });

    it('Testing valid id', async () => {
      const db = new PouchDB(dbs.name);
      try {
        await db.post({
          '_id': 123,
          test: 'somestuff'
        });
        throw new Error('should have thrown');
      } catch (err) {
        should.exist(err);
        err.name.should.be.oneOf(['bad_request', 'illegal_docid']);
      }
    });

    it('Put doc without _id should fail', async () => {
      const db = new PouchDB(dbs.name);
      try {
        await db.put({ test: 'somestuff' });
        throw new Error('should have thrown');
      } catch (err) {
        should.exist(err);
        err.message.should.equal(testUtils.errors.MISSING_ID.message,
          'correct error message returned');
      }
    });

    it('Put doc with bad reserved id should fail', async () => {
      const db = new PouchDB(dbs.name);
      try {
        await db.put({
          _id: '_i_test',
          test: 'somestuff'
        });
        throw new Error('should have thrown');
      } catch (err) {
        should.exist(err);
        err.status.should.equal(testUtils.errors.RESERVED_ID.status);
        err.message.should.equal(testUtils.errors.RESERVED_ID.message,
          'correct error message returned');
      }
    });

    it('update_seq persists', async () => {
      let db = new PouchDB(dbs.name);
      await db.post({ test: 'somestuff' });
      await db.close();
      db = new PouchDB(dbs.name);
      const info = await db.info();
      info.update_seq.should.not.equal(0);
      info.doc_count.should.equal(1);
    });

    it('deletions persists', async () => {
      const db = new PouchDB(dbs.name);
      const doc = {_id: 'staticId', contents: 'stuff'};

      const writeAndDelete = async () => {
        const info = await db.put(doc);
        await db.remove({
          _id: info.id,
          _rev: info.rev
        });
      };

      await writeAndDelete();
      await writeAndDelete();
      await db.put(doc);
      const details = await db.get(doc._id, { conflicts: true });
      details.should.not.have.property('_conflicts');
    });

    it('#4126 should not store raw Dates', async () => {
      const date = new Date();
      const date2 = new Date();
      const date3 = new Date();
      const origDocs = [
        { _id: '1', mydate: date },
        { _id: '2', array: [date2] },
        { _id: '3', deep: { deeper: { deeperstill: date3 } }
        }
      ];
      const db = new PouchDB(dbs.name);
      await db.bulkDocs(origDocs);
      const res = await db.allDocs({include_docs: true});
      const docs = res.rows.map(row => {
        delete row.doc._rev;
        return row.doc;
      });
      docs.should.deep.equal([
        { _id: '1', mydate: date.toJSON() },
        { _id: '2', array: [date2.toJSON()] },
        { _id: '3', deep: { deeper: { deeperstill: date3.toJSON() } }
        }
      ]);
      origDocs[0].mydate.should.be.instanceof(Date, 'date not modified');
      origDocs[1].array[0].should.be.instanceof(Date, 'date not modified');
      origDocs[2].deep.deeper.deeperstill
        .should.be.instanceof(Date, 'date not modified');
    });

    it('Create a db with a reserved name', async () => {
      const db = new PouchDB('__proto__');
      await db.info();
      await db.destroy();
    });

    [
      undefined,
      null,
      [],
      [{ _id: 'foo' }, { _id: 'bar' }],
      'this is not an object',
      String('this is not an object'),
      //new String('this is not an object'), actually, this _is_ an object
    ].forEach((badDoc, idx) => {
      describe(`Should error when document is not an object #${idx}`, () => {
        let db;

        const expectNotAnObject = fn => async () => {
          let threw;
          try {
            await fn();
          } catch (err) {
            threw = true;
            err.message.should.equal('Document must be a JSON object');
          }
          if (!threw) {
            throw new Error('should have thrown');
          }
        };

        beforeEach(() => {
          db = new PouchDB(dbs.name);
        });

        it('should error for .post()', expectNotAnObject(() => db.post(badDoc)));
        it('should error for .put()', expectNotAnObject(() => db.put(badDoc)));
        it('should error for .bulkDocs()', expectNotAnObject(() => db.bulkDocs({docs: [badDoc]})));
      });
    });

    it('Test instance update_seq updates correctly', async () => {
      const db1 = new PouchDB(dbs.name);
      const db2 = new PouchDB(dbs.name);
      await db1.post({ a: 'doc' });
      const db1Info = await db1.info();
      const db2Info = await db2.info();
      db1Info.update_seq.should.not.equal(0);
      db2Info.update_seq.should.not.equal(0);
    });

    it('Fail to fetch a doc after db was deleted', async () => {
      const db = new PouchDB(dbs.name);
      let db2 = new PouchDB(dbs.name);
      const doc = { _id: 'foodoc' };
      const doc2 = { _id: 'foodoc2' };
      await db.put(doc);
      await db2.put(doc2);
      const docs = await db.allDocs();
      docs.total_rows.should.equal(2);
      await db.destroy();
      db2 = new PouchDB(dbs.name);
      try {
        await db2.get(doc._id);
        throw new Error('should have thrown');
      } catch (err) {
        err.name.should.equal('not_found');
        err.status.should.equal(404);
      }
    });

    it('Fail to fetch a doc after db was deleted (re-test)', async () => {
      const db = new PouchDB(dbs.name);
      let db2 = new PouchDB(dbs.name);
      const doc = { _id: 'foodoc' };
      const doc2 = { _id: 'foodoc2' };
      await db.put(doc);
      await db2.put(doc2);
      const docs = await db.allDocs();
      docs.total_rows.should.equal(2);
      await db.destroy();
      db2 = new PouchDB(dbs.name);
      try {
        await db2.get(doc._id);
        throw new Error('should have thrown');
      } catch (err) {
        err.status.should.equal(404);
      }
    });

    it('Cant add docs with empty ids', async () => {
      const docs = [
        {},
        { _id: null },
        { _id: undefined },
        { _id: '' },
        { _id: {} },
        { _id: '_underscored_id' }
      ];
      const db = new PouchDB(dbs.name);
      for (const doc of docs) {
        try {
          await db.put(doc);
          throw new Error('should have thrown');
        } catch (err) {
          should.exist(err);
        }
      }
    });

    it('Test doc with percent in ID', async () => {
      const db = new PouchDB(dbs.name);
      const doc = {
        foo: 'bar',
        _id: 'foo%bar'
      };
      const res = await db.put(doc);
      res.id.should.equal('foo%bar');
      doc.foo.should.equal('bar');
      const dbDoc = await db.get('foo%bar');
      dbDoc._id.should.equal('foo%bar');
      const allDocsRes = await db.allDocs({include_docs: true});
      const x = allDocsRes.rows[0];
      x.id.should.equal('foo%bar');
      x.doc._id.should.equal('foo%bar');
      x.key.should.equal('foo%bar');
      should.exist(x.doc._rev);
    });

    it('db.info should give auto_compaction = false (#2744)', async () => {
      const db = new PouchDB(dbs.name, { auto_compaction: false });
      const info = await db.info();
      info.auto_compaction.should.equal(false);
    });

    it('db.info should give auto_compaction = true (#2744)', async () => {
      const db = new PouchDB(dbs.name, { auto_compaction: true });
      const info = await db.info();
      // http doesn't support auto compaction
      info.auto_compaction.should.equal(adapter !== 'http');
    });

    it('db.info should give adapter name (#3567)', async () => {
      const db = new PouchDB(dbs.name);
      const info = await db.info();
      info.adapter.should.equal(db.adapter);
    });

    it('db.info should give correct doc_count', async () => {
      const db = new PouchDB(dbs.name);
      let info = await db.info();
      info.doc_count.should.equal(0);
      await db.bulkDocs({docs: [{_id: '1'}, {_id: '2'}, {_id: '3'}]});
      info = await db.info();
      info.doc_count.should.equal(3);
      const doc = await db.get('1');
      await db.remove(doc);
      info = await db.info();
      info.doc_count.should.equal(2);
    });

    it('putting returns {ok: true}', async () => {
      // in couch, it's {ok: true} and in cloudant it's {},
      // but the http adapter smooths this out
      const db = new PouchDB(dbs.name);
      let info = await db.put({_id: '_local/foo'});
      true.should.equal(info.ok, 'putting local returns ok=true');
      info = await db.put({_id: 'quux'});
      true.should.equal(info.ok, 'putting returns ok=true');
      const bulkInfo = await db.bulkDocs([{_id: '_local/bar'}, {_id: 'baz'}]);
      bulkInfo.should.have.length(2, 'correct num bulk docs');
      true.should.equal(bulkInfo[0].ok, 'bulk docs says ok=true #1');
      true.should.equal(bulkInfo[1].ok, 'bulk docs says ok=true #2');
      const postInfo = await db.post({});
      true.should.equal(postInfo.ok, 'posting returns ok=true');
    });

    it('putting is override-able', async () => {
      const db = new PouchDB(dbs.name);
      let called = 0;
      const plugin = {
        initPull() {
          this.oldPut = this.put;
          this.put = function (...args) {
            if (typeof args[args.length - 1] === 'function') {
              called++;
            }
            return this.oldPut.apply(this, args);
          };
        },
        cleanupPut() {
          this.put = this.oldPut;
        }
      };
      PouchDB.plugin(plugin);
      db.initPull();

      await db.put({_id: 'anid', foo: 'bar'});
      await called.should.be.above(0, 'put was called');

      const doc = await db.get('anid');
      doc.foo.should.equal('bar', 'correct doc');
    });

    it('issue 2779, deleted docs, old revs COUCHDB-292', async () => {
      const db = new PouchDB(dbs.name);
      const resp = await db.put({_id: 'foo'});
      const rev = resp.rev;
      await db.remove('foo', rev);
      try {
        await db.get('foo');
      } catch (err) {
        try {
          await db.put({_id: 'foo', _rev: rev});
          throw new Error('should never have got here');
        } catch (err2) {
          should.exist(err2);
        }
      }
    });

    it('issue 2888, successive deletes and writes', async () => {
      const db = new PouchDB(dbs.name);

      const checkNumRevisions = async num => {
        const fullDocs = await db.get('foo', {
          open_revs: 'all',
          revs: true
        });
        fullDocs[0].ok._revisions.ids.should.have.length(num);
      };

      let res = await db.put({ _id: 'foo' });
      let rev = res.rev;
      await checkNumRevisions(1);
      await db.remove('foo', rev);
      await checkNumRevisions(2);
      res = await db.put({ _id: 'foo' });
      rev = res.rev;
      await checkNumRevisions(3);
      await db.remove('foo', rev);
      await checkNumRevisions(4);
    });

    it('2 invalid puts', done => {
      const db = new PouchDB(dbs.name);
      let called = 0;
      const cb = () => {
        if (++called === 2) {
          done();
        }
      };
      db.put({_id: 'foo', _zing: 'zing'}, cb);
      db.put({_id: 'bar', _zing: 'zing'}, cb);
    });

    it('Docs save "null" value', async () => {
      const db = new PouchDB(dbs.name);
      await db.put({_id: 'doc', foo: null});
      const doc = await db.get('doc');
      (typeof doc.foo).should.equal('object');
      should.not.exist(doc.foo);
      Object.keys(doc).sort().should.deep.equal(['_id', '_rev', 'foo']);
    });

    it('replace PouchDB.destroy() (express-pouchdb#203)', done => {
      const old = PouchDB.destroy;
      PouchDB.destroy = (name, callback) => {
        const db = new PouchDB(name);
        return db.destroy(callback);
      };
      // delete a non-existing db, should be fine.
      PouchDB.destroy(dbs.name, (err, resp) => {
        PouchDB.destroy = old;

        done(err, resp);
      });
    });

    it('3968, keeps all object fields', async () => {
      const db = new PouchDB(dbs.name);
      const doc = {
        _id: "x",
        type: "testdoc",
        watch: 1,
        unwatch: 1,
        constructor: 1,
        toString: 1,
        toSource: 1,
        toLocaleString: 1,
        propertyIsEnumerable: 1,
        isPrototypeOf: 1,
        hasOwnProperty: 1
      };
      await db.put(doc);
      const savedDoc = await db.get(doc._id);
      // We shouldn't need to delete from doc here (#4273)
      should.not.exist(doc._rev);
      should.not.exist(doc._rev_tree);

      delete savedDoc._rev;
      savedDoc.should.deep.equal(doc);
    });

    it('4712 invalid rev for new doc generates conflict', async () => {
      // CouchDB 1.X has a bug which allows this insertion via bulk_docs
      // (which PouchDB uses for all document insertions)
      if (adapter === 'http' && !testUtils.isCouchMaster()) {
        return;
      }

      const db = new PouchDB(dbs.name);
      const newdoc = {
        '_id': 'foobar',
        '_rev': '1-123'
      };

      try {
        await db.put(newdoc);
        throw new Error('expected an error');
      } catch (err) {
        err.should.have.property('name', 'conflict');
        err.should.have.property('status', 409);
      }
    });

    it('test info() after db close', async () => {
      const db = new PouchDB(dbs.name);
      await db.close();
      try {
        await db.info();
      } catch (err) {
        err.message.should.equal('database is closed');
      }
    });

    it('test get() after db close', async () => {
      const db = new PouchDB(dbs.name);
      await db.close();
      try {
        await db.get('foo');
      } catch (err) {
        err.message.should.equal('database is closed');
      }
    });

    it('test close() after db close', async () => {
      const db = new PouchDB(dbs.name);
      await db.close();
      try {
        await db.close();
      } catch (err) {
        err.message.should.equal('database is closed');
      }
    });

    it('7259 should have "this" keyword properly scoped', async () => {
      const doc = { _id: 'foo' };
      const db = new PouchDB(dbs.name);
      await db.put(doc);
      await db.get(doc._id);
    });

    it('Test rev purge', async () => {
      const db = new PouchDB(dbs.name);

      if (typeof db._purge === 'undefined') {
        console.log('purge is not implemented for adapter', db.adapter);
        return;
      }

      const doc = { _id: 'foo' };
      const res = await db.put(doc);
      await db.purge(doc._id, res.rev);
      try {
        await db.get(doc._id);
        assert.fail('doc should not exist');
      } catch (err) {
        if (!err.status) {
          throw err;
        }
        err.status.should.equal(404, 'doc should not exist');
      }
    });

    if (adapter === 'local') {
      // TODO: this test fails in the http adapter in Chrome
      it('should allow unicode doc ids', async () => {
        const db = new PouchDB(dbs.name);
        const ids = [
          // "PouchDB is awesome" in Japanese, contains 1-3 byte chars
          '\u30d1\u30a6\u30c1\u30e5DB\u306f\u6700\u9ad8\u3060',
          '\u03B2', // 2-byte utf-8 char: 3b2
          '\uD843\uDF2D', // exotic 4-byte utf-8 char: 20f2d
          '\u0000foo\u0000bar\u0001baz\u0002quux', // like mapreduce
          '\u0000',
          '\u30d1'
        ];
        for (const id of ids) {
          const doc = {_id: id, foo: 'bar'};
          const info = await db.put(doc);
          doc._rev = info.rev;
          await db.put(doc);
          const resp = await db.get(id);
          resp._id.should.equal(id);
        }
      });

      // this test only really makes sense for IDB
      it('should have same blob support for 2 dbs', async () => {
        const db1 = new PouchDB(dbs.name);
        await db1.info();
        const db2 = new PouchDB(dbs.name);
        await db2.info();
        if (typeof db1._blobSupport !== 'undefined') {
          db1._blobSupport.should.equal(db2._blobSupport,
            'same blob support');
        } else {
          true.should.equal(true);
        }
      });

      it('6053, PouchDB.plugin() resets defaults', () => {
        const PouchDB1 = PouchDB.defaults({foo: 'bar'});
        const PouchDB2 = PouchDB1.plugin({foo: () => {}});
        should.exist(PouchDB2.__defaults);
        PouchDB1.__defaults.should.deep.equal(PouchDB2.__defaults);
      });
    }

    if (typeof process !== 'undefined' && !process.browser) {
      it('#5471 PouchDB.plugin() should throw error if passed wrong type or empty object', () => {
        (() => {
          PouchDB.plugin('pouchdb-adapter-memory');
        }).should.throw(Error, 'Invalid plugin: got "pouchdb-adapter-memory", expected an object or a function');
      });
    }

    it('#9094 should update total_rows when doc is put with an attachment', async () => {
      // given
      const db = new PouchDB(dbs.name);
      await db.put({ _id:'foo', _attachments:{ 'simple.txt':{ content_type:'text/plain', data:'helo' } } });
      const { rows, total_rows } = await db.allDocs();
      rows.length.should.equal(1);
      total_rows.should.equal(1);
    });

    it('#9094 should update total_rows when doc is posted with an attachment', async () => {
      // given
      const db = new PouchDB(dbs.name);
      await db.post({ _attachments:{ 'simple.txt':{ content_type:'text/plain', data:'helo' } } });
      const { rows, total_rows } = await db.allDocs();
      rows.length.should.equal(1);
      total_rows.should.equal(1);
    });
  });
});
