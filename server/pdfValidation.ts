export const MAX_PDF_BYTES = 10 * 1024 * 1024;

export function validatePdfBuffer(buffer: Buffer) {
  if (buffer.length === 0 || buffer.length > MAX_PDF_BYTES) return false;
  const header = buffer.subarray(0, 16).toString("latin1");
  if (!/^%PDF-\d\.\d/.test(header)) return false;
  const tail = buffer.subarray(Math.max(0, buffer.length - 2048)).toString("latin1");
  if (!tail.includes("%%EOF")) return false;
  const source = buffer.toString("latin1");
  const dangerousMarkers = ["/JavaScript", "/JS", "/Launch", "/OpenAction", "/AA"];
  if (dangerousMarkers.some(marker => source.includes(marker))) return false;
  return true;
}
