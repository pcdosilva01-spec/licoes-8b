import { describe, expect, it } from "vitest";
import { validatePdfBuffer } from "./pdfValidation";

describe("validação de PDF", () => {
  it("aceita um PDF com assinatura, versão e trailer", () => {
    const pdf = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\nstartxref\n0\n%%EOF\n", "latin1");
    expect(validatePdfBuffer(pdf)).toBe(true);
  });

  it("recusa arquivo truncado sem trailer", () => {
    expect(validatePdfBuffer(Buffer.from("%PDF-1.7\nconteudo", "latin1"))).toBe(false);
  });

  it("recusa ações ativas perigosas", () => {
    const pdf = Buffer.from("%PDF-1.7\n/OpenAction /JavaScript\n%%EOF\n", "latin1");
    expect(validatePdfBuffer(pdf)).toBe(false);
  });

  it("recusa cabeçalho falso", () => {
    expect(validatePdfBuffer(Buffer.from("not-a-pdf\n%%EOF", "latin1"))).toBe(false);
  });
});
