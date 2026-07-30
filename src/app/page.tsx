import {redirect} from "next/navigation";
import LabHome from "@/components/LabHome";
import {currentUser} from "@/lib/auth";
export const dynamic="force-dynamic";
export default async function Home(){const user=await currentUser();if(!user)redirect("/login");return <LabHome isAdmin={user.role==="admin"}/>;}
