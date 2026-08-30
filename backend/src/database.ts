import sqlite3 from 'sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const directorioBaseDatos = '/backend/data';
const archivoBaseDatos = path.join(directorioBaseDatos, 'todo.db');

export function inicializarBaseDatos(): sqlite3.Database {
  if (!fs.existsSync(directorioBaseDatos)) {
    fs.mkdirSync(directorioBaseDatos, { recursive: true, mode: 0o755 });
  }

  const baseDatos = new sqlite3.Database(archivoBaseDatos);

  baseDatos.serialize(() => {
    baseDatos.run(`CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      completed INTEGER DEFAULT 0
    )`);
  });

  return baseDatos;
}

export function obtenerBaseDatos(): sqlite3.Database {
  return inicializarBaseDatos();
}
