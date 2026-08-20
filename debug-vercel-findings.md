
## Segunda reprodução

Em 2026-08-20, a consulta direta a `https://licoes-8b.vercel.app/api/trpc/auth.me?...` retornou a página Vercel `500: INTERNAL_SERVER_ERROR` com código `FUNCTION_INVOCATION_FAILED` e request ID `iad1::k5cts-1787184882809-e1e28a2bfc9b`. Isso confirma que a Function está crashando no runtime; o erro `Unexpected token 'A'` é apenas o cliente tRPC tentando interpretar a página/texto de erro como JSON. Ainda é necessário o Runtime Log da Vercel para identificar a exceção exata ou, alternativamente, conferir as variáveis e o schema TiDB.
