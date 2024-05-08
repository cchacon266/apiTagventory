const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
 mode: 'production',
  entry: './app.js', // Cambia la ruta de entrada a tu archivo app.js
  output: {
    path: path.resolve(__dirname, 'dist'), // Ruta de salida para el bundle.js
    filename: 'api.bundle.js'
  },
  externals: [nodeExternals()],
  resolve: {
    fallback: {
        "zlib": require.resolve("browserify-zlib")
    }
}
};
