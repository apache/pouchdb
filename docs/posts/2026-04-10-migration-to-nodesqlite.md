---
layout: post

title: PouchDB has a new adapter - nodesqlite
author: Alba Herrerías

---

Hello everyone! PouchDB has a new available adapter for you to use, `nodesqlite`, that internally uses Node.js's native SQLite module as its persistence layer. This will be, in PouchDB's release version 11.0.0, the default adapter for node environments, replacing the deprecated LevelDB ecosystem we currently depend on. You can read more about the details, discussion and timeline in this [issue](https://github.com/apache/pouchdb/issues/9163), and look at its implementation in this [pull request](https://github.com/apache/pouchdb/pull/9223).

## Migration guide

We suggest you to create a replication from your databases to new ones using the `nodesqlite` adapter. We have drafted a snippet you can copy and modify according to your needs.

```js
async function getDb (name) {
  const oldDb = new PouchDB(name, { adapter: 'leveldb' })
  
  // create a new database with new nodesqlite adapter
  const newDb = new PouchDB(name, { adapter: 'nodesqlite' })
  
  // set up promise wrapped around replication
  return new Promise((resolve, reject) => {
    console.log('Started migrating to nodesqlite...')
    
    PouchDB.replicate(oldDb, newDb).on('complete', async () => {
        // Do you want to remove the old database? 
        // If so, uncomment the following line:
        // await oldDb.destroy()
        
        console.log('All done!')
        resolve(newDb)
      }).on('change', (info) => {
        console.log(`Docs written: ${info.docs_written}` )
      }).on('denied', reject)
      .on('error', reject)
  })
}
```
Now, instead of getting your database like:
```js
const db = new PouchDB('my-db-name', { adapter: 'leveldb' })

// or like this, since `leveldb` is the default adapter in the Node.js environment
const db = new PouchDB('my-db-name')
```  

Do it like this:
```js
const db = await getDb('my-db-name')
```

If you encounter a bug in this migration, please [file an issue](https://github.com/pouchdb/pouchdb/issues) and, ideally, modify this post for the benefit of others. Thanks!

## Get in touch

As always, we welcome feedback from the community. Please don't hesitate to [file issues](https://github.com/pouchdb/pouchdb/issues), [open discussions](https://github.com/pouchdb/pouchdb/discussions) or [get in touch](https://github.com/pouchdb/pouchdb/blob/master/CONTRIBUTING.md#get-in-touch). And of course, a big thanks to all of our [new and existing contributors](https://github.com/pouchdb/pouchdb/graphs/contributors)!
