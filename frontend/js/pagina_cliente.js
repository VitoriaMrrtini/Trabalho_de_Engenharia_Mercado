const API = 'http://localhost:3000';

const token = sessionStorage.getItem('token');

const formPerfil = document.getElementById('formPerfil');
const campoNome = document.getElementById('nome');
const campoEmail = document.getElementById('email');
const campoSenhaAtual = document.getElementById('senhaAtual');
const campoNovaSenha = document.getElementById('novaSenha');

const areaSenhaAtual = document.getElementById('campoSenhaAtual');
const areaNovaSenha = document.getElementById('campoNovaSenha');

const btnEditar = document.getElementById('btnEditar');
const btnSalvar = document.getElementById('btnSalvar');
const btnCancelar = document.getElementById('btnCancelar');
const btnExcluir = document.getElementById('btnExcluir');

const mensagem = document.getElementById('mensagem');

let dadosOriginais = {};

// Exibir mensagens na página
function mostrarMensagem(texto, tipo) {
  mensagem.textContent = texto;
  mensagem.className = `mensagem ${tipo}`;
}

// Verificar autenticação
if (!token) {
  alert('Você precisa fazer login para acessar seu perfil.');
  window.location.href = '/frontend/login.html';
}

// Requisições autenticadas
async function requisicaoPerfil(metodo, corpo = null) {
  const opcoes = {
    method: metodo,
    headers: {
      Authorization: `Bearer ${token}`
    }
  };

  if (corpo !== null) {
    opcoes.headers['Content-Type'] = 'application/json';
    opcoes.body = JSON.stringify(corpo);
  }

  const resposta = await fetch(`${API}/cliente/perfil`, opcoes);

  const dados = await resposta.json();

  if (!resposta.ok) {
    throw new Error(dados.error || 'Ocorreu um erro na operação.');
  }

  return dados;
}

// Carregar dados do cliente
async function carregarPerfil() {
  try {
    const cliente = await requisicaoPerfil('GET');

    dadosOriginais = {
      nome: cliente.nome,
      email: cliente.email
    };

    campoNome.value = cliente.nome;
    campoEmail.value = cliente.email;

  } catch (erro) {
    mostrarMensagem(erro.message, 'erro');
  }
}

// Habilitar edição
btnEditar.addEventListener('click', () => {
  campoNome.disabled = false;
  campoEmail.disabled = false;

  areaSenhaAtual.hidden = false;
  areaNovaSenha.hidden = false;

  btnEditar.hidden = true;
  btnSalvar.hidden = false;
  btnCancelar.hidden = false;

  mostrarMensagem('', '');

  campoNome.focus();
});

// Cancelar edição
btnCancelar.addEventListener('click', () => {
  campoNome.value = dadosOriginais.nome;
  campoEmail.value = dadosOriginais.email;

  campoNome.disabled = true;
  campoEmail.disabled = true;

  campoSenhaAtual.value = '';
  campoNovaSenha.value = '';

  areaSenhaAtual.hidden = true;
  areaNovaSenha.hidden = true;

  btnEditar.hidden = false;
  btnSalvar.hidden = true;
  btnCancelar.hidden = true;

  mostrarMensagem('', '');
});

// Salvar alterações
formPerfil.addEventListener('submit', async (evento) => {
  evento.preventDefault();

  const nome = campoNome.value.trim();
  const email = campoEmail.value.trim();
  const senhaAtual = campoSenhaAtual.value;
  const novaSenha = campoNovaSenha.value;

  if (nome.length < 3) {
    mostrarMensagem('O nome deve ter pelo menos 3 caracteres.', 'erro');
    return;
  }

  if (!senhaAtual) {
    mostrarMensagem('Informe sua senha atual para confirmar.', 'erro');
    return;
  }

  if (novaSenha && novaSenha.length < 8) {
    mostrarMensagem('A nova senha deve ter pelo menos 8 caracteres.', 'erro');
    return;
  }

  const confirmou = confirm(
    'Confirma a atualização dos seus dados?'
  );

  if (!confirmou) {
    return;
  }

  const dados = {
    nome,
    email,
    senhaAtual
  };

  // Só enviar novaSenha se o cliente realmente informou uma
  if (novaSenha) {
    dados.novaSenha = novaSenha;
  }

  try {
    btnSalvar.disabled = true;

    const resultado = await requisicaoPerfil('PUT', dados);

    dadosOriginais = {
      nome: resultado.usuario.nome,
      email: resultado.usuario.email
    };

    campoNome.value = resultado.usuario.nome;
    campoEmail.value = resultado.usuario.email;

    campoNome.disabled = true;
    campoEmail.disabled = true;

    campoSenhaAtual.value = '';
    campoNovaSenha.value = '';

    areaSenhaAtual.hidden = true;
    areaNovaSenha.hidden = true;

    btnEditar.hidden = false;
    btnSalvar.hidden = true;
    btnCancelar.hidden = true;

    mostrarMensagem(resultado.message, 'sucesso');

  } catch (erro) {
    mostrarMensagem(erro.message, 'erro');

  } finally {
    btnSalvar.disabled = false;
  }
});

// Excluir perfil
btnExcluir.addEventListener('click', async () => {
  const confirmou = confirm(
    'Tem certeza de que deseja excluir sua conta? Essa ação não poderá ser desfeita.'
  );

  if (!confirmou) {
    return;
  }

  const senhaAtual = prompt(
    'Digite sua senha atual para confirmar a exclusão:'
  );

  if (senhaAtual === null) {
    return;
  }

  if (!senhaAtual) {
    mostrarMensagem('Informe sua senha para excluir a conta.', 'erro');
    return;
  }

  try {
    btnExcluir.disabled = true;

    const resultado = await requisicaoPerfil('DELETE', {
      senhaAtual
    });

    alert(resultado.message);

    sessionStorage.removeItem('token');
    sessionStorage.removeItem('usuario');

    window.location.href = '/frontend/login.html';

  } catch (erro) {
    mostrarMensagem(erro.message, 'erro');

  } finally {
    btnExcluir.disabled = false;
  }
});

// Inicializar página
if (token) {
  carregarPerfil();
}