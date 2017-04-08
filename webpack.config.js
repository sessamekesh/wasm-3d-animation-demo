module.exports = {
    entry: { demoapp: './ts/demoapp.ts', outputtest: './ts/outputtest.ts' },
    output: {
        filename: '[name].js',
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
