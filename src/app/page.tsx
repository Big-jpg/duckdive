import {redirect} from "next/navigation";
import PublicJourneyHome from "@/components/journey/PublicJourneyHome";
import {currentUser} from "@/lib/auth";
export const dynamic="force-dynamic";
export default async function Home(){if(await currentUser())redirect("/lake");return <PublicJourneyHome/>;}
