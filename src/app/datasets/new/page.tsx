import {redirect} from "next/navigation";
import type {Metadata} from "next";
import {currentUser} from "@/lib/auth";
import SemanticModelImport from "@/components/SemanticModelImport";

export const metadata:Metadata={title:"Bring your own model"};
export const dynamic="force-dynamic";

export default async function NewDataset(){
  if(!await currentUser())redirect("/login?next=%2Fdatasets%2Fnew");
  return <SemanticModelImport/>;
}
