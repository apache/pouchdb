'use strict';

const testUtils = Object.create(require('../common-utils'));

const uniq = (list) => {
  const map = {};
  list.forEach((item) => {
    map[item] = true;
  });
  return Object.keys(map);
};

testUtils.isCouchMaster = () => {
  return 'SERVER' in testUtils.params() &&
    testUtils.params().SERVER === 'couchdb-master';
};

testUtils.isChrome = () => {
  return (typeof window !== 'undefined') && window.navigator &&
      /Google Inc/.test(window.navigator.vendor);
};

testUtils.isSafari = () => {
  return (typeof process === 'undefined' || process.browser) &&
      /Safari/.test(window.navigator.userAgent) &&
      !/Chrome/.test(window.navigator.userAgent);
};

testUtils.adapterType = () => {
  return testUtils.adapters().indexOf('http') < 0 ? 'local' : 'http';
};

testUtils.readBlob = (blob, callback) => {
  if (testUtils.isNode()) {
    callback(blob.toString('binary'));
  } else {
    const reader = new FileReader();
    reader.onloadend = () => {
      let binary = "";
      const bytes = new Uint8Array(reader.result || '');
      const length = bytes.byteLength;

      for (let i = 0; i < length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }

      callback(binary);
    };
    reader.readAsArrayBuffer(blob);
  }
};

testUtils.readBlobPromise = (blob) => {
  return new Promise((resolve) => {
    testUtils.readBlob(blob, resolve);
  });
};

testUtils.base64Blob = (blob, callback) => {
  if (testUtils.isNode()) {
    callback(blob.toString('base64'));
  } else {
    testUtils.readBlob(blob, (binary) => {
      callback(testUtils.btoa(binary));
    });
  }
};

// Prefix http adapter database names with their host and
// node adapter ones with a db location
testUtils.adapterUrl = (adapter, name) => {

  // CouchDB master has problems with cycling databases rapidly
  // so give tests separate names
  name += `_${Date.now()}`;

  if (adapter === 'http') {
    return `${testUtils.couchHost()}/${name}`;
  }
  return name;
};

// Delete specified databases
testUtils.cleanup = (dbs, done) => {
  dbs = uniq(dbs);
  let num = dbs.length;
  const finished = () => {
    if (--num === 0) {
      done();
    }
  };

  dbs.forEach((db) => {
    new PouchDB(db).destroy(finished, finished);
  });
};

// Put doc after prevRev (so that doc is a child of prevDoc
// in rev_tree). Doc must have _rev. If prevRev is not specified
// just insert doc with correct _rev (new_edits=false!)
testUtils.putAfter = (db, doc, prevRev, callback) => {
  const newDoc = testUtils.assign({}, doc);
  if (!prevRev) {
    db.put(newDoc, { new_edits: false }, callback);
    return;
  }
  newDoc._revisions = {
    start: +newDoc._rev.split('-')[0],
    ids: [
      newDoc._rev.split('-')[1],
      prevRev.split('-')[1]
    ]
  };
  db.put(newDoc, { new_edits: false }, callback);
};

// docs will be inserted one after another
// starting from root
testUtils.putBranch = (db, docs, callback) => {
  const insert = (i) => {
    const doc = docs[i];
    const prev = i > 0 ? docs[i - 1]._rev : null;
    const next = () => {
      if (i < docs.length - 1) {
        insert(i + 1);
      } else {
        callback();
      }
    };
    db.get(doc._id, { rev: doc._rev }, (err) => {
      if (err) {
        testUtils.putAfter(db, docs[i], prev, () => {
          next();
        });
      } else {
        next();
      }
    });
  };
  insert(0);
};

testUtils.putTree = (db, tree, callback) => {
  const insert = (i) => {
    const branch = tree[i];
    testUtils.putBranch(db, branch, () => {
      if (i < tree.length - 1) {
        insert(i + 1);
      } else {
        callback();
      }
    });
  };
  insert(0);
};

const parseHostWithCreds = (host) => {
  const { origin, pathname, username, password } = new URL(host);
  const url = `${origin}${pathname}`;
  const options = {};
  if (username || password) {
    options.headers = {};
    options.headers['Authorization'] = `Basic: ${testUtils.btoa(`${username}:${password}`)}`;
  }
  return { url, options };
};

testUtils.isCouchDB = async (cb) => {
  const {url, options} = parseHostWithCreds(testUtils.couchHost());
  PouchDB.fetch(url, options).then(function (response) {
    return response.json();
  }).then(function (res) {
    cb('couchdb' in res || 'express-pouchdb' in res);
  });
};

testUtils.getServerType = async () => {
  const knownServers = [
    'couchdb',
    'express-pouchdb',
    'pouchdb-express-router',
  ];

  const { url, options } = parseHostWithCreds(testUtils.couchHost());
  const res = await PouchDB.fetch(url, options);
  const body = await res.json();

  for (const known of knownServers) {
    if (body[known]) {
      return known;
    }
  }

  throw new Error(`Could not find a known server type in response: ${JSON.stringify(res)}`);
};

testUtils.writeDocs = (db, docs, callback, res) => {
  if (!res) {
    res = [];
  }
  if (!docs.length) {
    return callback(null, res);
  }
  const doc = docs.shift();
  db.put(doc, (err, info) => {
    res.push(info);
    testUtils.writeDocs(db, docs, callback, res);
  });
};

// Borrowed from: http://stackoverflow.com/a/840849
testUtils.eliminateDuplicates = (arr) => {
  let i, element, len = arr.length, out = [], obj = {};
  for (i = 0; i < len; i++) {
    obj[arr[i]] = 0;
  }
  for (element in obj) {
    if (Object.hasOwnProperty.call(obj, element)) {
      out.push(element);
    }
  }
  return out;
};

// Promise finally util similar to Q.finally
testUtils.fin = async (promise, cb) => {
  try {
    const res = await promise;
    const promise2 = cb();
    if (typeof promise2.then === 'function') {
      await promise2;
    }
    return res;
  } catch (reason) {
    const promise2 = cb();
    if (typeof promise2.then === 'function') {
      await promise2;
    }
    throw reason;
  }
};

testUtils.promisify = (fun, context) => {
  return function () {
    const args = [];
    for (let i = 0; i < arguments.length; i++) {
      args[i] = arguments[i];
    }
    return new Promise((resolve, reject) => {
      args.push((err, res) => {
        if (err) {
          return reject(err);
        }
        return resolve(res);
      });
      fun.apply(context, args);
    });
  };
};

// We need to use pouchdb-for-coverage here to ensure that e.g pouchdb-utils
// and pouchdb-ajax don't get pulled in, because then our coverage tests
// would complain that we're not using the "whole" thing.
const PouchForCoverage = require('../../packages/node_modules/pouchdb-for-coverage');
const pouchUtils = PouchForCoverage.utils;
testUtils.binaryStringToBlob = pouchUtils.binaryStringToBlobOrBuffer;
testUtils.btoa = pouchUtils.btoa;
testUtils.atob = pouchUtils.atob;
testUtils.ajax = PouchForCoverage.ajax;
testUtils.uuid = pouchUtils.uuid;
testUtils.rev = pouchUtils.rev;
testUtils.errors = PouchForCoverage.Errors;
testUtils.assign = pouchUtils.assign;
testUtils.generateReplicationId = pouchUtils.generateReplicationId;

testUtils.makeBlob = (data, type) => {
  if (testUtils.isNode()) {
    // "global.Buffer" is to avoid Browserify pulling this in
    return global.Buffer.from(data, 'binary');
  } else {
    return pouchUtils.blob([data], {
      type: (type || 'text/plain')
    });
  }
};

testUtils.getUnHandledRejectionEventName = () => {
  return typeof window !== 'undefined' ? 'unhandledrejection' :
    'unhandledRejection';
};

testUtils.addGlobalEventListener = (eventName, listener) => {
  // The window test has to go first because the process test will pass
  // in the browser's test environment
  if (typeof window !== 'undefined' && window.addEventListener) {
    return window.addEventListener(eventName, listener);
  }

  if (typeof process !== 'undefined') {
    return process.on(eventName, listener);
  }

  return null;
};

testUtils.addUnhandledRejectionListener = (listener) => {
  return testUtils.addGlobalEventListener(
    testUtils.getUnHandledRejectionEventName(), listener);
};

testUtils.removeGlobalEventListener = (eventName, listener) => {
  if (typeof process !== 'undefined') {
    return process.removeListener(eventName, listener);
  }

  if (typeof window !== 'undefined' && window.removeEventListener) {
    return window.removeEventListener(eventName, listener);
  }

  return null;
};

testUtils.removeUnhandledRejectionListener = (listener) => {
  return testUtils.removeGlobalEventListener(
    testUtils.getUnHandledRejectionEventName(), listener);
};

testUtils.sortById = (a, b) => {
  return a._id < b._id ? -1 : 1;
};

if (testUtils.isNode()) {
  module.exports = testUtils;
} else {
  window.testUtils = testUtils;
}
