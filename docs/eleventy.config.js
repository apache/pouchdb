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

  eleventyConfig.addCollection('posts', collectionApi => {
    return collectionApi
        .getFilteredByGlob('./posts/*.md')
        .sort((a, b) => b.date - a.date || b.inputPath.localeCompare(a.inputPath));
  });

  eleventyConfig.addCollection('pages', collectionApi => {
    return collectionApi.getAll().filter(item => !item.data.tags);
  });

  eleventyConfig.setFrontMatterParsingOptions({
    excerpt: true,
    excerpt_separator: '#',
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

    return `<figure class="highlight"><pre class="language-${lang}"><code>${html}</code></pre></figure>`;
  });

  return {
    dir: {
      includes: '_includes',
      layouts: '_layouts',
    },
  };
};
