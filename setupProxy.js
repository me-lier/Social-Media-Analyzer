const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/lf',
    createProxyMiddleware({
      target: 'https://api.langflow.astra.datastax.com',
      changeOrigin: true,
      secure: false,
      pathRewrite: {
        '^/lf': '/lf'
      },
      onProxyRes: function(proxyRes, req, res) {
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
      }
    })
  );
};
