
const listaProdutos = document.getElementById("listaProdutos");
const mensagem = document.getElementById("mensagemProdutos");
const campoBusca = document.getElementById("campoTexto");
const contador = document.getElementById("contadorCarrinho");

const CHAVE_CARRINHO = "mercadoLobatoCarrinho";
const carrinho = JSON.parse(localStorage.getItem(CHAVE_CARRINHO)) || [];

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

function atualizarContador() {
  contador.textContent = carrinho.reduce(
    (total, produto) => total + produto.quantidade,
    0
  );
}

function salvarCarrinho() {
  localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(carrinho));
  atualizarContador();
}

function alterarQuantidade(produto, quantidade) {
  const id = `produto-${produto.id_produto}`;
  const existente = carrinho.find(item => item.id === id);
  const estoque = Number(produto.estoque);

 if (quantidade > 0) {

  if (existente && existente.quantidade >= estoque) {
      return;
  }

  if (existente) {
    existente.quantidade++;
  } else {
      carrinho.push({
        id,
        nome: produto.nome,
        descricao: produto.categoria || "",
        preco: Number(produto.preco),
        imagem: "",
        quantidade: 1
    });
  }

} else if (existente) {

  existente.quantidade--;

  if (existente.quantidade <= 0) {
    const indice = carrinho.indexOf(existente);
    carrinho.splice(indice, 1);
  }
}

  salvarCarrinho();
}

function criarControleCarrinho(produto) {
  const controle = document.createElement("div");
  controle.className = "controle-carrinho";

  const id = `produto-${produto.id_produto}`;

  const existente = carrinho.find(item => item.id === id);
  const quantidade = existente ? existente.quantidade : 0;

  if (quantidade === 0) {
    const botaoAdicionar = document.createElement("button");

    botaoAdicionar.className = "botao-comprar";
    botaoAdicionar.textContent = "+ Adicionar ao carrinho";

    botaoAdicionar.addEventListener("click", () => {
      alterarQuantidade(produto, 1);
      atualizarControleCarrinho(controle, produto);
    });

    controle.appendChild(botaoAdicionar);

  } else {

    const botaoRemover = document.createElement("button");
    botaoRemover.className = "botao-remover";
    botaoRemover.textContent = "−";
    botaoRemover.setAttribute("aria-label", "Diminuir quantidade");

    botaoRemover.addEventListener("click", () => {
      alterarQuantidade(produto, -1);
      atualizarControleCarrinho(controle, produto);
    });

    const quantidadeTexto = document.createElement("span");
    quantidadeTexto.className = "quantidade";
    quantidadeTexto.textContent = quantidade;

    const botaoAdicionar = document.createElement("button");
    botaoAdicionar.className = "botao-adicionar";
    botaoAdicionar.textContent = "+";
    botaoAdicionar.setAttribute("aria-label", "Aumentar quantidade");

    botaoAdicionar.disabled = quantidade >= Number(produto.estoque);

    botaoAdicionar.addEventListener("click", () => {
      alterarQuantidade(produto, 1);
      atualizarControleCarrinho(controle, produto);
    });

    controle.append(
      botaoRemover,
      quantidadeTexto,
      botaoAdicionar
    );
  }

  return controle;
}

function atualizarControleCarrinho(controle, produto) {
  const novoControle = criarControleCarrinho(produto);
  controle.replaceWith(novoControle);
}

function criarCard(produto) {
  const card = document.createElement("div");
  card.className = "card";

  const nome = document.createElement("h3");
  nome.textContent = produto.nome;

  const descricao = document.createElement("p");
  descricao.className = "descricao";
  descricao.textContent = produto.categoria || "Sem categoria";

  const preco = document.createElement("p");
  preco.className = "preco";
  preco.textContent = moeda.format(Number(produto.preco));

  const disponivel = Number(produto.estoque) > 0;

  const status = document.createElement("p");
  status.textContent = disponivel ? "Disponível" : "Indisponível";

  const controle = disponivel
    ? criarControleCarrinho(produto)
    : document.createElement("div");

  card.append(nome, descricao, preco, status, controle);

  return card;
}

// Filtra os produtos pela pesquisa
function filtrarProdutos() {
  const pesquisa = campoBusca.value.toLowerCase().trim();

  listaProdutos.querySelectorAll(".card").forEach(card => {
    const nome = card.querySelector("h3").textContent.toLowerCase();

    const descricao = card.querySelector(".descricao")
      .textContent.toLowerCase();

    const corresponde =
      nome.includes(pesquisa) || descricao.includes(pesquisa);

    card.style.display = corresponde ? "" : "none";
  });
}

// Carrega os produtos da API
async function carregarProdutos() {
  try {
    const resposta = await fetch("http://localhost:3000/produtos", {
      cache: "no-store"
    });

    if (!resposta.ok) {
      throw new Error(`Erro ao consultar produtos: ${resposta.status}`);
    }

    const produtos = await resposta.json();

    listaProdutos.replaceChildren(...produtos.map(criarCard));

    mensagem.textContent = produtos.length === 0
      ? "Nenhum produto cadastrado."
      : "";

    filtrarProdutos();

  } catch (erro) {
    console.error(erro);

    mensagem.textContent =
      "Não foi possível carregar os produtos. Tente recarregar a página.";
  }
}

// Eventos da pesquisa
campoBusca.addEventListener("input", filtrarProdutos);

document.getElementById("formBusca").addEventListener("submit", event => {
  event.preventDefault();
});

// Inicialização
atualizarContador();
carregarProdutos();
