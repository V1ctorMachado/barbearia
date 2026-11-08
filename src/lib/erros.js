// O Firebase devolve erros como "auth/invalid-credential".
// Esta função traduz os mais comuns para algo que o usuário entende.
// tipo: 'celular' (clientes) ou 'email' (equipe e contas antigas).
export function traduzErroAuth(codigo, tipo = 'email') {
  const acesso = tipo === 'celular' ? 'Celular ou senha incorretos.' : 'E-mail ou senha incorretos.';
  const mapa = {
    'auth/invalid-email': tipo === 'celular' ? 'Número de celular inválido.' : 'E-mail inválido.',
    'auth/user-disabled': 'Esta conta foi desativada.',
    'auth/user-not-found': acesso,
    'auth/wrong-password': acesso,
    'auth/invalid-credential': acesso,
    'auth/invalid-login-credentials': acesso,
    'auth/email-already-in-use': tipo === 'celular'
      ? 'Este celular já tem cadastro. Volte e entre com sua senha.'
      : 'Este e-mail já está cadastrado.',
    'auth/weak-password': 'A senha deve ter ao menos 6 caracteres.',
    'auth/too-many-requests': 'Muitas tentativas. Tente novamente em alguns minutos.',
    'auth/network-request-failed': 'Falha de conexão. Verifique sua internet.',
    'TEMPO_ESGOTADO': 'O servidor não respondeu. Verifique a internet ou troque de rede (Wi-Fi ↔ dados móveis).',
  };
  return mapa[codigo] || 'Algo deu errado. Tente novamente.';
}
