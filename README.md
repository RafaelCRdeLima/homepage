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

Cinco páginas de HTML puro. Não há build, não há dependência e não há
`node_modules`.

```text
site/index.html      capa — retrato, pílulas, a frase, os quatro destinos
site/pesquisa.html   01 · as frentes de pesquisa
site/codes.html      02 · ODEROM, TESSERA, ÁLETRA, PATHS
site/producao.html   03 · publicações com DOI
site/material.html   04 · disciplinas e material didático
site/styles.css      a apresentação inteira
site/rafael-cern.*   o retrato, em WebP (52 KB) e JPEG (98 KB)
site/favicon.svg     ícone
```

Para ver localmente:

```bash
python3 -m http.server -d site 8000
```

**A navegação é byte-a-byte idêntica nas cinco páginas.** Quem acende o item
da página atual é o JS, comparando `location.pathname` com o `href` de cada
link — não há classe `ativo` escrita à mão em arquivo nenhum. Ao mexer na
navegação, troque o bloco `<nav class="nav">` nos cinco arquivos e confira com:

```bash
grep -c 'class="nav"' site/*.html      # 1 em cada
md5sum <(grep -A5 '<nav class="nav"' site/*.html)
```

## Desenho

Escuro por decisão, não por `prefers-color-scheme`: a paleta inteira supõe
fundo escuro e não existe um modo claro para cair. Fundo `#0A0B12`, violeta
`#9E8CFF` como acento e turquesa `#56E1D0` como segundo.

O topo de cada página é o mesmo componente `.panel` — faixa de gradiente
índigo com o canto de baixo arredondado. Na capa ele é alto e guarda o palco
do retrato; nas outras é a versão `.panel-slim`, só com navegação e título.

Na capa o retrato fica centrado e as pílulas em volta, posicionadas em
porcentagem do palco. Quatro delas abrem uma explicação curta ao passar o
mouse; a quinta, "Fale comigo", é a única clicável e não tem balão — não há
o que explicar num convite. Nada mais reage a clique.

O balão só existe sob `@media (hover: hover) and (pointer: fine)`. Em tela de
toque `:hover` gruda no toque, e o balão viraria exatamente a reação a clique
que não se quer; fora do mouse ele nem entra no layout. Ele é
`pointer-events: none` para nunca roubar o mouse da pílula que o abriu, e é
ancorado pelo lado de dentro do palco (`left: 0` à esquerda, `right: 0` à
direita) porque centralizado ele sairia da tela nas bordas. As pílulas de
baixo levam `.up` e abrem para cima. A flutuação para no hover: texto que se
mexe não se lê. Abaixo de 46rem elas saem do posicionamento absoluto e
embrulham numa faixa; o retrato leva `order: -1` para continuar vindo antes
delas, já que no HTML as pílulas é que vêm primeiro.

Três tipografias, cada uma no seu papel:

| família | papel |
|---|---|
| Instrument Serif | a frase da capa, títulos de página, e-mail do rodapé |
| Literata | texto corrido — serifa desenhada para tela |
| Inter Tight | navegação, rótulos, autores, metadados |

Duas armadilhas que já custaram tempo, para não voltarem:

- O `<img>` do retrato tem `width`/`height` para reservar espaço e evitar
  salto no carregamento. Esses atributos viram altura fixa e atropelam o
  `aspect-ratio`, deixando o círculo oval — por isso o CSS traz `height: auto`.
- A `.nav` precisa de `min-width: 0`. Item flex não encolhe abaixo do próprio
  conteúdo, e sem isso ela estica a barra e a página inteira em tela estreita.

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
- **Programas**: os quatro são repositórios privados com site público, então
  nenhum tem link de repositório — só o link do app.
- **Disciplinas**: essas sim são públicas no GitHub, e a Relatividade Geral e a
  Astronomia levam link para o repositório além do link da página.
