const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
var webpack = require('webpack');

// Module for the index.html
module.exports = [
  {
    mode: 'development',
    target: 'web',
    entry: './src/js/app.js',
    output: {
      path: path.resolve('../static'),
      filename: 'bundle.js',
    },
    module: {
      rules: [
        {
          test: /\.s?css$/,
          loaders: ['style-loader', 'css-loader', 'sass-loader'],
        },
        {
          test: /\.(png|jpeg)$/,
          loader: 'file-loader',
        },
        {
          test: /\.(ttf|eot|woff|woff2)$/,
          use: {
            loader: 'file-loader',
            options: {
              name: 'fonts/[name].[ext]',
            },
          },
        },
        {
          test: /\.svg$/,
          loader: 'svg-inline-loader',
        },
      ],
    },
    plugins: [
      new webpack.ProvidePlugin({
        d3: 'd3',
        $: 'jquery',
        jQuery: 'jquery',
      }),
      new CopyWebpackPlugin(
        [
          {
            from: 'src/html/*.html',
            to: '',
            flatten: true,
          },
        ],
        {
          copyUnmodified: false,
        }
      ),
    ],
    devtool: 'inline-source-map',
  },
];
