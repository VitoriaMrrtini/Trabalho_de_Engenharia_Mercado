// backend/server.js
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();

// Permite que o seu arquivo HTML acesse esta API
app.use(cors());
app.use(express.json());

// Configuração da conexão com o MySQL
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',          // Seu usuário do MySQL
  password: 'sua_senha',  // Sua senha do MySQL
  database: 'seu_banco'   // O nome do seu banco de dados
});

db.connect((err) => {
  if (err) {
    console.error('Erro ao conectar ao MySQL:', err);
    return;
  }
  console.log('Conectado ao MySQL com sucesso!');
});

// Rota para buscar dados do banco
app.get('/produtos', (req, res) => {
  const query = 'SELECT * FROM produtos'; // Substitua pela sua tabela
  
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results); // Envia os dados para o frontend
  });
});

// Inicia o servidor na porta 3006
app.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3006');
});
