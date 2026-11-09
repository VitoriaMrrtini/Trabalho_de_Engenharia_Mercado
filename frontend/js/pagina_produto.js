
// PESQUISA DE PRODUTOS

const campoBusca = document.getElementById("campoTexto");
const cards = document.querySelectorAll(".card");

campoBusca.addEventListener("input", () => {
  const pesquisa = campoBusca.value.toLowerCase().trim();

  cards.forEach((card) => {
    const nome = card.querySelector("h3").textContent.toLowerCase();
    const descricao = card.querySelector(".descricao").textContent.toLowerCase();

    card.style.display =
      nome.includes(pesquisa) || descricao.includes(pesquisa)
        ? ""
        : "none";
  });
});

// CARRINHO DE COMPRAS

const CHAVE_CARRINHO = "mercadoLobatoCarrinho";

let carrinho = JSON.parse(localStorage.getItem(CHAVE_CARRINHO)) || [];

const contador = document.getElementById("contadorCarrinho");

function atualizarContador() {
  const quantidade = carrinho.reduce(
    (total, produto) => total + produto.quantidade,
    0
  );

  contador.textContent = quantidade;
}

function salvarCarrinho() {
  localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(carrinho));
  atualizarContador();
}

// CRIAR BOTÕES NOS PRODUTOS

cards.forEach((card, index) => {
  const nome = card.querySelector("h3").textContent.trim();
  const descricao = card.querySelector(".descricao").textContent.trim();
  const precoTexto = card.querySelector(".preco").textContent;

  const preco = Number(
    precoTexto.replace("R$", "").trim().replace(".", "").replace(",", ".")
  );

  const imagem = card.querySelector("img").getAttribute("src");

  const botao = document.createElement("button");

  botao.className = "botao-comprar";
  botao.textContent = "+ Adicionar ao carrinho";

  botao.addEventListener("click", () => {
    const produtoExistente = carrinho.find(
      (produto) => produto.id === index
    );

    if (produtoExistente) {
      produtoExistente.quantidade++;
    } else {
      carrinho.push({
        id: index,
        nome,
        descricao,
        preco,
        imagem,
        quantidade: 1
      });
    }

    salvarCarrinho();

    botao.textContent = "✓ Adicionado!";

    setTimeout(() => {
      botao.textContent = "+ Adicionar ao carrinho";
    }, 1000);
  });

  card.appendChild(botao);
});

atualizarContador();
