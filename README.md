# To-Do-App v.1 - Aplicación de Lista de Tareas
=========================================

## Descripción breve
Esta aplicación permite crear, completar y eliminar tareas a través de una interfaz web simple. El servicio guarda la información en una base de datos SQLite embebida. El proyecto está construido con un backend en Node.js (Express + TypeScript) y un frontend en React (Vite + Tailwind CSS). Todo el proyecto funciona de manera aislada dentro de un contenedor Docker optimizado.

## Tecnologías necesarias para replicar
Para ejecutar este proyecto se requiere tener instalado lo siguiente en el equipo o en el entorno de ejecución:
- **Docker (Desktop o Engine):** Para construir y ejecutar el contenedor (forma recomendada).
- **Node.js (versión 22.x o superior):** Con npm para instalar dependencias si se desea correr en desarrollo local.
- **Sistema operativo compatible con contenedores:** Windows con Docker Desktop, Linux o macOS.
- **Conexión a internet:** Para descargar las dependencias la primera vez y las imágenes base del contenedor.

*Nota: La arquitectura está verificada utilizando una construcción Multi-Stage eficiente que compila en entornos Node y despliega sobre una imagen final ultra-ligera de **Alpine Linux puro (alpine:3.20)** con el binario aislado de Node.js. El proyecto no requiere bases de datos externas ni servicios adicionales.*

## Cómo replicar el proyecto
A continuación se describen las dos formas de ejecutar la aplicación. Ambos flujos están validados con el archivo Dockerfile entregado.

### Opción A: Ejecutar con Docker (Forma más rápida y segura)
1. Copia los archivos del proyecto en una carpeta local (incluye `Dockerfile`, `.dockerignore`, `backend` y `frontend`).
2. Abre una terminal en esa carpeta.
3. Construye la imagen omitiendo la caché para asegurar un empaquetado limpio:
   ```bash
   docker build --no-cache -t todo-app:latest .
   ```
4. Inicia el contenedor mapeando el puerto y configurando el volumen persistente para SQLite según tu sistema operativo (opcional):

Comando sin volumen persistente, si se apaga el contenedor, las  tareas no persisten:  
   * **Linux / macOS /Windows/Zsh:**
     ```bash
     docker run -d -p 3000:3000 --name contenedor-todo todo-app:latest
     ```

Comando para volumen persistente, aprovechando la base SQLite integrada en el proyecto:
   * **Linux / macOS (Bash/Zsh):**
     ```bash
     docker run -d -p 3000:3000 --name contenedor-todo -v $(pwd)/backend/data:/backend/data todo-app:latest
     ```
   * **Windows (PowerShell):**
     ```powershell
     docker run -d -p 3000:3000 --name contenedor-todo -v ${PWD}/backend/data:/backend/data todo-app:latest
     ```
5. Abre un navegador web e ingresa a: `http://localhost:3000`

### Opción B: Ejecutar desde el repositorio (Desarrollo local)
1. Abre una terminal en la raíz del proyecto y crea la carpeta para la base de datos:
   * **Linux / macOS:** `mkdir -p backend/data`
   * **Windows (PowerShell):** `mkdir backend/data`
2. Instala las dependencias de ambas carpetas:
   ```bash
   cd backend && npm install && cd ../frontend && npm install && cd ..
   ```
3. Compila el frontend (React + Vite):
   ```bash
   cd frontend && npm run build && cd ..
   ```
4. Compila y arranca el backend (Express + TypeScript):
   ```bash
   cd backend && npm run build && npm start
   ```
5. Abre un navegador web e ingresa a: `http://localhost:3000`

## Estructura del proyecto
- `backend/src/app.ts`: Servicio REST con endpoints para crear (`POST /api/tasks`), listar (`GET /api/tasks`), actualizar (`PUT /api/tasks/:id`) y eliminar (`DELETE /api/tasks/:id`). Usa validación con Zod y persistencia en SQLite.
- `backend/src/database.ts`: Inicialización de la base SQLite y sus funciones de conexión.
- `backend/src/schemas.ts`: Esquemas de validación Zod para la entrada y la actualización de tareas.
- `frontend/src/App.tsx`: Interfaz de usuario con React, Tailwind CSS y conexión a la API relativa (`/api/tasks`).
- `Dockerfile`: Construcción multi-stage. Compila el frontend con `node:slim`, procesa el backend con herramientas nativas de compilación, y empaqueta la producción sobre un entorno `alpine` plano con un usuario no-root sin privilegios para mitigar vectores de ataque.
- `.dockerignore`: Exclusiones de archivos generados, bitácoras locales y dependencias de desarrollo para reducir drásticamente el tamaño final de la imagen.
- `sonar-project.properties`: Configuración del análisis estático con SonarQube (Fuentes: `backend/src`, `frontend/src`; Exclusiones: `dist`, `node_modules`).

## Prompts utilizados con la IA y aportes al proyecto

### Prompt 1: Ayúdame a crear una API REST sencilla de tareas en Node.js. Debe tener crear, listar, actualizar y eliminar. Explícame la estructura antes de generar código.
- **Aporte:** Se definieron los cuatro endpoints con esquemas Zod antes de escribir el código del servicio. 

### Prompt 2: Revisa este código y dime qué problemas de calidad podría detectar Sonar. No lo reescribas completo; explícame primero los problemas.
- **Aporte:** Se identificaron los 5 problemas de calidad en `app.ts` (referencias sin uso y uso de `this as any`) con explicación previa. 

### Prompt 3: Genera un Dockerfile sencillo y seguro para esta aplicación. Explícame cada instrucción.
- **Aporte:** Se construyó el archivo Dockerfile multi-stage con explicación paso a paso (frontend build, backend compile, producción con mitigación de privilegios root y actualización de paquetes de seguridad del sistema operativo).

### Prompt 4: Trivy reporta esta vulnerabilidad: [hallazgo vulnerabilidades detectadas por Trivy en la imagen base y en el entorno de construcción]. Explícame el riesgo y una forma segura de corregirla.
- **Aporte:** Se analizó el riesgo de dependencias heredadas de las herramientas del upstream de Node. Se optó por una solución de arquitectura profesional: migrar la etapa de producción a una base limpia de Alpine plano, erradicando los paquetes vulnerables globales.

### Prompt 5: Actuando como experto en análisis de desarrollo de software, necesito un md agents para crear una aplicación sencilla y llevarla por un flujo básico de calidad y seguridad antes de publicar su imagen en Docker Hub.
- **Aporte:** Se definió un archivo guía el cual demostraba el flujo del proyecto (estructura del monorepo, capas de seguridad y calidad). Se descartó la alternativa de Java/Spring Boot porque no cumplía con los requisitos de imagen ligera y despliegue simple en contenedor.
