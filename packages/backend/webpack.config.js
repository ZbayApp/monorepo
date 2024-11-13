import path from 'path'
import { fileURLToPath } from 'url';
import webpack from 'webpack'
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function root(args) {
    args = Array.prototype.slice.call(arguments, 0);
    return path.join.apply(path, [__dirname].concat(args));
}

const webpackConfig = (env) => {
    const config = {
        mode: env.mode,
        target: 'node',
        entry: {
            bundle: path.resolve(__dirname, 'src', 'backendManager.ts')
        },
        output: {
            path: path.resolve(__dirname, 'lib'),
            filename: '[name].cjs'
        },
        // We don't use minimization because we lose access to meaningful logs in production.
        optimization: {
            minimize: false
        },
        resolve: {
            extensions: ['.ts', '.js']
        },
        module: {
            rules: [
                {
                    test: /\.ts?$/,
                    use: {
                        loader: 'ts-loader',
                        options: {
                            configFile: 'tsconfig.build.json'
                        }
                    },
                    exclude: [/node_modules/, /packages[\/\\]identity/, /packages[\/\\]state-manager/, /packages[\/\\]logger/],

                },
                {
                    test: /node_modules[\/\\]classic-level[\/\\]index.js/,
                    loader: 'string-replace-loader',
                    options: {
                        search: "const binding = require('./binding')",
                        replace: "const binding = require('./binding').default"
                    }
                },
                {
                    test: /node_modules[\/\\]classic-level[\/\\]iterator.js/,
                    loader: 'string-replace-loader',
                    options: {
                        search: "const binding = require('./binding')",
                        replace: "const binding = require('./binding').default"
                    }
                },
                {
                    test: /node_modules[\/\\]@nestjs[\/\\]common[\/\\]services[\/\\]console-logger.service.js/,
                    loader: 'string-replace-loader',
                    options: {
                        search: `const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {\n    year: 'numeric',\n    hour: 'numeric',\n    minute: 'numeric',\n    second: 'numeric',\n    day: '2-digit',\n    month: '2-digit',\n})`,
                        replace: `const dateTimeFormatter = {format: (s) => s}`
                    }
                },
                {
                    test: /node_modules[\/\\]@nestjs[\/\\]common[\/\\]services[\/\\]logger.service.js/,
                    loader: 'string-replace-loader',
                    options: {
                        search: `const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {\n    year: 'numeric',\n    hour: 'numeric',\n    minute: 'numeric',\n    second: 'numeric',\n    day: '2-digit',\n    month: '2-digit',\n})`,
                        replace: `const dateTimeFormatter = {format: (s) => s}`
                    }
                }
            ]
        },
        plugins: [
            new webpack.NormalModuleReplacementPlugin(
                /node_modules[\/\\]classic-level[\/\\]binding.js/,
                root('classic_level.cjs')
            ),
            new webpack.NormalModuleReplacementPlugin(
                /node_modules[\/\\]ipfs-utils[\/\\]src[\/\\]http[\/\\]fetch.js/,
                'fetch.node.js'
            ),
            new webpack.NormalModuleReplacementPlugin(
                /node_modules[\/\\]ipfs-utils[\/\\]src[\/\\]fetch.js/,
                root(path.join('node_modules', 'electron-fetch', 'lib', 'index.js'))
            ),
            new webpack.IgnorePlugin({
                checkResource(resource) {
                    const lazyImports = ['@nestjs/microservices', '@nestjs/microservices/microservices-module', '@nestjs/platform-express', '@nestjs/websockets/socket-module'];
                    if (!lazyImports.includes(resource)) {
                        return false;
                    }
                    try {
                        require.resolve(resource);
                    } catch (err) {
                        return true;
                    }
                    return false;
                },
            }),
        ],
        experiments: {
            topLevelAwait: true
        }
    }
    return config
}
export default webpackConfig