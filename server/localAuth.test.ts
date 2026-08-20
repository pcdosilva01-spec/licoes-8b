import { describe, expect, it } from "vitest";
import { createLocalSessionToken, verifyLocalSessionToken } from "./localAuth";

describe("sessão local", () => {
  it("cria e valida um token pelo openId local", () => {
    const token = createLocalSessionToken("local:aluno-123");
    expect(verifyLocalSessionToken(token)).toBe("local:aluno-123");
  });

  it("rejeita token adulterado", () => {
    const token = createLocalSessionToken("local:aluno-123");
    const tampered = `${token}x`;
    expect(verifyLocalSessionToken(tampered)).toBeUndefined();
  });

  it("rejeita token ausente", () => {
    expect(verifyLocalSessionToken(undefined)).toBeUndefined();
  });
});
