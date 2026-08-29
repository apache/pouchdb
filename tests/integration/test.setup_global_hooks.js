"use strict";

let currentListener = null;
let currentError = null;

beforeEach(() => {
  currentError = null;
  currentListener = (error) => {
    currentError = error;
  };
  testUtils.addUnhandledRejectionListener(currentListener);
});

afterEach(async () => {
  testUtils.removeUnhandledRejectionListener(currentListener);
  if (currentError) {
    if (typeof PromiseRejectionEvent !== 'undefined' &&
        currentError instanceof PromiseRejectionEvent) {
      currentError = currentError.reason;
    }

    console.error(currentError);
    throw currentError;
  }
});
