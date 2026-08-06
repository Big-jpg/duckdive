import {redirect} from "next/navigation";
import DivesPreview from "@/components/journey/DivesPreview";
import JourneyShell from "@/components/journey/JourneyShell";
import {currentUser} from "@/lib/auth";
export const dynamic="force-dynamic";
export default async function Dives(){if(!await currentUser())redirect("/login?next=%2Fdives");return <JourneyShell stage="dives"><DivesPreview/></JourneyShell>;}
