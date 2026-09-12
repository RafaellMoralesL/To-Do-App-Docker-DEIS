import sqlite3 from 'sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const directorioBaseDatos = '/backend/data';
const archivoBaseDatos = path.join(directorioBaseDatos, 'todo.db');

function asegurarDirectorioBaseDatos(): void {
  if (!fs.existsSync(directorioBaseDatos)) {
    fs.mkdirSync(directorioBaseDatos, { recursive: true, mode: 0o755 });
  }
}

function abrirConexion(): Promise<sqlite3.Database> {
  return new Promise((resolve, reject) => {
    const baseDatos = new sqlite3.Database(archivoBaseDatos, (error) => {
      if (error) reject(error);
      else resolve(baseDatos);
    });
  });
}


function ejecutar(baseDatos: sqlite3.Database, sql: string, params: unknown[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    baseDatos.run(sql, params, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function consultarFilas<T>(baseDatos: sqlite3.Database, sql: string, params: unknown[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    baseDatos.all(sql, params, (error, filas) => {
      if (error) reject(error);
      else resolve(filas as T[]);
    });
  });
}


async function aplicarEsquemaYMigraciones(baseDatos: sqlite3.Database): Promise<void> {
  await ejecutar(
    baseDatos,
    `
    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      estado TEXT NOT NULL DEFAULT 'PENDIENTE',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
    `
  );

  const filas = await consultarFilas<{ name: string }>(baseDatos, 'PRAGMA table_info(todos)');
  const columnas = new Set(filas.map((fila) => fila.name));

  if (!columnas.has('estado')) {
    await ejecutar(baseDatos, "ALTER TABLE todos ADD COLUMN estado TEXT NOT NULL DEFAULT 'PENDIENTE'");
    await ejecutar(
      baseDatos,
      "UPDATE todos SET estado = CASE WHEN completed = 1 THEN 'COMPLETADA' ELSE 'PENDIENTE' END"
    );
  }

  if (!columnas.has('created_at')) {
    await ejecutar(baseDatos, 'ALTER TABLE todos ADD COLUMN created_at TEXT');
  }


  await ejecutar(baseDatos, "UPDATE todos SET created_at = datetime('now') WHERE created_at IS NULL");
}

let conexionBaseDatos: Promise<sqlite3.Database> | undefined;

export function obtenerBaseDatos(): Promise<sqlite3.Database> {
  conexionBaseDatos ??= (async () => {
    asegurarDirectorioBaseDatos();
    const baseDatos = await abrirConexion();
    await aplicarEsquemaYMigraciones(baseDatos);
    return baseDatos;
  })();
  return conexionBaseDatos;
}


export async function queryAll<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const baseDatos = await obtenerBaseDatos();
  return new Promise((resolve, reject) => {
    baseDatos.all(sql, params, (error, filas) => {
      if (error) return reject(error);
      resolve(filas as T[]);
    });
  });
}

export async function queryOne<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  const baseDatos = await obtenerBaseDatos();
  return new Promise((resolve, reject) => {
    baseDatos.get(sql, params, (error, fila) => {
      if (error) return reject(error);
      resolve(fila as T | undefined);
    });
  });
}

export async function executeRun(sql: string, params: unknown[] = []): Promise<{ lastID: number; changes: number }> {
  const baseDatos = await obtenerBaseDatos();
  return new Promise((resolve, reject) => {
    baseDatos.run(sql, params, function (error) {
      if (error) return reject(error);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}
