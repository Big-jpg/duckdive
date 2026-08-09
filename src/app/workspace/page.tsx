import {redirect} from "next/navigation";
import LabHome from "@/components/LabHome";
import {currentUser} from "@/lib/auth";
import {datasetWorkspaceManifest,defaultDataset} from "@/lib/datasets";
export const dynamic="force-dynamic";
export default async function Workspace(){const user=await currentUser();if(!user)redirect("/login?next=%2Fworkspace");return <LabHome isAdmin={user.role==="admin"} dataset={datasetWorkspaceManifest(defaultDataset())}/>;}
