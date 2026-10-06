// Collegamento alla classifica condivisa su Supabase.
// Da Supabase: Project Settings > API (o "Connect"): copia "Project URL" e la chiave
// pubblica ("publishable" oppure "anon public"). La chiave pubblica può stare nel codice:
// le regole in supabase/classifica.sql permettono solo di aggiungere e leggere i tempi.
// Se i due valori restano vuoti, la classifica viene salvata solo sul dispositivo.

export const SUPABASE_URL = 'https://kdvmegwsvwhhcsyismbv.supabase.co';
export const SUPABASE_CHIAVE = 'sb_publishable_znQAc0ejAxZGSoYzn1vxNA_dcyGdUfF';
