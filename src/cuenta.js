
/* ---------- entrar, cuenta, atajo y copia de seguridad (solo versión web) ---------- */
function vLogin() {
  return '<div class="wrap noTab" style="min-height:100%;justify-content:center">' +
    '<div class="stack" style="gap:6px;align-items:flex-start"><span class="brand" style="font-size:34px">' + I.logo('var(--ac)').replace('width="26" height="26"', 'width="44" height="44"') + 'Reserva</span><span class="mu">Tu entrenamiento, tu descanso y tu comida, en un sitio.</span></div>' +
    '<form class="card pad stack" id="fLogin" style="gap:10px"><label class="lbl xs mu" for="em">Correo<input id="em" class="field" type="email" autocomplete="username" required></label>' +
    '<label class="lbl xs mu" for="pw">Contraseña<input id="pw" class="field" type="password" autocomplete="current-password" minlength="8" required></label>' +
    '<button class="btn" type="submit" data-modo="entrar">Entrar</button><button class="btn sec" type="submit" data-modo="crear">Crear mi cuenta</button>' +
    '<span class="xs mu" id="loginMsg">La primera vez, pon tu correo y una contraseña de al menos 8 caracteres y toca «Crear mi cuenta».</span></form></div>';
}
async function enviarLogin(ev) {
  ev.preventDefault();
  const modo = ev.submitter?.dataset.modo || 'entrar';
  const email = $('#em').value.trim(), password = $('#pw').value; const msg = $('#loginMsg');
  msg.textContent = modo === 'crear' ? 'Creando la cuenta…' : 'Entrando…';
  try {
    if (modo === 'crear') {
      const { data, error } = await Nube.sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } });
      if (!error && data?.session) { Nube.user = data.user; location.reload(); return; }
      msg.textContent = error ? 'No se ha podido crear: ' + error.message : 'Hecho. Abre el correo que te ha llegado, toca el enlace para confirmar y vuelve aquí a «Entrar».';
    } else {
      const { data, error } = await Nube.sb.auth.signInWithPassword({ email, password });
      if (error) { msg.textContent = /confirm/i.test(error.message) ? 'Falta confirmar el correo: abre el enlace que te llegó.' : 'Correo o contraseña incorrectos.'; return; }
      Nube.user = data.user; location.reload();
    }
  } catch (e) { msg.textContent = 'Sin conexión. Inténtalo cuando tengas cobertura.'; }
}

function vCuenta() {
  const pend = Nube.outbox.length;
  const tk = S.tokenAtajo;
  const C = window.RESERVA_CFG || {};
  const urlRpc = (C.url || '') + '/rest/v1/rpc/ingest_salud';
  return '<div class="wrap noTab"><div class="top"><button class="back" data-act="volver">' + I.back + 'Hoy</button></div><h1 class="d">Ajustes</h1>' +
    '<section class="card pad stack"><span class="cap">Cuenta</span><span>' + esc(Nube.user?.email || '') + '</span><span class="xs mu">' + (pend ? pend + ' cambios esperando conexión para guardarse.' : 'Todo guardado en tu cuenta.') + '</span><button class="btn sec slim" data-act="salir" style="align-self:flex-start">Cerrar sesión</button></section>' +
    '<section class="card pad stack"><span class="cap">Atajo de Salud</span>' +
    (tk ? '<span class="sm" style="color:var(--tx2)">En tu atajo <b>Reserva.Salud</b>, añade al final la acción <b>«Obtener contenido de URL»</b> con estos datos:</span>' +
      '<div class="stack" style="gap:6px"><span class="xs mu">URL</span><code class="cbox">' + esc(urlRpc) + '</code><button class="btn sec slim" data-act="copiar" data-txt="' + esc(urlRpc) + '">Copiar URL</button>' +
      '<span class="xs mu">Cabeceras: <b>apikey</b></span><code class="cbox">' + esc(C.anon || '') + '</code><button class="btn sec slim" data-act="copiar" data-txt="' + esc(C.anon || '') + '">Copiar apikey</button>' +
      '<span class="xs mu">Cuerpo (JSON): <b>p_token</b> = este texto, <b>p_payload</b> = Texto combinado</span><code class="cbox">' + esc(tk) + '</code><button class="btn sec slim" data-act="copiar" data-txt="' + esc(tk) + '">Copiar clave del atajo</button></div>' +
      '<span class="xs mu">La clave solo sirve para enviar datos de Salud a tu cuenta; no deja leer nada. No la compartas.</span>'
      : '<button class="btn slim" data-act="crearToken" style="align-self:flex-start">Preparar el atajo</button>') + '</section>' +
    '<section class="card pad stack"><span class="cap">Copia de seguridad</span><span class="sm" style="color:var(--tx2)">Importa la copia de la versión anterior o guarda una copia de todo.</span>' +
    '<label class="btn sec slim" for="fileCopia" style="align-self:flex-start;cursor:pointer">Importar copia (.json)</label><input id="fileCopia" type="file" accept=".json,application/json" hidden>' +
    '<button class="btn sec slim" data-act="exportar" style="align-self:flex-start">Descargar copia</button></section>' +
    '<p class="mu xs" style="margin:0">Reserva · tus datos se guardan en tu propia base de datos de Supabase y solo puedes verlos tú.</p></div>';
}
async function importarCopia(file) {
  let o; try { o = JSON.parse(await file.text()); } catch (e) { aviso('Ese archivo no es una copia de Reserva.'); return; }
  if (!o || !Array.isArray(o.docs)) { aviso('Ese archivo no es una copia de Reserva.'); return; }
  for (const d of o.docs) { if (d.col === 'estado') continue; await Nube.doc(d.col + '/' + d.id).set(d.data); }
  await Nube.flush(); aviso('Importados ' + o.docs.length + ' documentos'); render();
}
function exportarCopia() {
  const docs = []; for (const col in Nube.cache) for (const id in Nube.cache[col]) docs.push({ col, id, data: Nube.cache[col][id] });
  const blob = new Blob([JSON.stringify({ app: 'Reserva', version: 1, exportado: ymd(hoy()), docs })], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'reserva_copia_' + ymd(hoy()) + '.json'; document.body.appendChild(a); a.click(); a.remove();
}
async function sincronizarSalud() { // lo que envió el atajo entra solo (R-146)
  try { const p = await Nube.saludPendiente(); if (!p) return; const n = Object.keys(parseSalud(p.texto)).length; await importarSaludTexto(p.texto, !n); await Nube.borrarSalud(p.hasta); } catch (e) { console.warn(e); }
}
