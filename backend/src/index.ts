import servidorWeb from './app';

const puertoServidor = Number(process.env.PUERTO ?? 3000);

const servidorHttp = servidorWeb.listen(puertoServidor, () => {
  console.log(`To-Do App server running on port ${puertoServidor}`);
});

servidorHttp.on('error', (error: NodeJS.ErrnoException) => {
  console.error('Error al iniciar el servidor:', error.message ?? 'Error desconocido');
  process.exit(1);
});
