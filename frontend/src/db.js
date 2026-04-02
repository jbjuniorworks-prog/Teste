import Dexie from 'dexie';

export const db = new Dexie('LojaOfflineDB');

// Define as tabelas do banco local
db.version(2).stores({ // Aumentamos a versão para 2
  estoque: '++id, cliente, aparelho, imei, status, preco',
  concorrentes: '++id, loja, modelo, preco'
});