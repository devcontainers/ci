const { lastCallFor, outputFor, toHaveComment } = require('./test-helpers.js')

describe('helper tests', () => {

  describe('lastCallFor', () => {
    var testMock;
    beforeEach(() => {
      testMock = jest.fn();
    });

    test('single call matches', () => {
      testMock('key', 'value');
      expect(lastCallFor(testMock, c => c[0] === 'key')[1]).toBe('value');
    })
    test('multiple calls matches last value', () => {
      testMock('key', 'value');
      testMock('key', 'value2');
      expect(lastCallFor(testMock, c => c[0] === 'key')[1]).toBe('value2');
    })
  })

  describe('outputFor', () => {
    var setOutput;
    beforeEach(() => {
      setOutput = jest.fn();
    });

    test('no calls returns null', () => {
      expect(outputFor(setOutput, 'key')).toBe(null);
    })
    test('single call matches', () => {
      setOutput('key', 'value');
      expect(outputFor(setOutput, 'key')).toBe('value');
    })
    test('multiple calls matches last value', () => {
      setOutput('key', 'value');
      setOutput('key', 'value2');
      expect(outputFor(setOutput, 'key')).toBe('value2');
    })
  })

  describe('toHaveComment', () => {
    expect.extend({
      toHaveComment
    })

    var add_comment;
    beforeEach(() => {
      add_comment = jest.fn();
    });

    test('no calls returns false', () => {
      expect(add_comment).not.toHaveComment({
        owner: 'someOwner',
        repo: 'someRepo',
        issue_number: 123,
        bodyMatcher: /test/,
      });
    });

    test('single matching call returns true', () => {
      add_comment({
        owner: 'someOwner',
        repo: 'someRepo',
        issue_number: 123,
        body: 'This is a test',
      })
      expect(add_comment).toHaveComment({
        owner: 'someOwner',
        repo: 'someRepo',
        issue_number: 123,
        bodyMatcher: /test/,
      });
    });

    test('single non-matching call returns false', () => {
      add_comment({
        owner: 'someOwner',
        repo: 'someRepo',
        issue_number: 1234,
        body: 'This is a test',
      })
      expect(add_comment).not.toHaveComment({
        owner: 'someOwner',
        repo: 'someRepo',
        issue_number: 123,
        bodyMatcher: /test/,
      });
    });

    test('multiple calls, none matching, returns false', () => {
      add_comment({
        owner: 'someOwner',
        repo: 'someRepo',
        issue_number: 1234,
        body: 'This is a test',
      })
      add_comment({
        owner: 'someOtherOwner',
        repo: 'someRepo',
        issue_number: 123,
        body: 'This is a test',
      })
      add_comment({
        owner: 'someOwner',
        repo: 'someOtherRepo',
        issue_number: 123,
        body: 'This is a test',
      })
      add_comment({
        owner: 'someOwner',
        repo: 'someRepo',
        issue_number: 1234,
        body: 'This is a test',
      })
      expect(add_comment).not.toHaveComment({
        owner: 'someOwner',
        repo: 'someRepo',
        issue_number: 123,
        bodyMatcher: /test/,
      });
    });


    test('multiple calls, with matching, returns true', () => {
      add_comment({
        owner: 'someOwner',
        repo: 'someRepo',
        issue_number: 1234,
        body: 'This is a test',
      })
      add_comment({
        owner: 'someOtherOwner',
        repo: 'someRepo',
        issue_number: 123,
        body: 'This is a test',
      })
      add_comment({
        owner: 'someOwner',
        repo: 'someRepo',
        issue_number: 123,
        body: 'This is a test',
      })
      add_comment({
        owner: 'someOwner',
        repo: 'someOtherRepo',
        issue_number: 123,
        body: 'This is a test',
      })
      expect(add_comment).toHaveComment({
        owner: 'someOwner',
        repo: 'someRepo',
        issue_number: 123,
        bodyMatcher: /test/,
      });
    });


  })

})
