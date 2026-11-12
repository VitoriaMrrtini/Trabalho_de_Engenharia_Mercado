//esse arquivo será responsável por cadastrar novos produtos e será importado pelo server.js, que iserirá esses dados ao banco


const produtos = [
  {
    nome: 'Leite  Condensado Integral',
    preco: 5.99,
    estoque: 25,
    data_validade: '2027-03-02',
    id_categoria: 2
  },
  {
    nome: 'Yorgute Botavo Pense Zero Morango',
    preco: 3.50,
    estoque: 15,
    data_validade: '2026-12-20',
    id_categoria: 2
  },
  {
    nome: 'Creme de leite fresco Quatá 500ml',
    preco: 29.99,
    estoque: 10,
    data_validade: '2026-12-29',
    id_categoria: 2
  }
];

module.exports = produtos;
