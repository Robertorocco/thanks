// Classifica dei tempi. Per ora i tempi restano salvati solo su questo dispositivo:
// la versione condivisa tra tutti i partecipanti si collega qui, con la stessa interfaccia.

const CHIAVE = 'gioco-laurea:classifica';

function leggiLocale() {
  try {
    const dati = JSON.parse(localStorage.getItem(CHIAVE) || '[]');
    return Array.isArray(dati) ? dati : [];
  } catch {
    return [];
  }
}

export async function inviaTempo(nome, tempo) {
  const voci = leggiLocale();
  voci.push({ nome, tempo, data: new Date().toISOString() });
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(voci));
  } catch {
    // Archiviazione non disponibile (navigazione privata): il tempo resta solo a schermo.
  }
}

export async function leggiClassifica(limite = 10) {
  return leggiLocale()
    .sort((a, b) => a.tempo - b.tempo)
    .slice(0, limite);
}

export function formattaTempo(secondi) {
  const s = Math.max(0, secondi);
  const minuti = Math.floor(s / 60);
  const resto = s - minuti * 60;
  return `${minuti}:${resto.toFixed(1).padStart(4, '0')}`;
}
