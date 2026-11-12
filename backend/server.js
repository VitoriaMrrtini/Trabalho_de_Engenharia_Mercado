require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.get('/teste-conexao', async (req, res) => {
  try {
    const [resultado] = await pool.query('SELECT DATABASE() AS banco');
    res.json(resultado[0]);
  } catch (erro) {
    res.status(500).json({ error: erro.message });
  }
});

app.get('/produtos', async (req, res) => {
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
app.post('/cadastro', async (req, res) => {
  const { nome, email, senha } = req.body;

  // Validar os dados recebidos
  if (!nome || !email || !senha) {
    return res.status(400).json({
      error: 'Preencha todos os campos.'
    });
  }

  if (nome.trim().length < 3) {
    return res.status(400).json({
      error: 'O nome deve ter pelo menos 3 caracteres.'
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({
      error: 'Digite um e-mail válido.'
    });
  }

  if (senha.length < 8) {
    return res.status(400).json({
      error: 'A senha deve ter pelo menos 8 caracteres.'
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
      'INSERT INTO CLIENTE (nome, email) VALUES (?, ?)',
      [nome.trim(), email.trim()]
    );

    const idCliente = resultado.insertId;

    // Cadastrar senha vinculada ao cliente
    await conexao.execute(
      'INSERT INTO USUARIO (id_cliente, senha) VALUES (?, ?)',
      [idCliente, senhaHash]
    );

    await conexao.commit();

    return res.status(201).json({
      message: 'Cadastro realizado com sucesso!',
      idCliente
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

    console.error('Erro no cadastro:', erro);

    return res.status(500).json({
      error: 'Erro ao realizar cadastro.'
    });

  } finally {
    if (conexao) {
      conexao.release();
    }
  }
});

app.post('/api/lista-produto', async (req, res) => {

    const { id_cliente, produtos } = req.body;

    if (
        !Number.isInteger(id_cliente) ||
        id_cliente <= 0 ||
        !Array.isArray(produtos) ||
        produtos.length === 0
    ) {
        return res.status(400).json({
            mensagem: 'Dados inválidos.'
        });
    }

    const ids = new Set();

    for (const produto of produtos) {

        if (
            !Number.isInteger(produto.id_produto) ||
            produto.id_produto <= 0 ||
            !Number.isInteger(produto.quantidade) ||
            produto.quantidade <= 0 ||
            ids.has(produto.id_produto)
        ) {
            return res.status(400).json({
                mensagem: 'Produto ou quantidade inválida.'
            });
        }

        ids.add(produto.id_produto);
    }

    let db;

    try {

        db = await pool.getConnection();

        await db.beginTransaction();

        const [cliente] = await db.execute(
            `SELECT id_cliente FROM CLIENTE WHERE id_cliente = ?`,
            [id_cliente]
        );

        if (cliente.length === 0) {

            await db.rollback();

            return res.status(404).json({
                mensagem: 'Cliente não encontrado.'
            });
        }

        const sql = `
            INSERT INTO LISTA_PRODUTO
            (id_cliente, id_produto, quantidade)
            VALUES (?, ?, ?)

            ON DUPLICATE KEY UPDATE
            quantidade = VALUES(quantidade)
        `;

        for (const produto of produtos) {

            await db.execute(sql, [
                id_cliente,
                produto.id_produto,
                produto.quantidade
            ]);
        }

        await db.commit();

        res.status(201).json({
            mensagem: 'Lista de produtos salva com sucesso!'
        });

    } catch (erro) {

        if (db) await db.rollback();

        console.error(erro);

        res.status(500).json({
            mensagem: 'Erro ao salvar a lista de produtos.'
        });

    } finally {

        if (db) db.release();

    }

});

app.get('/api/lista-produto/:id_cliente', async (req, res) => {

    const id_cliente = Number(req.params.id_cliente);

    if (!Number.isInteger(id_cliente) || id_cliente <= 0) {

        return res.status(400).json({
            mensagem: 'ID do cliente inválido.'
        });
    }

    try {

        const [lista] = await pool.execute(`
            SELECT
                LP.id_cliente,
                LP.id_produto,
                P.nome,
                P.preco,
                LP.quantidade

            FROM LISTA_PRODUTO LP

            INNER JOIN PRODUTO P
                ON LP.id_produto = P.id_produto

            WHERE LP.id_cliente = ?

            ORDER BY P.nome
        `, [id_cliente]);

        res.json(lista);

    } catch (erro) {

        console.error(erro);

        res.status(500).json({
            mensagem: 'Erro ao buscar lista.'
        });

    }

});

const PORTA = process.env.PORT || 3000;
app.listen(PORTA, () => {
  console.log(`Servidor rodando em http://localhost:${PORTA}`);
});