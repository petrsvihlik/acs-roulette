const Dotenv = require('dotenv-webpack');

module.exports = {
  entry: './client.ts',
  devtool: 'inline-source-map',
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ],
    fallback: {
    }
  },
  plugins: [
    new Dotenv()
  ],
  output: {
    filename: 'bundle.js'
  },
  devServer: {
    inline: false
  }
};
