/*

Gives us globally available info about PouchDB versions:

- versions.all
- versions.stable

*/

module.exports = () => {
  const versions = ["7.3.0", "8.0.0", "9.0.0"];
  return {
    all: versions,
    stable: versions.sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    ).at(-1)
  };
};
