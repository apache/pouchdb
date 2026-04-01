(async () => {
  'use strict';

  const params = testUtils.params();
  const remote = params.remote === '1';

  const startTests = () => {
    window.removeEventListener("load", startTests);

    if (remote) {
      mocha.reporter((runner) => {
        const eventNames = ['start', 'end', 'suite', 'suite end', 'pass', 'pending', 'fail'];
        eventNames.forEach((name) => {
          runner.on(name, (obj, err) => {
            window.postMessage({
              type: 'mocha',
              details: {
                name,
                obj: obj && {
                  root: obj.root,
                  title: obj.title,
                  duration: obj.duration,
                  slow: typeof obj.slow === 'function' ? obj.slow() : undefined,
                  fullTitle: typeof obj.fullTitle === 'function' ? obj.fullTitle() : undefined,
                  titlePath: typeof obj.titlePath === 'function' ? obj.titlePath() : undefined,
                },
                err: err && {
                  actual: err.actual,
                  expected: err.expected,
                  showDiff: err.showDiff,
                  message: err.message,
                  stack: err.stack,
                  uncaught: err.uncaught
                },
              },
            });
          });
        });
      });
    }

    mocha.run();
  };

  const PouchDB = await testUtils.loadPouchDB();
  window.PouchDB = PouchDB;
  if (document.readyState === 'complete') {
    startTests();
  } else {
    window.addEventListener("load", startTests);
  }

})();
