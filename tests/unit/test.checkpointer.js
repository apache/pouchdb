"use strict";

require("chai").should();

var PouchDB = require("../../packages/node_modules/pouchdb-for-coverage");
var Checkpointer = require("../../packages/node_modules/pouchdb-checkpointer");
var memdown = require("memdown");

var genReplicationId = PouchDB.utils.generateReplicationId;
var sourceDb = new PouchDB({ name: "local_test_db", db: memdown });
var targetDb = new PouchDB({ name: "target_test_db", db: memdown });

describe("test.checkpointer.js", () => {
  it("create checkpointer instance", async () => {
    const checkpointer = await createCheckpointer();

    checkpointer.src.name.should.equal("local_test_db");
    checkpointer.target.name.should.equal("target_test_db");
    checkpointer.opts.writeSourceCheckpoint.should.be.true;
    checkpointer.opts.writeTargetCheckpoint.should.be.true;
    checkpointer.id.startsWith("_local/").should.be.true;
  });

  it("write and retrieve checkpoint doc to/from src and target db", async () => {
    const checkpointer = await createCheckpointer();

    const result = await checkpointer.writeCheckpoint(1, "session-1");
    // { ok: true, id: '_local/1DB6QfM3RDEOFoOwE65CpQ==', rev: '0-1' }
    result.ok.should.equal(true);
    result.rev.should.equal("0-1");

    //get checkpoint doc from source and target db by id
    let { srcDoc, tgtDoc } = await getCheckpointDocs(checkpointer.id);

    srcDoc._rev.should.equal("0-1");
    tgtDoc._rev.should.equal("0-1");
    srcDoc._id.should.equal(checkpointer.id);
    tgtDoc._id.should.equal(checkpointer.id);
    srcDoc.history.length.should.equal(1);
    srcDoc.last_seq.should.equal(srcDoc.history[0].last_seq);
  });

  it("update: new checkpoint with next replication session", async () => {
    const checkpointer = await createCheckpointer();
    await checkpointer.writeCheckpoint(1, "session-1");

    const update = await checkpointer.writeCheckpoint(2, "session-2");
    update.ok.should.equal(true);
    update.rev.should.equal("0-2");

    let { srcDoc, tgtDoc } = await getCheckpointDocs(checkpointer.id);

    srcDoc.last_seq.should.equal(2);
    tgtDoc.last_seq.should.equal(2);
    srcDoc.history.length.should.equal(2);
    srcDoc.history[0].session_id.should.equal("session-2");
  });

  it("update: don't update if checkpoint hasn't changed", async () => {
    const checkpointer = await createCheckpointer();
    await checkpointer.writeCheckpoint(1, "session-1");

    // attempt to update with the same checkpoint number
    // -> returns undefined
    await checkpointer.writeCheckpoint(1, "session-2");
    let { srcDoc, tgtDoc } = await getCheckpointDocs(checkpointer.id);

    srcDoc.last_seq.should.equal(1);
    srcDoc.history.length.should.equal(1);
    tgtDoc.last_seq.should.equal(1);
    tgtDoc.history.length.should.equal(1);
    srcDoc.history[0].session_id.should.equal("session-1");
    tgtDoc.history[0].session_id.should.equal("session-1");
  });

  it("update: only keep one history entry per replication session", async () => {
    const checkpointer = await createCheckpointer();
    await checkpointer.writeCheckpoint(1, "session-1");

    let { srcDoc, tgtDoc } = await getCheckpointDocs(checkpointer.id);
    srcDoc.last_seq.should.equal(1);
    srcDoc.history.length.should.equal(1);
    tgtDoc.last_seq.should.equal(1);
    tgtDoc.history.length.should.equal(1);

    // update changed checkpoint with the same sessionId as before
    const update = await checkpointer.writeCheckpoint(2, "session-1");
    update.ok.should.equal(true);
    update.rev.should.equal("0-2");

    // update should have replaced the history entry with that sessionId
    ({ srcDoc, tgtDoc } = await getCheckpointDocs(checkpointer.id));

    srcDoc.history.length.should.equal(1);
    srcDoc.last_seq.should.equal(2);
    srcDoc.session_id.should.equal("session-1");
    tgtDoc.history.length.should.equal(1);
    tgtDoc.last_seq.should.equal(2);
    tgtDoc.session_id.should.equal("session-1");
  });

  it("update: history should store max five latest updates", async () => {
    const checkpointer = await createCheckpointer();
    await checkpointer.writeCheckpoint(1, "session-1");

    for (let i = 2; i < 8; i++) {
      await checkpointer.writeCheckpoint(i, `session-${i}`);
    }

    let { srcDoc, tgtDoc } = await getCheckpointDocs(checkpointer.id);
    srcDoc.history.length.should.equal(5);
    srcDoc._rev.should.equal("0-7");
    srcDoc.last_seq.should.equal(7);
    srcDoc.history[srcDoc.history.length - 1].session_id.should.equal(
      "session-3"
    );
    tgtDoc.history.length.should.equal(5);
    tgtDoc._rev.should.equal("0-7");
    tgtDoc.last_seq.should.equal(7);
    tgtDoc.history[tgtDoc.history.length - 1].session_id.should.equal(
      "session-3"
    );
  });

  it("update: only update source checkpoint", async () => {
    //create checkpointer with options to only write to the source db
    const checkpointer = await createCheckpointer({
      writeSourceCheckpoint: true,
      writeTargetCheckpoint: false,
    });

    await checkpointer.writeCheckpoint(1, "session-1");
    // getCheckpointDocIfExists returns either the document or null
    let { srcDoc, tgtDoc } = await getCheckpointDocs(checkpointer.id);

    srcDoc.last_seq.should.equal(1);
    (tgtDoc === null).should.be.true;
  });

  it("update: only update target checkpoint", async () => {
    //create checkpointer with option to only write to the target db
    const checkpointer = await createCheckpointer({
      writeSourceCheckpoint: false,
      writeTargetCheckpoint: true,
    });

    await checkpointer.writeCheckpoint(1, "session-1");
    // getCheckpointDocIfExists returns either the doc or null
    let { srcDoc, tgtDoc } = await getCheckpointDocs(checkpointer.id);

    tgtDoc.last_seq.should.equal(1);
    (srcDoc === null).should.be.true;
  });

  it("get: return lowest_seq if no checkpoint doc exists", async () => {
    const checkpointer = await createCheckpointer();

    let result = await checkpointer.getCheckpoint();

    result.should.equal(0);
  });

  it("get: return lowest_seq when write src and tgt opts are both set to false", async () => {
    const checkpointer = await createCheckpointer({
      writeSourceCheckpoint: false,
      writeTargetCheckpoint: false,
    });
    await checkpointer.writeCheckpoint(5, "session-5");

    let result = await checkpointer.getCheckpoint();

    result.should.equal(0);
  });

  it("get: return last_seq from source if only written to source", async () => {
    const checkpointer = await createCheckpointer({
      writeSourceCheckpoint: true,
      writeTargetCheckpoint: false,
    });
    await checkpointer.writeCheckpoint(4, "session-5");

    let result = await checkpointer.getCheckpoint();

    result.should.equal(4);
  });

  it("get: return lowest_seq if only written to source but no doc extists", async () => {
    const checkpointer = await createCheckpointer({
      writeSourceCheckpoint: true,
      writeTargetCheckpoint: false,
    });

    let result = await checkpointer.getCheckpoint();

    result.should.equal(0);
  });

  it("get: return last_seq from target if only written to target", async () => {
    const checkpointer = await createCheckpointer({
      writeSourceCheckpoint: false,
      writeTargetCheckpoint: true,
    });
    await checkpointer.writeCheckpoint(8, "session-8");

    let result = await checkpointer.getCheckpoint();

    result.should.equal(8);
  });

  it("get: return latest matching seq from divergent state src ahead", async () => {
    const checkpointer = await createCheckpointer();

    await sourceDb.put({
      session_id: "session-3",
      _id: checkpointer.id,
      history: [
        { session_id: "session-3", last_seq: 3 },
        { session_id: "session-2", last_seq: 2 },
        { session_id: "session-1", last_seq: 1 },
      ],
      replicator: "pouchdb",
      version: 1,
      last_seq: 3,
    });
    await targetDb.put({
      session_id: "session-2",
      _id: checkpointer.id,
      history: [
        { session_id: "session-2", last_seq: 2 },
        { session_id: "session-1", last_seq: 1 },
      ],
      replicator: "pouchdb",
      version: 1,
      last_seq: 2,
    });

    const result = await checkpointer.getCheckpoint();

    result.should.equal(2);
  });

  it("get: return last matching seq from divergent state tgt ahead", async () => {
    const checkpointer = await createCheckpointer({
      writeSourceCheckpoint: true,
      writeTargetCheckpoint: true,
    });

    await sourceDb.put({
      session_id: "session-6",
      _id: checkpointer.id,
      history: [
        { session_id: "session-6", last_seq: 6 },
        { session_id: "session-5", last_seq: 5 },
        { session_id: "session-4", last_seq: 4 },
        { session_id: "session-3", last_seq: 3 },
        { session_id: "session-2", last_seq: 2 },
      ],
      replicator: "pouchdb",
      version: 1,
      last_seq: 6,
    });

    await targetDb.put({
      session_id: "session-9",
      _id: checkpointer.id,
      history: [
        { session_id: "session-9", last_seq: 9 },
        { session_id: "session-8", last_seq: 8 },
        { session_id: "session-7", last_seq: 7 },
        { session_id: "session-6", last_seq: 6 },
        { session_id: "session-5", last_seq: 5 },
      ],
      replicator: "pouchdb",
      version: 1,
      last_seq: 9,
    });

    const result = await checkpointer.getCheckpoint();

    result.should.equal(6);
  });

  // target is always written first on update, so always ahead of source
  it("get: return source.last_seq if different last_seq, but same session_id", async () => {
    const checkpointer = await createCheckpointer();

    await sourceDb.put({
      session_id: "session-3",
      _id: checkpointer.id,
      history: [
        { session_id: "session-3", last_seq: 6 },
        { session_id: "session-2", last_seq: 5 },
        { session_id: "session-1", last_seq: 2 },
      ],
      replicator: "pouchdb",
      version: 1,
      last_seq: 6,
    });

    await targetDb.put({
      session_id: "session-3",
      _id: checkpointer.id,
      history: [
        { session_id: "session-3", last_seq: 7 },
        { session_id: "session-2", last_seq: 5 },
        { session_id: "session-1", last_seq: 2 },
      ],
      replicator: "pouchdb",
      version: 1,
      last_seq: 7,
    });

    const result = await checkpointer.getCheckpoint();

    result.should.equal(6);
  });
});

// opts writeSourceCheckpoint and writeTargetCheckpoint can be set to only write to one db
const createCheckpointer = async (opts = {}) => {
  //replicationId is created with a random docId
  const randomDocId = `${Date.now()}-${Math.random()}`;
  const replicationId = await genReplicationId(sourceDb, targetDb, {
    doc_ids: [randomDocId],
  });

  const checkpointer = new Checkpointer(
    sourceDb,
    targetDb,
    replicationId,
    {},
    opts
  );
  return checkpointer;
};

const getCheckpointDocs = async (id) => {
  const [srcDoc, tgtDoc] = await Promise.all([
    getCheckpointDocIfExists(sourceDb, id),
    getCheckpointDocIfExists(targetDb, id),
  ]);
  return { srcDoc, tgtDoc };
};

const getCheckpointDocIfExists = async (db, id) => {
  try {
    return await db.get(id);
  } catch (e) {
    if (e.status === 404) {
      return null;
    }
    throw new Error("Unexpected error", e.message);
  }
};
