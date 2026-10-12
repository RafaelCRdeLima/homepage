"""Gera `site/mundo.svg`, o mapa-múndi da página de visitas.

Os contornos vêm do Natural Earth 1:110m (domínio público), no TopoJSON do
pacote `world-atlas` (licença ISC, Mike Bostock). O arquivo não é baixado por
este script — baixe à parte e passe o caminho:

    curl -sSfLO https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json
    python3 -I tools/mundo.py land-110m.json > site/mundo.svg

A projeção é a Equal Earth (Šavrič, Patterson & Jenny 2018): áreas
verdadeiras, então um país não parece ter mais visitantes só porque fica
perto do polo. Abaixo de 60° S só há a Antártida, e o recorte para ali.

Os pontos das cidades são desenhados pela página, com a MESMA conta. Por isso
o script escreve em stderr as constantes que `visitas.html` precisa copiar —
mudou a largura, o recorte ou a margem aqui, mude lá também.
"""

import json
import math
import sys

LARGURA = 1000.0
MARGEM = 6.0
SUL = -60.0  # recorte: abaixo disto só há a Antártida
PASSO = 0.7  # pontos mais próximos que isto (em unidades do SVG) são descartados
AREA_MIN = 0.6  # ilhas menores que isto não aparecem nem como um pixel

A1, A2, A3, A4 = 1.340264, -0.081106, 0.000893, 0.003796
M = math.sqrt(3) / 2


def equal_earth(lon, lat):
    l, p = math.radians(lon), math.radians(lat)
    th = math.asin(M * math.sin(p))
    t2 = th * th
    t6 = t2 * t2 * t2
    x = l * math.cos(th) / (M * (A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2)))
    y = th * (A1 + A2 * t2 + t6 * (A3 + A4 * t2))
    return x, y


X_MAX = equal_earth(180, 0)[0]
Y_MAX = equal_earth(0, 90)[1]
Y_MIN = equal_earth(0, SUL)[1]
ESCALA = (LARGURA - 2 * MARGEM) / (2 * X_MAX)
ALTURA = round((Y_MAX - Y_MIN) * ESCALA + 2 * MARGEM, 1)


def svg(lon, lat):
    x, y = equal_earth(lon, max(lat, SUL))
    return MARGEM + (x + X_MAX) * ESCALA, MARGEM + (Y_MAX - y) * ESCALA


def num(v):
    s = f"{v:.1f}".rstrip("0").rstrip(".")
    if s.startswith("0."):
        s = s[1:]
    elif s.startswith("-0."):
        s = "-" + s[2:]
    return s or "0"


def caminho(aneis):
    """Anéis fechados em `d` de SVG: M absoluto, o resto relativo."""
    partes = []
    for anel in aneis:
        x0, y0 = anel[0]
        partes.append(f"M{num(x0)} {num(y0)}")
        px, py = round(x0, 1), round(y0, 1)
        trechos = []
        for x, y in anel[1:]:
            x, y = round(x, 1), round(y, 1)
            trechos.append(f"{num(x - px)} {num(y - py)}")
            px, py = x, y
        partes.append("l" + " ".join(trechos).replace(" -", "-") + "z")
    return "".join(partes)


def corta_antimeridiano(lonlat):
    """Um anel que atravessa ±180° vira dois, um de cada lado.

    Fiji e a ponta de Chukotka cruzam o antimeridiano. Projetados como estão,
    ligam um ponto em +179° a outro em −179° com uma reta que atravessa o
    mapa inteiro. Desenrolando a longitude o anel fica contínuo (179°, 181°),
    e aí basta recortá-lo contra a reta de 180° duas vezes: uma do jeito que
    está, e outra deslocado de 360°.
    """
    contínuo = [lonlat[0]]
    for lon, lat in lonlat[1:]:
        anterior = contínuo[-1][0]
        while lon - anterior > 180:
            lon -= 360
        while lon - anterior < -180:
            lon += 360
        contínuo.append((lon, lat))
    if all(-180 <= lon <= 180 for lon, _ in contínuo):
        return [lonlat]

    def recorta(anel, dentro, borda):
        # Sutherland–Hodgman contra uma única reta vertical, lon = borda.
        saida = []
        for a, b in zip(anel, anel[1:] + anel[:1]):
            if dentro(b):
                if not dentro(a):
                    saida.append(cruza(a, b, borda))
                saida.append(b)
            elif dentro(a):
                saida.append(cruza(a, b, borda))
        return saida

    def cruza(a, b, borda):
        t = (borda - a[0]) / (b[0] - a[0])
        return (borda, a[1] + t * (b[1] - a[1]))

    if max(lon for lon, _ in contínuo) > 180:
        leste = recorta(contínuo, lambda p: p[0] <= 180, 180)
        oeste = recorta([(lon - 360, lat) for lon, lat in contínuo], lambda p: p[0] >= -180, -180)
    else:
        oeste = recorta(contínuo, lambda p: p[0] >= -180, -180)
        leste = recorta([(lon + 360, lat) for lon, lat in contínuo], lambda p: p[0] <= 180, 180)
    return [p for p in (leste, oeste) if len(p) >= 3]


def area(anel):
    return abs(sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(anel, anel[1:] + anel[:1]))) / 2


def main(arquivo):
    with open(arquivo, encoding="utf-8") as f:
        topo = json.load(f)

    sx, sy = topo["transform"]["scale"]
    tx, ty = topo["transform"]["translate"]
    arcos = []
    for arco in topo["arcs"]:
        x = y = 0
        pts = []
        for dx, dy in arco:
            x += dx
            y += dy
            pts.append((x * sx + tx, y * sy + ty))
        arcos.append(pts)

    def anel(indices):
        pts = []
        for i in indices:
            trecho = arcos[i] if i >= 0 else arcos[~i][::-1]
            pts.extend(trecho if not pts else trecho[1:])
        return pts

    aneis = []
    for geo in topo["objects"]["land"]["geometries"]:
        poligonos = geo["arcs"] if geo["type"] == "MultiPolygon" else [geo["arcs"]]
        for poligono in poligonos:
            for indices in poligono:
                lonlat = anel(indices)
                if max(lat for _, lat in lonlat) < SUL + 5:
                    continue  # a Antártida e o que mais estiver lá embaixo
                for pedaco in corta_antimeridiano(lonlat):
                    pts = [svg(lon, lat) for lon, lat in pedaco]
                    enxuto = [pts[0]]
                    for p in pts[1:]:
                        if math.dist(p, enxuto[-1]) >= PASSO:
                            enxuto.append(p)
                    if len(enxuto) >= 3 and area(enxuto) >= AREA_MIN:
                        aneis.append(enxuto)

    # O contorno do globo: as duas bordas em ±180° e as retas dos polos.
    borda = [svg(-180, lat) for lat in range(90, int(SUL) - 1, -2)]
    borda += [svg(180, lat) for lat in range(int(SUL), 91, 2)]

    print(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {num(LARGURA)} {num(ALTURA)}">'
        f'<path fill="#0c0e17" d="{caminho([borda])}"/>'
        f'<path fill="#272e44" d="{caminho(aneis)}"/>'
        "</svg>"
    )
    print(
        f"LARGURA={num(LARGURA)} ALTURA={num(ALTURA)} MARGEM={MARGEM} "
        f"ESCALA={ESCALA:.6f} X_MAX={X_MAX:.6f} Y_MAX={Y_MAX:.6f} "
        f"aneis={len(aneis)}",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main(sys.argv[1])
