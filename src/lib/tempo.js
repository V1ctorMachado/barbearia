// Limite de tempo para operações no Firebase.
//
// Em algumas redes (operadora móvel, Wi-Fi com proxy, antivírus, economia de
// dados), a conexão com o Firestore pode ficar "aberta" mas sem resposta.
// Sem limite, a tela fica carregando para sempre. Com limite, a operação
// falha com erro TEMPO_ESGOTADO e o site mostra uma mensagem.

export const TEMPO_LEITURA = 10000;   // 10 s
export const TEMPO_GRAVACAO = 15000;  // 15 s

export function comTimeout(promessa, ms = TEMPO_LEITURA) {
  let timer;
  const limite = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const e = new Error('Tempo esgotado ao falar com o servidor.');
      e.code = 'TEMPO_ESGOTADO';
      reject(e);
    }, ms);
  });
  return Promise.race([promessa, limite]).finally(() => clearTimeout(timer));
}

export const tempoEsgotado = (e) => e?.code === 'TEMPO_ESGOTADO';
