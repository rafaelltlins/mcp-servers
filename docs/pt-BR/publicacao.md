🇺🇸 [English](../en/publishing.md) | 🇧🇷 Português

# Publicação e versionamento

## Registrar uma mudança

Execute isto no mesmo pull request da mudança:

```bash
npm run changeset
```

Selecione os pacotes afetados e o tipo de mudança:

| Tipo | Quando usar | Exemplo |
| --- | --- | --- |
| `patch` | Correção de bug | `0.1.0` para `0.1.1` |
| `minor` | Funcionalidade nova e compatível | `0.1.0` para `0.2.0` |
| `major` | Mudança incompatível, como renomear uma ferramenta | `1.0.0` para `2.0.0` |

Só os pacotes selecionados ganham uma nova versão.

## Configuração inicial

Você só faz isto uma vez:

1. Crie uma conta em [npmjs.com](https://www.npmjs.com). Se o seu usuário não for `rafaelltlins`, altere o escopo `@rafaelltlins` em cada pacote.
2. Execute `npm login`.
3. Instale o `mcp-publisher` seguindo o [guia oficial](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/quickstart.mdx).

## Lançar uma versão

1. Aplique as mudanças pendentes. Isto atualiza versões, changelogs e cada `server.json`:

   ```bash
   npm run version
   ```

2. Revise o resultado e faça o commit.
3. Verifique, publique no npm os pacotes alterados e crie as tags:

   ```bash
   npm run release
   ```

4. Envie o commit e as tags:

   ```bash
   git push --follow-tags
   ```

5. Para cada servidor lançado, publique os metadados a partir da pasta do pacote. O npm precisa vir primeiro, porque o registro verifica o pacote:

   ```bash
   cd packages/mcp-omniakey
   ```

   ```bash
   mcp-publisher login github
   ```

   ```bash
   mcp-publisher publish
   ```

O `mcpName` do `package.json` precisa ser igual ao `name` do `server.json`. É assim que o registro confirma que o pacote npm é seu.
