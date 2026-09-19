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

Sete páginas de HTML puro. Não há build, não há dependência e não há
`node_modules`.

```text
site/index.html      capa — pulsar, pílulas, a frase, o cartão, os destinos
site/pesquisa.html   01 · as frentes de pesquisa
site/codes.html      02 · ODEROM, TESSERA, ÁLETRA, PATHS, SUCURI
site/producao.html   03 · publicações com DOI
site/material.html   04 · disciplinas e material didático
site/laboratorio.html 05 · luz em torno de um buraco negro
site/estrela.html     06 · estrela de nêutrons girando, com hot spot
site/styles.css      a apresentação inteira
site/rafael-atlas.*  o retrato do cartão, em WebP (78 KB) e JPEG (121 KB)
site/favicon.svg     ícone
```

Para ver localmente:

```bash
python3 -m http.server -d site 8000
```

**A navegação é byte-a-byte idêntica nas sete páginas.** Quem acende o item
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

No centro da capa gira um pulsar — SVG desenhado à mão, sem imagem e sem
biblioteca — e as pílulas ficam em volta, posicionadas em porcentagem do
palco. O eixo de rotação aponta para quem olha e o magnético faz ângulo com
ele: por isso os dois feixes varrem o céu em círculo e aparecem sempre do
mesmo tamanho, e por isso basta girar o grupo magnético e deixar a esfera
quieta. São dois grupos `.pulsar-gira`, um atrás da esfera e outro na frente,
em fase porque a animação é a mesma e começa junto. O SVG ocupa exatamente a
caixa que era do retrato: as pílulas de fora encostam nela, e crescer ali é
atropelar a `.p3`.

As sete pílulas são links, e só isso: quatro para as seções do site, duas
para os laboratórios e uma para o e-mail. Cada uma das quatro leva o mesmo
ícone do cartão de destino lá embaixo — mesmo lugar, mesmo desenho — e a
ordem delas no HTML segue a da navegação, porque abaixo de 46rem elas
embrulham numa faixa e essa ordem vira a que se lê.

Até setembro de 2026 quatro delas eram conceitos (objetos compactos, matéria
densa, magnetares, neutrinos) que abriam um balão de explicação ao passar o
mouse. O balão saiu com elas, e com ele umas cinquenta linhas de CSS. Os
quatro temas têm seção própria em `pesquisa.html`, que é onde cabe explicá-los
com espaço; a capa passou a apontar caminhos em vez de ensinar.

O retrato mudou para o cartão logo abaixo da frase, ao lado dos dados que ele
identifica — nome, cargo, universidade, unidade e e-mail. O parágrafo que
ficava sob a frase veio junto, porque dizia cargo e instituição e ficaria
repetido a dois palmos de distância.

A flutuação para no hover: texto que se mexe não se lê. Abaixo de 46rem as
pílulas saem do posicionamento absoluto e embrulham numa faixa; o pulsar leva
`order: -1` para continuar vindo antes delas, já que no HTML as pílulas é que
vêm primeiro. O cartão vira coluna na mesma largura.

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
  A armadilha mudou de endereço junto com o retrato: hoje é `.cartao-retrato`
  que precisa dela.
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
- **Programas**: os cinco são repositórios privados com site público, então
  nenhum tem link de repositório — só o link do app.
- **Disciplinas**: essas sim são públicas no GitHub, e a Relatividade Geral e a
  Astronomia levam link para o repositório além do link da página.

## O laboratório

`/laboratorio.html` traça geodésicas nulas de Schwarzschild pela equação de
órbita exata `u″ + u = 3Mu²`, em Runge–Kutta de 4ª ordem, com
`d²x/dλ² = −3M h² x/r⁵` e `h` conservado (Binet para força central ∝ 1/r⁴).
Conferido contra três resultados independentes: o desvio bate com
`4M/b + (15π/4)(M/b)²` a 0,03% em b = 200M; o limiar de captura cai entre
b = 5,1961M e 5,2000M, cercando `3√3 M = 5,196152M`; e o ponto de maior
aproximação bate com a raiz de `1/b² = (1−2M/r)/r²` em quatro casas.

Três coisas foram corrigidas em relação ao rascunho em `Codes/BH Demo`:

1. **A curvatura da grade virou geometria de verdade.** O rascunho encurvava
   a grade com um remapeamento radial inventado (`warp`), que desenhava o
   horizonte 32% menor que 2M e cisalhava as formas em até 50%. No lugar
   dele entrou o **paraboloide de Flamm**, `z(r) = 2√(2M(r−2M))` — o mergulho
   isométrico da fatia equatorial —, visto de 62° de elevação. A grade
   afunila porque a superfície afunila. O interruptor *relevo do espaço*
   desliga e devolve o plano `(r, φ)`, de linhas retas.
2. **Ultravioleta não é magenta.** A aproximação usual de espectro pinta tudo
   abaixo de 380 nm com `R=1, B=1`. Como a luz AZULA ao cair no poço, o efeito
   correto saía avermelhado na tela — invertendo a leitura. Agora as duas
   pontas do espectro somem por decaimento, como luz invisível deve sumir.
3. **Exagero começa em 1,0×**, o valor real, e não em 2×.

O `g` de emissão passou a ser o de cada fio, não o do centro do feixe: com
feixe largo, os fios partem de potenciais diferentes.

## O laboratório da estrela de nêutrons

`/estrela.html` traça o desvio da luz de um *hot spot* na superfície pela
integral exata

```
ψ(b) = ∫₀^{1/R} du / √(1/b² − u² + 2M u³),   b = R sen α / √(1 − 2M/R)
```

**não** pela aproximação de Beloborodov 2002 (`cos α = u + (1−u)cos ψ`), que
bate com a integral a 0,002 em `u = 0,20` e 0,008 em `u = 0,33`, mas erra por
0,26 em `u = 0,63` — e é justamente no regime compacto que a segunda imagem
aparece.

Conferências: a integral reproduz `arcsin(b/R)` no limite `M → 0` a quatro
casas; ψ_max bate com a literatura (104° em `u = 0,2`, 152° em `u = 0,5`).

Três coisas que exigiram cuidado:

1. **Abaixo de `R = 3M` a estrela fica dentro da própria esfera de fótons.**
   Ali só escapa luz com `b < 3√3 M`, ψ diverge e há infinitas imagens — a
   integral deixa de valer. Sem a barreira, o código devolvia ψ = 10⁷ graus.
2. **O cáustico em ψ = 180°.** Fonte pontual passando exatamente por trás tem
   ampliação infinita: é física de verdade, e o que a regulariza é o spot ter
   área. Integra-se em ψ com a largura em azimute da calota — o `sen ψ` do
   peso cancela o `1/sen ψ` da divergência.
3. **A quadratura quebra nos joelhos** `ψ = ψ_max` e `ψ = 2π − ψ_max`, onde
   uma imagem nasce ou morre. Simpson atravessando um joelho erra de um jeito
   que varia com a fase, e era isso que serrilhava a curva de luz.
4. **A imagem do spot é desenhada pixel a pixel, pelo caminho inverso** —
   o método do PULSARIS. Para cada pixel do disco, `q = b/b_max` dá o ângulo
   varrido ψ(q) pela tabela, e `n = sin ψ·t̂ + cos ψ·ô` diz de que ponto da
   superfície ele veio; o pixel testa sozinho se está dentro do spot. Com
   ψ > π o `sin ψ` fica negativo e a segunda imagem cai do outro lado sem
   caso especial. Duas tentativas pelo caminho direto (região → pixels)
   morreram no cáustico: preencher a borda do spot pintava o disco inteiro
   quando ele engolia o antípoda, e faixas de ψ deixavam gravatas-borboleta
   onde a borda tangencia o antípoda — ali `χ_max` salta de 90° a 180° numa
   descontinuidade real, e nenhuma faixa atravessa isso sem erro.
5. **Brilho uniforme por pixel.** Intensidade específica se conserva ao
   longo do raio (Liouville) a menos de `g⁴`, constante numa estrela
   estática. O fluxo sobe no cáustico porque a imagem cobre mais pixels,
   não porque os pixels brilham mais. O `cos α` e o jacobiano moram na
   integral do fluxo sobre a fonte, não no desenho.

Os dois caminhos foram validados um contra o outro: a razão entre a área da
imagem (inverso, contando pixels numa grade de 700²) e o fluxo da integral
(direto) é constante em 0,162 ao longo de toda a fase, nos dois presets,
atravessando o cáustico, para a primária e para a secundária — dispersão de
1,4–2,7%, que é discretização de pixel num anel fino.

Presets: *Recomeçar* dá 1,4 M☉ e 12 km (`R = 5,80M`, realista, sem segunda
imagem); *estrela compacta* dá 2,1 M☉ e 10,2 km (`R = 3,29M`, com segunda
imagem em ~19% da volta).
