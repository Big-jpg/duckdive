import {redirect} from "next/navigation";
import JourneyShell from "@/components/journey/JourneyShell";
import LakeExperience from "@/components/journey/LakeExperience";
import {currentUser} from "@/lib/auth";
export const dynamic="force-dynamic";
export default async function Lake(){if(!await currentUser())redirect("/login?next=%2Flake");return <JourneyShell stage="lake"><LakeExperience/></JourneyShell>;}
