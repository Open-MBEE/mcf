/**
 * @classification UNCLASSIFIED
 *
 * @module scripts.webpack-dev
 *
 * @copyright Copyright (C) 2020, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Donte McDaniel
 *
 * @author Donte McDaniel
 *
 * @description The webpack configuration for development automatic recompile.
 */

const webpack = require('webpack');
const path = require('path');
const rootPath = path.join(path.dirname(__dirname).split(path.sep).join('/'));

module.exports = {
  mode: 'development',
  entry: {
    navbar: path.join(rootPath, 'app', 'ui', 'components', 'apps', 'nav-app.jsx'),
    'home-app': path.join(rootPath, 'app', 'ui', 'components', 'apps', 'home-app.jsx'),
    'org-app': path.join(rootPath, 'app', 'ui', 'components', 'apps', 'org-app.jsx'),
    'project-app': path.join(rootPath, 'app', 'ui', 'components', 'apps', 'project-app.jsx'),
    'profile-app': path.join(rootPath, 'app', 'ui', 'components', 'apps', 'profile-app.jsx'),
    'admin-console-app': path.join(rootPath, 'app', 'ui', 'components', 'apps', 'admin-console-app.jsx')
  },
  output: {
    path: path.join(rootPath, 'build', 'public', 'js'),
    filename: '[name].js'
  },
  devServer: {
    historyApiFallback: true
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        loader: ['babel-loader'],
        exclude: /node_modules/
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new webpack.optimize.LimitChunkCountPlugin({
      maxChunks: 1
    })
  ]
  // devtool: 'source-map'
};
