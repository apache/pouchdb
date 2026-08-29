const markdownIt = require('markdown-it');
const Terser = require("terser");
const through = require('through2');

module.exports = eleventyConfig => {
  process.env.TZ = 'UTC';
  // Turn off extensionless layouts
  // https://www.11ty.dev/docs/layouts/#omitting-the-layouts-file-extension
  eleventyConfig.setLayoutResolution(false);
  eleventyConfig.addPlugin(require("@11ty/eleventy-plugin-syntaxhighlight"));

  eleventyConfig.addPassthroughCopy('./docs/asf.md');
  eleventyConfig.addPassthroughCopy('./docs/static');
  // Copy and minify src/code.js to _site/static/js
  eleventyConfig.addPassthroughCopy(
    {
      "./docs/src/code.js": "static/js/code.min.js",
    },
    {
      transform: function () {
        let buffer = '';

        return through(
          function (chunk, enc, done) {
            buffer += chunk.toString();
            done();
          },
          function (done) {
            // INFO: this usage is very specific to the pinned Terser 4.8.0,
            // if Terser is ever updated, this will break.
            const result = Terser.minify(buffer);
            if (result.error) {
              console.log('Error minifying code.js:', result.error);
            }
            done(null, result.code);
          }
        );
      }
    }
  );

  eleventyConfig.setLiquidOptions({
    jekyllInclude: true,
  });

  // use e.g. /learn.html in preference to /learn/
  eleventyConfig.addGlobalData('permalink', '/{{ page.filePathStem }}.html');

  eleventyConfig.addCollection('guides', collectionApi => {
    return collectionApi.getFilteredByTag('guides').sort((a, b) => a.data.index - b.data.index);
  });

  // Used to filter a collection of guides by version
  eleventyConfig.addFilter("byVersion", (collection, version) => {
    const result = collection.filter(item => {
      const targetVersion = version || item.data.versions.stable;
        return item.data.version === targetVersion;
      }
    );
    return result;
  });

  // Used to convert a versioned URL to a stable URL, e.g:
  // from http://localhost:4000/version/8.0.0/api.html
  //   to http://localhost:4000/api.html/
  // This is used for the sidebar navigation items, the version switcher,
  // and the old version warning block, and helps to build links to the `root`
  // stable docs when the source is a versioned doc.
  // The `version` prop is the page prop from wherever this is called,
  // it determines whether we’re displaying versioned or stable docs.
  eleventyConfig.addFilter("makeURLForStable", (content, version) => {
    // if version is undefined, we’re in the root, so displaying `stable` docs.
    // This means we need to strip the `/versions/[versionNumber]` fragment
    // out of the URL
    if (!version) {
      return content.replace(/^\/version\/[^/]*/, '');
    }
    return content;
  });

  // Transforms any doc URL into the same URL for any other version.
  // from http://localhost:4000/version/8.0.0/api.html
  //   to http://localhost:4000/version/7.3.0/api.html
  // You can also go from `stable` to versioned or vice versa.
  // Used in the version switcher component
  eleventyConfig.addFilter("transformDocURL", (content, targetVersion) => {
    if (!targetVersion) {
      return content;
    }
    if (content.includes('/version/')) {
      // replace the version in a URL
      return content.replace(/^\/version\/[^/]*/, `/version/${targetVersion}`);
    } else {
      // Prepend the version to the URL if it doesn‘t have one
      return `/version/${targetVersion}${content}`;
    }
  });

  eleventyConfig.addCollection('pages', collectionApi => {
    // zero-indexed, but skip page 1, as it's served at /blog/
    const pageCount = Math.ceil(collectionApi.getFilteredByTag('posts').length / 5) - 1;
    const blogPages = Array.from(
      { length:pageCount },
      (_, n) => ({
        url: `/blog/page${n+2}/`,
      }),
    );

    return [
      ...collectionApi.getAll().filter(item => !item.data.tags),
      ...blogPages,
    ];
  });

  eleventyConfig.addCollection('posts', collectionApi => {
    return collectionApi
        .getFilteredByTag('posts')
        .sort((a, b) => b.date - a.date || b.inputPath.localeCompare(a.inputPath));
  });

  // Make a `stable` collection out of the most recent release files
  // The stable release does not exist as actual files on disk, it is
  // basically a copy of the versioned docs in
  // _docs/versions/<versions.stable>,
  // where versions.stable is defined in `_/docs/data/versions.js`
  eleventyConfig.addCollection("stable", (collectionApi) => {
    const stable = collectionApi.getAll().filter(item => {
      const filePath = item.data.page.filePathStem;
      const version = filePath.split('/')[2];
      return version === item.data.versions.stable;
      }
    );
    return stable;
  });

  // Filter to compute a frontmatter boolean from a frontmatter
  // boolean. No idea why this is necessary, and it’s only used
  // in stable.liquid to make sure a boolean taken from another
  // file’s frontmatter stays a boolean and doesn’t become a string
  eleventyConfig.addFilter('boolean', function (content) {
    if (content === "true" || content === true) {
      return true;
    }
    return false;
  });

  eleventyConfig.addFilter('first_paragraph', function (content) {
    const marker = '</p>';
    const idx = content.indexOf(marker);
    if (idx === -1) {return content;}
    return content.substring(0, idx + marker.length);
  });

  eleventyConfig.addFilter('liquid', function (content) {
    if (!this.liquid) {return content;}

    return this.liquid.parseAndRender(content, this.context);
  });

  const md = markdownIt({
    html: true,
  });

  eleventyConfig.addFilter('inlinemarkdown', content => md.renderInline(content));
  // Re-defined markdown-it lib to prevent eleventy messing with internals.
  // See: https://github.com/11ty/eleventy/issues/2438
  eleventyConfig.setLibrary('md', md);
  eleventyConfig.addFilter('markdown',  content => md.render(content));
  eleventyConfig.addPairedShortcode('markdown',  content => md.render(content));

  function pubDateRFC822(value, timeZone = undefined) {
    const date = new Date(value);
    const options = {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',

      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',

      timeZone: timeZone,
      timeZoneName: 'longOffset',
    };

    const formattedDate = new Intl.DateTimeFormat('en-US', options).format(date);
    const [wkd, mmm, dd, yyyy, time, z] = formattedDate.replace(/([,\s]+)/g, ' ').split(' ');
    // This is valid regex, even if ESLint complains. It’s also not ignorable for some reason.
    const tz = z.replace(/GMT(?<sign>\+|\-)(?<hour>\d\d):(?<minute>\d\d)/, '$<sign>$<hour>$<minute>');

    return `${wkd}, ${dd} ${mmm} ${yyyy} ${time} ${tz}`;
  }

  eleventyConfig.addLiquidFilter("dateToRfc882", pubDateRFC822);

  return {
    dir: {
      input: './docs',
      output: "docs/_site"
    },
  };
};
