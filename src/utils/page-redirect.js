module.exports = redirectPages;

function redirectPages(config, createPage, redirectPageTemplate) {
  return config.forEach(data => {
    createPage({
      path: data.url,
      component: redirectPageTemplate,
      context: {
        redirect: data.redirect
      }
    });
  });
}
