import {redirect} from "next/navigation";
import {cookies} from "next/headers";
import {currentUser} from "@/lib/auth";
import {safeNextPath} from "@/lib/auth-policy";

export const dynamic="force-dynamic";
export default async function AuthComplete({searchParams}:{searchParams:Promise<{next?:string;neon_auth_session_verifier?:string}>}){
  const params=await searchParams;
  const cookieStore=await cookies();
  const verifierPresent=typeof params.neon_auth_session_verifier==="string";
  const challengePresent=cookieStore.has("__Secure-neon-auth.session_challange");
  const sessionTokenPresent=cookieStore.has("__Secure-neon-auth.session_token");
  const sessionDataPresent=cookieStore.has("__Secure-neon-auth.local.session_data");
  const user=await currentUser();
  console.info("Neon Auth completion diagnostic",{
    verifierPresent,
    challengePresent,
    sessionTokenPresent,
    sessionDataPresent,
    sessionResolved:Boolean(user),
  });
  if(!user)redirect("/login?error=access_denied");
  redirect(safeNextPath(params.next));
}
