const API_URL = 'http://localhost:3000';
const CHAVE_CARRINHO = 'mercadoLobatoCarrinho'; // Mesma chave usada em pagina_produto.js

let carrinho = [];
try {
  carrinho = JSON.parse(localStorage.getItem(CHAVE_CARRINHO)) || [];
} catch (_) {
  carrinho = [];
}

let produtosBanco = [];

// Os dois arrays exigidos para envio ao banco na confirmação
let idsProdutos = [];
let quantidades = [];

const containerItens = document.getElementById('containerItens');
const totalListaEl = document.getElementById('totalLista');
const btnConfirmar = document.getElementById('btnConfirmar');
const btnDeletarLista = document.getElementById('btnDeletarLista');
const alertaListaEl = document.getElementById('alertaLista');
const statusClienteEl = document.getElementById('statusCliente');

let timeoutAlerta;
function mostrarAlertaTela(mensagem, tipo = 'erro') {
  alertaListaEl.textContent = mensagem;
  alertaListaEl.className = '';

  if (tipo === 'erro') {
    alertaListaEl.classList.add('alerta-erro');
  } else {
    alertaListaEl.classList.add('alerta-sucesso');
  }

  alertaListaEl.style.display = 'block';

  clearTimeout(timeoutAlerta);
  timeoutAlerta = setTimeout(() => {
    alertaListaEl.textContent = '';
    alertaListaEl.style.display = 'none';
  }, 4000);
}

let listaSalvaBanco = [];
function normalizarTexto(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function lerStorageSeguro(storage, chave) {
  try {
    return storage.getItem(chave);
  } catch (_) {
    return null;
  }
}

// Localiza o JWT caso tenha sido salvo no storage
function obterTokenJWT() {
  const chavesDiretas = ['token', 'jwt', 'authToken', 'accessToken'];
  for (const storage of [sessionStorage, localStorage]) {
    for (const chave of chavesDiretas) {
      const val = lerStorageSeguro(storage, chave);
      if (val && val.split('.').length === 3) {
        return val.replace(/^Bearer\s+/i, '').trim();
      }
    }

    try {
      for (let i = 0; i < storage.length; i++) {
        const val = storage.getItem(storage.key(i));
        if (!val) continue;

        if (val.startsWith('eyJ') && val.split('.').length === 3) {
          return val.trim();
        }

        try {
          const obj = JSON.parse(val);
          if (obj && typeof obj.token === 'string' && obj.token.split('.').length === 3) {
            return obj.token.trim();
          }
        } catch (_) {}
      }
    } catch (_) {}
  }

  return null;
}

function decodificarPayloadJWT(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (_) {
    return null;
  }
}

// Lê tanto o JWT quanto o objeto 'usuario' salvo no sessionStorage pelo login.js
function obterClienteAutenticado() {
  const token = obterTokenJWT();
  let id = null;
  let nome = '';

  if (token) {
    const payload = decodificarPayloadJWT(token);
    if (payload && Number(payload.id) > 0) {
      id = Number(payload.id);
    }
  }

  const usuarioRaw =
    lerStorageSeguro(sessionStorage, 'usuario') ||
    lerStorageSeguro(localStorage, 'usuario');

  if (usuarioRaw) {
    try {
      const usuario = JSON.parse(usuarioRaw);
      if (!id && Number(usuario.id) > 0) {
        id = Number(usuario.id);
      }
      if (usuario.nome) {
        nome = usuario.nome;
      }
    } catch (_) {}
  }

  if (!id) return null;
  return { token, id, nome };
}

function atualizarStatusCliente() {
  const cliente = obterClienteAutenticado();
  if (cliente) {
    statusClienteEl.textContent = cliente.nome
      ? `Cliente logado: ${cliente.nome} (ID #${cliente.id})`
      : `Cliente logado (ID #${cliente.id})`;
  } else {
    statusClienteEl.innerHTML =
      'Você não está logado. <a href="login.html">Faça login</a> para confirmar sua lista.';
  }
}

async function carregarProdutosDoBanco() {
  try {
    const res = await fetch(`${API_URL}/produtos`);
    if (res.ok) {
      produtosBanco = await res.json();
    }
  } catch (err) {
    console.error('Erro ao buscar produtos do banco:', err);
  }
}

function encontrarIdProdutoNoBanco(nomeProduto) {
  const nomeBusca = normalizarTexto(nomeProduto);
  const encontrado = produtosBanco.find(
    (p) => normalizarTexto(p.nome) === nomeBusca
  );
  if (!encontrado) return null;
  return Number(encontrado.id_produto ?? encontrado.ID_produto);
}

// Mantém os dois arrays separados (idsProdutos e quantidades) sincronizados
function atualizarArraysParaEnvio() {
  idsProdutos = [];
  quantidades = [];

  carrinho.forEach((item) => {
    const idBanco = encontrarIdProdutoNoBanco(item.nome);
    if (idBanco !== null) {
      const idxExistente = idsProdutos.indexOf(idBanco);
      if (idxExistente !== -1) {
        quantidades[idxExistente] += Number(item.quantidade);
      } else {
        idsProdutos.push(idBanco);
        quantidades.push(Number(item.quantidade));
      }
    }
  });
}

function salvarCarrinhoLocal() {
  try {
    localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(carrinho));
  } catch (_) {}
  atualizarArraysParaEnvio();
  renderizarLista();
}

function alterarQuantidade(index, delta) {
  const item = carrinho[index];
  const idBanco = encontrarIdProdutoNoBanco(item.nome);
  
  // Cria um mapa/objeto rápido de estoque baseado no array produtosBanco carregado do servidor
  const estoqueProdutos = {};
  produtosBanco.forEach(p => {
    const id = Number(p.id_produto ?? p.ID_produto);
    const estoque = Number(p.estoque ?? 0);
    estoqueProdutos[id] = estoque;
  });

  const estoqueDisponivel = estoqueProdutos[idBanco];

  if (estoqueDisponivel === undefined) {
    alert('Produto não encontrado ou estoque indisponível.');
    return;
  }

  // Calcula a quantidade desejada caso o delta seja positivo (adicionando)
  if (delta > 0) {
    const quantidadeAtualNaLista = item.quantidade;
    const quantidadeTotalDesejada = quantidadeAtualNaLista + delta;

    if (quantidadeTotalDesejada > estoqueDisponivel) {
      alert(`Quantidade excede o estoque disponível. Máximo em estoque: ${estoqueDisponivel}`);
      return;
    }
  }

  item.quantidade += delta;
  if (item.quantidade <= 0) {
    carrinho.splice(index, 1);
  }
  salvarCarrinhoLocal();
}

function removerItem(index) {
  carrinho.splice(index, 1);
  salvarCarrinhoLocal();
}

function renderizarLista() {
  containerItens.innerHTML = '';

  // Se o cliente já possui lista salva no banco, exibe apenas para visualização (sem alterar) e libera a exclusão
  if (listaSalvaBanco.length > 0) {
    btnConfirmar.style.display = 'none';
    btnDeletarLista.style.display = 'inline-block';
    btnDeletarLista.disabled = false;

    const aviso = document.createElement('p');
    aviso.style.cssText = 'margin-bottom: 14px; color: #555;';
    aviso.textContent = 'Você já possui uma lista salva no banco (somente visualização). Exclua esta lista se desejar criar uma nova.';
    containerItens.appendChild(aviso);

    let totalSalvo = 0;

    listaSalvaBanco.forEach((item) => {
      const subtotal = Number(item.preco) * Number(item.quantidade);
      totalSalvo += subtotal;

      const card = document.createElement('div');
      card.style.cssText =
        'display: flex; align-items: center; justify-content: space-between; border: 1px solid #ddd; border-radius: 8px; padding: 12px; margin-bottom: 12px; gap: 12px; background: #fafafa;';

      card.innerHTML = `
        <div style="flex: 1;">
          <strong>${item.nome}</strong>
          <small style="color: #666;"> (ID Banco: #${item.ID_prod})</small>
          <p style="margin: 4px 0 0; font-size: 0.9rem; color: #555;">
            Unitário: R$ ${Number(item.preco).toFixed(2).replace('.', ',')} • Quantidade: <strong>${item.quantidade}</strong>
          </p>
        </div>
        <div style="min-width: 110px; text-align: right;">
          <strong>R$ ${subtotal.toFixed(2).replace('.', ',')}</strong>
        </div>
      `;

      containerItens.appendChild(card);
    });

    totalListaEl.textContent = `Total: R$ ${totalSalvo.toFixed(2).replace('.', ',')}`;
    return;
  }

  btnDeletarLista.style.display = 'none';
  btnConfirmar.style.display = 'inline-block';

  if (carrinho.length === 0) {
    containerItens.innerHTML = '<p>Sua lista está vazia. Volte à página de produtos para adicionar itens.</p>';
    totalListaEl.textContent = 'Total: R$ 0,00';
    btnConfirmar.disabled = true;
    btnConfirmar.style.opacity = '0.6';
    return;
  }

  btnConfirmar.disabled = false;
  btnConfirmar.style.opacity = '1';

  let totalGeral = 0;

  carrinho.forEach((item, index) => {
    const idBanco = encontrarIdProdutoNoBanco(item.nome);
    const subtotal = Number(item.preco) * Number(item.quantidade);
    totalGeral += subtotal;

    const card = document.createElement('div');
    card.style.cssText =
      'display: flex; align-items: center; justify-content: space-between; border: 1px solid #ddd; border-radius: 8px; padding: 12px; margin-bottom: 12px; gap: 12px;';

    card.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
        <img src="${item.imagem}" alt="${item.nome}" style="width: 60px; height: 60px; object-fit: contain;">
        <div>
          <strong>${item.nome}</strong>
          <small style="color: #666;">${idBanco ? `(ID Banco: #${idBanco})` : '(Não encontrado na tabela PRODUTO)'}</small>
          <p style="margin: 4px 0; font-size: 0.9rem; color: #555;">${item.descricao}</p>
          <span>R$ ${Number(item.preco).toFixed(2).replace('.', ',')}</span>
        </div>
      </div>

      <div style="display: flex; align-items: center; gap: 8px;">
        <button type="button" class="btn-menos" style="padding: 4px 10px; cursor: pointer;">-</button>
        <strong>${item.quantidade}</strong>
        <button type="button" class="btn-mais" style="padding: 4px 10px; cursor: pointer;">+</button>
      </div>

      <div style="min-width: 110px; text-align: right;">
        <strong>R$ ${subtotal.toFixed(2).replace('.', ',')}</strong>
      </div>

      <button type="button" class="btn-remover" style="background: #dc3545; color: #fff; border: none; border-radius: 4px; padding: 6px 10px; cursor: pointer;">
        Remover
      </button>
    `;

    card.querySelector('.btn-menos').addEventListener('click', () => alterarQuantidade(index, -1));
    card.querySelector('.btn-mais').addEventListener('click', () => alterarQuantidade(index, 1));
    card.querySelector('.btn-remover').addEventListener('click', () => removerItem(index));

    containerItens.appendChild(card);
  });

  totalListaEl.textContent = `Total: R$ ${totalGeral.toFixed(2).replace('.', ',')}`;
}

btnConfirmar.addEventListener('click', async () => {
  const cliente = obterClienteAutenticado();

  if (!cliente) {
    alert('Você precisa fazer login antes de confirmar a lista.');
    window.location.href = 'login.html';
    return;
  }

  atualizarArraysParaEnvio();

  if (idsProdutos.length === 0) {
    alert('Nenhum produto da lista foi encontrado na tabela PRODUTO do banco de dados.');
    return;
  }

  const payload = {
    id_cliente: cliente.id,
    ids_produtos: idsProdutos,
    quantidades: quantidades
  };

  const headers = { 'Content-Type': 'application/json' };
  if (cliente.token) {
    headers['Authorization'] = `Bearer ${cliente.token}`;
  }

  btnConfirmar.disabled = true;
  btnConfirmar.textContent = 'Confirmando...';

  try {
    const res = await fetch(`${API_URL}/api/lista-produto`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const dados = await res.json();

    if (!res.ok) {
      alertaListaEl.style.color = '#dc3545';
      alertaListaEl.textContent = dados.mensagem || 'Erro ao salvar a lista.';
      btnConfirmar.disabled = false;
      btnConfirmar.textContent = 'Confirmar';
      return;
    }

   carrinho = [];
    try {
      localStorage.removeItem(CHAVE_CARRINHO);
    } catch (_) {}
    idsProdutos = [];
    quantidades = [];

    alertaListaEl.style.color = '#28a745';
    alertaListaEl.textContent = dados.mensagem;
    btnConfirmar.textContent = 'Confirmar';

    await carregarListaSalvaDoBanco();
    renderizarLista();
  } catch (err) {
    alertaListaEl.style.color = '#dc3545';
    alertaListaEl.textContent = 'Erro de conexão com o servidor.';
    btnConfirmar.disabled = false;
    btnConfirmar.textContent = 'Confirmar';
  }
});

async function carregarListaSalvaDoBanco() {
  const cliente = obterClienteAutenticado();
  if (!cliente) {
    listaSalvaBanco = [];
    return;
  }

  try {
    const res = await fetch(`${API_URL}/api/lista-produto/${cliente.id}`);
    if (res.ok) {
      listaSalvaBanco = await res.json();
    }
  } catch (err) {
    console.error('Erro ao verificar lista salva no banco:', err);
  }
}

btnDeletarLista.addEventListener('click', async () => {
  const cliente = obterClienteAutenticado();
  if (!cliente) {
    alert('Você precisa fazer login para excluir a lista.');
    window.location.href = 'login.html';
    return;
  }

  const headers = { 'Content-Type': 'application/json' };
  if (cliente.token) {
    headers['Authorization'] = `Bearer ${cliente.token}`;
  }

  btnDeletarLista.disabled = true;
  btnDeletarLista.textContent = 'Excluindo...';

  try {
    const res = await fetch(`${API_URL}/api/lista-produto`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ id_cliente: cliente.id })
    });

    const dados = await res.json();

    if (!res.ok) {
      alertaListaEl.style.color = '#dc3545';
      alertaListaEl.textContent = dados.mensagem || 'Erro ao excluir a lista.';
      btnDeletarLista.disabled = false;
      btnDeletarLista.textContent = 'Deletar Lista';
      return;
    }

    listaSalvaBanco = [];
    alertaListaEl.style.color = '#28a745';
    alertaListaEl.textContent = dados.mensagem;
    btnDeletarLista.textContent = 'Deletar Lista';
    renderizarLista();
  } catch (err) {
    alertaListaEl.style.color = '#dc3545';
    alertaListaEl.textContent = 'Erro de conexão com o servidor.';
    btnDeletarLista.disabled = false;
    btnDeletarLista.textContent = 'Deletar Lista';
  }
});

(async function iniciar() {
  atualizarStatusCliente();
  await carregarProdutosDoBanco();
  await carregarListaSalvaDoBanco();
  atualizarArraysParaEnvio();
  renderizarLista();
})();