const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'production',
  target: 'node',
  entry: {
    index: './src/index.ts',
  },
  output: {
    path: path.resolve(__dirname, 'lib', 'cjs'),
    filename: '[name].js',
    libraryTarget: 'commonjs',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
  },
  externals: {},
  plugins: [],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        exclude: '/node_modules/',
      },
    ],
  },
};
