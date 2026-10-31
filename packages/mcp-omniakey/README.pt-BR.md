🇺🇸 [English](README.md) | 🇧🇷 Português

# mcp-omniakey

Um servidor MCP que permite a assistentes de IA usar a [OmniaKey](https://omniakey.com): conversar com modelos de texto e gerar imagens, vídeos e músicas.

> **Projeto não oficial:** não tem vínculo com a OmniaKey. A OmniaKey tem o próprio [servidor MCP oficial](https://github.com/omniakey-com/omniakey-devtools). Este aqui acrescenta uma ferramenta dedicada para cada tipo de mídia, arquivos locais como entrada e download verificado para o disco.

## Requisitos

- Node.js 20 ou mais recente
- Uma [chave de API da OmniaKey](https://omniakey.com/dashboard/tokens)

> **Custos:** as ferramentas de chat e geração gastam seu saldo na OmniaKey. Defina um limite de gastos na chave se quiser restringir o uso por um assistente.

## Instalação

> **Status:** este servidor ainda não está no npm e não foi testado na API real da OmniaKey, então os comandos `npx` abaixo só vão funcionar depois da publicação. Para experimentar agora, clone este repositório, execute `npm install` e `npm run build`, e configure seu cliente com `"command": "node"` e `"args": ["<caminho do repositório>/packages/mcp-omniakey/dist/index.js"]`.

**Claude Code**

```bash
claude mcp add --transport stdio --env OMNIAKEY_API_KEY=sua-chave omniakey -- npx -y @rafaelltlins/mcp-omniakey
```

**Claude Desktop, Cursor e outros clientes com configuração em JSON**

```json
{
  "mcpServers": {
    "omniakey": {
      "command": "npx",
      "args": ["-y", "@rafaelltlins/mcp-omniakey"],
      "env": {
        "OMNIAKEY_API_KEY": "sua-chave"
      }
    }
  }
}
```

No Windows, se o cliente não conseguir iniciar o `npx`, use `"command": "cmd"` e adicione `"/c", "npx"` ao início de `args`.

## Configuração

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `OMNIAKEY_API_KEY` | Sim | Sua chave de API |
| `OMNIAKEY_OUTPUT_DIR` | Não | Pasta padrão de downloads. O padrão é `./omniakey-output` |
| `OMNIAKEY_BASE_URL` | Não | Endereço da API. O padrão é `https://api.omniakey.com` |

## Ferramentas

| Ferramenta | O que faz | Custo |
| --- | --- | --- |
| `list_models` | Lista os modelos disponíveis para sua chave | Grátis |
| `chat` | Executa uma conversa em um modelo de texto | Pago |
| `generate_image` | Gera uma imagem ou edita imagens fornecidas | Pago |
| `generate_video` | Gera um vídeo a partir de texto, de um quadro ou de referências | Pago |
| `generate_audio` | Gera uma música a partir de uma descrição ou letra | Pago |
| `get_task` | Consulta o status e o resultado de uma tarefa | Grátis |
| `cancel_task` | Solicita o cancelamento de uma tarefa | Veja abaixo |
| `download_task_assets` | Salva os arquivos de uma tarefa e verifica os checksums | Grátis |

## Exemplos de pedidos

Peça ao seu assistente coisas como:

- "Liste os modelos de imagem da OmniaKey."
- "Gere uma imagem 16:9 de um barco de papel com `gemini-3.1-flash-image` e salve."
- "Crie um vídeo de 5 segundos a partir de `./quadro.png` com `wan3.0-video` em 720P."
- "Componha uma música folk acústica animada com `suno-v6`."

## Como a geração funciona

1. Uma ferramenta `generate_*` cria a tarefa e, por padrão, espera até 45 segundos.
2. Se a tarefa não terminar, a ferramenta retorna o id dela, e a tarefa continua rodando. Vídeos costumam precisar disso.
3. `get_task` consulta a tarefa novamente.
4. `download_task_assets` salva os arquivos. As tarefas e os arquivos ficam disponíveis por 24 horas.

## Bom saber

- **Os parâmetros dependem do modelo:** opções como `size` ou `aspect_ratio` vão em `parameters`. Consulte a [documentação de mídia da OmniaKey](https://docs.omniakey.com/en/media/overview).
- **Tamanho da entrada:** um pedido de mídia é limitado a 1 MiB, incluindo arquivos embutidos. Use uma URL pública para arquivos maiores quando o modelo aceitar.
- **Arquivos locais:** só podem ser enviados `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.mp4`, `.mov`, `.webm`, `.mp3`, `.wav` e `.m4a`.
- **Novas tentativas:** se a criação de uma tarefa falhar, o erro inclui uma `idempotency_key`. Tentar de novo com ela e a mesma entrada evita uma segunda cobrança.
- **Cancelamento:** é feito na base do melhor esforço. Alguns modelos continuam renderizando, e o status final define a cobrança.

## Desenvolvimento

Na raiz do repositório:

```bash
npm install
```

```bash
npm run check
```

## Licença

[MIT](LICENSE)
