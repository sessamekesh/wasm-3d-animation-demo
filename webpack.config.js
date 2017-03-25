module.exports = {
    entry: './ts/demoapp.ts',
    output: {
        filename: 'demoapp.js',
        path: __dirname + '/webroot/'
    },
    module: {
        rules: [
            {
                loader: 'ts-loader',
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        extensions: ['.ts']
    }
}
