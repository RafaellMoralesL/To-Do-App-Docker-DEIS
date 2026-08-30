import { inicializarBaseDatos } from './database';
import servidorWeb from './app';

inicializarBaseDatos();

const puertoServidor = 3000;

servidorWeb.listen(puertoServidor, () => {
  console.log(`To-Do App server running on port ${puertoServidor}`);
});
