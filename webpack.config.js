const path = require('path');

module.exports = {
    entry: './src/senior-bridge.js',
    output: {
        filename: 'senior-bridge.bundle.js',
        path: path.resolve(__dirname, 'dist'),
    },
    mode: 'production',
    // Opcional: Se precisar de polyfills, adicionar aqui
};
