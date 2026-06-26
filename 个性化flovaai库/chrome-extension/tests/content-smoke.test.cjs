const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function createElement(tagName) {
  return {
    tagName,
    children: [],
    id: "",
    src: "",
    textContent: "",
    innerHTML: "",
    classList: {
      add() {},
      remove() {},
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    addEventListener() {},
    remove() {},
    querySelector(selector) {
      if (selector !== ".fss-search") return null;
      return {
        addEventListener() {},
        focus() {},
        setSelectionRange() {},
      };
    },
  };
}

function runContentScript() {
  const documentElement = createElement("html");
  const head = createElement("head");
  const context = {
    console,
    location: { pathname: "/zh-CN/project/" },
    chrome: { runtime: { getURL: (file) => `chrome-extension://test/${file}` } },
    setTimeout,
    clearTimeout,
  };
  context.window = context;
  context.globalThis = context;
  context.FlovaSelectorUtils = {
    extractAssetItems: () => [],
    normalizeAssetForNativeMention: (asset) => asset,
  };
  context.document = {
    head,
    documentElement,
    createElement,
    querySelector() {
      return null;
    },
  };
  context.addEventListener = () => {};
  context.removeEventListener = () => {};
  context.postMessage = () => {};

  const filename = path.join(__dirname, "..", "content.js");
  vm.runInNewContext(fs.readFileSync(filename, "utf8"), context, { filename });
  return { context, documentElement };
}

try {
  const { documentElement } = runContentScript();
  assert.equal(documentElement.children.some((child) => child.id === "flova-skill-stack-selector-root"), true);
  console.log("ok - content script renders initial project UI without asset selection crash");
} catch (error) {
  console.error("not ok - content script renders initial project UI without asset selection crash");
  throw error;
}
