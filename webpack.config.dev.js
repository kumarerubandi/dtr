const merge = require("webpack-merge");
const path = require("path");
const webpack = require("webpack");
const common = require("./webpack.config.common.js");

module.exports = merge(common, {
  mode: "development",
  module: {
      rules: [
          {
              test: /\.js$/,
              loader:'babel-loader'
          }
      ]
  },
  devServer: {
    contentBase: path.resolve(__dirname, "public"),
    port: 3005,
    https: false,
    public: "0.0.0.0",
    hotOnly: true,
    historyApiFallback: {
        rewrites: [
          { from: /index/, to: '/index.html' },
          { from: /launch/, to: '/launch.html' }
        ]
      },
    proxy: [{
      context: ['/fetchFhirUri', '/getfile'],
      target: 'http://cdex.mettles.com/crd',
      changeOrigin: true,
      secure: false
    }],
    
    disableHostCheck: true	

  },
  plugins: [new webpack.HotModuleReplacementPlugin()]
});
