
/* =====================================================================
   Nube: los datos viven en Supabase (tabla docs, protegida por usuario).
   La app trabaja siempre contra una copia local: funciona sin cobertura
   y los cambios se envían cuando vuelve la conexión (cola «outbox»).
   Imita la parte de la API que usaba la versión de Claude:
   collection(col).limit(n).onSnapshot(cb) · collection(col).doc(id).set/get/delete
   ===================================================================== */
const Nube = {
  sb: null, user: null, cache: {}, outbox: [], subs: {}, flushing: false,
  load() { try { this.cache = JSON.parse(localStorage.getItem('reserva.cache') || '{}'); this.outbox = JSON.parse(localStorage.getItem('reserva.outbox') || '[]'); } catch (e) { this.cache = {}; this.outbox = []; } },
  persist() { try { localStorage.setItem('reserva.cache', JSON.stringify(this.cache)); localStorage.setItem('reserva.outbox', JSON.stringify(this.outbox)); } catch (e) {} },
  async init() {
    const C = window.RESERVA_CFG || {};
    if (!window.supabase || !C.url || !C.anon) return null;
    this.sb = window.supabase.createClient(C.url, C.anon, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'reserva.auth' } });
    this.load();
    try { const { data } = await this.sb.auth.getSession(); this.user = data.session?.user || null; } catch (e) { this.user = null; }
    this.sb.auth.onAuthStateChange((_ev, ses) => { this.user = ses?.user || null; });
    return this.user;
  },
  emit(col) { const docs = Object.entries(this.cache[col] || {}).map(([id, d]) => ({ id, exists: true, data: () => d })); for (const cb of this.subs[col] || []) { try { cb({ docs, size: docs.length, empty: !docs.length }); } catch (e) { console.error(e); } } },
  collection(col) {
    const self = this;
    return { limit() { return this; }, onSnapshot(cb) { (self.subs[col] = self.subs[col] || []).push(cb); self.emit(col); return () => {}; }, doc(id) { return self.doc(col + '/' + id); } };
  },
  doc(path) {
    const [col, id] = path.split('/'); const self = this;
    const quitar = () => { self.outbox = self.outbox.filter((o) => !(o.col === col && o.id === id)); };
    return {
      async get() { const d = self.cache[col]?.[id]; return { exists: !!d, data: () => d }; },
      async set(data) { (self.cache[col] = self.cache[col] || {})[id] = JSON.parse(JSON.stringify(data)); quitar(); self.outbox.push({ op: 'set', col, id, data }); self.persist(); self.emit(col); self.flush(); },
      async delete() { if (self.cache[col]) delete self.cache[col][id]; quitar(); self.outbox.push({ op: 'del', col, id }); self.persist(); self.emit(col); self.flush(); }
    };
  },
  async flush() {
    if (this.flushing || !this.user || !navigator.onLine || !this.outbox.length) return;
    this.flushing = true;
    try {
      while (this.outbox.length) {
        const o = this.outbox[0]; let r;
        if (o.op === 'set') r = await this.sb.from('docs').upsert({ user_id: this.user.id, col: o.col, id: o.id, data: o.data, updated_at: new Date().toISOString() });
        else r = await this.sb.from('docs').delete().eq('col', o.col).eq('id', o.id);
        if (r.error) throw r.error;
        this.outbox.shift(); this.persist();
      }
    } catch (e) { console.warn('Sin sincronizar todavía', e); }
    finally { this.flushing = false; window.dispatchEvent(new Event('nube')); }
  },
  async pull() {
    if (!this.user || !navigator.onLine) return false;
    await this.flush(); if (this.outbox.length) return false;
    const filas = []; let desde = 0;
    for (;;) { const { data, error } = await this.sb.from('docs').select('col,id,data').range(desde, desde + 999); if (error) return false; filas.push(...data); if (data.length < 1000) break; desde += 1000; }
    const c = {}; for (const r of filas) (c[r.col] = c[r.col] || {})[r.id] = r.data;
    this.cache = c; this.persist(); for (const col in this.subs) this.emit(col);
    window.dispatchEvent(new Event('nube')); return true;
  },
  async saludPendiente() { // lo que ha enviado el atajo (R-146)
    if (!this.user || !navigator.onLine) return null;
    const { data, error } = await this.sb.from('salud_raw').select('n,payload').order('n').limit(200);
    if (error || !data?.length) return null;
    return { texto: data.map((x) => x.payload).join('\n'), hasta: data[data.length - 1].n };
  },
  async borrarSalud(hasta) { await this.sb.from('salud_raw').delete().lte('n', hasta); },
  async token() {
    const { data } = await this.sb.from('atajo_tokens').select('token').maybeSingle();
    if (data?.token) return data.token;
    const t = Array.from(crypto.getRandomValues(new Uint8Array(24))).map((b) => b.toString(16).padStart(2, '0')).join('');
    const r = await this.sb.from('atajo_tokens').upsert({ user_id: this.user.id, token: t });
    return r.error ? null : t;
  },
  async salir() { try { await this.sb.auth.signOut(); } catch (e) {} localStorage.removeItem('reserva.cache'); localStorage.removeItem('reserva.outbox'); location.reload(); }
};
