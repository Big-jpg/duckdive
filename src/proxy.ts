import {neonAuth} from "@/lib/neon-auth";

export default neonAuth().middleware({loginUrl:"/login"});

// Application authorization stays in the route/page layer. The proxy runs only
// on Neon Auth OAuth returns so it can exchange the one-time verifier and set
// DuckDive's session cookies without changing the public /share contract.
export const config={
  matcher:[{source:"/:path*",has:[{type:"query",key:"neon_auth_session_verifier"}]}],
};
