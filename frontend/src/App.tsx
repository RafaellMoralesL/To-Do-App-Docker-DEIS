import { useState, useEffect, useCallback, useMemo } from 'react';

type EstadoTarea = 'PENDIENTE' | 'EN PROGRESO' | 'COMPLETADA';

type FiltroEstado = EstadoTarea | 'TODAS';

interface TareaRaw {
  id?: number;
  title: string;
  description?: string | null;
  estado: string;
  created_at?: string;
}

interface Tarea {
  id: number;
  tituloTarea: string;
  descripcionTarea: string | null;
  estado: EstadoTarea;
  fechaCreacion: string | null;
}

const iconosEstado: Record<EstadoTarea, string> = {
  'PENDIENTE': '○',
  'EN PROGRESO': '◐',
  'COMPLETADA': '✓',
};

const ESTADOS: EstadoTarea[] = ['PENDIENTE', 'EN PROGRESO', 'COMPLETADA'];

const LIMITE_TITULO = 100;
const LIMITE_DESCRIPCION = 500;

const estilosPorEstado: Record<EstadoTarea, { tarjeta: string; indicador: string; icono: string }> = {
  PENDIENTE: {
    tarjeta: 'bg-slate-800/30 border-slate-700/50',
    indicador: 'bg-slate-500',
    icono: 'text-slate-600',
  },
  'EN PROGRESO': {
    tarjeta: 'bg-indigo-950/30 border-indigo-800/40',
    indicador: 'bg-indigo-400',
    icono: 'text-indigo-400',
  },
  COMPLETADA: {
    tarjeta: 'bg-emerald-950/20 border-emerald-800/40',
    indicador: 'bg-emerald-400',
    icono: 'text-slate-500',
  },
};

function transformarTarea(tareaRaw: TareaRaw): Tarea {
  return {
    id: tareaRaw.id ?? 0,
    tituloTarea: tareaRaw.title ?? '',
    descripcionTarea: tareaRaw.description ?? null,
    estado: (tareaRaw.estado ?? 'PENDIENTE') as EstadoTarea,
    fechaCreacion: tareaRaw.created_at ?? null,
  };
}

export default function App() {
  const [listaTareas, setListaTareas] = useState<Tarea[]>([]);
  const [tituloTarea, setTituloTarea] = useState('');
  const [descripcionTarea, setDescripcionTarea] = useState('');
  const [nuevoEstado, setNuevoEstado] = useState<EstadoTarea>('PENDIENTE');
  const [filtroActivo, setFiltroActivo] = useState<FiltroEstado>('TODAS');
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [idTareaEditando, setIdTareaEditando] = useState<number | null>(null);
  const [tituloEdicion, setTituloEdicion] = useState('');
  const [descripcionEdicion, setDescripcionEdicion] = useState('');

  const obtenerTareas = useCallback(async () => {
    try {
      setCargando(true);
      const respuesta = await fetch('/api/tasks');
      if (!respuesta.ok) {
        throw new Error(`El servidor respondió con estado ${respuesta.status}`);
      }
      const datos = await respuesta.json();
      const tareasTransformadas = Array.isArray(datos)
        ? datos.map((elemento: TareaRaw) => transformarTarea(elemento))
        : [];
      setListaTareas(tareasTransformadas);
      setMensajeError(null);
    } catch {
      setMensajeError('No se pudieron cargar las tareas. Verifica tu conexión e inténtalo de nuevo.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    obtenerTareas();
  }, [obtenerTareas]);

  const manejarAgregar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!tituloTarea.trim() || enviando) return;
    setEnviando(true);
    try {
      const respuesta = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: tituloTarea,
          description: descripcionTarea,
          estado: nuevoEstado,
        }),
      });
      if (!respuesta.ok) {
        setMensajeError('No se pudo crear la tarea. Revisa los datos e inténtalo de nuevo.');
        return;
      }
      setTituloTarea('');
      setDescripcionTarea('');
      setNuevoEstado('PENDIENTE');
      setMensajeError(null);
      await obtenerTareas();
    } catch {
      setMensajeError('Error de red al crear la tarea. Inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  const manejarActualizarEstado = async (id: number, estado: EstadoTarea) => {
    try {
      const respuesta = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado }),
      });
      if (!respuesta.ok) {
        setMensajeError('No se pudo actualizar el estado de la tarea.');
        return;
      }
      setMensajeError(null);
      await obtenerTareas();
    } catch {
      setMensajeError('Error de red al actualizar el estado. Inténtalo de nuevo.');
    }
  };

  const manejarEliminar = async (id: number) => {
    try {
      const respuesta = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (!respuesta.ok) {
        setMensajeError('No se pudo eliminar la tarea.');
        return;
      }
      setMensajeError(null);
      await obtenerTareas();
    } catch {
      setMensajeError('Error de red al eliminar la tarea. Inténtalo de nuevo.');
    }
  };

  const iniciarEdicion = (tarea: Tarea) => {
    setIdTareaEditando(tarea.id);
    setTituloEdicion(tarea.tituloTarea);
    setDescripcionEdicion(tarea.descripcionTarea ?? '');
  };

  const cancelarEdicion = () => {
    setIdTareaEditando(null);
    setTituloEdicion('');
    setDescripcionEdicion('');
  };

  const manejarGuardarEdicion = async () => {
    if (idTareaEditando === null || !tituloEdicion.trim() || enviando) return;
    setEnviando(true);
    try {
      const respuesta = await fetch(`/api/tasks/${idTareaEditando}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: tituloEdicion, description: descripcionEdicion }),
      });
      if (!respuesta.ok) {
        setMensajeError('No se pudo guardar la edición de la tarea.');
        return;
      }
      setMensajeError(null);
      cancelarEdicion();
      await obtenerTareas();
    } catch {
      setMensajeError('Error de red al guardar la edición. Inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  const contadorPorEstado = useMemo(() => {
    const contadores: Record<FiltroEstado, number> = {
      TODAS: listaTareas.length,
      PENDIENTE: 0,
      'EN PROGRESO': 0,
      COMPLETADA: 0,
    };
    for (const tareaActual of listaTareas) {
      contadores[tareaActual.estado] = (contadores[tareaActual.estado] ?? 0) + 1;
    }
    return contadores;
  }, [listaTareas]);

  const tareasFiltradas = useMemo(() => {
    if (filtroActivo === 'TODAS') return listaTareas;
    return listaTareas.filter((tareaActual) => tareaActual.estado === filtroActivo);
  }, [listaTareas, filtroActivo]);

  const mensajeListaVacia = listaTareas.length === 0
    ? 'No hay tareas aún. Agrega una arriba.'
    : 'No hay tareas con este estado.';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              TodoList
            </h1>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/40 text-indigo-300">
              v2.0
            </span>
          </div>
          <p className="text-sm text-slate-500">Gestor de tareas con filtro por estado</p>
        </header>

        {/* Formulario de creación */}
        <form onSubmit={manejarAgregar} className="mb-8 p-6 rounded-xl border border-slate-800 bg-slate-800/40 shadow-xl backdrop-blur-sm">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">Nueva Tarea</h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="titulo-nueva-tarea" className="block text-xs text-slate-500 mb-1.5 font-medium">
                Título * <span className="text-slate-600">({tituloTarea.length}/{LIMITE_TITULO})</span>
              </label>
              <input
                id="titulo-nueva-tarea"
                type="text"
                placeholder="Ej: Revisar informe mensual"
                value={tituloTarea}
                maxLength={LIMITE_TITULO}
                onChange={(evento) => setTituloTarea(evento.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition"
              />
            </div>

            <div>
              <label htmlFor="descripcion-nueva-tarea" className="block text-xs text-slate-500 mb-1.5 font-medium">
                Descripción (opcional) <span className="text-slate-600">({descripcionTarea.length}/{LIMITE_DESCRIPCION})</span>
              </label>
              <textarea
                id="descripcion-nueva-tarea"
                placeholder="Detalles adicionales..."
                value={descripcionTarea}
                maxLength={LIMITE_DESCRIPCION}
                onChange={(evento) => setDescripcionTarea(evento.target.value)}
                rows={2}
                className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition resize-none"
              />
            </div>

            <div className="flex items-center gap-4 pt-2">
              <div className="flex-1">
                <label htmlFor="estado-inicial-tarea" className="block text-xs text-slate-500 mb-1.5 font-medium">Estado inicial</label>
                <div className="relative">
                  <select
                    id="estado-inicial-tarea"
                    value={nuevoEstado}
                    onChange={(evento) => setNuevoEstado(evento.target.value as EstadoTarea)}
                    className="w-full appearance-none px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition cursor-pointer pr-8"
                  >
                    <option value="PENDIENTE"> ○  Pendiente</option>
                    <option value="EN PROGRESO"> ◐  En progreso</option>
                    <option value="COMPLETADA"> ✓  Completada</option>
                  </select>
                  <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              <button
                type="submit"
                disabled={enviando || !tituloTarea.trim()}
                className="px-6 py-2.5 rounded-lg font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-lg shadow-indigo-900/20 transition cursor-pointer whitespace-nowrap"
              >
                {enviando ? 'Agregando...' : 'Agregar'}
              </button>
            </div>
          </div>
        </form>

        {/* Banner de error global */}
        {mensajeError && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 p-4 rounded-xl border border-red-800/50 bg-red-950/40 text-red-300"
          >
            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm">{mensajeError}</p>
              <button
                type="button"
                onClick={obtenerTareas}
                className="mt-2 text-xs font-semibold text-red-200 underline underline-offset-2 hover:text-white transition cursor-pointer"
              >
                Reintentar
              </button>
            </div>
            <button
              type="button"
              onClick={() => setMensajeError(null)}
              className="shrink-0 text-red-400 hover:text-red-200 transition cursor-pointer"
              aria-label="Cerrar mensaje de error"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Filtro por estado (v2.0) */}
        <section className="mb-6 flex items-center gap-2 flex-wrap" aria-label="Filtrar tareas por estado">
          <span className="text-xs text-slate-500 font-medium uppercase tracking-wider mr-1">Filtrar:</span>
          {(['TODAS', ...ESTADOS] as FiltroEstado[]).map((filtro) => {
            const activo = filtroActivo === filtro;
            return (
              <button
                key={filtro}
                type="button"
                onClick={() => setFiltroActivo(filtro)}
                aria-pressed={activo}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 cursor-pointer ${
                  activo
                    ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-200 shadow-sm'
                    : 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                }`}
              >
                <span>{filtro === 'TODAS' ? '☰' : iconosEstado[filtro]}</span>
                <span>{filtro === 'EN PROGRESO' ? 'En progreso' : filtro.charAt(0) + filtro.slice(1).toLowerCase()}</span>
                <span className={`px-1.5 rounded-full text-[10px] font-bold ${activo ? 'bg-indigo-500/30 text-indigo-200' : 'bg-slate-800 text-slate-500'}`}>
                  {contadorPorEstado[filtro]}
                </span>
              </button>
            );
          })}
        </section>

        {/* Lista de tareas */}
        <section className="space-y-3" aria-label="Lista de tareas">
          {cargando && (
            <output className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-8 h-8 border-2 border-slate-700 border-t-indigo-400 rounded-full animate-spin" aria-hidden="true" />
              <p className="text-sm text-slate-500">Cargando tareas...</p>
            </output>
          )}

          {!cargando && tareasFiltradas.length === 0 && (
            <p className="text-slate-500 text-center py-8 text-sm">{mensajeListaVacia}</p>
          )}

          {!cargando && tareasFiltradas.length > 0 && (
            tareasFiltradas.map((tareaActual) => {
              const estadoActual = tareaActual.estado;
              const esCompletada = estadoActual === 'COMPLETADA';
              const estiloEstado = estilosPorEstado[estadoActual];
              const editando = idTareaEditando === tareaActual.id;

              const claseTitulo = esCompletada ? 'line-through text-slate-500' : 'text-slate-100';

              return (
                <article
                  key={tareaActual.id}
                  className={`group relative p-5 rounded-xl border transition-all duration-200 shadow-sm hover:border-slate-700/80 hover:shadow-md ${estiloEstado.tarjeta}`}
                >
                  <div
                    className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full transition-colors duration-200 ${estiloEstado.indicador}`}
                  />
                  <div className="flex items-start justify-between gap-4 pl-6">
                    <div className="flex-1 min-w-0">
                      {editando ? (
                        <div className="space-y-3 mb-2">
                          <div>
                            <label htmlFor={`titulo-edicion-${tareaActual.id}`} className="block text-xs text-slate-500 mb-1.5 font-medium">
                              Título * <span className="text-slate-600">({tituloEdicion.length}/{LIMITE_TITULO})</span>
                            </label>
                            <input
                              id={`titulo-edicion-${tareaActual.id}`}
                              type="text"
                              value={tituloEdicion}
                              maxLength={LIMITE_TITULO}
                              onChange={(evento) => setTituloEdicion(evento.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition"
                            />
                          </div>
                          <div>
                            <label htmlFor={`descripcion-edicion-${tareaActual.id}`} className="block text-xs text-slate-500 mb-1.5 font-medium">
                              Descripción <span className="text-slate-600">({descripcionEdicion.length}/{LIMITE_DESCRIPCION})</span>
                            </label>
                            <textarea
                              id={`descripcion-edicion-${tareaActual.id}`}
                              value={descripcionEdicion}
                              maxLength={LIMITE_DESCRIPCION}
                              onChange={(evento) => setDescripcionEdicion(evento.target.value)}
                              rows={2}
                              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition resize-none"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={manejarGuardarEdicion}
                              disabled={enviando || !tituloEdicion.trim()}
                              className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white transition cursor-pointer"
                            >
                              {enviando ? 'Guardando...' : 'Guardar'}
                            </button>
                            <button
                              type="button"
                              onClick={cancelarEdicion}
                              className="px-4 py-1.5 rounded-lg text-sm font-medium border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 transition cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-lg leading-none ${estiloEstado.icono}`}>
                              {iconosEstado[estadoActual]}
                            </span>
                            <h3 className={`font-semibold text-base truncate ${claseTitulo}`}>
                              {tareaActual.tituloTarea}
                            </h3>
                          </div>

                          {tareaActual.descripcionTarea && (
                            <p className="text-sm text-slate-400 truncate mb-2">{tareaActual.descripcionTarea}</p>
                          )}
                        </>
                      )}

                      {/* Indicadores de estado interactivos */}
                      <div className="flex gap-1.5 flex-wrap">
                        {ESTADOS.map((estado) => {
                          const activo = estadoActual === estado;
                          return (
                            <button
                              key={estado}
                              type="button"
                              onClick={() => manejarActualizarEstado(tareaActual.id, estado)}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all duration-200 cursor-pointer ${
                                activo
                                  ? 'bg-indigo-900/30 border-indigo-500/40 text-indigo-300 shadow-sm'
                                  : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-600/50'
                              }`}
                            >
                              <span className={`leading-5 w-5 flex-shrink-0 ${activo ? 'text-indigo-400' : 'text-slate-600'}`}>
                                {iconosEstado[estado]}
                              </span>
                              <span className="capitalize text-sm">{estado.toLowerCase().replace('_', ' ')}</span>
                            </button>
                          );
                        })}
                      </div>

                      {tareaActual.fechaCreacion && (
                        <p className="text-xs text-slate-600 mt-2 font-mono">{tareaActual.fechaCreacion}</p>
                      )}
                    </div>

                    {!editando && (
                      <div className="flex shrink-0 flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => iniciarEdicion(tareaActual)}
                          className="p-1.5 rounded-md border border-slate-700 text-slate-500 hover:text-indigo-300 hover:border-indigo-800/50 transition cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
                          aria-label="Editar tarea"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => manejarEliminar(tareaActual.id)}
                          className="p-1.5 rounded-md border border-slate-700 text-slate-500 hover:text-red-400 hover:border-red-800/50 transition cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
                          aria-label="Eliminar tarea"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}
