import DiveView from "@/components/DiveView";
export default async function Page({params}:{params:Promise<{starter:string}>}){return <DiveView starter={(await params).starter}/>;}
