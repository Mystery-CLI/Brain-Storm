/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://brain-storm.app',
  generateRobotsTxt: true,
  robotsTxtOptions: {
    policies: [
      { userAgent: '*', allow: '/' },
      { userAgent: '*', disallow: ['/instructor/', '/profile', '/login', '/register'] },
    ],
  },
  // Static routes are auto-discovered; dynamic course pages need ISR or a fetch
  exclude: ['/instructor/*'],
};
