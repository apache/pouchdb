# www.pouchdb.com

This is the PouchDB documentation site, built with [11ty](http://11ty.dev/), a node.js static site generator.

To run the site locally, in the repo root:

```sh
$ npm i
$ npm run build-site
```

This starts a development server. It watches your files and should rebuild automatically in most cases, but it doesn’t reload the browser for you. 

You can have full hot reloading, but this doesn’t catch changes to the styles (LESS files):

```sh
$ npm run build11 -- --serve
```

To deactivate the dev server and run a regular build without the file watcher:

```sh
$ BUILD=1 npm run build-site
```

## Testing Serviceworker

```sh
$ npm i
$ npm run build-site
```

By default, SW will only cache the pages you’ve seen plus `offline.html`, which it will show whenever you try to access a page offline that hasn’t been cached.

To test the "Content updated, reload now?" toast that indicates that a new version of the site is available, run the dev server, make a change to the site (e.g. change some text somewhere), then navigate once or reload the page with a normal (not hard) reload. The update toast should show. When you click it, the page and the serviceworker cache will be updated.

## Technology Choices

The PouchDB website is over a decade old and some parts of it are somewhat out of date by now, but they haven’t been updated for good reasons. The most significant legacy bit is Bootstrap 3.11 in the LESS version, which depends on JQuery for interactivity. There is currently zero benefit to, for example, migrating to SASS/SCSS here or trying to untangle JQuery from Bootstrap in order to use vanilla JS. A design update is on the horizon, and we’ll take that as an opportunity to remove Bootstrap, LESS and JQuery alltogether and replace everything with vanilla web standard JS and CSS, and maybe a slim UI library for base styling. Then we can also get rid of `/bin/build-site.js` and just use 11ty for everything. Until then, we’re still rocking Bootstrap and JQuery.

