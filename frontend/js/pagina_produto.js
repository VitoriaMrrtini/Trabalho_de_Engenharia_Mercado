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

function adicionarAoCarrinho(produto) {
  const id = `produto-${produto.id_produto}`;
  const existente = carrinho.find(item => item.id === id);

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

  localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(carrinho));
  atualizarContador();
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

  const botao = document.createElement("button");
  botao.className = "botao-comprar";
  botao.textContent = disponivel
    ? "+ Adicionar ao carrinho"
    : "Indisponível";
  botao.disabled = !disponivel;

  botao.addEventListener("click", () => {
    adicionarAoCarrinho(produto);
  });

  card.append(nome, descricao, preco, status, botao);
  return card;
}

function filtrarProdutos() {
  const pesquisa = campoBusca.value.toLowerCase().trim();

  listaProdutos.querySelectorAll(".card").forEach(card => {
    const nome = card.querySelector("h3").textContent.toLowerCase();
    const descricao = card.querySelector(".descricao").textContent.toLowerCase();

    const corresponde =
      nome.includes(pesquisa) || descricao.includes(pesquisa);

    card.style.display = corresponde ? "" : "none";
  });
}

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

campoBusca.addEventListener("input", filtrarProdutos);

document.getElementById("formBusca").addEventListener("submit", event => {
  event.preventDefault();
});

atualizarContador();
carregarProdutos();