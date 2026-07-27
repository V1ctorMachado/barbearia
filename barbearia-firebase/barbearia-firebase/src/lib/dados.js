// Dados fixos da barbearia. Como serviços e barbeiros mudam pouco,
// ficam aqui em vez de no banco — simples de editar e não precisa de tela de admin.
// (Se um dia quiser gerenciá-los pela interface, dá para mover para o Firestore.)

export const SERVICOS = [
  { id: 'corte',      nome: 'Corte Masculino', preco: 45, duracaoMin: 30, descricao: 'Corte de cabelo completo' },
  { id: 'barba',      nome: 'Barba',           preco: 35, duracaoMin: 25, descricao: 'Aparar e modelar a barba' },
  { id: 'combo',      nome: 'Corte + Barba',   preco: 70, duracaoMin: 50, descricao: 'Combo completo' },
  { id: 'infantil',   nome: 'Corte Infantil',  preco: 35, duracaoMin: 30, descricao: 'Para crianças até 12 anos' },
  { id: 'sobrancelha',nome: 'Sobrancelha',     preco: 20, duracaoMin: 15, descricao: 'Design de sobrancelha' },
];

export const BARBEIROS = [
  { id: 'ricardo', nome: 'Ricardo Alves', especialidades: 'Corte clássico, Barba' },
  { id: 'marcos',  nome: 'Marcos Silva',  especialidades: 'Degradê, Navalha' },
  { id: 'joao',    nome: 'João Pereira',  especialidades: 'Corte infantil, Sobrancelha' },
];

// Horário de funcionamento (fixo, igual todo dia)
export const FUNCIONAMENTO = { abertura: 9, fechamento: 18 };

// Rótulos amigáveis para cada status
export const STATUS_LABEL = {
  pendente:   'Aguardando confirmação',
  agendado:   'Agendado',
  confirmado: 'Confirmado',
  concluido:  'Concluído',
  cancelado:  'Cancelado',
  recusado:   'Recusado',
};

export const servicoPorId = (id) => SERVICOS.find((s) => s.id === id);
export const barbeiroPorId = (id) => BARBEIROS.find((b) => b.id === id);
