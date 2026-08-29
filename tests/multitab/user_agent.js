'use strict';

const playwright = require('playwright');

const ADAPTERS = process.env.ADAPTERS || 'indexeddb';
const CLIENT = process.env.CLIENT || 'firefox';
const SHELL_URL = 'http://127.0.0.1:8000/tests/multitab/shell.html';

class UserAgent {
  static async start() {
    let browser = await playwright[CLIENT].launch();
    let context = await browser.newContext();
    return new UserAgent(ADAPTERS, browser, context);
  }

  constructor(adapter, browser, context) {
    this._adapter = adapter;
    this._browser = browser;
    this._context = context;
    this._pages = new Map();
  }

  async stop() {
    await this._browser.close();
  }

  async eval(pageId, fn) {
    let page = await this._getPage(pageId);
    return page.evaluate(fn);
  }

  _getPage(id) {
    if (!this._pages.has(id)) {
      this._pages.set(id, this._setupPage());
    }
    return this._pages.get(id);
  }

  async _setupPage() {
    let page = await this._context.newPage();
    await page.goto(SHELL_URL);

    if (this._adapter === 'idb') {
      await page.evaluate(() => window.__pouch__ = new PouchDB('testdb', { adapter: 'idb' }));
    } else if (this._adapter === 'indexeddb') {
      await page.evaluate(() => window.__pouch__ = new PouchDB('testdb', { adapter: 'indexeddb' }));
    }

    return page;
  }
}

module.exports = UserAgent;
