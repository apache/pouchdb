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
