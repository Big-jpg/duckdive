import Image from "next/image";
import Link from "next/link";

export default function AppBrand(){
  return <Link href="/" className="lab-brand" translate="no">
    <span className="lab-brand-mark"><Image src="/duckdive-icon.svg" alt="" fill sizes="32px" priority/></span>
    <span>DuckDive<i>.gold</i></span>
  </Link>;
}
