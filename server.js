const express = require('express');
const db= require('./db');
const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  res.send('Servidor funcionando!');
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});