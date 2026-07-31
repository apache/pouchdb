'use strict';

const { assert } = require('chai');
const UserAgent = require('./user_agent');

describe('multi-tab concurrency', () => {
  let agent, res;

  beforeEach(async () => {
    agent = await UserAgent.start();
  });

  afterEach(async () => {
    await agent.stop();
  });

  async function checkInfo({ doc_count }) {
    let info1 = await agent.eval(1, () => __pouch__.info());
    assert.equal(info1.doc_count, doc_count);

    let info2 = await agent.eval(2, () => __pouch__.info());
    assert.deepEqual(info1, info2);
  }

  it('creates docs concurrently in two tabs', async () => {
    res = await agent.eval(1, () => __pouch__.put({ _id: 'doc-1' }));
    assert(res.ok);
    await checkInfo({ doc_count: 1 });

    res = await agent.eval(2, () => __pouch__.put({ _id: 'doc-2' }));
    assert(res.ok);
    await checkInfo({ doc_count: 2 });

    res = await agent.eval(1, () => __pouch__.put({ _id: 'doc-3' }));
    assert(res.ok);
    await checkInfo({ doc_count: 3 }); // fails on indexeddb; pages have different info

    res = await agent.eval(2, () => __pouch__.put({ _id: 'doc-4' }));
    assert(res.ok); // fails on indexeddb
    await checkInfo({ doc_count: 4 });
  });
});
