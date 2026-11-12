require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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

const PORTA = process.env.PORT || 3000;
app.listen(PORTA, () => {
  console.log(`Servidor rodando em http://localhost:${PORTA}`);
});