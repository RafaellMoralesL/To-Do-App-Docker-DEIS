import { useState, useEffect, useCallback } from 'react';
interface Tarea {
  id: number;
  tituloTarea: string;
  descripcionTarea: string | null;
  completed: number;
}
export default function App() {
  const [listaTareas, setListaTareas] = useState<Tarea[]>([]);
  const [tituloTarea, setTituloTarea] = useState('');
  const [descripcionTarea, setDescripcionTarea] = useState('');
  const obtenerTareas = useCallback(async () => {
    try {
      const respuesta = await fetch('/api/tasks');
      const datos = await respuesta.json();
      const tareasTransformadas = Array.isArray(datos) ? datos.map((elemento: any) => ({
        id: elemento.id,
        tituloTarea: elemento.title,
        descripcionTarea: elemento.description,
        completed: elemento.completed,
      })) : [];
      setListaTareas(tareasTransformadas);
    } catch {
    }
  }, []);
  useEffect(() => {
    obtenerTareas();
  }, [obtenerTareas]);
  const manejarAgregar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!tituloTarea.trim()) return;
    try {
      const respuesta = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: tituloTarea, description: descripcionTarea }),
      });
      if (respuesta.ok) {
        setTituloTarea('');
        setDescripcionTarea('');
        obtenerTareas();
      }
    } catch {
    }
  };
  const manejarAlternar = async (id: number, completed: number) => {
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: completed ? 0 : 1 }),
      });
      obtenerTareas();
    } catch {
    }
  };
  const manejarEliminar = async (id: number) => {
    try {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      obtenerTareas();
    } catch {
    }
  };
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <header className="mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Lista de Tareas
          </h1>
        </header>
        <form onSubmit={manejarAgregar} className="mb-8 p-6 rounded-xl border border-slate-800 bg-slate-800/40 shadow-xl backdrop-blur-sm">
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Título de la tarea..."
              value={tituloTarea}
              onChange={(evento) => setTituloTarea(evento.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition"
            />
            <textarea
              placeholder="Descripción (opcional)..."
              value={descripcionTarea}
              onChange={(evento) => setDescripcionTarea(evento.target.value)}
              rows={2}
              className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition resize-none"
            />
            <button
              type="submit"
              className="self-start px-6 py-3 rounded-lg font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg shadow-indigo-900/20 transition cursor-pointer"
            >
              Agregar Tarea
            </button>
          </div>
        </form>
        <section className="space-y-4">
          {listaTareas.length === 0 && (
            <p className="text-slate-500 text-center py-8">No hay tareas aún. Agrega una arriba.</p>
          )}
          {listaTareas.map((tareaActual) => (
            <article
              key={tareaActual.id}
              className="group flex items-center gap-4 p-5 rounded-xl border border-slate-800 bg-slate-800/30 hover:bg-slate-800/60 transition shadow-sm"
            >
              <button
                type="button"
                onClick={() => manejarAlternar(tareaActual.id, tareaActual.completed)}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition cursor-pointer ${
                  tareaActual.completed ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600 hover:border-indigo-400'
                }`}
                aria-label={tareaActual.completed ? 'Marcar como incompleta' : 'Marcar como completa'}
              >
                {tareaActual.completed ? (
                  <span className="text-white text-xs">✓</span>
                ) : null}
              </button>
              <div className="flex-1 min-w-0">
                <h3 className={`font-semibold text-lg truncate ${tareaActual.completed ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                  {tareaActual.tituloTarea}
                </h3>
                {tareaActual.descripcionTarea ? (
                  <p className="text-sm text-slate-400 truncate">{tareaActual.descripcionTarea}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => manejarEliminar(tareaActual.id)}
                className="px-3 py-2 text-xs font-medium rounded-md bg-slate-900 border border-slate-800 text-red-400 hover:text-red-300 hover:border-red-700 transition cursor-pointer"
                aria-label="Eliminar tarea"
              >
                Eliminar
              </button>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
