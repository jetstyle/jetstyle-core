// /** @type {import('next').NextConfig} */
// const nextConfig = {}
//
// module.exports = nextConfig

/** @type {import('next').NextConfig} */
const withNextIntl = require('next-intl/plugin')();
const nextConfig = {
    // basePath: '/'
}

module.exports = withNextIntl(nextConfig)
