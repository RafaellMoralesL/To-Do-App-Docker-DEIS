# To-Do App — Guía de Replicación y Despliegue

Aplicación de lista de tareas con estados (PENDIENTE / EN PROGRESO / COMPLETADA). El proyecto cuenta con un backend en **Node.js (Express + TypeScript + SQLite)** y un frontend en **React (Vite + Tailwind CSS)**, empaquetados en un **contenedor Docker multi-etapa** que sirve la interfaz y la API a través del puerto 3000.

---

## 0. Requisitos previos

| Herramienta | Versión mínima | Comando de verificación |
|---|---|---|
| Docker Desktop / Engine | 24.x | `docker --version` |
| Git | 2.40 | `git --version` |
| Node.js *(solo para desarrollo local)* | 22.x | `node --version` |

* **Windows:** Utilice la terminal para ejecutar todos los comandos de esta guía.
* **Linux:** Asegúrese de añadir su usuario al grupo docker para evitar usar sudo: `sudo usermod -aG docker $USER` (requiere reiniciar sesión).

---

## 1. Ejecución en LOCAL (Modo Desarrollo - Sin Docker)

### Paso 1: Instalar dependencias
```bash
cd backend && npm install && cd ../frontend && npm install && cd ..
```

### Paso 2: Levantar el Backend (Terminal 1)
```bash
mkdir -p backend/data
cd backend
npm run build
npm start
```

### Paso 3: Levantar el Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```
Abre tu navegador web e ingresa a: `http://localhost:5173`

---

## 2. Ejecución con Docker (Entorno Local)

La construcción utiliza etapas múltiples (**Multi-Stage**) para compilar las herramientas en entornos cerrados y desplegar el resultado en una imagen final ultra-ligera de **Alpine Linux puro (alpine:3.20)** con un usuario no-root sin privilegios para mitigar vectores de ataque.

### Paso 1: Construir la imagen
```bash
# Para compilar la Versión 1.0
docker build --no-cache -t tu_usuario_hub/todo-app:1.0 .

# Para compilar la Versión 2.0
docker build --no-cache -t tu_usuario_hub/todo-app:2.0 .
```

### Paso 2: Crear carpeta de persistencia y ejecutar
Para evitar problemas de permisos de escritura con el archivo SQLite interno (`todo.db`), cree la carpeta localmente antes de iniciar el contenedor:
```bash
mkdir -p backend/data

# Ejecutar el contenedor (Mapeando el volumen local mediante ruta relativa)
docker run -d --name todolist -p 3000:3000 -v "\$(pwd)/backend/data:/backend/data" tu_usuario_hub/todo-app:2.0
```
Abre tu navegador web e ingresa a: `http://localhost:3000`

### Paso 3: Limpieza Local
Antes de cambiar de versión o subir la imagen, detenga y remueva el contenedor para liberar el nombre y el puerto:
```bash
docker stop todolist && docker rm todolist
```

---

## 3. Despliegue en Servidor y Estrategia (Recreate)

Para bases de datos embebidas como **SQLite**, la concurrencia de escritura simultánea provocaría un bloqueo crítico (`database is locked`). Por ende, este proyecto implementa formalmente la estrategia de despliegue **Recreate (Recreación)**, deteniendo por completo el proceso de la versión anterior antes de ceder el acceso al volumen a la nueva versión.

### Paso 1: Descargar imágenes en el Servidor (SSH)
Conéctese a su servidor remoto y descargue los artefactos inmutables desde Docker Hub:
```bash
ssh usuario@IP_SERVIDOR
docker pull tu_usuario_hub/todo-app:1.0
docker pull tu_usuario_hub/todo-app:2.0

# Comando de comprobación intermedia para verificar artefactos disponibles
docker images
```

### Paso 2: Desplegar Versión Inicial (v1.0)
Cree el directorio de producción aislado en la raíz del servidor y levante el servicio:
```bash
docker volume create todo-db
docker run -d --name todolist -p 3000:3000 -v todo-db:/backend/data tu_usuario_hub/todo-app:1.0
```
*Acceso público del servidor:* `http://IP_SERVIDOR:3000` (Proceda a crear tareas base en la interfaz).

### Paso 3: Ejecutar Actualización a v2.0 (Aplicando Recreate)
Detenga la versión antigua para liberar el candado del archivo de base de datos e inicie la nueva versión apuntando **exactamente al mismo volumen**:
```bash
docker stop todolist && docker rm todolist
docker run -d --name todolist -p 3000:3000 -v todo-db:/backend/data tu_usuario_hub/todo-app:2.0
```
*Al refrescar el navegador, la nueva interfaz v2.0 heredará y mostrará las tareas intactas creadas en la v1.0.*

### Paso 4: Plan de Contingencia (Rollback a v1.0)
Si la nueva versión presenta fallas imprevistas, se ejecuta la estrategia de retorno inmediato a la versión estable anterior bajo el mismo principio:
```bash
docker stop todolist && docker rm todolist
docker run -d --name todolist -p 3000:3000 -v todo-db:/backend/data tu_usuario_hub/todo-app:1.0
```

---

## 4. Estructura del Proyecto

```text
├── backend/
│   ├── src/
│   │   ├── app.ts            # Servicio REST con endpoints, validación Zod y SQLite
│   │   ├── database.ts       # Inicialización y funciones de conexión de SQLite
│   │   └── schemas.ts        # Esquemas de validación Zod para peticiones
│   └── package.json
├── frontend/
│   ├── src/
│   │   └── App.tsx           # Interfaz React con Tailwind CSS y llamadas relativas
│   └── package.json
├── .dockerignore             # Exclusión de módulos, compilados y logs locales
├── Dockerfile                # Construcción multi-etapa optimizada (Alpine Linux)
└── sonar-project.properties  # Configuración de análisis estático con SonarQube
```

---

## 5. Diagnóstico y Solución de Problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| `port is already allocated` | El puerto 3000 ya está siendo usado por otro proceso en la máquina. | Detenga el proceso ocupante o asigne un puerto externo libre en el run: `-p 3001:3000`. |
| `database is locked` | Dos contenedores activos están intentando escribir en el archivo SQLite al mismo tiempo. | Aplique estrictamente la estrategia Recreate. Detenga y elimine uno de los contenedores activos. |
| El contenedor se reinicia en bucle | Volumen con datos corruptos o problemas severos de lectura. | Ejecute `docker logs todolist` para auditar el error explícito del proceso de Node.js. |
| `permission denied` en el volumen (Linux) | La carpeta del host no otorga permisos de escritura al usuario sin privilegios `node` (UID 1000). | Otorgue los permisos correctos en el servidor ejecutando: `sudo chown -R 1000:1000 /srv/todolist-data`. |

---

## 6. Prompts utilizados con la IA y aportes al proyecto

### Prompt 1: Ayúdame a crear una API REST sencilla de tareas en Node.js. Debe tener crear, listar, actualizar y eliminar. Explícame la estructura antes de generar código.
* **Aporte:** Se definieron los cuatro endpoints con esquemas Zod antes de escribir el código del servicio.

### Prompt 2: Revisa este código y dime qué problemas de calidad podría detectar Sonar. No lo reescribas completo; explícame primero los problemas.
* **Aporte:** Se identificaron los 5 problemas de calidad en `app.ts` (referencias sin uso y uso de `this as any`) con explicación previa.

### Prompt 3: Genera un Dockerfile sencillo y seguro para esta aplicación. Explícame cada instrucción.
* **Aporte:** Se construyó el archivo Dockerfile multi-stage con explicación paso a paso (frontend build, backend compile, producción con mitigación de privilegios root y actualización de paquetes de seguridad del sistema operativo).

### Prompt 4: Trivy reporta esta vulnerabilidad: [hallazgo vulnerabilidades detectadas por Trivy en la imagen base y en el entorno de construcción]. Explícame el riesgo y una forma segura de corregirla.
* **Aporte:** Se analizó el riesgo de dependencias heredadas de las herramientas del upstream de Node. Se optó por una solución de arquitectura profesional: migrar la etapa de producción a una base limpia de Alpine plano, erradicando los paquetes vulnerables globales.

### Prompt 5: Actuando como experto en análisis de desarrollo de software, necesito un md agents para crear una aplicación sencilla y llevarla por un flujo básico de calidad y seguridad antes de publicar su imagen en Docker Hub.
* **Aporte:** Se definió un archivo guía el cual demostraba el flujo del proyecto (estructura del monorepo, capas de seguridad y calidad). Se descartó la alternativa de Java/Spring Boot porque no cumplía con los requisitos de imagen ligera y despliegue simple en contenedor.
