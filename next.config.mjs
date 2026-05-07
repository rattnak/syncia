/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Allow the app to be embedded inside the Syncia Chrome/Edge extension side panel.
        // Chrome extensions have an origin of "chrome-extension://<id>".
        // We can't whitelist the extension ID at build time, so CSP uses a wildcard.
        source: '/(.*)',
        headers: [
          {
            // frame-ancestors controls who can embed this page in an iframe.
            // 'self' = same-origin navigation, chrome-extension://* = any installed extension.
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' chrome-extension://*",
          },
          // X-Frame-Options cannot express chrome-extension origins, so we omit DENY/SAMEORIGIN
          // here and rely on the CSP frame-ancestors directive above instead.
        ],
      },
    ]
  },
}

export default nextConfig;
