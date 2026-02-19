const markdownIt = require('markdown-it');
const Prism = require('prismjs');
const loadLanguages = require('prismjs/components/');

const LINEBREAK_PLACEHOLDER = '---linebreak-placeholder---';

module.exports = eleventyConfig => {
  process.env.TZ = 'UTC';

  eleventyConfig.addPassthroughCopy('asf.md');
  eleventyConfig.addPassthroughCopy('static');

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

  eleventyConfig.setFrontMatterParsingOptions({
    excerpt: true,
    excerpt_separator: '#',
  });

  eleventyConfig.addFilter('liquid', function(content) {
    if(!this.liquid) return content;

    return this.liquid.parseAndRender(content, this.context);
  });

  const wrapCode = (code, lang) => {
    let html = code.trim();

    if(lang) {
      loadLanguages([lang]);
      html = Prism.highlight(html, Prism.languages[lang], lang);
    }

    // prevent markdown interpreter from converting multiple
    // linebreaks in code examples into <p>...</p>
    html = html.replaceAll(/\n(?=\n)/g, `\n${LINEBREAK_PLACEHOLDER}`);

    return `<figure class="highlight"><pre data-copybutton><code class="language-${lang}">${html}</code></pre></figure>`;
  };

  const md = markdownIt({
    html: true,
  });
  md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
    const { content, info } = tokens[idx];
    const lang = info ? info.trim().split(/\s/)[0] : '';

    return wrapCode(content, lang);
  };
  md.renderer.rules.code_block = (tokens, idx, options, env, slf) => {
    const { content } = tokens[idx];
    return wrapCode(content);
  };

  // Define wrapper object for render function to work around corruption of
  // markdown-it parser.  Check parsing of indented code blocks with/without
  // this { render:... } wrapper to see the issue.
  eleventyConfig.setLibrary('md', { render:raw => md.render(raw) });
  eleventyConfig.addFilter('markdown', content => md.render(content));
  eleventyConfig.addPairedShortcode('markdown', content => md.render(content));

  eleventyConfig.addPairedShortcode('highlight', wrapCode);

  eleventyConfig.addTransform('revert-linebreak-markers', function(content) {
    console.log('revert-linebreak-markers', this.outputPath);
    if(!this.outputPath?.endsWith('.html')) return content;
    return content.replaceAll(new RegExp(`^${LINEBREAK_PLACEHOLDER}$`, 'gm'), '');
  });

  return {
    dir: {
      includes: '_includes',
      layouts: '_layouts',
    },
  };
};
