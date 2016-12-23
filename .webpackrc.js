module.exports = {
  entry: './lib/CENode.js',
  entry: {
    CENode: './lib/CENode.js',
    CEModels: './models/index.js'
  },
  output: {
    filename: 'dist/[name].js',
    library: '[name]',
    libraryTarget: 'var'
  }
}
