import {redirect} from "next/navigation";
import DiveView from "@/components/DiveView";
import {currentUser} from "@/lib/auth";
export const dynamic="force-dynamic";
export default async function Page({params}:{params:Promise<{starter:string}>}){const {starter}=await params;if(!await currentUser())redirect(`/login?next=${encodeURIComponent(`/dives/${starter}`)}`);return <DiveView starter={starter}/>;}
