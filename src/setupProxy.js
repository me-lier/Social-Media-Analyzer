const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  const options = {
    target: 'https://api.langflow.astra.datastax.com',
    changeOrigin: true,
    secure: false,
    pathRewrite: {
      '^/api': ''
    },
    headers: {
      'Connection': 'keep-alive'
    },
    onProxyReq: (proxyReq, req, res) => {
      proxyReq.setHeader('Origin', 'https://api.langflow.astra.datastax.com');
    }
  };

  // Use Object.assign instead of util._extend
  const proxyConfig = Object.assign({}, options);
  
  app.use('/api', createProxyMiddleware(proxyConfig));
};
