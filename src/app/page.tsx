import type {Metadata} from "next";
import AccessRequestForm from "@/components/AccessRequestForm";

export const metadata:Metadata={title:"Explore DuckDive",description:"Request access to explore governed datasets and reshape live reports with DuckDive."};

export default function Home(){return <AccessRequestForm/>;}
