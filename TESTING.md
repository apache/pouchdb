# Running PouchDB Tests <!-- omit from toc -->

This document covers all the types of tests the PouchDB project has and how to
run them. PouchDB has been primarily developed on Linux and macOS, if you are
using Windows then these instructions will have problems, we would love your
help fixing them though.

> [!WARNING] VERY IMPORTANT
> **Always set the `COUCH_HOST` env var to a proper CouchDB for the integration tests!**
> 
> If you don’t, the integration tests currently fall back to `pouchdb-server`, which is 
> no longer reliable and causes random test failures. (20000ms timeouts).
>
> Until this is resolved, please set the `COUCH_HOST` env var:
> `$ CLIENT=firefox COUCH_HOST=http://admin:admin@127.0.0.1:5984 npm test`
>
> This is necessary for both `npm test` and `npm run dev`.

## Table of Contents <!-- omit from toc -->

- [Running the integration tests](#running-the-integration-tests)
  - [Test options](#test-options)
- [Other sets of tests](#other-sets-of-tests)
  - [`find` and `mapreduce`](#find-and-mapreduce)
  - [multi-tab tests](#multi-tab-tests)
  - ["Fuzzy" tests](#fuzzy-tests)
  - [Performance tests](#performance-tests)
  - [Running tests in the browser](#running-tests-in-the-browser)
- [Other test tasks](#other-test-tasks)
- [Troubleshooting and useful info when working on tests](#troubleshooting-and-useful-info-when-working-on-tests)
  - [Where do I get a CouchDB from?](#where-do-i-get-a-couchdb-from)
  - [Utils won’t update](#utils-wont-update)
  - [Flaky tests and random timeouts](#flaky-tests-and-random-timeouts)

The PouchDB test suite expects an instance of CouchDB (version 1.6.1 and above)
running in [Admin Party](http://guide.couchdb.org/draft/security.html#party) on
`http://127.0.0.1:5984` with [CORS
enabled](https://github.com/pouchdb/add-cors-to-couchdb). See the [official
CouchDB documentation](https://docs.couchdb.org/en/stable/install/index.html) for
a guide on how to install CouchDB.

If you have CouchDB available at a different URL, you can assign this URL to the
`COUCH_HOST` environment variable to make the PouchDB tests use it.

You can run CouchDB v3.0 or later, which no longer supports Admin Party, but you
will need to put user credentials in the `COUCH_HOST` URL to allow new databases
to be created, for example:

    COUCH_HOST='http://admin:password@localhost:5984'

If you use docker, you can start the CouchDB instance with:

    $ docker run -e COUCHDB_USER=admin -e COUCHDB_PASSWORD=password -it --name my-couchdb -p 5984:5984 couchdb:latest

    # to have a couchdb with enabled cors, you can use trivago/couchdb-cors
    $ docker run -e COUCHDB_USER=admin -e COUCHDB_PASSWORD=password -it --name my-couchdb -p 5984:5984 trivago/couchdb-cors:latest


## Running the integration tests

The main test suite can be run using the following command:

    $ npm test

> [!NOTE]
> If the tests don‘t pass on `main`, try building once before running the tests: `$npm run build`.

PouchDB runs in the browser and on Node.js, and has multiple different storage
backends known as _adapters_. In the browser these are `idb`, `indexeddb` and
`memory` and on Node.js they're `leveldb` and `memory`.

It also includes an adapter named `http`, which works by delegating operations
to CouchDB (or anything that's API-compatible with it) over the network. Since
PouchDB replicates the functionality of CouchDB and speaks its replication
protocol, it's important we maintain compatibility with CouchDB and that all
tests pass against it. The variable `COUCH_HOST` sets the URL that PouchDB will
use to connect to a remote server.

By default, `npm test` will run the integration tests on Node.js, using the
default adapter for the target environment. Some of the tests perform
replication to a remote server, and by default we start an instance of
`pouchdb-express-router` for this purpose.

### Test options

The integration tests support the following options, configured via environment
variables.

#### `ADAPTERS` (default: depends on `CLIENT`) <!-- omit from toc -->

Comma-separated list of preferred adapter backends that PouchDB will use for local
databases. These are selected automatically based on the execution environment,
but this variable overrides the default choice and causes additional adapters to
be loaded if they're not part of the default distribution.

On Node.js the available local adapters are `leveldb` and `memory`. In the
browser they're `idb`, `indexeddb` and `memory`.

You can also set `ADAPTERS=http` to force all PouchDB databases to be created on
a remote server, identified by `COUCH_HOST`. This is not necessary for
integration tests since they use a mixture of local and remote databases to
check compatibility, but it's useful for the `find` and `mapreduce` suites.

#### `AUTO_COMPACTION` (default: `0`) <!-- omit from toc -->

Set this to `1` to enable automatic compaction of PouchDB databases by default.

#### `BAIL` (default: `1`) <!-- omit from toc -->

Normally the test runner will halt as soon as it discovers a failing test. Set
this to `0` to prevent this behaviour.

#### `CLIENT` (default: `node`) <!-- omit from toc -->

Sets the target platform the tests will execute on. Set this to
`firefox`, `chromium` or `webkit` to execute the tests in the browser.

#### `COUCH_HOST` <!-- omit from toc -->

Some tests perform replication between local and remote databases. When we
create a remote database, we get the URL of the remote server from `COUCH_HOST`.
This variable must be set to the URL of a CouchDB-compatible HTTP server, with
CORS enabled.

If not set explicitly, this variable is set automatically based on the other
configuration values.

#### `FETCH` (default: `0`) <!-- omit from toc -->

Set this to `1` to stop PouchDB falling back to `XMLHttpRequest` if `fetch()` is
not available.

#### `GREP` <!-- omit from toc -->

Use this to request that a specific test is run; if you set `GREP='name of
test'` then only those tests whose names include the string `name of test` will
run.  Regular expressions are also supported.

#### `PLUGINS` (default: empty) <!-- omit from toc -->

Comma-separated list of additional plugins that should be loaded into the test
environment. For example:

    $ PLUGINS=pouchdb-find npm test

#### `POUCHDB_SRC` <!-- omit from toc -->

This overrides the path used to load PouchDB in the browser. We use this in CI
to select different builds of the PouchDB library, for example to test the
Webpack version, etc.

This is an alternative to `SRC_ROOT` and `USE_MINIFIED`.

#### `SRC_ROOT` <!-- omit from toc -->

This overrides the path used to load all PouchDB files in the browser. We use
this in performance tests to allow easily comparing two different versions of
PouchDB, including plugin and adapter implementations.

#### `USE_MINIFIED` <!-- omit from toc -->

This changes the file extension used for loading PouchDB files in the browser.
This can be used in CI and performance testing to select the minified version of
PouchDB and its adapters, plugins, etc.

#### `SERVER` (default: `pouchdb-express-router`) <!-- omit from toc -->

To support remote replication tests, we start a server in the background that
speaks the CouchDB replication protocol. This variable controls how that is
done, and what `COUCH_HOST` is set to as a result. It can have one of the
following values:

- `pouchdb-express-router` (default): a minimal implementation of the CouchDB
  API that supports the replication protocol but not the `query()` or `find()`
  methods.
- `pouchdb-server`: this is a full reimplementation of the CouchDB API on top of
  PouchDB, including Mango and map-reduce queries.
- `couchdb-master`: use this value if you already have CouchDB running; it
  causes `COUCH_HOST` to be set to the correct value.

#### `SKIP_MIGRATION` (default: `0`) <!-- omit from toc -->

Set this to `1` to skip the migration tests.

#### `VIEW_ADAPTERS` (default: `memory`) <!-- omit from toc -->

Comma-separated list of preferred view adapter backends that PouchDB will use. 
This variable overrides the default choice and causes additional adapters to
be loaded if they're not part of the default distribution.

On Node.js the available adapters are `leveldb` and `memory`. In the
browser they're `idb`, `indexeddb` and `memory`.


## Other sets of tests

### `find` and `mapreduce`

The integration tests cover all the core functionality of CouchDB. Some
additional behaviour is covered by separate test suites, either because they
contain features not supported in every adapter, or because they take a long
time to run.

The main additional suites are the `find` and `mapreduce` suites, which can be
run using these commands:

    $ TYPE=find PLUGINS=pouchdb-find npm test
    $ TYPE=mapreduce npm test

These suites run all their tests against a single adapter per run; they will use
the default adapter for the target environment, which is Node.js by default.
These suites support most of the same options as the integration tests.

You'll want to test specific adapters by specifying them on the command-line,
for example:

    # run the "find" tests with the memory client on node.js
    $ TYPE=find PLUGINS=pouchdb-find CLIENT=node ADAPTERS=memory npm test

    # run the "mapreduce" tests with indexeddb in firefox
    $ TYPE=mapreduce CLIENT=firefox ADAPTERS=indexeddb npm test

It's also important to check these tests against server-side adapters,
specifically we need to ensure compatibility with CouchDB itself. We do this by
setting `ADAPTERS=http` and pointing `COUCH_HOST` at our server:

    $ TYPE=mapreduce ADAPTERS=http COUCH_HOST='<your CouchDB URL>' npm test

And we test [pouchdb-server](https://github.com/pouchdb/pouchdb-server) using
the current PouchDB source tree. This is an implementation of the CouchDB API
and supports the `find()` and `query()` methods. Run the test suites against it
like so:

    $ TYPE=mapreduce ADAPTERS=http SERVER=pouchdb-server npm test

Note that the default choice for the `SERVER` value (`pouchdb-express-router`)
does not support `find` or `mapreduce` and does not need to pass these tests.

### Multi-tab tests

We have a few tests to check that interactions with backing stores like
IndexedDB are synchronized across tabs where multiple PouchDB instances are
connected to the same database. These have to be scripted via Playwright rather
than being run inside the normal unit test suite. To run them:

    $ npm run test-multitab

Two environment variables can be used to control how these are run:

- `CLIENT`: may be `firefox`, `chromium` or `webkit` to select the browser where
  the tests will be run.
- `ADAPTERS`: may be `idb` or `indexeddb` to set which backend adapter PouchDB
  will use.

All combinations of these should be tested on CI.

### "Fuzzy" tests

This test suite checks some more unusual replication scenarios, it can be run
using the command:

    $ npm run test-fuzzy

### Performance tests

This suite checks some performance metrics.  It can be run using the command:

    $ TYPE=performance npm test

This supports most of the same options as the integration suite, particularly
the `CLIENT`, `ADAPTERS` and `GREP` options. It has some additional options of
its own:

#### `ITERATIONS` <!-- omit from toc -->

Sets the number of iterations each test uses by default.

### Running tests in the browser

To run tests in the browser, you first have to install playwright:

```shell
npx playwright install
```

This will download the `firefox`, `chromium` and `webkit` `CLIENT`s onto
your system.

PouchDB is tested with `CLIENT=firefox`, `CLIENT=chromium` and `CLIENT=webkit`
to run a set of tests in the browser automatically. This runs these browsers
in a “headless” mode and prints the test results back into the terminal.

    $ CLIENT=firefox npm test

You can also run browser tests in a more "manual" fashion by running the dev
server and opening a browser window yourself. To run the server:

    $ npm run dev

You will almost always want to include the `find` plugin though, without it, all the `find` tests will fail:

    $ PLUGINS=pouchdb-find npm run dev

Then you can open the page for any of the test suites via the following URLs:

- `http://127.0.0.1:8000/tests/integration/`
- `http://127.0.0.1:8000/tests/find/`
- `http://127.0.0.1:8000/tests/mapreduce/`
- `http://127.0.0.1:8000/tests/performance/`

You can re-run tests by reloading, and only run specific suites by clicking on the suite names, this sets the `grep` query string mentioned below. This works well in conjunction with setting `.only` on individual tests in that suite.

The test options are controlled by editing the query string; some of the common command-line options and their query string equivalents are:

| Environment variable | Query-string param |
| -------------------- | ------------------ |
| `ADAPTERS`           | `adapters`         |
| `AUTO_COMPACTION`    | `autoCompaction`   |
| `COUCH_HOST`         | `couchHost`        |
| `GREP`               | `grep`             |
| `ITERATIONS`         | `iterations`       |
| `PLUGINS`            | `plugins`          |
| `SRC_ROOT`           | `srcRoot`          |
| `POUCHDB_SRC`        | `src`              |
| `USE_MINIFIED`       | `useMinified`      |
| `VIEW_ADAPTERS`      | `viewAdapters`     |


## Other test tasks

There are a few other tasks we run during CI and which you will find useful to
run during development.

### `npm run eslint` <!-- omit from toc --> 

Checks that all code in the project follows our formatting and style guide. This
runs before any other tasks are run during our CI build.

### `npm run test-unit` <!-- omit from toc --> 

Runs the unit tests; running these can give more precise feedback about key
building blocks that are not working.

### `npm run test-component` <!-- omit from toc --> 

Tests some additional components besides the core database functionality, for
example authentication and read-only replication.

### `npm run test-coverage` <!-- omit from toc --> 

Runs the test suite with coverage analysis turned on.

### `npm run test-webpack` <!-- omit from toc --> 

Checks that the Webpack build of PouchDB works correctly.

### `npm run verify-build` <!-- omit from toc --> 

Checks that the build is correct.

## Troubleshooting and useful info when working on tests

### Where do I get a CouchDB from?

See the [official CouchDB documentation](https://docs.couchdb.org/en/stable/install/index.html) for a guide on how to install CouchDB.

Your CouchDB will most likely then run at `http://127.0.0.1:5984`. All you need to do now is  enable CORS so CouchDB will accept requests from PouchDB in the tests. Add `http://127.0.0.1:8000`, the test server’s domain. There are several ways to do this, easiest first:

1. In the [CouchDB admin UI](http://127.0.0.1:5984/_utils), click on `Configuration` -> `CORS`. 
2. Via cURL (`_local` is the node name in single-node databases, which your local dev CouchDB probably is):
   ```sh
   curl 'http://admin:password@127.0.0.1:5984/_node/_local/_config/cors/origins' -X PUT -d '"http://127.0.0.1:8000"'
   ```
3. There’s also an older [npm package](https://github.com/pouchdb/add-cors-to-couchdb) to help you do this porgrammatically.

### Utils won’t update

If you’re modifying the test utils (`/tests/integration/utils.js` etc.) or adding logs to them, you need to rebuild these before running your tests again, eg.:

```sh
$ npm run build && CLIENT=firefox npm test
```

### Flaky tests and random timeouts

If you regularly run into random timeouts, please re-read the top of this file and set the `COUCH_HOST` env var when running tests or the dev server, eg.:

```sh
$ CLIENT=firefox COUCH_HOST=http://admin:admin@127.0.0.1:5984 npm test
```

