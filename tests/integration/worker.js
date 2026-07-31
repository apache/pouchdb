'use strict';

const onError = (err) => {
  setTimeout(() => {
    throw err; // can catch this in the worker's 'error' listener
  }, 0);
};

const bigTest = async (name) => {
  const db = new PouchDB(name);
  try {
    await db.post({
      _id: 'blablah',
      key: 'lala'
    });
    const doc = await db.get('blablah');
    await db.destroy();
    self.postMessage(doc.key);
  } catch (err) {
    onError(err);
  }
};

const postAttachmentThenAllDocs = async (name) => {
  const db = new PouchDB(name);
  try {
    await db.post({
      _id: 'blah',
      title: 'lalaa',
      _attachments: {
        'test': {
          data: new Blob(),
          content_type: ''
        }
      }
    });
    const doc = await db.get('blah');
    await db.destroy();
    self.postMessage(doc);
  } catch (err) {
    onError(err);
  }
};

const putAttachment = async (name, docId, attId, att, type) => {
  const db = new PouchDB(name);
  try {
    await db.putAttachment(docId, attId, att, type);
    const fetchedAtt = await db.getAttachment(docId, attId);
    await db.destroy();
    self.postMessage(fetchedAtt);
  } catch (err) {
    onError(err);
  }
};

const allDocs = async (name) => {
  const db = new PouchDB(name);
  try {
    const res = await db.allDocs();
    self.postMessage(res);
  } catch (err) {
    onError(err);
  }
};

self.addEventListener('message', (e) => {
  if (Array.isArray(e.data) && e.data[0] === 'source') {
    importScripts(e.data[1]);
  } else if (e.data === 'ping') {
    self.postMessage('pong');
  } else if (e.data === 'version') {
    self.postMessage(PouchDB.version);
  } else if (Array.isArray(e.data) && e.data[0] === 'create') {
    bigTest(e.data[1]);
  } else if (Array.isArray(e.data) && e.data[0] === 'postAttachmentThenAllDocs') {
    postAttachmentThenAllDocs(e.data[1]);
  } else if (Array.isArray(e.data) && e.data[0] === 'putAttachment') {
    putAttachment(e.data[1], e.data[2], e.data[3], e.data[4], e.data[5]);
  } else if (Array.isArray(e.data) && e.data[0] === 'allDocs') {
    allDocs(e.data[1]);
  } else {
    onError(new Error(`unknown message: ${JSON.stringify(e.data)}`));
  }

});
