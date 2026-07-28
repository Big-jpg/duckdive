export function parseIngestArgs(argv: string[]) {
  const args=argv.filter((value)=>value!=="--");
  return {
    directory:args.find((value)=>!value.startsWith("--"))||process.env.ESTATE_SOURCE_DIRECTORY||"../rea_sales_data_model/VIC",
    limit:args.find((value)=>value.startsWith("--limit="))?.split("=")[1],
  };
}
