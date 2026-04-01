'use strict';

describe('migration', () => {

  const usingIdb = () => {
    const pref = PouchDB.preferredAdapters;
    // Firefox will have ['idb'], Chrome will have ['idb', 'websql']
    return (pref.length === 1 && pref[0] === 'idb') ||
      (pref.length === 2 && pref[0] === 'idb' && pref[1] === 'websql');
  };

  const usingIndexeddb = () => {
    const pref = PouchDB.preferredAdapters;
    // FUTURE: treat indexeddb adapter as the preferred option?
    return pref.length === 1 && pref[0] === 'indexeddb';
  };

  const usingDefaultPreferredAdapters = () => usingIdb() || usingIndexeddb();

  const scenarios = [
    { scenario: 'PouchDB v1.1.0', constructorName: 'PouchDBVersion110'} ,
    { scenario: 'PouchDB v2.0.0', constructorName: 'PouchDBVersion200'} ,
    { scenario: 'PouchDB v2.2.0', constructorName: 'PouchDBVersion220'} ,
    { scenario: 'PouchDB v3.0.6', constructorName: 'PouchDBVersion306'} ,
    { scenario: 'PouchDB v3.2.0', constructorName: 'PouchDBVersion320'} ,
    { scenario: 'PouchDB v3.6.0', constructorName: 'PouchDBVersion360'} ,
    { scenario: 'PouchDB v7.3.1', constructorName: 'PouchDBVersion731'} ,
    { scenario: 'PouchDB v8.0.1', constructorName: 'PouchDBVersion801'} ,
    { scenario: 'websql',         constructorName: 'PouchDB'} ,
  ];

  let skip = false;

  before(() => {
    const isNodeWebkit = typeof window !== 'undefined' &&
      typeof process !== 'undefined';

    const skipMigration = 'SKIP_MIGRATION' in testUtils.params() &&
      testUtils.params().SKIP_MIGRATION;

    if (!usingDefaultPreferredAdapters() || window.msIndexedDB ||
      isNodeWebkit || skipMigration) {
      skip = true;
      return this.skip();
    }

    // conditionally load all legacy PouchDB scripts to avoid pulling them in
    // for test runs that don't test migrations
    return Promise.all(scenarios.map(async ({ scenario }) => {
      const match = scenario.match(/PouchDB v([.\d]+)/);
      if (!match) {
        return;
      }

      await testUtils.asyncLoadScript(`deps/pouchdb-${match[1]}-postfixed.js`);

      if (usingIndexeddb() && versionGte(scenario, '7.2.1')) {
        await testUtils.asyncLoadScript(`deps/pouchdb-${match[1]}-indexeddb-postfixed.js`);
      }
    }));
  });

  after(() => {
    // free memory
    scenarios.forEach(({ constructorName }) => {
      if (constructorName !== 'PouchDB') {
        delete window[constructorName];
      }
    });
  });

  scenarios.forEach(({ scenario, constructorName }) => {

    describe(`migrate from ${scenario}`, () => {

      let dbs = {};

      before(function () {
        if (usingIndexeddb() && !versionGte(scenario, '7.2.1')) {
          return this.skip();
        }

        // TODO Currently, previous versions of indexeddb adapter do not work on
        // webkit. They should be supported soon, so a different !versionGte()
        // call can be added here when appropriate.
        if (testUtils.isSafari() && usingIndexeddb()) {
          return this.skip();
        }
      });

      beforeEach(function (done) {
        if (skip) {
          return this.skip();
        }

        // need actual unique db names for these tests
        const localName = testUtils.adapterUrl('local', 'test_migration_local');
        const remoteName = testUtils.adapterUrl('http', 'test_migration_remote');

        dbs.first = {
          pouch : window[constructorName] || PouchDB,
          local : localName,
          remote : remoteName,
          localOpts : {}
        };

        dbs.second = {
          pouch : PouchDB,
          local : localName,
          remote : remoteName
        };

        if (scenario in PouchDB.adapters) {
          dbs.first.localOpts.adapter = scenario;
        } else if (usingIndexeddb()) {
          // use indexeddb adapter for both old and new DBs:
          // * cannot currently migrate idb -> indexeddb automatically
          // * in these tests, idb adapter is always the default for old PouchDB
          //   bundles, even if indexeddb is available
          dbs.first.localOpts.adapter = 'indexeddb';
        }
        // else scenario might not make sense for this browser, so just use
        // same adapter for both

        testUtils.cleanup([dbs.first.local, dbs.second.local], done);

      });

      afterEach((done) => {
        testUtils.cleanup([dbs.first.local, dbs.second.local], done);
      });

      const origDocs = [
        {_id: '0', a: 1, b: 1},
        {_id: '3', a: 4, b: 16},
        {_id: '1', a: 2, b: 4},
        {_id: '2', a: 3, b: 9}
      ];

      it('Testing basic migration integrity', async () => {
        const oldPouch = new dbs.first.pouch(dbs.first.local, dbs.first.localOpts);
        const bulkRes = await oldPouch.bulkDocs({docs: origDocs});
        const removedDoc = {_deleted: true, _rev: bulkRes[0].rev, _id: bulkRes[0].id};
        await oldPouch.remove(removedDoc);
        await oldPouch.close();
        const newPouch = new dbs.second.pouch(dbs.second.local);
        let res = await newPouch.allDocs({key: '2'});
        res.total_rows.should.equal(3);
        res.rows.should.have.length(1);
        res = await newPouch.allDocs({key: '0'});
        res.total_rows.should.equal(3);
        res.rows.should.have.length(0);
      });

      it("Test basic replication with migration", async () => {
        const docs = [
          {_id: "0", integer: 0, string: '0'},
          {_id: "1", integer: 1, string: '1'},
          {_id: "2", integer: 2, string: '2'},
          {_id: "3", integer: 3, string: '3', _deleted : true},
          {_id: "4", integer: 4, string: '4', _deleted : true}
        ];

        const oldPouch = new dbs.first.pouch(dbs.first.remote);
        await oldPouch.bulkDocs({docs}, {});
        const oldLocalPouch = new dbs.first.pouch(dbs.first.local,
                                                   dbs.first.localOpts);
        const result = await oldPouch.replicate.to(oldLocalPouch);
        should.exist(result.ok, 'replication was ok');
        await oldPouch.close();
        await oldLocalPouch.close();
        const newPouch = new dbs.second.pouch(dbs.second.local);
        const res = await newPouch.allDocs({});
        res.rows.should.have.length(3, 'unexpected rows: ' +
                                    JSON.stringify(res.rows));
        res.total_rows.should.equal(3);
      });

      it("Test basic replication with migration + changes()", async () => {
        const docs = [
          {_id: "0", integer: 0, string: '0'},
          {_id: "1", integer: 1, string: '1'},
          {_id: "2", integer: 2, string: '2'},
          {_id: "3", integer: 3, string: '3', _deleted : true},
          {_id: "4", integer: 4, string: '4', _deleted : true}
        ];

        const oldPouch = new dbs.first.pouch(dbs.first.remote);
        await oldPouch.bulkDocs({docs}, {});
        const oldLocalPouch = new dbs.first.pouch(dbs.first.local,
                                                  dbs.first.localOpts);
        const result = await oldPouch.replicate.to(oldLocalPouch);
        should.exist(result.ok, 'replication was ok');
        await oldPouch.close();
        await oldLocalPouch.close();
        const newPouch = new dbs.second.pouch(dbs.second.local);
        const complete = await newPouch.changes({include_docs: true, return_docs: true});
        complete.results.should.have
          .length(5, 'no _local docs in changes()');
      });

      if (versionGte(scenario, '2.2.0')) {
        it("Test persistent views don't require update", async () => {
          const oldPouch = new dbs.first.pouch(dbs.first.local, dbs.first.localOpts);
          const docs = origDocs.slice().concat([{
            _id: '_design/myview',
            views: {
              myview: {
                map: function (doc) {
                  emit(doc.a);
                }.toString()
              }
            }
          }]);
          const expectedRows = [
            { key: 1, id: '0', value: null },
            { key: 2, id: '1', value: null },
            { key: 3, id: '2', value: null },
            { key: 4, id: '3', value: null }
          ];
            await oldPouch.bulkDocs({docs});
            should.not.exist(null, 'bulkDocs');
            const queryRes = await oldPouch.query('myview');
            queryRes.rows.should.deep.equal(expectedRows);
            await oldPouch.close();
            const newPouch = new dbs.second.pouch(dbs.second.local);
            const newRes = await newPouch.query('myview', {stale: 'ok'});
            newRes.rows.should.deep.equal(expectedRows);
        });

        it("Test persistent views don't require update, with a value",
            async () => {
          const oldPouch = new dbs.first.pouch(dbs.first.local, dbs.first.localOpts);
          const docs = origDocs.slice().concat([{
            _id: '_design/myview',
            views: {
              myview: {
                map: function (doc) {
                  emit(doc.a, doc.b);
                }.toString()
              }
            }
          }]);
          const expectedRows = [
            { key: 1, id: '0', value: 1 },
            { key: 2, id: '1', value: 4 },
            { key: 3, id: '2', value: 9 },
            { key: 4, id: '3', value: 16 }
          ];
            await oldPouch.bulkDocs({docs});
            const queryRes = await oldPouch.query('myview');
            queryRes.rows.should.deep.equal(expectedRows);
            await oldPouch.close();
            const newPouch = new dbs.second.pouch(dbs.second.local);
            const newRes = await newPouch.query('myview', {stale: 'ok'});
            newRes.rows.should.deep.equal(expectedRows);
        });

        it('Returns ok for viewCleanup after modifying view', async () => {
          const oldPouch =
            new dbs.first.pouch(dbs.first.local, dbs.first.localOpts);
          const ddoc = {
            _id: '_design/myview',
            views: {
              myview: {
                map: function (doc) {
                  emit(doc.firstName);
                }.toString()
              }
            }
          };
          const doc = {
            _id: 'foo',
            firstName: 'Foobar',
            lastName: 'Bazman'
          };
          const info = await oldPouch.bulkDocs({docs: [ddoc, doc]});
          ddoc._rev = info[0].rev;
          let res = await oldPouch.query('myview');
          res.rows.should.deep.equal([
            {id: 'foo', key: 'Foobar', value: null}
          ]);
          ddoc.views.myview.map = function (doc) {
            emit(doc.lastName);
          }.toString();
          await oldPouch.put(ddoc);
          res = await oldPouch.query('myview');
          res.rows.should.deep.equal([
            {id: 'foo', key: 'Bazman', value: null}
          ]);
          await oldPouch.close();
          const newPouch = new dbs.second.pouch(dbs.second.local);
          await newPouch.viewCleanup();
        });
        it('Remembers local docs', async () => {
          const oldPouch =
            new dbs.first.pouch(dbs.first.local, dbs.first.localOpts);
          const docs = [
            { _id: '_local/foo' },
            { _id: '_local/bar' }
          ];
          await oldPouch.bulkDocs({docs});
          await oldPouch.close();
          const newPouch = new dbs.second.pouch(dbs.second.local);
          await newPouch.get('_local/foo');
          await newPouch.get('_local/bar');
        });

        it('Testing migration with weird doc ids', async () => {
          const origDocs = [
            {_id: 'foo::bar::baz'},
            {_id: '\u0000foo\u0000'}
          ];

          const oldPouch = new dbs.first.pouch(dbs.first.local, dbs.first.localOpts);
            await oldPouch.bulkDocs({docs: origDocs});
            await oldPouch.close();
            const newPouch = new dbs.second.pouch(dbs.second.local);
            const res = await newPouch.allDocs();
            res.total_rows.should.equal(2);
            res.rows.should.have.length(2);
            res.rows[1].id.should.equal(origDocs[0]._id);
            res.rows[0].id.should.equal(origDocs[1]._id);
        });
      }

      if (versionGte(scenario, '3.0.6')) {
        // attachments didn't really work until this release
        it('#2818 Testing attachments with compaction of dups', async () => {
          const docs = [
            {
              _id: 'doc1',
              _attachments: {
                'att.txt': {
                  data: 'Zm9vYmFy', // 'foobar'
                  content_type: 'text/plain'
                }
              }
            },
            {
              _id: 'doc2',
              _attachments: {
                'att.txt': {
                  data: 'Zm9vYmFy', // 'foobar'
                  content_type: 'text/plain'
                }
              }
            }
          ];

          const oldPouch = new dbs.first.pouch(
            dbs.first.local, dbs.first.localOpts);
          await oldPouch.bulkDocs(docs);
          await oldPouch.close();
          const newPouch = new dbs.second.pouch(dbs.second.local,
            {auto_compaction: false});
          const doc1 = await newPouch.get('doc1');
          await newPouch.remove(doc1);
          await newPouch.compact();
          const doc2 = await newPouch.get('doc2', {attachments: true});
          doc2._attachments['att.txt'].data.should.equal('Zm9vYmFy');
        });

        it('#2818 Testing attachments with compaction of dups 2', async () => {
          const docs = [
            {
              _id: 'doc1',
              _attachments: {
                'att.txt': {
                  data: 'Zm9vYmFy', // 'foobar'
                  content_type: 'text/plain'
                }
              }
            }
          ];

          const oldPouch = new dbs.first.pouch(
            dbs.first.local, dbs.first.localOpts);
          await oldPouch.bulkDocs(docs);
          await oldPouch.close();
          const newPouch = new dbs.second.pouch(dbs.second.local,
            {auto_compaction: false});
          await newPouch.put({
            _id: 'doc2',
            _attachments: {
              'att.txt': {
                data: 'Zm9vYmFy', // 'foobar'
                content_type: 'text/plain'
              }
            }
          });
          const doc2 = await newPouch.get('doc2');
          await newPouch.remove(doc2);
          await newPouch.compact();
          const doc1 = await newPouch.get('doc1', {attachments: true});
          doc1._attachments['att.txt'].data.should.equal('Zm9vYmFy');
        });

        it('#2818 Testing attachments with compaction of dups 3', async () => {
          const docs = [
            {
              _id: 'doc1',
              _attachments: {
                'att.txt': {
                  data: 'Zm9vYmFy', // 'foobar'
                  content_type: 'text/plain'
                }
              }
            },
            {
              _id: 'doc_deleted',
              _deleted: true
            },
            {
              _id: 'doc_no_attachments'
            }
          ];

          for (let i = 0; i < 25; i++) {
            // test paging in the migration
            docs.push({
              _id: `some_other_doc_${i}`
            });
          }

          const oldPouch = new dbs.first.pouch(
            dbs.first.local, dbs.first.localOpts);
          await oldPouch.bulkDocs(docs);
          await oldPouch.close();
          const newPouch = new dbs.second.pouch(dbs.second.local,
            {auto_compaction: false});
          await newPouch.put({
            _id: 'doc2',
            _attachments: {
              'att.txt': {
                data: 'Zm9vYmFy', // 'foobar'
                content_type: 'text/plain'
              }
            }
          });
          const doc2 = await newPouch.get('doc2');
          await newPouch.remove(doc2);
          await newPouch.compact();
          const doc1 = await newPouch.get('doc1', {attachments: true});
          doc1._attachments['att.txt'].data.should.equal('Zm9vYmFy');
        });

        it('#2818 Testing attachments with compaction of dups 4', async () => {
          const docs = [
            {
              _id: 'doc1',
              _attachments: {
                'att.txt': {
                  data: 'Zm9vYmFy', // 'foobar'
                  content_type: 'text/plain'
                },
                'att2.txt': {
                  data: 'Zm9vYmFy', // 'foobar'
                  content_type: 'text/plain'
                },
                'att3.txt': {
                  data: 'Zm9v', // 'foo'
                  content_type: 'text/plain'
                }
              }
            }
          ];

          const oldPouch = new dbs.first.pouch(
            dbs.first.local, dbs.first.localOpts);
          await oldPouch.bulkDocs(docs);
          await oldPouch.close();
          const newPouch = new dbs.second.pouch(dbs.second.local,
            {auto_compaction: false});
          await newPouch.put({
            _id: 'doc2',
            _attachments: {
              'att.txt': {
                data: 'Zm9vYmFy', // 'foobar'
                content_type: 'text/plain'
              }
            }
          });
          const doc2 = await newPouch.get('doc2');
          await newPouch.remove(doc2);
          await newPouch.compact();
          const doc1 = await newPouch.get('doc1', {attachments: true});
          doc1._attachments['att.txt'].data.should.equal('Zm9vYmFy');
          doc1._attachments['att2.txt'].data.should.equal('Zm9vYmFy');
          doc1._attachments['att3.txt'].data.should.equal('Zm9v');
        });

        it('#2818 Testing attachments with compaction of dups 5', async () => {
          const docs = [
            {
              _id: 'doc1',
              _attachments: {
                'att.txt': {
                  data: 'Zm9vYmFy', // 'foobar'
                  content_type: 'text/plain'
                },
                'att2.txt': {
                  data: 'Zm9vYmFy', // 'foobar'
                  content_type: 'text/plain'
                },
                'att3.txt': {
                  data: 'Zm9v', // 'foo'
                  content_type: 'text/plain'
                }
              }
            }, {
              _id: 'doc3',
              _attachments: {
                'att-a.txt': {
                  data: 'Zm9vYmFy', // 'foobar'
                  content_type: 'text/plain'
                },
                'att-b.txt': {
                  data: 'Zm9v', // 'foo'
                  content_type: 'text/plain'
                },
                'att-c.txt': {
                  data: 'YmFy', // 'bar'
                  content_type: 'text/plain'
                }
              }
            }
          ];

          const oldPouch = new dbs.first.pouch(
            dbs.first.local, dbs.first.localOpts);
          await oldPouch.bulkDocs(docs);
          await oldPouch.close();
          const newPouch = new dbs.second.pouch(dbs.second.local,
            {auto_compaction: false});
          await newPouch.put({
            _id: 'doc2',
            _attachments: {
              'att.txt': {
                data: 'YmFy', // 'bar'
                content_type: 'text/plain'
              }
            }
          });
          const doc2 = await newPouch.get('doc2');
          await newPouch.remove(doc2);
          await newPouch.compact();
          const doc1 = await newPouch.get('doc1', {attachments: true});
          doc1._attachments['att.txt'].data.should.equal('Zm9vYmFy');
          doc1._attachments['att2.txt'].data.should.equal('Zm9vYmFy');
          doc1._attachments['att3.txt'].data.should.equal('Zm9v');
          const doc3 = await newPouch.get('doc3', {attachments: true});
          doc3._attachments['att-a.txt'].data.should.equal('Zm9vYmFy');
          doc3._attachments['att-b.txt'].data.should.equal('Zm9v');
          doc3._attachments['att-c.txt'].data.should.equal('YmFy');
        });

        it('#2818 Testing attachments with compaction of dups 6', async () => {
          const docs = [];

          for (let i = 0; i < 40; i++) {
            docs.push({
              _id: `doc${i}`,
              _attachments: {
                'att.txt' : {
                  data: testUtils.btoa(Math.random().toString()),
                  content_type: 'text/plain'
                }
              }
            });
          }
          docs.push({
            _id: 'doc_a',
            _attachments: {
              'att.txt': {
                data: 'Zm9vYmFy', // 'foobar'
                content_type: 'text/plain'
              },
              'att2.txt': {
                data: 'Zm9vYmFy', // 'foobar'
                content_type: 'text/plain'
              },
              'att3.txt': {
                data: 'Zm9v', // 'foo'
                content_type: 'text/plain'
              }
            }
          });
          const oldPouch = new dbs.first.pouch(
            dbs.first.local, dbs.first.localOpts);
          await oldPouch.bulkDocs(docs);
          await oldPouch.close();
          const newPouch = new dbs.second.pouch(dbs.second.local,
            {auto_compaction: false});
          await newPouch.put({
            _id: 'doc_b',
            _attachments: {
              'att.txt': {
                data: 'Zm9v', // 'foo'
                content_type: 'text/plain'
              }
            }
          });
          const docB = await newPouch.get('doc_b');
          await newPouch.remove(docB);
          await newPouch.compact();
          const docA = await newPouch.get('doc_a', {attachments: true});
          docA._attachments['att.txt'].data.should.equal('Zm9vYmFy');
          docA._attachments['att2.txt'].data.should.equal('Zm9vYmFy');
          docA._attachments['att3.txt'].data.should.equal('Zm9v');
        });

        it('#2818 compaction of atts after many revs', async () => {
          const oldPouch = new dbs.first.pouch(
            dbs.first.local, dbs.first.localOpts);

           const res = await oldPouch.put({_id: 'foo'});
          await oldPouch.putAttachment('foo', 'att', res.rev, 'Zm9v', 'text/plain');
          let doc = await oldPouch.get('foo', {attachments: true});
          doc._attachments['att'].content_type.should.equal('text/plain');
          should.exist(doc._attachments['att'].data);
          doc = await oldPouch.get('foo');
          await oldPouch.put(doc);
          const newPouch = new dbs.second.pouch(dbs.second.local,
            {auto_compaction: false});
          await newPouch.compact();
          doc = await newPouch.get('foo', {attachments: true});
          doc._attachments['att'].content_type.should.equal('text/plain');
          doc._attachments['att'].data.length.should.be.above(0,
            'attachment exists');
        });

        it('#2818 Testing attachments with compaction of dups (local docs)', async () => {
          const docs = [
            {
              _id: '_local/doc1',
              _attachments: {
                'att.txt': {
                  data: 'Zm9vYmFy', // 'foobar'
                  content_type: 'text/plain'
                }
              }
            },
            {
              _id: '_local/doc2',
              _attachments: {
                'att.txt': {
                  data: 'Zm9vYmFy', // 'foobar'
                  content_type: 'text/plain'
                }
              }
            }
          ];

          const oldPouch = new dbs.first.pouch(
            dbs.first.local, dbs.first.localOpts);
          await oldPouch.bulkDocs(docs);
          await oldPouch.close();
          const newPouch = new dbs.second.pouch(dbs.second.local,
            {auto_compaction: false});
          const doc1 = await newPouch.get('_local/doc1');
          await newPouch.remove(doc1);
          await newPouch.compact();
          const doc2 = await newPouch.get('_local/doc2', {attachments: true});
          doc2._attachments['att.txt'].data.should.equal('Zm9vYmFy');
        });

        it('#2890 PNG content after migration', async () => {
          const oldPouch = new dbs.first.pouch(
            dbs.first.local, dbs.first.localOpts);

          const transparent1x1Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HA' +
              'wCAAAAC0lEQVR4nGP6zwAAAgcBApocMXEA' +
              'AAAASUVORK5CYII=';
          const black1x1Png =
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACkl' +
              'EQVR4nGNiAAAABgADNjd8qAAA' +
              'AABJRU5ErkJggg==';

          const res = await oldPouch.put({_id: 'foo'});
          await oldPouch.putAttachment('foo', 'att', res.rev, transparent1x1Png, 'image/png');
          let doc = await oldPouch.get('foo', {attachments: true});
          doc._attachments['att'].content_type.should.equal('image/png');
          should.exist(doc._attachments['att'].data);
          doc = await oldPouch.get('foo');
          await oldPouch.put(doc);
          const newPouch = new dbs.second.pouch(dbs.second.local,
            {auto_compaction: false});
          await newPouch.compact();
          doc = await newPouch.get('foo', {attachments: true});
          doc._attachments['att'].content_type.should.equal('image/png');
          doc._attachments['att'].data.should.equal(transparent1x1Png);
          await newPouch.putAttachment('bar', 'att', null, black1x1Png, 'image/png');
          const barDoc = await newPouch.get('bar', {attachments: true});
          barDoc._attachments['att'].content_type.should.equal('image/png');
          barDoc._attachments['att'].data.should.equal(black1x1Png);
        });
      }

      if (versionGte(scenario, '3.2.0')) {
        it('#3136 Testing later winningSeqs', async () => {
          const tree = [
            [
              {
                _id: 'foo',
                _rev: '1-a',
                _revisions: {start: 1, ids: ['a']}
              }
            ], [
              {
                _id: 'foo',
                _rev: '2-b',
                _revisions: {start: 2, ids: ['b', 'a']}
              }
            ], [
              {
                _id: 'bar',
                _rev: '1-x',
                _revisions: {start: 1, ids: ['x']}
              }
            ], [
              {
                _id: 'foo',
                _rev: '2-c',
                _deleted: true,
                _revisions: {start: 2, ids: ['c', 'a']}
              }
            ]
          ];

          const oldPouch = new dbs.first.pouch(
            dbs.first.local, dbs.first.localOpts);
          for (const docs of tree) {
            await oldPouch.bulkDocs(docs, {new_edits: false});
          }
          await oldPouch.close();
          const newPouch = new dbs.second.pouch(dbs.second.local,
            {auto_compaction: false});
          const result = await newPouch.changes({
            return_docs: true,
            include_docs: true,
            style: 'all_docs'
          });
          // order don't matter
          result.results.forEach((ch) => {
            ch.changes = ch.changes.sort((a, b) => {
              return a.rev < b.rev ? -1 : 1;
            });
          });
          const expected = {
            "results": [
              {
                "seq": 3,
                "id": "bar",
                "changes": [{"rev": "1-x"}],
                "doc": {"_id": "bar", "_rev": "1-x"}
              },
              {
                "seq": 4,
                "id": "foo",
                "changes": [{"rev": "2-b"}, {"rev": "2-c"}],
                "doc": {"_id": "foo", "_rev": "2-b"}
              }
            ],
            "last_seq": 4
          };
          result.should.deep.equal(expected);
        });
      }

      if (versionGte(scenario, '3.6.0')) {
        it('#3646 - Should finish with 0 documents', async () => {
          const data = [
            {
              "docs": [
                {
                  "_revisions": {
                    "start": 2,
                    "ids": [
                      "4e16ac64356d4358bf1bdb4857fc299f",
                      "aed67b17ea5ba6b78e704ad65d3fb5db"
                    ]
                  },
                  "_rev": "2-4e16ac64356d4358bf1bdb4857fc299f",
                  "_id": "b74e3b45",
                  "_deleted": true
                },
                {
                  "_revisions": {
                    "start": 2,
                    "ids": [
                      "3757f03a178b34284361c89303cf8c35",
                      "0593f4c87b24f0f9b620526433929bb0"
                    ]
                  },
                  "_rev": "2-3757f03a178b34284361c89303cf8c35",
                  "_id": "b74e3b45",
                  "_deleted": true
                },
                {
                  "_revisions": {
                    "start": 3,
                    "ids": [
                      "f28d17ab990dcadd20ad38860fde9f11",
                      "6cf4b9e2115d7e884292b97aa8765285",
                      "dcfdf66ab61873ee512a9ccf3e3731a1"
                    ]
                  },
                  "_rev": "3-f28d17ab990dcadd20ad38860fde9f11",
                  "_id": "b74e3b45"
                },
                {
                  "_revisions": {
                    "start": 3,
                    "ids": [
                      "4d93920c00a4a7269095b22ff4329b3c",
                      "7190eca51acb2b302a89ed1204ac2813",
                      "017eba7ef1e4f529143f463779822627"
                    ]
                  },
                  "_rev": "3-4d93920c00a4a7269095b22ff4329b3c",
                  "_id": "b74e3b45",
                  "_deleted": true
                },
                {
                  "_revisions": {
                    "start": 3,
                    "ids": [
                      "91b47d7b889feb36eaf9336c071f00cc",
                      "0e3379b8f9128e6062d13eeb98ec538e",
                      "1c006ce18b663e2a031ced4669797c28"
                    ]
                  },
                  "_rev": "3-91b47d7b889feb36eaf9336c071f00cc",
                  "_id": "b74e3b45",
                  "_deleted": true
                },
                {
                  "_revisions": {
                    "start": 4,
                    "ids": [
                      "2c3c860d421fc9f6cc82e4fb811dc8e2",
                      "4473170dcffa850aca381b4f644b2947",
                      "3524a871600080f5e30e59a292b02a3f",
                      "89eb0b5131800963bb7caf1fc83b6242"
                    ]
                  },
                  "_rev": "4-2c3c860d421fc9f6cc82e4fb811dc8e2",
                  "_id": "b74e3b45",
                  "_deleted": true
                },
                {
                  "_revisions": {
                    "start": 6,
                    "ids": [
                      "441f43a31c89dc68a7cc934ce5779bf8",
                      "4c7f8b00508144d049d18668d17e552a",
                      "e8431fb3b448f3457c5b2d77012fa8b4",
                      "f2e7dc8102123e13ca792a0a05ca6235",
                      "37a13a5c1e2ce5926a3ffcda7e669106",
                      "78739468c87b30f76d067a2d7f373803"
                    ]
                  },
                  "_rev": "6-441f43a31c89dc68a7cc934ce5779bf8",
                  "_id": "b74e3b45",
                  "_deleted": true
                }
              ]
            },
            {
              "docs": [
                {
                  "_revisions": {
                    "start": 2,
                    "ids": [
                      "3757f03a178b34284361c89303cf8c35",
                      "0593f4c87b24f0f9b620526433929bb0"
                    ]
                  },
                  "_rev": "2-3757f03a178b34284361c89303cf8c35",
                  "_id": "b74e3b45",
                  "_deleted": true
                },
                {
                  "_revisions": {
                    "start": 2,
                    "ids": [
                      "4e16ac64356d4358bf1bdb4857fc299f",
                      "aed67b17ea5ba6b78e704ad65d3fb5db"
                    ]
                  },
                  "_rev": "2-4e16ac64356d4358bf1bdb4857fc299f",
                  "_id": "b74e3b45",
                  "_deleted": true
                },
                {
                  "_revisions": {
                    "start": 3,
                    "ids": [
                      "91b47d7b889feb36eaf9336c071f00cc",
                      "0e3379b8f9128e6062d13eeb98ec538e",
                      "1c006ce18b663e2a031ced4669797c28"
                    ]
                  },
                  "_rev": "3-91b47d7b889feb36eaf9336c071f00cc",
                  "_id": "b74e3b45",
                  "_deleted": true
                },
                {
                  "_revisions": {
                    "start": 3,
                    "ids": [
                      "4d93920c00a4a7269095b22ff4329b3c",
                      "7190eca51acb2b302a89ed1204ac2813",
                      "017eba7ef1e4f529143f463779822627"
                    ]
                  },
                  "_rev": "3-4d93920c00a4a7269095b22ff4329b3c",
                  "_id": "b74e3b45",
                  "_deleted": true
                },
                {
                  "_revisions": {
                    "start": 4,
                    "ids": [
                      "2c3c860d421fc9f6cc82e4fb811dc8e2",
                      "4473170dcffa850aca381b4f644b2947",
                      "3524a871600080f5e30e59a292b02a3f",
                      "89eb0b5131800963bb7caf1fc83b6242"
                    ]
                  },
                  "_rev": "4-2c3c860d421fc9f6cc82e4fb811dc8e2",
                  "_id": "b74e3b45",
                  "_deleted": true
                },
                {
                  "_revisions": {
                    "start": 4,
                    "ids": [
                      "dbaa7e6c02381c2c0ec5259572387d7c",
                      "f28d17ab990dcadd20ad38860fde9f11",
                      "6cf4b9e2115d7e884292b97aa8765285",
                      "dcfdf66ab61873ee512a9ccf3e3731a1"
                    ]
                  },
                  "_rev": "4-dbaa7e6c02381c2c0ec5259572387d7c",
                  "_id": "b74e3b45",
                  "_deleted": true
                },
                {
                  "_revisions": {
                    "start": 6,
                    "ids": [
                      "441f43a31c89dc68a7cc934ce5779bf8",
                      "4c7f8b00508144d049d18668d17e552a",
                      "e8431fb3b448f3457c5b2d77012fa8b4",
                      "f2e7dc8102123e13ca792a0a05ca6235",
                      "37a13a5c1e2ce5926a3ffcda7e669106",
                      "78739468c87b30f76d067a2d7f373803"
                    ]
                  },
                  "_rev": "6-441f43a31c89dc68a7cc934ce5779bf8",
                  "_id": "b74e3b45",
                  "_deleted": true
                }
              ]
            }
          ];

          const oldPouch = new dbs.first.pouch(
              dbs.first.local, dbs.first.localOpts);

          await oldPouch.bulkDocs(data[0], {new_edits: false});
          await oldPouch.bulkDocs(data[1], {new_edits: false});
          await oldPouch.close();
          const newPouch = new dbs.second.pouch(dbs.second.local,
              {auto_compaction: false});
          let res = await newPouch.allDocs();
          res.rows.should.have.length(0, 'all docs length is 0');
          res.total_rows.should.equal(0);
          res = await newPouch.allDocs({keys: ['b74e3b45'], include_docs: true});
          const first = res.rows[0];
          should.equal(first.value.deleted, true, 'all docs value.deleted');
          first.value.rev.should.equal('6-441f43a31c89dc68a7cc934ce5779bf8');
          res.total_rows.should.equal(0);
          const info = await newPouch.info();
          info.doc_count.should.equal(0, 'doc_count is 0');
          const changes = await newPouch.changes({include_docs: true, return_docs: true});
          changes.results.should.have.length(1);
          const firstChange = changes.results[0];
          firstChange.doc._rev.should.equal('6-441f43a31c89dc68a7cc934ce5779bf8');
          should.equal(firstChange.deleted, true, 'changes metadata.deleted');
          should.equal(firstChange.doc._deleted, true, 'changes doc._deleted');
        });
      }
    });
  });
});

function versionGte(scenario, minimumRequired) {
  const match = scenario.match(/^PouchDB v([.\d]+)$/);
  if (!match) { return false; }
  const actual = match[1].split('.').map(Number);

  const min = minimumRequired.split('.').map(Number);

  for (let i=0; i<min.length; ++i) {
    if (actual[i] > min[i]) { return true; }
    if (actual[i] < min[i]) { return false; }
  }

  return true;
}
