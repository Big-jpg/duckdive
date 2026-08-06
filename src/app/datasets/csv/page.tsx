import {createHash} from "node:crypto";
import type {Metadata} from "next";
import {redirect} from "next/navigation";
import CsvDiveExperience from "@/components/CsvDiveExperience";
import {currentUser} from "@/lib/auth";

export const metadata:Metadata={title:"Import a CSV"};
export const dynamic="force-dynamic";

export default async function CsvDataset(){
  const user=await currentUser();if(!user)redirect("/login?next=%2Fdatasets%2Fcsv");
  const ownerScope=createHash("sha256").update(`csv-dive:${user.user_id}`).digest("hex").slice(0,24);
  return <CsvDiveExperience ownerScope={ownerScope}/>;
}
