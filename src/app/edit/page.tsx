import {Suspense} from "react";
import {redirect} from "next/navigation";
import EditLab from "@/components/EditLab";
import {currentUser} from "@/lib/auth";

export default async function EditPage(){
  if(!await currentUser())redirect("/login?next=%2Fedit");
  return <Suspense><EditLab/></Suspense>;
}
