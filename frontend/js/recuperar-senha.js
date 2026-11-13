
const API = 'http://localhost:3000';

// Elementos do formulário
const form = document.getElementById('formRecuperacao');
const emailInput = document.getElementById('email');
const novaSenhaInput = document.getElementById('novaSenha');
const confirmarSenhaInput = document.getElementById('confirmarSenha');

const btnMostrarNovaSenha = document.getElementById('btnMostrarNovaSenha');
const btnMostrarConfirmacao = document.getElementById('btnMostrarConfirmacao');

const alerta = document.getElementById('alerta');

// Mostrar / ocultar nova senha
btnMostrarNovaSenha.addEventListener('click', () => {
  const visivel = novaSenhaInput.type === 'text';

  novaSenhaInput.type = visivel ? 'password' : 'text';
  btnMostrarNovaSenha.textContent = visivel ? 'Mostrar' : 'Ocultar';
});

// Mostrar / ocultar confirmação
btnMostrarConfirmacao.addEventListener('click', () => {
  const visivel = confirmarSenhaInput.type === 'text';

  confirmarSenhaInput.type = visivel ? 'password' : 'text';
  btnMostrarConfirmacao.textContent = visivel ? 'Mostrar' : 'Ocultar';
});

// Validação dos campos
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

// Validar e-mail
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

// Validar nova senha
function validarNovaSenha() {
  if (novaSenhaInput.value.length < 8) {
    return definirErro(
      novaSenhaInput,
      'erro-nova-senha',
      'A senha deve ter pelo menos 8 caracteres.'
    );
  }

  return definirErro(
    novaSenhaInput,
    'erro-nova-senha',
    ''
  );
}

// Validar confirmação da senha
function validarConfirmacao() {
  if (confirmarSenhaInput.value === '') {
    return definirErro(
      confirmarSenhaInput,
      'erro-confirmar-senha',
      'Confirme sua nova senha.'
    );
  }

  if (confirmarSenhaInput.value !== novaSenhaInput.value) {
    return definirErro(
      confirmarSenhaInput,
      'erro-confirmar-senha',
      'As senhas não coincidem.'
    );
  }

  return definirErro(
    confirmarSenhaInput,
    'erro-confirmar-senha',
    ''
  );
}

// Validação ao sair dos campos
emailInput.addEventListener('blur', validarEmail);
novaSenhaInput.addEventListener('blur', validarNovaSenha);
confirmarSenhaInput.addEventListener('blur', validarConfirmacao);

// Validação em tempo real
[emailInput, novaSenhaInput, confirmarSenhaInput].forEach((input) => {
  input.addEventListener('input', () => {
    if (input.closest('.campo').classList.contains('invalido')) {
      if (input === emailInput) {
        validarEmail();
      } else if (input === novaSenhaInput) {
        validarNovaSenha();

        if (confirmarSenhaInput.value !== '') {
          validarConfirmacao();
        }
      } else {
        validarConfirmacao();
      }
    }
  });
});

// Exibir mensagem de alerta
function mostrarAlerta(mensagem, tipo) {
  alerta.textContent = mensagem;
  alerta.className = `alerta ${tipo}`;
}

// Envio do formulário
form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const resultados = [
    validarEmail(),
    validarNovaSenha(),
    validarConfirmacao()
  ];

  if (resultados.includes(false)) {
    mostrarAlerta('Corrija os campos destacados.', 'perigo');
    return;
  }

  const email = emailInput.value.trim();
  const novaSenha = novaSenhaInput.value;

  const botao = form.querySelector('button[type="submit"]');

  botao.disabled = true;
  botao.textContent = 'Alterando senha...';

  try {
    const resposta = await fetch(`${API}/recuperar-senha`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        novaSenha
      })
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      mostrarAlerta(
        dados.error || 'Não foi possível alterar a senha.',
        'perigo'
      );
      return;
    }

    mostrarAlerta(
      'Senha alterada com sucesso! Você já pode fazer login.',
      'sucesso'
    );

    form.reset();

    // Limpar estados de validação
    [emailInput, novaSenhaInput, confirmarSenhaInput].forEach((input) => {
      input.closest('.campo').classList.remove('valido', 'invalido');
    });

    document.getElementById('erro-email').textContent = '';
    document.getElementById('erro-nova-senha').textContent = '';
    document.getElementById('erro-confirmar-senha').textContent = '';

    // Restaurar botões de mostrar senha
    novaSenhaInput.type = 'password';
    confirmarSenhaInput.type = 'password';

    btnMostrarNovaSenha.textContent = 'Mostrar';
    btnMostrarConfirmacao.textContent = 'Mostrar';

  } catch (erro) {
    console.error('Erro ao recuperar senha:', erro);

    mostrarAlerta(
      'Não foi possível conectar ao servidor.',
      'perigo'
    );

  } finally {
    botao.disabled = false;
    botao.textContent = 'Alterar senha';
  }
});
