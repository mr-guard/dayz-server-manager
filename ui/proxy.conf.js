
// eslint-disable-next-line @typescript-eslint/naming-convention
const PROXY_CONFIG = [
    {
        context: [
            '/api/**',
        ],
        target: process.env.DZSM_HOST ? process.env.DZSM_HOST : 'http://localhost:2313',
        secure: false,
        changeOrigin: true,
    },
    {
        context: [
            '/version',
        ],
        target: process.env.DZSM_HOST ? process.env.DZSM_HOST : 'http://localhost:2313',
        secure: false,
        changeOrigin: true,
    },
];

console.log(`Using dev backend: ${PROXY_CONFIG[0].target}`);

module.exports = PROXY_CONFIG;
