import { z } from 'zod';


export const ESTADOS_TAREA = ['PENDIENTE', 'EN PROGRESO', 'COMPLETADA'] as const;

export type EstadoTarea = (typeof ESTADOS_TAREA)[number];


const MAX_TITULO = 100;
const MAX_DESCRIPCION = 500;

const campoTitulo = z
  .string({ message: 'Title must be a string' })
  .trim()
  .min(1, 'Title is required')
  .max(MAX_TITULO, `Title must be at most ${MAX_TITULO} characters`);

const campoDescripcion = z
  .string({ message: 'Description must be a string' })
  .trim()
  .max(MAX_DESCRIPCION, `Description must be at most ${MAX_DESCRIPCION} characters`)

  .transform((valor) => (valor.length === 0 ? undefined : valor));

const campoEstado = z.enum(ESTADOS_TAREA, { message: `Estado must be one of: ${ESTADOS_TAREA.join(', ')}` });


export const esquemaCreacionTarea = z
  .object({
    title: campoTitulo,
    description: campoDescripcion.optional(),
    estado: campoEstado.default('PENDIENTE'),
  })
  .strict();


export const esquemaActualizacionTarea = z
  .object({
    title: campoTitulo.optional(),
    description: campoDescripcion.optional(),
    estado: campoEstado.optional(),
  })
  .strict();

export type TareaCreacion = z.infer<typeof esquemaCreacionTarea>;
export type TareaActualizacion = z.infer<typeof esquemaActualizacionTarea>;
