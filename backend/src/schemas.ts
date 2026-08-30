import { z } from 'zod';

export const esquemaEntradaTarea = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  completed: z.number().optional(),
}).strict();

export const esquemaActualizacionTarea = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  completed: z.number().optional(),
}).strict();

export function sanitizarCargaTarea(body: unknown) {
  const datosValidados = esquemaEntradaTarea.parse(body);
  const datosSanitizados: Record<string, unknown> = {};
  if (datosValidados.title !== undefined) datosSanitizados.title = datosValidados.title;
  if (datosValidados.description !== undefined) datosSanitizados.description = datosValidados.description;
  if (datosValidados.completed !== undefined) datosSanitizados.completed = datosValidados.completed;
  return datosSanitizados;
}
