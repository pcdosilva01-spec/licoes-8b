import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../push-github.bat", import.meta.url), "utf8");

assert.match(source, /set \/p "CONFIRM=/i);
assert.match(source, /if \/I "%CONFIRM%"=="S" goto :continue/i);
assert.match(source, /if \/I "%CONFIRM%"=="N" goto :cancel/i);
assert.match(source, /git ls-files/i);
assert.match(source, /git diff --cached --name-only/i);
assert.doesNotMatch(source, /if exist "\.env"/i);
assert.match(source, /pause >nul/i);
assert.match(source, /REPO_URL=https:\/\/github\.com\/pcdosilva01-spec\/licoes-8b/i);

console.log("push-github.bat OK: aceita S/N, permite segredo local ignorado, bloqueia rastreado/staged e pausa ao terminar.");
