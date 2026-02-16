const markdownIt = require('markdown-it');
const Prism = require('prismjs');
const loadLanguages = require('prismjs/components/');

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

  const md = markdownIt({
    html: true,
  });
  eleventyConfig.setLibrary('md', md);
  eleventyConfig.addFilter('markdown', content => md.render(content));
  eleventyConfig.addPairedShortcode('markdown', content => md.render(content));

  eleventyConfig.addPairedShortcode('highlight', function(content, lang) {
    loadLanguages([lang]);

    const html = Prism
        .highlight(content.trim(), Prism.languages[lang], lang)
        // prevent markdown interpreter from converting multiple
        // linebreaks in code examples into <p>...</p>
        .replaceAll(/\n(?=\n)/g, '\n&zwnj;');

    return `<figure class="highlight"><pre data-copybutton><code class="language-${lang}">${html}</code></pre></figure>`;
  });

  return {
    dir: {
      includes: '_includes',
      layouts: '_layouts',
    },
  };
};
