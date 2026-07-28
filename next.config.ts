import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const scriptPolicy=process.env.NODE_ENV==="development"?"script-src 'self' 'unsafe-inline' 'unsafe-eval'":"script-src 'self' 'unsafe-inline'";
const config: NextConfig = {
  serverExternalPackages: ["postgres"],
  async headers(){return [{source:"/:path*",headers:[
    {key:"Content-Security-Policy",value:`default-src 'self'; ${scriptPolicy}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://api.motherduck.com https://*.motherduck.com; frame-src https://embed-motherduck.com; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`},
    {key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},
    {key:"X-Content-Type-Options",value:"nosniff"},
    {key:"X-Frame-Options",value:"DENY"},
    {key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=()"},
  ]}]},
};

export default withWorkflow(config);
