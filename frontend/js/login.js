// ===== Elementos do formulário =====
const form = document.getElementById('formLogin');
const emailInput = document.getElementById('email');
const senhaInput = document.getElementById('senha');
const btnMostrarSenha = document.getElementById('btnMostrarSenha');
const alerta = document.getElementById('alerta');

// ===== Mostrar / ocultar senha =====
btnMostrarSenha.addEventListener('click', () => {
  const visivel = senhaInput.type === 'text';

  senhaInput.type = visivel ? 'password' : 'text';
  btnMostrarSenha.textContent = visivel ? 'Mostrar' : 'Ocultar';
});

// ===== Validação dos campos =====
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

// ===== Validar e-mail =====
function validarEmail() {
  const email = emailInput.value.trim();

  const formatoValido =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!formatoValido) {
    return definirErro(
      emailInput,
      'erro-email',
      'Digite um e-mail válido.'
    );
  }

  return definirErro(emailInput, 'erro-email', '');
}

// ===== Validar senha =====
function validarSenha() {
  if (senhaInput.value.trim() === '') {
    return definirErro(
      senhaInput,
      'erro-senha',
      'Digite sua senha.'
    );
  }

  return definirErro(senhaInput, 'erro-senha', '');
}

// ===== Validação em tempo real =====
emailInput.addEventListener('blur', validarEmail);
senhaInput.addEventListener('blur', validarSenha);

[emailInput, senhaInput].forEach((input) => {
  input.addEventListener('input', () => {
    if (input.closest('.campo').classList.contains('invalido')) {
      if (input === emailInput) {
        validarEmail();
      } else {
        validarSenha();
      }
    }
  });
});

// ===== Exibir mensagem de alerta =====
function mostrarAlerta(mensagem, tipo) {
  alerta.textContent = mensagem;
  alerta.className = `alerta ${tipo}`;
}

// ===== Envio do formulário =====
form.addEventListener('submit', (event) => {
  event.preventDefault();

  // Executa todas as validações
  const resultados = [
    validarEmail(),
    validarSenha()
  ];

  if (resultados.includes(false)) {
    mostrarAlerta(
      'Corrija os campos destacados.',
      'perigo'
    );
    return;
  }

  // Simulação de login para fins de demonstração.
  // A autenticação real deve ser feita pelo backend.
  mostrarAlerta(
    'Dados válidos! A autenticação precisa ser confirmada pelo servidor.',
    'sucesso'
  );

  // Não redireciona porque ainda não houve autenticação real.
});