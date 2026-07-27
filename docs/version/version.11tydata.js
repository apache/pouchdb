module.exports = {
  eleventyComputed: {
    version: (data) => {
      return data.page.filePathStem.split("/")[2];
    },
    versionURLPrefix: (data) => {
      return data.page.filePathStem.split('/').slice(0,3).join('/');
    }
  },
};
