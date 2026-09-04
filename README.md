# Página pessoal — Rafael C. R. de Lima

Página acadêmica bilíngue (PT/EN): posição na UDESC, descrição da pesquisa,
programas abertos ao público, disciplinas com material didático e a lista de
publicações com DOI.

## No ar

O endereço definitivo sai no log do primeiro deploy — `*.pages.dev` é único no
mundo inteiro, e a Cloudflare acrescenta um sufixo se `rafael-lima` já estiver
tomado. Leia o endereço em **Actions → Publicar no Cloudflare Pages → Enviar
para o Cloudflare**, ou no painel da Cloudflare.

Quando souber o endereço, vale atualizar duas linhas em `site/index.html`:
a tag `<link rel="canonical">` e o `--canonical` mencionado aqui.

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

`push` na `main` → a Action envia `site/` para o Cloudflare Pages. Os segredos
`CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` precisam existir em
*Settings → Secrets and variables → Actions* (são os mesmos usados no ALETRA,
no TESSERA e no ODEROM).

## Manutenção

- **Publicações**: a lista em `site/index.html` está em ordem cronológica
  inversa; cada entrada é um `<li>` com ano, autores, título com DOI e revista.
  A fonte de verdade continua sendo o [ORCID](https://orcid.org/0000-0003-1718-3838)
  e o [Lattes](http://lattes.cnpq.br/0799234795742587) — a página é um recorte.
- **Programas e disciplinas**: os links apontam para os sites públicos, não para
  os repositórios (ODEROM, TESSERA e ÁLETRA são repositórios privados com site
  público).
