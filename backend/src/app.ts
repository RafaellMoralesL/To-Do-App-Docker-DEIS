import express, { Request, Response, NextFunction, Express } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { sanitizarCargaTarea, esquemaActualizacionTarea } from './schemas';
import { obtenerBaseDatos } from './database';

const servidorWeb: Express = express();



servidorWeb.use(helmet());

const limitadorSolicitudes = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
servidorWeb.use(limitadorSolicitudes);

servidorWeb.use(express.json());

servidorWeb.post('/api/tasks', (req: Request, res: Response, next: NextFunction) => {
  try {
    const cargaDatos = sanitizarCargaTarea(req.body);
    const baseDatos = obtenerBaseDatos();

    const consultaPreparada = baseDatos.prepare('INSERT INTO todos (title, description, completed) VALUES (?, ?, ?)');
    consultaPreparada.run(cargaDatos.title, cargaDatos.description || null, cargaDatos.completed ?? 0, function (this: any, error: Error | null) {
      if (error) {
        return next(error);
      }
      const identificadorNuevo = this.lastID;
      consultaPreparada.finalize();
      baseDatos.get('SELECT * FROM todos WHERE id = ?', [identificadorNuevo], (errorLectura, registroResultado) => {
        if (errorLectura) return next(errorLectura);
        res.status(201).json(registroResultado);
      });
    });
  } catch (error) {
    next(error);
  }
});

servidorWeb.get('/api/tasks', (req: Request, res: Response, next: NextFunction) => {
  try {
    const baseDatos = obtenerBaseDatos();
    baseDatos.all('SELECT * FROM todos', (error, registros) => {
      if (error) return next(error);
      res.json(registros || []);
    });
  } catch (error) {
    next(error);
  }
});

servidorWeb.put('/api/tasks/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const datosValidados = esquemaActualizacionTarea.parse(req.body);
    const datosSanitizados: Record<string, unknown> = {};
    if (datosValidados.title !== undefined) datosSanitizados.title = datosValidados.title;
    if (datosValidados.description !== undefined) datosSanitizados.description = datosValidados.description;
    if (datosValidados.completed !== undefined) datosSanitizados.completed = datosValidados.completed;

    const identificadorParametro = req.params.id;
    const baseDatos = obtenerBaseDatos();

    const camposActualizados: string[] = [];
    const valoresActualizados: (string | number | null)[] = [];

    for (const [key, val] of Object.entries(datosSanitizados)) {
      camposActualizados.push(`${key} = ?`);
      valoresActualizados.push(val as string | number | null);
    }
    valoresActualizados.push(identificadorParametro as string);

    if (camposActualizados.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    baseDatos.run(`UPDATE todos SET ${camposActualizados.join(', ')} WHERE id = ?`, valoresActualizados, function (error) {
      if (error) return next(error);
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Not found' });
      }
      baseDatos.get('SELECT * FROM todos WHERE id = ?', [identificadorParametro], (errorLectura, registroResultado) => {
        if (errorLectura) return next(errorLectura);
        res.json(registroResultado);
      });
    });
  } catch (error) {
    next(error);
  }
});

servidorWeb.delete('/api/tasks/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const identificadorParametro = req.params.id;
    const baseDatos = obtenerBaseDatos();
    baseDatos.run('DELETE FROM todos WHERE id = ?', [identificadorParametro], function (error) {
      if (error) return next(error);
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Not found' });
      }
      res.status(204).send();
    });
  } catch (error) {
    next(error);
  }
});

servidorWeb.use((error: any, req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ error: 'Internal server error' });
});

servidorWeb.use(express.static('public'));

export default servidorWeb;
