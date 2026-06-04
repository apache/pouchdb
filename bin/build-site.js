#!/usr/bin/env node

/*
ideally, we would eventually deprecate this entire file and rely exclusively
on 11ty for building and dev serving (https://www.11ty.dev/docs/watch-serve/).

However, since all the styles are in LESS, and 11ty doesn’t build that, and
the LESS plugin for 11ty doesn’t seem to work with our setup, we’ll need to keep
build-site.js around for a little longer.
*/

'use strict';

import { execa } from 'execa';
import fs from 'fs';
import http_server from 'http-server';
import globWatcher from 'glob-watcher';

process.chdir('./');

async function buildCSS() {
  await execa({stdio: 'inherit'})`npm run build:less`;
  console.log('=> Rebuilt CSS');
}

async function buildEleventy() {
  // --incremental sadly doesn't work in this setup, but the build is so fast
  // it doesn’t really matter. However, on a full rebuild, 11ty logs every
  // single built file, hence --quiet
  await execa({stdio: 'inherit'})`eleventy --quiet`;
  console.log('=> Rebuilt eleventy');
}

async function buildEverything() {
  try {
    await buildCSS();
    await buildEleventy();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

if (!process.env.BUILD) {
  const watchGlob = (path, fn) => globWatcher(path, () => fn().catch(console.log));

  // Simpler ways of blacklisting certain paths here would be very welcome.
  fs.readdirSync('./docs')
    .forEach(path => {
      if (path === '_site') {
        return;
      }

      if (fs.statSync(`./docs/${path}`).isDirectory()) {
        watchGlob(`./docs/${path}/**`, buildEleventy);
      } else {
        watchGlob(`./docs/${path}`, buildEleventy);
      }
    });


  watchGlob('./docs/src/less/**', buildCSS);

  http_server.createServer({root: './docs/_site', cache: '-1'}).listen(4000);
  console.log('Server address: http://localhost:4000');
}

buildEverything();
