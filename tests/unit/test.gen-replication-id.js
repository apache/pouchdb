'use strict';

const memdown = require('memdown');
const PouchDB = require('../../packages/node_modules/pouchdb-for-coverage');
const genReplicationId = PouchDB.utils.generateReplicationId;
const sourceDb = new PouchDB({name: 'local_db', db: memdown});
const targetDb = new PouchDB({name: 'target_db', db: memdown});

require('chai').should();

describe('test.gen-replication-id.js', function () {
  it('is different with different `doc_ids` option', async function () {
    const opts2 = {doc_ids: ["1"]};
    const opts1 = {doc_ids: ["2"]};

    const [ id1, id2 ] = await generateReplicationIds(sourceDb, targetDb, opts1, opts2);

    id2.should.not.eql(id1);
  });

  it('ignores the order of array elements in the `doc_ids` option',
    async function () {
      const opts1 = {doc_ids: ["1", "2", "3"]};
      const opts2 = {doc_ids: ["3", "2", "1"]};

      const [ id1, id2 ] = await generateReplicationIds(sourceDb, targetDb, opts1, opts2);

      id2.should.eql(id1);
    }
  );

  it('is different with different `filter` option', async function () {
    const opts1 = {filter: 'ddoc/filter'};
    const opts2 = {filter: 'ddoc/other_filter'};

    const [ id1, id2 ] = await generateReplicationIds(sourceDb, targetDb, opts1, opts2);

    id2.should.not.eql(id1);
  });

  it('ignores the `query_params` option if there\'s no `filter` option',
    async function () {
      const opts1 = {query_params: {foo: 'bar'}};
      const opts2 = {query_params: {bar: 'baz'}};

      const [ id1, id2 ] = await generateReplicationIds(sourceDb, targetDb, opts1, opts2);

      id2.should.eql(id1);
    }
  );

  it('is different with same `filter` but different `query_params` option',
    async function () {
      const opts1 = {filter: 'ddoc/filter', query_params: {foo: 'bar'}};
      const opts2 = {filter: 'ddoc/other_filter'};

      const [ id1, id2 ] = await generateReplicationIds(sourceDb, targetDb, opts1, opts2);

      id2.should.not.eql(id1);
    }
  );

  it('ignores the order of object properties in the `query_params` option',
    async function () {
      const opts1 = {
        filter: 'ddoc/filter',
        query_params: {foo: 'bar', bar: 'baz'}
      };
      const opts2 = {
        filter: 'ddoc/filter',
        query_params: {bar: 'baz', foo: 'bar'}
      };

      const [ id1, id2 ] = await generateReplicationIds(sourceDb, targetDb, opts1, opts2);

      id2.should.eql(id1);
    }
  );

  it('it ignores the `view` option unless the `filter` option value ' +
    'is `_view`',
    async function () {
      const opts1 = {view: 'ddoc/view'};
      const opts2 = {view: 'ddoc/other_view'};
      const opts3 = {filter: 'ddoc/view', view: 'ddoc/view'};
      const opts4 = {filter: 'ddoc/view', view: 'ddoc/other_view'};
      const opts5 = {filter: '_view', view: 'ddoc/other_view'};
      const opts6 = {filter: '_view', view: 'ddoc/view'};

      const [ id1, id2, id3, id4, id5, id6 ] = await generateReplicationIds(
        sourceDb, targetDb, opts1, opts2, opts3, opts4, opts5, opts6);

      id2.should.eql(id1);
      id3.should.not.eql(id2);
      id4.should.eql(id3);
      id5.should.not.eql(id4);
      id6.should.not.eql(id5);
    }
  );
});

const generateReplicationIds = async (sourceDb, targetDb, ...allOpts) => {
  return Promise.all(
    allOpts.map(opts => genReplicationId(sourceDb, targetDb, opts))
  );
};
