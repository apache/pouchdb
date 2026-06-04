'use strict';

describe('constructor errors', () => {

  it('should error on an undefined name', () => {
    try {
      new PouchDB();
      throw new Error('Should have thrown');
    } catch (err) {
      if (err.message === 'Should have thrown') {
        throw err;
      }
      should.equal(err instanceof Error, true, 'should be an error');
    }
  });

  it('should error on an undefined adapter', () => {
    try {
      new PouchDB('foo', {adapter : 'myFakeAdapter'});
      throw new Error('Should have thrown');
    } catch (err) {
      if (err.message === 'Should have thrown') {
        throw err;
      }
      should.equal(err instanceof Error, true, 'should be an error');
      err.message.should
        .equal('Invalid Adapter: myFakeAdapter',
               'should give the correct error message');
    }
  });

  it('should error on an undefined view adapter', () => {
    try {
      new PouchDB('foo', {view_adapter : 'myFakeViewAdapter'});
      throw new Error('Should have thrown');
    } catch (err) {
      if (err.message === 'Should have thrown') {
        throw err;
      }
      should.equal(err instanceof Error, true, 'should be an error');
      err.message.should
        .equal('Invalid View Adapter: myFakeViewAdapter',
               'should give the correct error message');
    }
  });

  it('should error on a null name', () => {
    try {
      new PouchDB(null);
      throw new Error('Should have thrown');
    } catch (err) {
      if (err.message === 'Should have thrown') {
        throw err;
      }
      should.equal(err instanceof Error, true, 'should be an error');
    }
  });

});
