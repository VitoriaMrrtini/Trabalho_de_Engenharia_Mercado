const form = document.getElementById("formCadastro");
const nomeInput = document.getElementById("nome");
const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");
const confirmarInput = document.getElementById("confirmarSenha");
const termosInput = document.getElementById("termos");
const btnMostrarSenha = document.getElementById("btnMostrarSenha");
const alerta = document.getElementById("alerta");

// Mostrar / ocultar senha (afeta os dois campos)
btnMostrarSenha.addEventListener("click", () => {
  const visivel = senhaInput.type === "text";
  const novoTipo = visivel ? "password" : "text";
  senhaInput.type = novoTipo;
  confirmarInput.type = novoTipo;
  btnMostrarSenha.textContent = visivel ? "Mostrar" : "Ocultar";
});

// Marca o campo como inválido (com mensagem) ou válido
function definirErro(input, idErro, mensagem) {
  const campo = input.closest(".campo");
  const textoErro = document.getElementById(idErro);

  if (mensagem) {
    campo.classList.add("invalido");
    campo.classList.remove("valido");
    textoErro.textContent = mensagem;
    return false;
  }

  campo.classList.remove("invalido");
  campo.classList.add("valido");
  textoErro.textContent = "";
  return true;
}

// Validações de cada campo (todos obrigatórios)
function validarNome() {
  const nome = nomeInput.value.trim();
  if (nome === "") {
    return definirErro(nomeInput, "erro-nome", "O nome é obrigatório.");
  }
  if (nome.length < 3) {
    return definirErro(
      nomeInput,
      "erro-nome",
      "Digite seu nome (mínimo 3 caracteres).",
    );
  }
  return definirErro(nomeInput, "erro-nome", "");
}
const dominiosComErro = {
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmail.con": "gmail.com",
  "hotmial.com": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "outlook.con": "outlook.com",
};

function validarEmail() {
  const email = emailInput.value.trim().toLowerCase();

  if (email === "") {
    return definirErro(emailInput, "erro-email", "O e-mail é obrigatório.");
  }

  const formato = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/;
  if (!formato.test(email) || email.includes("..")) {
    return definirErro(emailInput, "erro-email", "Digite um e-mail válido.");
  }

  const dominio = email.split("@")[1];
  if (dominiosComErro[dominio]) {
    return definirErro(
      emailInput,
      "erro-email",
      `Você quis dizer @${dominiosComErro[dominio]}?`,
    );
  }

  return definirErro(emailInput, "erro-email", "");
}

const senhasComuns = [
  "12345678", "123456789", "password", "senha123", "qwerty123", "abc12345", "senha1234", "admin123",
];
function validarSenha() {
  const senha = senhaInput.value;

  if (senha === "") {
    return definirErro(senhaInput, "erro-senha", "A senha é obrigatória.");
  }
  if (senha.length < 8) {
    return definirErro(senhaInput, "erro-senha", "Use pelo menos 8 caracteres.");
  }
  if (!/[a-z]/.test(senha)) {
    return definirErro(senhaInput, "erro-senha", "Inclua uma letra minúscula.");
  }
  if (!/[A-Z]/.test(senha)) {
    return definirErro(senhaInput, "erro-senha", "Inclua uma letra maiúscula.");
  }
  if (!/\d/.test(senha)) {
    return definirErro(senhaInput, "erro-senha", "Inclua um número.");
  }
  if (!/[^A-Za-z0-9]/.test(senha)) {
    return definirErro(senhaInput, "erro-senha", "Inclua um símbolo (ex.: ! @ # $ %).");
  }
  if (senhasComuns.includes(senha.toLowerCase())) {
    return definirErro(senhaInput, "erro-senha", "Essa senha é muito comum.");
  }
  const usuarioEmail = emailInput.value.split("@")[0].toLowerCase();
  if (usuarioEmail.length >= 3 && senha.toLowerCase().includes(usuarioEmail)) {
    return definirErro(senhaInput, "erro-senha", "A senha não pode conter seu e-mail.");
  }
  return definirErro(senhaInput, "erro-senha", "");
}

function validarConfirmacao() {
  const senha = senhaInput.value;
  const confirmacao = confirmarInput.value;

  if (confirmacao === "") {
    return definirErro(
      confirmarInput,
      "erro-confirmar",
      "Confirme sua senha.",
    );
  }

  if (senha !== confirmacao) {
    return definirErro(
      confirmarInput,
      "erro-confirmar",
      "As senhas não coincidem.",
    );
  }

  return definirErro(confirmarInput, "erro-confirmar", "");
}

function validarTermos() {
  const campo = termosInput.closest(".campo");
  const textoErro = document.getElementById("erro-termos");

  if (!termosInput.checked) {
    campo.classList.add("invalido");
    textoErro.textContent = "Você precisa aceitar os termos para continuar.";
    return false;
  }

  campo.classList.remove("invalido");
  textoErro.textContent = "";
  return true;
}

// Validação em tempo real: ao sair do campo...
nomeInput.addEventListener("blur", validarNome);
emailInput.addEventListener("blur", validarEmail);
senhaInput.addEventListener("blur", validarSenha);
confirmarInput.addEventListener("blur", validarConfirmacao);

// ...e enquanto digita, depois que o campo já deu erro
function revalidarSeInvalido(input, validar) {
  input.addEventListener("input", () => {
    if (input.closest(".campo").classList.contains("invalido")) validar();
  });
}

revalidarSeInvalido(nomeInput, validarNome);
revalidarSeInvalido(emailInput, validarEmail);

senhaInput.addEventListener("input", () => {
  if (senhaInput.closest(".campo").classList.contains("invalido")) {
    validarSenha();
  }
  if (confirmarInput.value !== "") validarConfirmacao();
});

confirmarInput.addEventListener("input", validarConfirmacao);

termosInput.addEventListener("change", validarTermos);

// Exibe uma mensagem no alerta
function mostrarAlerta(mensagem, tipo) {
  alerta.textContent = mensagem;
  alerta.className = `alerta ${tipo}`;
}

// Envio do formulário
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const resultados = [
    // Roda todas as validações (sem parar na primeira que falhar)
    validarNome(),
    validarEmail(),
    validarSenha(),
    validarConfirmacao(),
    validarTermos(),
  ];
  if (resultados.includes(false)
  ) {
    mostrarAlerta("Corrija os campos destacados.", "perigo");

    // Leva o foco para o primeiro campo com erro
    const primeiroInvalido = form.querySelector(".campo.invalido input");
    if (primeiroInvalido) primeiroInvalido.focus();
    return;
  }

  try {
    console.log("Enviando cadastro...");

    const resposta = await fetch('http://localhost:3000/cadastro', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nome: nomeInput.value.trim(),
        email: emailInput.value.trim(),
        senha: senhaInput.value
      })
    });

    const dados = await resposta.json();

    console.log("Resposta do servidor:", dados);

    if (!resposta.ok) {
      mostrarAlerta(
        dados.error || 'Erro ao realizar cadastro.',
        'perigo'
      );
      return;
    }

    mostrarAlerta(
      'Cadastro realizado com sucesso! Redirecionando para o login...',
      'sucesso'
    );

    setTimeout(() => {
      window.location.href = 'login.html';
    }, 2000);

  } catch (erro) {
    console.error("Erro na requisição:", erro);

    mostrarAlerta(
      'Não foi possível conectar ao servidor. Tente novamente.',
      'perigo'
    );
  }
}
)