import { omitUndefined } from './omit-undefined';

describe('omitUndefined', () => {
  it('drops undefined values but keeps null, false, 0 and empty strings', () => {
    expect(omitUndefined({ a: undefined, b: null, c: false, d: 0, e: '' })).toEqual({
      b: null,
      c: false,
      d: 0,
      e: '',
    });
  });
});
