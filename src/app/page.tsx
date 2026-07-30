import {redirect} from "next/navigation";
import LabHome from "@/components/LabHome";
import {currentUser} from "@/lib/auth";
export const dynamic="force-dynamic";
export default async function Home(){if(!await currentUser())redirect("/login");return <LabHome/>;}
