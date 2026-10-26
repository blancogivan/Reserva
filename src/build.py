"""Construye la versión web (GitHub Pages + Supabase) a partir de la de Claude."""
import re, json, base64, sys, os
src = open('reserva.html').read()
s = src
def rep(x, y, c=1):
    global s
    assert s.count(x) == c, (s.count(x), x[:90]); s = s.replace(x, y)
# fuera las cabeceras que puse para Claude (van en el <head> real)
s = re.sub(r'^<title>.*?</title>\n<meta name="claude:viewport-fit-sides"[^\n]*\n<meta name="apple-mobile-web-app-capable"[^\n]*\n<meta name="apple-mobile-web-app-title"[^\n]*\n<link rel="preconnect"[^\n]*\n<link rel="stylesheet"[^\n]*\n', '', s, flags=re.S)
rep("html, body { height: 100%; }", "html, body { height: 100%; }\nbody { padding-top: env(safe-area-inset-top, 0px); }\n.cbox { display: block; padding: 8px 10px; border-radius: 10px; background: rgba(255,255,255,.06); font-size: 11px; word-break: break-all; font-family: ui-monospace, Menlo, monospace; color: var(--tx2); }")
rep("""function modoAviso() {
  if (S.mode === 'local') return '<div class="note warn sm">No hay conexión con tu cuenta de Claude, así que lo que apuntes se guarda solo en este móvil. Ábrela desde el enlace de Claude para que se guarde en tu cuenta.</div>';
  return '';
}""", """function modoAviso() {
  const p = Nube.outbox.length;
  if (!navigator.onLine) return '<div class="note warn sm">Sin cobertura. Puedes seguir apuntando: ' + (p ? p + ' cambios se guardarán' : 'se guardará todo') + ' en tu cuenta cuando vuelva la conexión.</div>';
  if (p) return '<div class="note sm">Guardando ' + p + ' cambios en tu cuenta…</div>';
  return '';
}""")
rep("""'<div class="top"><span class="brand">' + I.logo('var(--ac)') + 'Reserva</span><span class="mu sm">' + DIAS""", """'<div class="top"><span class="brand">' + I.logo('var(--ac)') + 'Reserva</span><span class="row" style="gap:6px"><span class="mu sm">' + DIAS""")
# rueda de ajustes en Hoy (cierra el span de la fecha y añade el botón)
rep("""d.getDate() + ' de ' + MESES[d.getMonth()] + '</span></div>' +""", """d.getDate() + ' de ' + MESES[d.getMonth()] + '</span><button class="icon" style="width:36px;height:36px;border-radius:18px" data-act="ir" data-v="cuenta" aria-label="Ajustes"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg></button></span></div>' +""")
rep("""(d ? 'Actualizado ' + (ymd(d) === ymd(hoy()) ? 'hoy' : fCorta(d)) + ' a las ' + hm(d) : 'Aún no has cargado tu archivo de Salud') + '</span>' +""",
    """(d ? 'Datos de Salud ' + (ymd(d) === ymd(hoy()) ? 'de hoy' : 'del ' + fCorta(d)) + ', ' + hm(d) + ' · llegan solos con tu atajo' : 'Prepara tu atajo en Ajustes para que lleguen solos') + '</span>' +""")
rep("""'<label class="btn slim" for="fileSalud" style="cursor:pointer;white-space:nowrap">' + I.plus + 'Actualizar</label>""", """'<label class="btn sec slim" for="fileSalud" style="cursor:pointer;white-space:nowrap">Archivo</label>""")
rep("  else if (v === 'descanso') h = vDescanso();", "  else if (v === 'cuenta') h = vCuenta();\n  else if (v === 'descanso') h = vDescanso();")
rep("  if (S.mode === 'cargando') h =", "  if (S.mode === 'login') h = vLogin();\n  else if (S.mode === 'cargando') h =")
rep("    case 'tab': ir(v, { tab: true }); break;", """    case 'tab': ir(v, { tab: true }); break;
    case 'salir': await Nube.salir(); break;
    case 'crearToken': S.tokenAtajo = await Nube.token(); if (!S.tokenAtajo) aviso('No se ha podido crear la clave. Revisa la conexión.'); render(); break;
    case 'copiar': try { await navigator.clipboard.writeText(b.dataset.txt); aviso('Copiado'); } catch (e) { aviso('No se ha podido copiar: mantén pulsado el texto para copiarlo'); } break;
    case 'exportar': exportarCopia(); break;""")
rep("document.addEventListener('change', (ev) => {\n  const t = ev.target; const a = S.activa;", "document.addEventListener('submit', (ev) => { if (ev.target.id === 'fLogin') enviarLogin(ev); });\ndocument.addEventListener('change', (ev) => {\n  const t = ev.target; const a = S.activa;\n  if (t.id === 'fileCopia' && t.files && t.files[0]) { importarCopia(t.files[0]); t.value = ''; }")
rep("""  let db = null;
  try { db = window.claude?.use ? await window.claude.use('db') : null; } catch (e) { db = null; }
  if (db) {
    S.db = db; S.mode = 'nube';""", """  let db = null;
  const user = await Nube.init();
  if (!Nube.sb) { $('#app').innerHTML = '<div class="wrap"><div class="empty">Falta configurar la conexión (config.js).</div></div>'; return; }
  if (!user) { S.mode = 'login'; render(); return; }
  db = Nube;
  if (db) {
    S.db = db; S.mode = 'nube';""")
rep("""      }, () => { aviso('Se ha perdido la conexión con tus datos. Recarga la página.'); });
    }""", """      });
    }
    if (!Object.keys(Nube.cache).length) aviso('Cargando tus datos…');
    Nube.pull().then(() => sincronizarSalud()).then(() => Nube.token().then((t) => { S.tokenAtajo = t; }));
    const refrescar = () => { if (document.visibilityState === 'visible') Nube.pull().then(() => sincronizarSalud()); };
    document.addEventListener('visibilitychange', refrescar); window.addEventListener('online', refrescar);
    window.addEventListener('nube', () => { const tag = document.activeElement?.tagName; if (tag !== 'INPUT' && tag !== 'SELECT') render(); });""")
rep("arrancar();\n</script>", open('nube.js').read() + open('cuenta.js').read() + "\narrancar();\nif ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});\n</script>")
head = """<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Reserva</title>
<meta name="description" content="Tu entrenamiento, tu descanso y tu comida, en un sitio.">
<meta name="theme-color" content="#0B0E13">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Reserva">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="192x192" href="icon-192.png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..800&display=swap">
<style>:root{color-scheme:light}body{margin:0;font:14px system-ui,-apple-system,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"></script>
<script src="config.js"></script>
</head>
<body>
"""
open('../index.html', 'w').write(head + s + "\n</body>\n</html>\n")
print('index.html', len(head + s))
