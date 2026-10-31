🇺🇸 [English](../en/getting-started.md) | 🇧🇷 Português

# Primeiros passos

## Usando um servidor

Você não precisa clonar este repositório para usar um servidor. Escolha um da [lista](../../README.pt-BR.md#servidores) e siga o README dele.

## Trabalhando no código

Você precisa do Node.js 20 ou mais recente.

```bash
git clone https://github.com/rafaelltlins/mcp-servers.git
```

```bash
cd mcp-servers
```

```bash
npm install
```

```bash
npm run check
```

O `npm run check` verifica os tipos, compila e testa todos os servidores.

## Estrutura do repositório

| Caminho | Conteúdo |
| --- | --- |
| `packages/` | Uma pasta por servidor MCP |
| `templates/mcp-template/` | Ponto de partida para novos servidores |
| `docs/en/`, `docs/pt-BR/` | Guias do repositório como um todo |
| `scripts/` | Scripts de manutenção do repositório |
| `.changeset/` | Mudanças de versão pendentes |
