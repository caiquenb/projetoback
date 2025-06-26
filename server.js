const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

require('dotenv').config();

const dbHost = process.env.DB_HOST;
// e outras variáveis de conexão




const app = express();
const PORT = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());

// Conexão com o banco de dados
// const pool = mysql.createPool({
//   host: 'localhost',
//   user: 'root',
//   password: '1234',
//   database: 'himaflexn1',
// });


const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  ...(process.env.DB_USE_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {})
});

// ROTAS -----------------------------

// GET /usuarios - lista todos os usuários
app.get('/usuarios', async (req, res) => {
  try {
    const [results] = await pool.query('SELECT * FROM usuarios');
    res.json(results);
  } catch (err) {
    console.error('Erro ao buscar usuários:', err.message);
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

// POST /usuarios - cadastra novo usuário
app.post('/usuarios', async (req, res) => {
  const { login, senha } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO usuarios (login, senha) VALUES (?, ?)',
      [login, senha]
    );
    res.json({ id: result.insertId, login, senha });
  } catch (err) {
    console.error('Erro ao inserir usuário:', err.message);
    res.status(500).json({ error: 'Erro ao inserir usuário' });
  }
});

// POST /login - autentica usuário
app.post('/login', async (req, res) => {
  console.log("Dados recebidos:", req.body);
  const { login, senha } = req.body;
  try {
    const [results] = await pool.query(
      'SELECT * FROM usuarios WHERE login = ? AND senha = ?',
      [login, senha]
    );

    if (results.length > 0) {
      res.json(results[0]);
    } else {
      res.status(401).json({ erro: 'Usuário ou senha inválidos' });
    }
  } catch (err) {
    console.error('Erro no login:', err.message);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});

// Rota para buscar produto pelo código de produção
app.get('/api/produto/:codProducao', async (req, res) => {
  const codProducao = req.params.codProducao;
  console.log("Buscando produto com código:", codProducao);

  const query = "SELECT nome_produto, peso FROM produto WHERE codProducao = ? LIMIT 1";

  try {
    const [results] = await pool.query(query, [codProducao]);

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: "Produto não encontrado" });
    }

    return res.json({ success: true, data: results[0] });
  } catch (err) {
    console.error("Erro ao buscar produto:", err);
    return res.status(500).json({ success: false, message: "Erro interno no servidor" });
  }
});




// POST /api/formulario - insere dados de produção
app.post('/api/formulario', async (req, res) => {
  try {
    const {
      data, setor, turno, linha, codProducao, produto, peso, codigo_of,
      prodM, prodKg, refugo, motivoRefugo, retalhoM, retalhoKg, motivoRetalho,
      codParada1, descParada1, hrsParada1, codParada2, descParada2, hrsParada2,
      codParada3, descParada3, hrsParada3, totalHorasParadas,
    } = req.body;

    const query = `
  INSERT INTO producao (
    data, setor, turno, linha, codProducao, produto, peso, codigo_of,
    prodM, prodKg, refugo, motivoRefugo, retalhoM, retalhoKg, motivoRetalho,
    codParada1, descParada1, hrsParada1, codParada2, descParada2, hrsParada2,
    codParada3, descParada3, hrsParada3, totalHorasParadas
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;


    const values = [
      data, setor, turno, linha, codProducao, produto, peso, codigo_of,
      prodM, prodKg, refugo, motivoRefugo, retalhoM, retalhoKg, motivoRetalho,
      codParada1, descParada1, hrsParada1, codParada2, descParada2, hrsParada2,
      codParada3, descParada3, hrsParada3, totalHorasParadas
    ];

    await pool.query(query, values);

    res.json({ success: true, message: 'Dados inseridos com sucesso!' });
  } catch (error) {
    console.error('Erro ao salvar dados:', error.message);
    console.error(error.stack);
    res.status(500).json({ erro: 'Erro ao salvar dados' });
  }
});



app.get('/api/producao/total/:codProducao', async (req, res) => {
  const codProducao = req.params.codProducao;
  try {
    const query = `
      SELECT 
        codProducao, 
        produto, 
        SUM(prodM) AS total_metros, 
        SUM(prodKg) AS total_kg
      FROM producao
      WHERE codProducao = ?
      GROUP BY codProducao, produto
    `;

    const [results] = await pool.query(query, [codProducao]);

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: "Produto não encontrado" });
    }

    return res.json({ success: true, data: results[0] });
  } catch (err) {
    console.error("Erro ao buscar total produção:", err);
    return res.status(500).json({ success: false, message: "Erro interno no servidor" });
  }
});


// GET /produtos -------------- Comeco da listagem
app.get('/api/producao/recentes', async (req, res) => {
  try {
    // Buscar últimos 5 registros da tabela producao, ordenando pelo id (ou data, se preferir)
    const [resultados] = await pool.query('SELECT * FROM producao ORDER BY id DESC LIMIT 5');
    res.json({ success: true, data: resultados });
  } catch (err) {
    console.error('Erro ao buscar producao recente:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});


app.delete('/api/producao/:id', async (req, res) => {
  console.log('DELETE recebida para id:', req.params.id);
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM producao WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir produção:', err.message);
    res.status(500).json({ success: false });
  }
});

// routes/producao.js (ou onde estiver sua rota de produção)
app.put('/api/producao/:id', async (req, res) => {
  const { id } = req.params;
  const dados = req.body;

  try {
    const [resultado] = await pool.query(
  `UPDATE producao SET
    data = ?, linha = ?, codProducao = ?, produto = ?, peso = ?,
    codigo_of = ?, prodM = ?, prodKg = ?, refugo = ?, motivoRefugo = ?,
    retalhoM = ?, retalhoKg = ?, motivoRetalho = ?,
    codParada1 = ?, descParada1 = ?, hrsParada1 = ?,
    codParada2 = ?, descParada2 = ?, hrsParada2 = ?,
    codParada3 = ?, descParada3 = ?, hrsParada3 = ?,
    totalHorasParadas = ?, setor = ?, turno = ?
  WHERE id = ?`,
  [
    dados.data, dados.linha, dados.codProducao, dados.produto, dados.peso,
    dados.codigo_of, dados.prodM, dados.prodKg, dados.refugo, dados.motivoRefugo,
    dados.retalhoM, dados.retalhoKg, dados.motivoRetalho,
    dados.codParada1, dados.descParada1, dados.hrsParada1,
    dados.codParada2, dados.descParada2, dados.hrsParada2,
    dados.codParada3, dados.descParada3, dados.hrsParada3,
    dados.totalHorasParadas, dados.setor, dados.turno,
    id
  ]
);


    if (resultado.affectedRows > 0) {
      res.json({ success: true, message: "Atualizado com sucesso!" });
    } else {
      res.json({ success: false, message: "Registro não encontrado." });
    }
  } catch (err) {
    console.error("Erro ao atualizar produção:", err);
    res.status(500).json({ success: false, message: "Erro no servidor." });
  }
});

app.get("/ping", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 + 1 AS resultado");
    res.json({ sucesso: true, resultado: rows[0].resultado });
  } catch (err) {
    console.error("Erro na conexão com o banco:", err.message);
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});



// INICIAR SERVIDOR -------------------
app.listen(PORT, () => {
  console.log(`Servidor backend rodando na porta ${PORT}`);
});
