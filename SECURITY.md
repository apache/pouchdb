# The Apache PouchDB Security Model.

PouchDB is a database written in JavaScript. It can run both in a web browser as
well as a server-side JavaScript runtime environment like Node.js.

## Security Considerations

- PouchDB does not provide any input validations outside of what is required
  for its internal correctness guarantees.
    - It does not protect against cross-site scripting attacks and requires
      validation of input values and correct escaping of output values.
    - It does not protect against RegExp-based exploits. Make sure to only
      pass-in RegExp patterns that you know finish in constant time.
    - It does not provide unescapable sandboxing for JavaScript code that is
      passed-in through API calls or design documents.
      - JavaScript can arrive in PouchDB in two different ways:
        1. Through its JavaScript API. If an attacker can control this, they can
           already execute arbitrary JavaScript
        2. Through replication with CouchDB or PouchDB-Server. On those
           endpoints, JavaScript can only be added by database users that have
           admin privileges and are considered trustworthy by CouchDB.
    - It does not protect against Mango selector denormalisation attacks.
