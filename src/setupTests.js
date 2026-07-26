import '@testing-library/jest-dom';

// jsdom implements no layout, so it has no scrollIntoView. Components that
// keep a chat pinned to the newest message call it on every render; without
// this they throw in tests for a reason that has nothing to do with the test.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
