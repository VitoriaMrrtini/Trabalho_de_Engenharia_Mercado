require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');

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

const PORTA = process.env.PORT || 3000;
app.listen(PORTA, () => {
  console.log(`Servidor rodando em http://localhost:${PORTA}`);
});