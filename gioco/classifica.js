// Classifica dei tempi. Con Supabase configurato in config.js è condivisa tra tutti
// i partecipanti; altrimenti, o se la rete non risponde, resta su questo dispositivo.

import { SUPABASE_URL, SUPABASE_CHIAVE } from './config.js';

const CHIAVE = 'gioco-laurea:classifica';
const condivisa = Boolean(SUPABASE_URL && SUPABASE_CHIAVE);

function intestazioni() {
  const h = { apikey: SUPABASE_CHIAVE, 'Content-Type': 'application/json' };
  // Le chiavi "anon" storiche sono JWT e vanno anche in Authorization; le nuove "publishable" no.
  if (!SUPABASE_CHIAVE.startsWith('sb_')) h.Authorization = `Bearer ${SUPABASE_CHIAVE}`;
  return h;
}

// Le registrazioni col nome "0" (prove) non contano.
const valida = v => !/^\s*0*\s*$/.test(String(v.nome ?? ''));

function leggiLocale() {
  try {
    const dati = JSON.parse(localStorage.getItem(CHIAVE) || '[]');
    return Array.isArray(dati) ? dati : [];
  } catch {
    return [];
  }
}

function salvaLocale(nome, tempo) {
  const voci = leggiLocale();
  voci.push({ nome, tempo, data: new Date().toISOString() });
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(voci));
  } catch {
    // Archiviazione non disponibile (navigazione privata): il tempo resta solo a schermo.
  }
}

function miglioriLocali(limite) {
  const migliori = new Map();
  for (const v of leggiLocale().filter(valida)) {
    const k = v.nome.toLowerCase();
    if (!migliori.has(k) || v.tempo < migliori.get(k).tempo) migliori.set(k, v);
  }
  return [...migliori.values()].sort((a, b) => a.tempo - b.tempo).slice(0, limite);
}

// Restituisce true se il tempo è finito nella classifica condivisa.
export async function inviaTempo(nome, tempo) {
  salvaLocale(nome, tempo);
  if (!condivisa) return false;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/tempi`, {
      method: 'POST',
      headers: { ...intestazioni(), Prefer: 'return=minimal' },
      body: JSON.stringify({ nome, tempo }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

// Migliori tempi, uno per nome. `condivisa` dice da dove arrivano.
export async function leggiClassifica(limite = 10) {
  if (condivisa) {
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/classifica?select=nome,tempo&nome=neq.0&order=tempo.asc&limit=${limite + 20}`,
        { headers: intestazioni() },
      );
      if (r.ok) return { voci: (await r.json()).filter(valida).slice(0, limite), condivisa: true };
    } catch {
      // Rete assente: si mostra la classifica locale.
    }
  }
  return { voci: miglioriLocali(limite), condivisa: false };
}

export function formattaTempo(secondi) {
  const s = Math.max(0, secondi);
  const minuti = Math.floor(s / 60);
  const resto = s - minuti * 60;
  return `${minuti}:${resto.toFixed(1).padStart(4, '0')}`;
}
