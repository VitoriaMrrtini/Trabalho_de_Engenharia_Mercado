require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./db");
const bcrypt = require("bcrypt");
const path = require("path");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

// Middleware para autenticar o cliente
function autenticarCliente(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).json({
      error: 'Acesso não autorizado.'
    });
  }

  const token = authorization.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'Token não informado.'
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.cliente = decoded;

    next();

  } catch (erro) {
    return res.status(401).json({
      error: 'Sessão inválida ou expirada.'
    });
  }
}

app.get('/teste-conexao', async (req, res) => {
  try {
    const [resultado] = await pool.query("SELECT DATABASE() AS banco");
    res.json(resultado[0]);
  } catch (erro) {
    res.status(500).json({ error: erro.message });
  }
});

app.get("/produtos", async (req, res) => {
  try {
    const [produtos] = await pool.query(`
      SELECT p.id_produto, p.nome, p.preco, p.estoque, p.data_validade,
             c.nome AS categoria
      FROM PRODUTO p
      LEFT JOIN CATEGORIA_PRODUTO c ON c.id_categoria = p.id_categoria
    `);
    res.json(produtos);
  } catch (erro) {
    res.status(500).json({ error: erro.message });
  }
});

// Cadastro de cliente
app.post("/cadastro", async (req, res) => {
  const { nome, email, senha } = req.body;

  // Validar os dados recebidos
  if (!nome || !email || !senha) {
    return res.status(400).json({
      error: "Preencha todos os campos.",
    });
  }

  if (nome.trim().length < 3) {
    return res.status(400).json({
      error: "O nome deve ter pelo menos 3 caracteres.",
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({
      error: "Digite um e-mail válido.",
    });
  }

  if (senha.length < 8) {
    return res.status(400).json({
      error: "A senha deve ter pelo menos 8 caracteres.",
    });
  }

  let conexao;

  try {
    conexao = await pool.getConnection();

    await conexao.beginTransaction();

    // Gerar hash da senha
    const senhaHash = await bcrypt.hash(senha, 10);

    // Cadastrar cliente
    const [resultado] = await conexao.execute(
      "INSERT INTO CLIENTE (nome, email) VALUES (?, ?)",
      [nome.trim(), email.trim()],
    );

    const idCliente = resultado.insertId;

    // Cadastrar senha vinculada ao cliente
    await conexao.execute(
      "INSERT INTO USUARIO (id_cliente, senha) VALUES (?, ?)",
      [idCliente, senhaHash],
    );

    await conexao.commit();

    return res.status(201).json({
      message: "Cadastro realizado com sucesso!",
      idCliente,
    });
  } catch (erro) {
    if (conexao) {
      await conexao.rollback();
    }

    if (erro.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: "Este e-mail já está cadastrado.",
      });
    }

    console.error("Erro no cadastro:", erro);

    return res.status(500).json({
      error: "Erro ao realizar cadastro.",
    });
  } finally {
    if (conexao) {
      conexao.release();
    }
  }
});
// Anexa o token JWT na resposta do /login sem alterar a rota original
app.use("/login", (req, res, next) => {
  const jsonOriginal = res.json.bind(res);
  res.json = (corpo) => {
    if (res.statusCode === 200 && corpo && corpo.usuario && !corpo.token) {
      corpo.token = jwt.sign(
        { id: corpo.usuario.id },
        process.env.JWT_SECRET || "chave_secreta_mercado",
        { expiresIn: "2h" }
      );
    }
    return jsonOriginal(corpo);
  };
  next();
});
// Login de cliente
app.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({
      error: 'Informe o e-mail e a senha.'
    });
  }

  try {
    const [usuarios] = await pool.execute(
      `SELECT c.id_cliente, c.nome, c.email, s.senha
       FROM CLIENTE c
       INNER JOIN USUARIO s ON c.id_cliente = s.id_cliente
       WHERE c.email = ?`,
      [email.trim()]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({
        error: 'E-mail ou senha incorretos.'
      });
    }

    const usuario = usuarios[0];

    const senhaValida = await bcrypt.compare(
      senha,
      usuario.senha
    );

    if (!senhaValida) {
      return res.status(401).json({
        error: 'E-mail ou senha incorretos.'
      });
    }

    const token = jwt.sign(
      { id: usuario.id_cliente },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    return res.status(200).json({
      message: 'Login realizado com sucesso!',
      token,
      usuario: {
        id: usuario.id_cliente,
        nome: usuario.nome,
        email: usuario.email
      }
    });

  } catch (erro) {
    console.error('Erro no login:', erro);

    return res.status(500).json({
      error: 'Erro ao realizar login.'
    });
  }
});

// Consultar perfil do cliente autenticado
app.get('/cliente/perfil', autenticarCliente, async (req, res) => {
  try {
    const [clientes] = await pool.execute(
      `SELECT id_cliente, nome, email
       FROM CLIENTE
       WHERE id_cliente = ?`,
      [req.cliente.id]
    );

    if (clientes.length === 0) {
      return res.status(404).json({
        error: 'Cliente não encontrado.'
      });
    }

    return res.status(200).json(clientes[0]);

  } catch (erro) {
    console.error('Erro ao consultar perfil:', erro);

    return res.status(500).json({
      error: 'Erro ao consultar perfil.'
    });
  }
});

// Atualizar perfil do cliente autenticado
app.put('/cliente/perfil', autenticarCliente, async (req, res) => {
  const { nome, email, senhaAtual, novaSenha } = req.body;

  if (
    typeof nome !== 'string' ||
    typeof email !== 'string' ||
    typeof senhaAtual !== 'string' ||
    !nome.trim() ||
    !email.trim() ||
    !senhaAtual
  ) {
    return res.status(400).json({
      error: 'Preencha os campos obrigatórios.'
    });
  }

  const nomeLimpo = nome.trim();
  const emailLimpo = email.trim();

  if (nomeLimpo.length < 3) {
    return res.status(400).json({
      error: 'O nome deve ter pelo menos 3 caracteres.'
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) {
    return res.status(400).json({
      error: 'Digite um e-mail válido.'
    });
  }

  if (
    novaSenha !== undefined &&
    (typeof novaSenha !== 'string' || novaSenha.length < 8)
  ) {
    return res.status(400).json({
      error: 'A nova senha deve ter pelo menos 8 caracteres.'
    });
  }

  let conexao;

  try {
    conexao = await pool.getConnection();

    const [usuarios] = await conexao.execute(
      `SELECT senha
       FROM USUARIO
       WHERE id_cliente = ?`,
      [req.cliente.id]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({
        error: 'Usuário não encontrado.'
      });
    }

    // Verificar a senha atual
    const senhaValida = await bcrypt.compare(
      senhaAtual,
      usuarios[0].senha
    );

    if (!senhaValida) {
      return res.status(401).json({
        error: 'Senha atual incorreta.'
      });
    }

    await conexao.beginTransaction();

    // Atualizar nome e e-mail
    await conexao.execute(
      `UPDATE CLIENTE
       SET nome = ?, email = ?
       WHERE id_cliente = ?`,
      [nomeLimpo, emailLimpo, req.cliente.id]
    );

    // Atualizar senha somente se uma nova foi informada
    if (novaSenha) {
      const senhaHash = await bcrypt.hash(novaSenha, 10);

      await conexao.execute(
        `UPDATE USUARIO
         SET senha = ?
         WHERE id_cliente = ?`,
        [senhaHash, req.cliente.id]
      );
    }

    await conexao.commit();

    return res.status(200).json({
      message: 'Perfil atualizado com sucesso!',
      usuario: {
        id: req.cliente.id,
        nome: nomeLimpo,
        email: emailLimpo
      }
    });

  } catch (erro) {
    if (conexao) {
      await conexao.rollback();
    }

    if (erro.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'Este e-mail já está cadastrado.'
      });
    }

    console.error('Erro ao atualizar perfil:', erro);

    return res.status(500).json({
      error: 'Erro ao atualizar perfil.'
    });

  } finally {
    if (conexao) {
      conexao.release();
    }
  }
});

// Excluir perfil do cliente
app.delete('/cliente/perfil', autenticarCliente, async (req, res) => {
  const { senhaAtual } = req.body;

  if (!senhaAtual) {
    return res.status(400).json({
      error: 'Informe sua senha para confirmar a exclusão.'
    });
  }

  try {
    const [usuarios] = await pool.execute(
      `SELECT senha
       FROM USUARIO
       WHERE id_cliente = ?`,
      [req.cliente.id]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({
        error: 'Usuário não encontrado.'
      });
    }

    const senhaValida = await bcrypt.compare(
      senhaAtual,
      usuarios[0].senha
    );

    if (!senhaValida) {
      return res.status(401).json({
        error: 'Senha incorreta. Exclusão cancelada.'
      });
    }

    await pool.execute(
      'DELETE FROM CLIENTE WHERE id_cliente = ?',
      [req.cliente.id]
    );

    return res.status(200).json({
      message: 'Perfil excluído com sucesso!'
    });

  } catch (erro) {
    console.error('Erro ao excluir perfil:', erro);

    return res.status(500).json({
      error: 'Erro ao excluir perfil.'
    });
  }
});


 // Recuperar senha do cliente
app.put('/recuperar-senha', async (req, res) => {
  const { email, novaSenha } = req.body;

  if (
    typeof email !== 'string' ||
    typeof novaSenha !== 'string' ||
    !email.trim() ||
    !novaSenha
  ) {
    return res.status(400).json({
      error: 'Preencha todos os campos.'
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({
      error: 'Digite um e-mail válido.'
    });
  }

  if (novaSenha.length < 8) {
    return res.status(400).json({
      error: 'A senha deve ter pelo menos 8 caracteres.'
    });
  }

  try {
    // Localizar cliente pelo e-mail
    const [clientes] = await pool.execute(
      `SELECT id_cliente
       FROM CLIENTE
       WHERE email = ?`,
      [email.trim()]
    );

    if (clientes.length === 0) {
      return res.status(404).json({
        error: 'E-mail não encontrado.'
      });
    }

    const idCliente = clientes[0].id_cliente;

    // Criptografar nova senha
    const senhaHash = await bcrypt.hash(novaSenha, 10);

    // Atualizar senha do cliente
    const [resultado] = await pool.execute(
      `UPDATE USUARIO
       SET senha = ?
       WHERE id_cliente = ?`,
      [senhaHash, idCliente]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        error: 'Usuário não encontrado.'
      });
    }

    return res.status(200).json({
      message: 'Senha alterada com sucesso!'
    });

  } catch (erro) {
    console.error('Erro ao recuperar senha:', erro);

    return res.status(500).json({
      error: 'Erro ao alterar a senha.'
    });
  }
});

// Extrai o ID do cliente a partir do token JWT gerado no login/cadastro
function autenticarCliente(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token && token !== "null" && token !== "undefined") {
    try {
        const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "chave_secreta_mercado"
      );

      const idToken = Number(
        decoded &&
          (decoded.id ??
            decoded.id_cliente ??
            decoded.ID_cliente ??
            decoded.idCliente ??
            decoded.sub ??
            (decoded.usuario && decoded.usuario.id))
      );

      if (Number.isInteger(idToken) && idToken > 0) {
        req.idClienteAutenticado = idToken;
        return next();
      }
    } catch (erro) {
      return res.status(403).json({
        mensagem: "Token inválido ou expirado. Faça login novamente.",
      });
    }
  }

  // Fallback caso o frontend envie o id_cliente enquanto o token não estiver salvo no storage
  const idBody = Number(req.body.id_cliente);
  if (Number.isInteger(idBody) && idBody > 0) {
    req.idClienteAutenticado = idBody;
    return next();
  }

  return res.status(401).json({
    mensagem: "Cliente não autenticado. Faça login para continuar.",
  });
}

// Salva os arrays ids_produtos e quantidades na tabela LISTA_PRODUTO
app.post("/api/lista-produto", autenticarCliente, async (req, res) => {
  const id_cliente = req.idClienteAutenticado;
  const { ids_produtos, quantidades } = req.body;

  if (
    !Array.isArray(ids_produtos) ||
    !Array.isArray(quantidades) ||
    ids_produtos.length === 0 ||
    ids_produtos.length !== quantidades.length
  ) {
    return res.status(400).json({
      mensagem: "Dados inválidos.",
    });
  }

  const ids = new Set();

  for (let i = 0; i < ids_produtos.length; i++) {
    const idProd = Number(ids_produtos[i]);
    const qtd = Number(quantidades[i]);

    if (
      !Number.isInteger(idProd) ||
      idProd <= 0 ||
      !Number.isInteger(qtd) ||
      qtd <= 0 ||
      ids.has(idProd)
    ) {
      return res.status(400).json({
        mensagem: "Produto ou quantidade inválida.",
      });
    }

    ids.add(idProd);
  }

  let db;

  try {
    db = await pool.getConnection();
    await db.beginTransaction();

  const [cliente] = await db.execute(
      `SELECT ID_cliente FROM CLIENTE WHERE ID_cliente = ?`,
      [id_cliente]
    );

    if (cliente.length === 0) {
      await db.rollback();
      return res.status(404).json({
        mensagem: "Cliente não encontrado.",
      });
    }

    // Bloqueia nova lista caso o cliente já possua itens salvos no banco
    const [listaExistente] = await db.execute(
      `SELECT 1 FROM LISTA_PRODUTO WHERE ID_cliente = ? LIMIT 1`,
      [id_cliente]
    );

    if (listaExistente.length > 0) {
      await db.rollback();
      return res.status(409).json({
        mensagem: "Você já possui uma lista cadastrada. Exclua a lista atual antes de criar uma nova.",
      });
    }

    const sql = `
      INSERT INTO LISTA_PRODUTO
      (ID_cliente, ID_prod, quantidade)
      VALUES (?, ?, ?)`;

    for (let i = 0; i < ids_produtos.length; i++) {
      await db.execute(sql, [
        id_cliente,
        Number(ids_produtos[i]),
        Number(quantidades[i]),
      ]);
    }

    await db.commit();

    res.status(201).json({
      mensagem: "Lista de produtos salva com sucesso!",
    });
  } catch (erro) {
    if (db) await db.rollback();
    console.error(erro);
    res.status(500).json({
      mensagem: "Erro ao salvar a lista de produtos.",
    });
  } finally {
    if (db) db.release();
  }
});
// Exclui a lista salva do cliente autenticado para permitir criar uma nova
app.delete("/api/lista-produto", autenticarCliente, async (req, res) => {
  const id_cliente = req.idClienteAutenticado;

  try {
    const [resultado] = await pool.execute(
      `DELETE FROM LISTA_PRODUTO WHERE ID_cliente = ?`,
      [id_cliente]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        mensagem: "Nenhuma lista encontrada para excluir.",
      });
    }

    return res.status(200).json({
      mensagem: "Lista excluída com sucesso! Agora você já pode criar uma nova lista.",
    });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({
      mensagem: "Erro ao excluir a lista de produtos.",
    });
  }
});

// Consulta os itens salvos da lista de um cliente
app.get("/api/lista-produto/:id_cliente", async (req, res) => {
  const id_cliente = Number(req.params.id_cliente);

  if (!Number.isInteger(id_cliente) || id_cliente <= 0) {
    return res.status(400).json({
      mensagem: "ID do cliente inválido.",
    });
  }

  try {
    const [lista] = await pool.execute(
      `
      SELECT
        LP.ID_cliente,
        LP.ID_prod,
        P.nome,
        P.preco,
        LP.quantidade
      FROM LISTA_PRODUTO LP
      INNER JOIN PRODUTO P
        ON LP.ID_prod = P.ID_produto
      WHERE LP.ID_cliente = ?
      ORDER BY P.nome
      `,
      [id_cliente]
    );

    res.json(lista);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({
      mensagem: "Erro ao buscar lista.",
    });
  }
});
const PORTA = process.env.PORT || 3000;

app.listen(PORTA, () => {
  console.log(`Servidor rodando em http://localhost:${PORTA}`);
});
