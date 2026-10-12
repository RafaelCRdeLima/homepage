/*
 * Conta esta visita em /api/visitas — ver `functions/api/visitas.js`.
 *
 * Sem cookie e sem identificador. O navegador guarda só a data da última
 * visita (`rcrl-visita`), e o servidor recebe só duas perguntas respondidas:
 * é a primeira vez deste navegador? é a primeira vez dele hoje? O dia é o de
 * Brasília, o mesmo que o servidor usa para somar.
 *
 * Quem não quer ser contado (o dono do site, por exemplo) marca isso em
 * /visitas.html, e a escolha fica em `rcrl-nao-contar`.
 */
(function () {
  try {
    if (localStorage.getItem('rcrl-nao-contar') === '1') return;
  } catch (e) { /* armazenamento bloqueado: conta assim mesmo */ }

  var partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  var v = function (tipo) {
    for (var i = 0; i < partes.length; i++) if (partes[i].type === tipo) return partes[i].value;
  };
  var hoje = v('year') + '-' + v('month') + '-' + v('day');

  var ultima = null;
  try {
    ultima = localStorage.getItem('rcrl-visita');
    localStorage.setItem('rcrl-visita', hoje);
  } catch (e) { /* idem */ }

  var corpo = JSON.stringify({
    p: location.pathname,
    n: ultima ? 0 : 1,
    h: ultima === hoje ? 0 : 1
  });

  // Texto puro, e não Blob JSON: o sendBeacon do Chrome recusa tipos fora da
  // lista "simples". O servidor lê o texto e faz o parse.
  if (!(navigator.sendBeacon && navigator.sendBeacon('/api/visitas', corpo))) {
    fetch('/api/visitas', { method: 'POST', body: corpo, keepalive: true }).catch(function () {});
  }
})();
