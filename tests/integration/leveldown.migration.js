'use strict';
if (!process.env.LEVEL_ADAPTER &&
    !process.env.LEVEL_PREFIX &&
    !process.env.AUTO_COMPACTION &&
    !process.env.ADAPTERS) {
  // these tests don't make sense for anything other than default leveldown
  const fs = require('fs');
  const { ncp } = require('ncp');

  ncp.limit = 16;

  describe('migration one', () => {
    beforeEach((done) => {
      const input =
        fs.createReadStream('./tests/integration/leveldb/oldStyle.uuid');
      input.on('end', () => {
        ncp('./tests/integration/leveldb/oldStyle',
            './tmp/_pouch_oldStyle', done);
      });
      input.pipe(fs.createWriteStream('./tmp/_pouch_oldStyle.uuid'));
    });
    it('should work', async () => {
      const db = new PouchDB('oldStyle');
      const doc = await db.get('doc');
      doc.something.should.equal('awesome');
      await db.destroy();
    });
  });
  describe('migration two', () => {
    beforeEach((done) => {
      ncp('./tests/integration/leveldb/middleStyle',
          './tmp/_pouch_middleStyle', done);
    });
    it('should work', async () => {
      const db = new PouchDB('middleStyle');
      const id = await db.id();
      id.should.equal('8E049E64-784A-3209-8DD6-97C29D7A5868');
      const resp = await db.get('_local/foo');
      resp.something.should.equal('else');
      const allDocsResp = await db.allDocs();
      allDocsResp.total_rows.should.equal(1);
      allDocsResp.rows[0].id.should.equal('_design/foo');
      await db.destroy();
    });
  });

  // sanity check to ensure we don't actually need to migrate
  // attachments for #2818
  describe('#2818 no migration needed for attachments', () => {
    beforeEach((done) => {
      ncp('./tests/integration/leveldb/lateStyle',
          './tmp/_pouch_lateStyle', done);
    });
    it('should work', async () => {
      const db = new PouchDB('lateStyle', { auto_compaction: false });
      await db.put({
        _id: 'doc_b',
        _attachments: {
          'att.txt': {
            data: 'Zm9v', // 'foo'
            content_type: 'text/plain'
            }
        }
      });
      let doc = await db.get('doc_b');
      await db.remove(doc);
      await db.compact();
      doc = await db.get('doc_a', {attachments: true});
      doc._attachments['att.txt'].data.should.equal('Zm9vYmFy');
      doc._attachments['att2.txt'].data.should.equal('Zm9vYmFy');
      doc._attachments['att3.txt'].data.should.equal('Zm9v');
      await db.destroy();
    });
  });

  // Sanity check for the fix in 3136 that guards against successive
  // new_edits to the same rev, ensuring it ignores duplicates.
  //
  // In the olden days, <=3.2.0, if you bulk-pushed with new_edits=false
  // the same rev multiple times, LevelDB would keep incrementing the seq
  // and keep writing new revs. This was fixed, but when we do _changes,
  // we have to guard against these duplicate seqs for backwards compat.
  //
  // This test is very similar to the test.bulk_docs.js test:
  // 'Testing successive new_edits to the same doc, different content'

  describe('#3136 no migration needed for overwritten revs', () => {
    beforeEach((done) => {
      ncp('./tests/integration/leveldb/laterStyle',
        './tmp/_pouch_laterStyle', done);
    });
    it('should work', async () => {
      const db = new PouchDB('laterStyle');

      // basically this a db where I did a very pathological thing:
      //var docsA = [{
      //  '_id': 'foo',
      //  '_rev': '1-x',
      //  'bar' : 'baz',
      //  '_revisions': {
      //    'start': 1,
      //    'ids': ['x']
      //  }
      //}, {
      //  '_id' : 'fee',
      //  '_rev': '1-x',
      //  '_revisions': {
      //    'start': 1,
      //    'ids': ['x']
      //  }
      //}];
      //var docsB = [{
      //  '_id': 'foo',
      //  '_rev': '1-x',
      //  'bar' : 'zam', // this update should be rejected
      //  '_revisions': {
      //    'start': 1,
      //    'ids': ['x']
      //  }
      //}];
      //
      //db.bulkDocs(docsA, {new_edits: false});
      //db.bulkDocs(docsB, {new_edits: false});


      const result = await db.changes({
        include_docs: true,
        return_docs: true
        // the important thing is that 'zam' is ignored. see
        // the other test in test.bulk_docs.js for details
      });
      const expected = {
        "results": [{
          "id": "fee",
          "changes": [{"rev": "1-x"}],
          "doc": {"_id": "fee", "_rev": "1-x"},
          "seq": 1
        }, {
          "id": "foo",
          "changes": [{"rev": "1-x"}],
          "doc": {"bar": "baz", "_id": "foo", "_rev": "1-x"},
          "seq": 2
        }],
        "last_seq": 2
      };
      result.should.deep.equal(expected);
      await db.destroy();
    });
  });
}
