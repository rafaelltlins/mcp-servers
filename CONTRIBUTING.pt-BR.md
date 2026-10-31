🇺🇸 [English](CONTRIBUTING.md) | 🇧🇷 Português

# Como contribuir

## Preparação

Você precisa do Node.js 20 ou mais recente.

```bash
npm install
npm run check
```

## Regras

1. **Código em inglês:** código-fonte, comentários, identificadores e mensagens de commit.
2. **Documentação nos dois idiomas:** ao alterar um README ou guia, atualize as versões em inglês e pt-BR, mantendo as mesmas seções.
3. **Servidores independentes:** um pacote nunca importa código de outro pacote.
4. **Registre sua mudança:** execute `npm run changeset` para qualquer mudança em um pacote que afete quem o usa.
5. **Proteja segredos:** nunca faça commit de chaves de API nem as exiba em logs e erros.

## Pull requests

Antes de abrir um pull request, confirme que `npm run check` passa.
