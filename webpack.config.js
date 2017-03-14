module.exports = {
    entry: './ts/demoapp.ts',
    output: {
        filename: 'demoapp.js',
        path: './webroot/'
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