export function ensureMySqlTls(connectionString: string) {
  if (/[?&]ssl=/i.test(connectionString)) return connectionString;
  return `${connectionString}${connectionString.includes("?") ? "&" : "?"}ssl=true`;
}
