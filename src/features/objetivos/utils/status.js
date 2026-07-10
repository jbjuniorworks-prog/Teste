const DIAS_PARA_CONSIDERAR_PARADO = 30;
const PROGRESSO_MINIMO_ATIVO = 15;

export function calcularStatus(objetivo, progresso, agora = Date.now()) {
  if (progresso >= 100) return null;

  const criadoEm = objetivo.created_at ? new Date(objetivo.created_at) : null;
  if (!criadoEm) return null;

  const dias = Math.floor((agora - criadoEm.getTime()) / 86400000);

  if (dias >= DIAS_PARA_CONSIDERAR_PARADO && progresso < PROGRESSO_MINIMO_ATIVO) {
    return "parado";
  }

  return "ativo";
}
