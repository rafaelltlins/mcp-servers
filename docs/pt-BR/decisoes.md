🇺🇸 [English](../en/decisions.md) | 🇧🇷 Português

# Decisões do projeto

Estas são as decisões por trás deste repositório. Se alguma mudar, atualize este arquivo nos dois idiomas.

| Tema | Decisão |
| --- | --- |
| Repositório | Um monorepo, `mcp-servers`, com servidores independentes |
| Documentação | Arquivos separados por idioma: inglês é o padrão, e o pt-BR tem as mesmas seções |
| Idioma do código | Somente inglês, inclusive nos comentários |
| Stack padrão | TypeScript no Node.js, com o SDK oficial do MCP |
| Versionamento | Independente por servidor, gerenciado com Changesets |
| Distribuição | npm no escopo `@rafaelltlins`, listado no MCP Registry oficial |
| Licença | MIT |

## Monorepo

Todos os servidores ficam em um só repositório porque, com uma única pessoa mantendo, compensa ter um só lugar para issues, CI, convenções e templates.

Os servidores continuam independentes, então qualquer um pode ir para um repositório próprio depois, com `git filter-repo` ou `git subtree split`. Vale considerar isso quando um servidor ganhar comunidade própria, releases frequentes ou contribuidores diferentes.

Ser independente significa que cada pasta em `packages/` tem dependências, versão, changelog, licença e READMEs próprios, e nunca importa código de outro pacote.

## Documentação em dois idiomas

Cada documento existe como um arquivo por idioma, porque misturar os dois no mesmo arquivo o deixa longo e difícil de ler, revisar e pesquisar.

- `README.md` fica em inglês, porque é o que GitHub e npm mostram por padrão. `README.pt-BR.md` é a versão em português.
- Os guias ficam em `docs/en/` e `docs/pt-BR/`.
- Cada documento traz no topo um link para o outro idioma.
- Uma mudança em um idioma também precisa atualizar o outro. O template de pull request inclui essa verificação.

## Escolha da linguagem

O MCP é um protocolo, então o cliente não sabe em que linguagem o servidor foi escrito. A linguagem só afeta o que o usuário precisa instalar e a facilidade de manutenção.

TypeScript é o padrão porque o `npx` simplifica a instalação. Um servidor pode usar outra linguagem quando o trabalho pedir, como Python para processar dados ou IA localmente. Um mesmo servidor não deve ser escrito em duas linguagens, porque isso dobra a manutenção sem nenhum ganho para o cliente.

## Versionamento

Cada servidor segue o [Versionamento Semântico](https://semver.org/lang/pt-BR/) por conta própria, com [Changesets](https://github.com/changesets/changesets). Cada release ganha uma tag Git por pacote, como `@rafaelltlins/mcp-omniakey@0.1.0`, e cada pacote tem seu próprio `CHANGELOG.md`.

Esse formato de tag substitui o `mcp-foo-v1.2.0` sugerido no início, porque é o que o Changesets gera.

## Nomes e registros

| Local | O nome é único? | Formato usado |
| --- | --- | --- |
| npm, sem escopo | Sim, em todo o npm | Não usado |
| npm, com escopo | Só dentro do escopo, então autores podem repetir nomes | `@rafaelltlins/mcp-<servico>` |
| MCP Registry oficial | Só dentro do namespace | `io.github.rafaelltlins/mcp-<servico>` |

Com o escopo, todo nome simples, como `mcp-omniakey`, fica disponível para este projeto mesmo que outra pessoa use o mesmo nome em outro lugar.

O [MCP Registry oficial](https://registry.modelcontextprotocol.io) foi escolhido por ser mantido pelo próprio projeto MCP. Ele guarda apenas metadados, então o código continua sendo publicado no npm. Quando isto foi escrito, ele ainda estava em prévia, então as regras podem mudar.

## Licença

A MIT permite qualquer uso, inclusive customização e uso comercial. Ela exige que cópias e partes substanciais do código mantenham o aviso de copyright e a licença, e é assim que o autor original continua creditado.

Ela não exige que forks divulguem a origem de nenhuma outra forma. Uma licença com esse tipo de exigência deixaria de ser "sem restrições".

## mcp-omniakey e o servidor oficial da OmniaKey

A OmniaKey publica o próprio [servidor MCP oficial](https://github.com/omniakey-com/omniakey-devtools), também sob MIT. Este projeto é independente, não tem vínculo com a OmniaKey e deve sempre informar que não é oficial.

| | Servidor oficial | mcp-omniakey |
| --- | --- | --- |
| Instalação | Tag fixa do GitHub via `npx` | Pacote npm |
| Ferramentas de mídia | Uma ferramenta genérica de envio | Uma ferramenta para cada tipo: imagem, vídeo e áudio |
| Espera e resultados | Ferramenta separada de espera; retorna URLs | Espera opcional ao gerar; baixa os arquivos para o disco e verifica o checksum |
| Arquivos locais como entrada | Não oferecido como recurso da ferramenta | Aceita caminhos locais de imagem, vídeo e áudio |

Esta comparação reflete o servidor oficial na v0.1.0 e deve ser revista conforme ele evoluir.

## Regras de design das ferramentas de mídia

- **Tarefas longas:** uma ferramenta espera no máximo 50 segundos, já que muitos clientes cancelam chamadas aos 60. Depois disso, ela retorna o id da tarefa, que continua rodando.
- **Arquivos grandes:** os resultados trazem URLs ou caminhos salvos, nunca Base64, para proteger o contexto do modelo.
- **Chaves de API:** são lidas somente de variáveis de ambiente e nunca são enviadas aos hosts que servem os arquivos baixados.
- **Custos:** a descrição de cada ferramenta paga informa isso. Toda tarefa de mídia paga usa uma chave de idempotência, para que uma nova tentativa não seja cobrada duas vezes.
- **Arquivos locais:** só extensões conhecidas de mídia podem ser enviadas, para que uma instrução maliciosa não envie um arquivo como uma chave privada.
- **Quantidade de ferramentas:** as ferramentas são agrupadas por tipo de mídia, com o modelo como parâmetro, para manter pequeno o contexto do cliente.
