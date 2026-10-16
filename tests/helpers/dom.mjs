import { JSDOM } from "jsdom";

/** Fresh DOM as globals (window, document, ...) for one test. */
export function setupDom({ width = 1280 } = {}) {
  const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
    url: "https://customer.test/page",
    pretendToBeVisual: true,
  });
  const { window } = dom;
  Object.defineProperty(window, "innerWidth", { value: width, configurable: true });
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.HTMLElement = window.HTMLElement;
  return dom;
}
