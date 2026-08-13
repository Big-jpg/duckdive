import type {Metadata} from "next";
import AccessRequestForm from "@/components/AccessRequestForm";

export const metadata:Metadata={title:"Explore governed data",description:"Request access to explore WA's used-vehicle market through live, inspectable DuckDive reports."};

export default function Home(){return <AccessRequestForm/>;}
