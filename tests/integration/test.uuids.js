'use strict';
const rfcRegexp = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const makeUuids = (count, length, radix) => {
  count = count || 1;
  let i = -1;
  const out = [];
  while (++i < count) {
    out.push(testUtils.uuid(length, radix));
  }
  return out;
};

describe('test.uuid.js', () => {

  it('UUID RFC4122 test', () => {
    rfcRegexp.test(makeUuids()[0]).should
      .equal(true, 'Single UUID complies with RFC4122.');
    rfcRegexp.test(testUtils.uuid()).should
      .equal(true,
             'Single UUID through Pouch.utils.uuid complies with RFC4122.');
  });

  it('UUID generation uniqueness', () => {
    const count = 1000;
    const uuids = makeUuids(count);
    testUtils.eliminateDuplicates(uuids).should.have
      .length(count, 'Generated UUIDS are unique.');
  });

  it('Test small uuid uniqness', () => {
    const length = 8;
    const count = 2000;
    const uuids = makeUuids(count, length);
    testUtils.eliminateDuplicates(uuids).should.have
      .length(count, 'Generated small UUIDS are unique.');
  });

  it('_rev generation', () => {
    const _rev = testUtils.rev();

    _rev.should.match(/^[0-9a-fA-F]{32}$/);
  });
});
