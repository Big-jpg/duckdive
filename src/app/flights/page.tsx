import {redirect} from "next/navigation";
import FlightsPreview from "@/components/journey/FlightsPreview";
import JourneyShell from "@/components/journey/JourneyShell";
import {currentUser} from "@/lib/auth";
import {getDemoFlightStatus} from "@/lib/motherduck-flight-status";
export const dynamic="force-dynamic";
export default async function Flights(){if(!await currentUser())redirect("/login?next=%2Fflights");const flightStatus=await getDemoFlightStatus();return <JourneyShell stage="flights"><FlightsPreview flightStatus={flightStatus}/></JourneyShell>;}
