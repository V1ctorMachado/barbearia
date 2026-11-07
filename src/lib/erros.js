// O Firebase devolve erros como "auth/invalid-credential".
// Esta função traduz os mais comuns para algo que o usuário entende.
export function traduzErroAuth(codigo) {
  const mapa = {
    'auth/invalid-email': 'E-mail inválido.',
    'auth/user-disabled': 'Esta conta foi desativada.',
    'auth/user-not-found': 'E-mail ou senha incorretos.',
    'auth/wrong-password': 'E-mail ou senha incorretos.',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
    'auth/weak-password': 'A senha deve ter ao menos 6 caracteres.',
    'auth/too-many-requests': 'Muitas tentativas. Tente novamente em alguns minutos.',
    'auth/network-request-failed': 'Falha de conexão. Verifique sua internet.',
    'TEMPO_ESGOTADO': 'O servidor não respondeu. Verifique a internet ou troque de rede (Wi-Fi ↔ dados móveis).',
  };
  return mapa[codigo] || 'Algo deu errado. Tente novamente.';
}
