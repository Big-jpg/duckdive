import {redirect} from "next/navigation";
import FlightsPreview from "@/components/journey/FlightsPreview";
import JourneyShell from "@/components/journey/JourneyShell";
import {currentUser} from "@/lib/auth";
export const dynamic="force-dynamic";
export default async function Flights(){if(!await currentUser())redirect("/login?next=%2Fflights");return <JourneyShell stage="flights"><FlightsPreview/></JourneyShell>;}
