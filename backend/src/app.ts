import express, { Request, Response, NextFunction, Express } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ZodError } from 'zod';
import { esquemaCreacionTarea, esquemaActualizacionTarea, type EstadoTarea } from './schemas';
import { queryAll, queryOne, executeRun } from './database';

type TareaRecord = {
  id?: number;
  title: string;
  description?: string | null;
  estado: EstadoTarea;
  created_at?: string;
};

const servidorWeb: Express = express();
servidorWeb.disable('x-powered-by')

servidorWeb.set('trust proxy', 1);


const limitadorSolicitudes = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 10000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.RATE_LIMIT_DISABLED === 'true',
  message: { error: 'Too many requests, please try again later.' },
});
servidorWeb.use(limitadorSolicitudes);

servidorWeb.use(express.json({ limit: '16kb' }));

servidorWeb.post('/api/tasks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cargaDatos = esquemaCreacionTarea.parse(req.body);
    const resultado = await executeRun(

      'INSERT INTO todos (title, description, estado, created_at) VALUES (?, ?, ?, datetime(\'now\'))',
      [cargaDatos.title, cargaDatos.description ?? null, cargaDatos.estado]
    );

    const tareaRecienCreada = await queryOne<TareaRecord>('SELECT * FROM todos WHERE id = ?', [resultado.lastID]);
    if (!tareaRecienCreada) {
      return res.status(500).json({ error: 'Failed to retrieve created task' });
    }

    res.status(201).json(tareaRecienCreada);
  } catch (error) {
    next(error);
  }
});

servidorWeb.get('/api/tasks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const registros = await queryAll<TareaRecord>('SELECT * FROM todos');
    res.json(registros);
  } catch (error) {
    next(error);
  }
});

servidorWeb.get('/api/tasks/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const identificadorParametro = req.params.id;
    const registroResultado = await queryOne<TareaRecord>('SELECT * FROM todos WHERE id = ?', [identificadorParametro]);

    if (!registroResultado) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.json(registroResultado);
  } catch (error) {
    next(error);
  }
});

servidorWeb.put('/api/tasks/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cuerpoActualizacion = esquemaActualizacionTarea.parse(req.body);
    const identificadorParametro = req.params.id;

    const camposActualizados: string[] = [];
    const valoresActualizados: (string | number | null)[] = [];

    if (cuerpoActualizacion.title !== undefined) {
      camposActualizados.push('title = ?');
      valoresActualizados.push(cuerpoActualizacion.title);
    }

    if (cuerpoActualizacion.description !== undefined) {
      camposActualizados.push('description = ?');
      valoresActualizados.push(cuerpoActualizacion.description ?? null);
    }

    if (cuerpoActualizacion.estado !== undefined) {
      camposActualizados.push('estado = ?');
      valoresActualizados.push(cuerpoActualizacion.estado);
    }

    if (camposActualizados.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    await executeRun(
      `UPDATE todos SET ${camposActualizados.join(', ')} WHERE id = ?`,
      [...valoresActualizados, identificadorParametro]
    );

    const registroActualizado = await queryOne<TareaRecord>('SELECT * FROM todos WHERE id = ?', [identificadorParametro]);
    if (!registroActualizado) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.json(registroActualizado);
  } catch (error) {
    next(error);
  }
});

servidorWeb.delete('/api/tasks/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const identificadorParametro = req.params.id;
    const resultado = await executeRun('DELETE FROM todos WHERE id = ?', [identificadorParametro]);

    if (resultado.changes === 0) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

servidorWeb.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {

  if (error instanceof ZodError) {
    return res.status(400).json({
      error: 'Invalid request payload',
      details: error.issues.map((problema) => ({
        path: problema.path.join('.'),
        message: problema.message,
      })),
    });
  }

  if (error instanceof Error) {
    console.error('Error no manejado:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
  console.error('Error desconocido:', error);
  res.status(500).json({ error: 'Internal server error' });
});

servidorWeb.use(express.static('public'));

export default servidorWeb;
