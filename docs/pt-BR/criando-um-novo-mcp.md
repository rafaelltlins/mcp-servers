🇺🇸 [English](../en/creating-a-new-mcp.md) | 🇧🇷 Português

# Criando um novo MCP

1. Copie `templates/mcp-template` para `packages/mcp-<servico>`.
2. Substitua `mcp-template` por `mcp-<servico>` em todos os arquivos da nova pasta e troque as descrições provisórias.
3. Execute `npm install` na raiz do repositório para vincular o novo pacote.
4. Implemente as ferramentas em `src/server.ts` e teste-as em `test/server.test.ts`.
5. Preencha `README.md` e `README.pt-BR.md`.
6. Adicione o servidor às tabelas do `README.md` e do `README.pt-BR.md` da raiz.
7. Execute `npm run check`.
8. Execute `npm run changeset` para registrar a primeira versão.

## Regras para todo servidor

- Não importe código de outro pacote deste repositório. Código compartilhado amarraria as versões entre eles.
- Leia segredos somente de variáveis de ambiente e deixe o servidor iniciar sem eles. Informe a falta da chave quando uma ferramenta for chamada.
- Escreva diagnósticos no stderr, porque o stdout transporta o protocolo MCP.
- Informe na descrição da ferramenta quando ela custa dinheiro ou altera algo.
- Faça ferramentas demoradas retornarem um id de tarefa, em vez de bloquear além do limite de tempo do cliente.
- Retorne URLs ou caminhos de arquivo para conteúdo grande, em vez do próprio conteúdo.
