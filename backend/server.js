require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json());

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
      SELECT p.ID_produto, p.nome, p.preco, p.estoque, p.data_validade,
             c.nome AS categoria
      FROM PRODUTO p
      LEFT JOIN CATEGORIA_PRODUTO c ON c.ID_categoria = p.ID_categoria
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
      'INSERT INTO CLIENTE (nome, Email) VALUES (?, ?)',
      [nome.trim(), email.trim()]
    );

    const idCliente = resultado.insertId;

    // Cadastrar senha vinculada ao cliente
    await conexao.execute(
      'INSERT INTO SENHA (ID_cliente, senha) VALUES (?, ?)',
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

const PORTA = process.env.PORT || 3000;
app.listen(PORTA, () => {
  console.log(`Servidor rodando em http://localhost:${PORTA}`);
});