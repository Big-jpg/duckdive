import {redirect} from "next/navigation";
import {currentUser} from "@/lib/auth";
import {safeNextPath} from "@/lib/auth-policy";

export const dynamic="force-dynamic";
export default async function AuthComplete({searchParams}:{searchParams:Promise<{next?:string}>}){
  const user=await currentUser();
  if(!user)redirect("/login?error=access_denied");
  redirect(safeNextPath((await searchParams).next));
}
