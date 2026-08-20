
## Terceira reprodução — banco TiDB

O novo erro deixou de ser crash da Function. A rota `auth.register` agora chega ao Drizzle/mysql2 e falha no SQL `INSERT ... ON DUPLICATE KEY UPDATE` da tabela `users`. O SQL gerado é compatível com MySQL/TiDB e inclui as colunas definidas em `drizzle/schema.ts` (`openId`, `name`, `email`, `loginMethod`, `role`, `lastSignedIn`).

O indício principal é que o banco usado pela `DATABASE_URL` não recebeu as migrações `drizzle/0000_milky_wraith.sql` e `drizzle/0001_lumpy_dreaming_celestial.sql`, ou a URL aponta para outro database/schema com estrutura diferente. A solução operacional é executar `npm run db:push` usando exatamente a mesma `DATABASE_URL` configurada na Vercel, preferencialmente em um database dedicado da aplicação, e depois publicar/testar novamente. O aviso de Permissions Policy sobre `unload` não é a causa do cadastro.
