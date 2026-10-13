const form = document.getElementById('formCadastro');
const nomeInput = document.getElementById('nome');
const emailInput = document.getElementById('email');
const senhaInput = document.getElementById('senha');
const confirmarInput = document.getElementById('confirmarSenha');
const termosInput = document.getElementById('termos');
const btnMostrarSenha = document.getElementById('btnMostrarSenha');
const alerta = document.getElementById('alerta');

// Mostrar / ocultar senha (afeta os dois campos)
btnMostrarSenha.addEventListener('click', () => {
  const visivel = senhaInput.type === 'text';
  const novoTipo = visivel ? 'password' : 'text';
  senhaInput.type = novoTipo;
  confirmarInput.type = novoTipo;
  btnMostrarSenha.textContent = visivel ? 'Mostrar' : 'Ocultar';
});

// Marca o campo como inválido (com mensagem) ou válido
function definirErro(input, idErro, mensagem) {
  const campo = input.closest('.campo');
  const textoErro = document.getElementById(idErro);

  if (mensagem) {
    campo.classList.add('invalido');
    campo.classList.remove('valido');
    textoErro.textContent = mensagem;
    return false;
  }

  campo.classList.remove('invalido');
  campo.classList.add('valido');
  textoErro.textContent = '';
  return true;
}

// ----- Validações de cada campo -----
function validarNome() {
  const nome = nomeInput.value.trim();
  if (nome.length < 3) {
    return definirErro(nomeInput, 'erro-nome', 'Digite seu nome (mínimo 3 caracteres).');
  }
  return definirErro(nomeInput, 'erro-nome', '');
}

function validarEmail() {
  const email = emailInput.value.trim();
  const formatoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!formatoValido) {
    return definirErro(emailInput, 'erro-email', 'Digite um e-mail válido.');
  }
  return definirErro(emailInput, 'erro-email', '');
}

function validarSenha() {
  if (senhaInput.value.length < 6) {
    return definirErro(senhaInput, 'erro-senha', 'A senha deve ter pelo menos 6 caracteres.');
  }
  return definirErro(senhaInput, 'erro-senha', '');
}

function validarConfirmacao() {
  if (confirmarInput.value === '') {
    return definirErro(confirmarInput, 'erro-confirmar', 'Confirme sua senha.');
  }
  if (confirmarInput.value !== senhaInput.value) {
    return definirErro(confirmarInput, 'erro-confirmar', 'As senhas não coincidem.');
  }
  return definirErro(confirmarInput, 'erro-confirmar', '');
}

function validarTermos() {
  const campo = termosInput.closest('.campo');
  const textoErro = document.getElementById('erro-termos');

  if (!termosInput.checked) {
    campo.classList.add('invalido');
    textoErro.textContent = 'Você precisa aceitar os termos para continuar.';
    return false;
  }

  campo.classList.remove('invalido');
  textoErro.textContent = '';
  return true;
}

// Validação em tempo real: ao sair do campo e enquanto digita depois do primeiro erro
nomeInput.addEventListener('blur', validarNome);
emailInput.addEventListener('blur', validarEmail);
senhaInput.addEventListener('blur', validarSenha);
confirmarInput.addEventListener('blur', validarConfirmacao);

[
  [nomeInput, validarNome],
  [emailInput, validarEmail],
  [senhaInput, () => { validarSenha(); if (confirmarInput.value) validarConfirmacao(); }],
  [confirmarInput, validarConfirmacao]
].forEach(([input, validar]) => {
  input.addEventListener('input', () => {
    if (input.closest('.campo').classList.contains('invalido')) validar();
  });
});

termosInput.addEventListener('change', validarTermos);

// Exibe uma mensagem no alerta
function mostrarAlerta(mensagem, tipo) {
  alerta.textContent = mensagem;
  alerta.className = `alerta ${tipo}`;
}

// Envio do formulário
form.addEventListener('submit', (event) => {
  event.preventDefault();

  // Roda todas as validações (sem parar na primeira que falhar)
  const resultados = [
    validarNome(),
    validarEmail(),
    validarSenha(),
    validarConfirmacao(),
    validarTermos()
  ];

  if (resultados.includes(false)) {
    mostrarAlerta('Corrija os campos destacados.', 'perigo');
    return;
  }

  // ATENÇÃO: isto é só uma simulação para o trabalho.
  // Em um sistema real, os dados são enviados ao servidor, que salva
  // a conta e guarda a senha de forma criptografada (hash).
  mostrarAlerta('Cadastro realizado com sucesso! Redirecionando para o login...', 'sucesso');

  setTimeout(() => {
    window.location.href = '/frontend/login.html';
  }, 2000);
});