# Página pessoal — Rafael C. R. de Lima

Página acadêmica bilíngue (PT/EN): posição na UDESC, descrição da pesquisa,
programas abertos ao público, disciplinas com material didático e a lista de
publicações com DOI.

## No ar

**<https://rafael-lima.pages.dev>**

O subdomínio saiu sem sufixo — `rafael-lima` estava livre. `*.pages.dev` é único
no mundo inteiro, então se um dia o projeto for recriado com outro nome o
endereço muda, e duas coisas precisam acompanhar: a tag `<link rel="canonical">`
em `site/index.html` e esta seção.

## Estrutura

```text
site/index.html   a página inteira (conteúdo dos dois idiomas)
site/styles.css   apresentação
site/favicon.svg  ícone, claro e escuro
```

Não há build, não há dependência e não há `node_modules`. Para ver localmente:

```bash
python3 -m http.server -d site 8000
```

e abrir <http://localhost:8000>.

## Como a troca de idioma funciona

Cada texto existe duas vezes no HTML, marcado com `lang="pt"` ou `lang="en"`.
O CSS esconde o idioma inativo:

```css
html[data-lang="pt"] [lang="en"],
html[data-lang="en"] [lang="pt"] { display: none; }
```

O botão PT/EN só troca `data-lang` no `<html>` e guarda a escolha no
`localStorage`. A primeira visita segue o idioma do navegador. Isso mantém tudo
numa página só, sem roteamento, e faz os dois idiomas serem indexáveis.

**Ao editar, mexa sempre nos dois blocos.** Se um texto aparecer em português
com a página em inglês, é porque o par ficou incompleto.

## Publicação

`push` na `main` → a Action envia `site/` para o Cloudflare Pages.

**Falta um passo para isso funcionar:** os segredos `CLOUDFLARE_API_TOKEN` e
`CLOUDFLARE_ACCOUNT_ID` ainda não existem neste repositório. São os mesmos
valores já usados no ALETRA, no TESSERA e no ODEROM — o GitHub não deixa ler o
valor de um segredo depois de gravado, então eles têm de vir do painel da
Cloudflare:

```bash
gh secret set CLOUDFLARE_API_TOKEN  --repo RafaelCRdeLima/homepage
gh secret set CLOUDFLARE_ACCOUNT_ID --repo RafaelCRdeLima/homepage
```

Enquanto os segredos não existirem, a Action falha e o site fica no ar com a
última versão publicada — o primeiro deploy foi feito à mão, daqui, com
`wrangler pages deploy site --project-name=rafael-lima`.

## Manutenção

- **Publicações**: a lista em `site/index.html` está em ordem cronológica
  inversa; cada entrada é um `<li>` com ano, autores, título com DOI e revista.
  A fonte de verdade continua sendo o [ORCID](https://orcid.org/0000-0003-1718-3838)
  e o [Lattes](http://lattes.cnpq.br/0799234795742587) — a página é um recorte.
- **Programas e disciplinas**: os links apontam para os sites públicos. ODEROM,
  TESSERA e ÁLETRA são repositórios privados com site público, então não têm
  link de repositório; o PATHS é público e tem.
