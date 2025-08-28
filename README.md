# Scrapper Mixcloud Full

Una aplicación Next.js sencilla que permite consultar y mostrar episodios de usuarios de Mixcloud.

## Características

- 🎵 Consulta episodios de cualquier usuario de Mixcloud
- 🌐 Frontend y backend integrados en Next.js
- 🎨 Interfaz moderna con Tailwind CSS
- 📱 Diseño responsive
- ⚡ TypeScript para mayor seguridad de tipos

## Funcionalidades

- **Formulario de entrada**: Permite introducir una URL de usuario de Mixcloud
- **API interna**: Consulta la API pública de Mixcloud
- **Descarga de audio**: Dos opciones de descarga para cada episodio:
  - **MP3**: Formato universal, máxima compatibilidad
  - **M4A**: Formato original, mayor calidad de audio
- **Visualización de episodios**: Muestra la lista de episodios con:
  - Imagen de portada
  - Título del episodio
  - Nombre del usuario
  - Fecha de publicación
  - Duración
  - Estadísticas (reproducciones, favoritos, comentarios)
  - Enlace directo a Mixcloud
  - Botones de descarga (MP3 y M4A)
- **Gestión automática de archivos**: Sistema de limpieza inteligente
  - Eliminación automática por edad (30 minutos)
  - Límite de archivos simultáneos (50 archivos)
  - Límite de espacio en disco (500 MB)
  - Limpieza manual disponible

## Tecnologías utilizadas

- **Next.js 15**: Framework de React con App Router
- **TypeScript**: Para tipado estático
- **Tailwind CSS**: Para estilos
- **API de Mixcloud**: Fuente de datos públicos
- **yt-dlp**: Para descarga de audio
- **ffmpeg**: Para conversión de formatos

## Instalación y uso

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Ejecutar en modo desarrollo**:
   ```bash
   npm run dev
   ```

3. **Abrir en el navegador**:
   Visita [http://localhost:3000](http://localhost:3000)

4. **Usar la aplicación**:
   - Introduce una URL de usuario de Mixcloud (ej: `https://www.mixcloud.com/username/`)
   - Haz clic en "Obtener Episodios"
   - Explora la lista de episodios mostrados

## Estructura del proyecto

```
src/
├── app/
│   ├── api/
│   │   └── mixcloud/
│   │       └── route.ts      # API endpoint para consultar Mixcloud
│   ├── globals.css           # Estilos globales con Tailwind
│   ├── layout.tsx           # Layout principal de la aplicación
│   └── page.tsx             # Página principal con formulario y lista
```
src/
├── app/
│   ├── api/
│   │   ├── cleanup/
│   │   │   └── route.ts      # API para gestión de limpieza
│   │   ├── download/
│   │   │   └── [filename]/
│   │   │       └── route.ts  # API para servir archivos descargados
│   │   ├── download-m4a/
│   │   │   └── route.ts      # API para descarga en formato M4A
│   │   ├── download-mp3/
│   │   │   └── route.ts      # API para descarga en formato MP3
│   │   └── mixcloud/
│   │       └── route.ts      # API endpoint para consultar Mixcloud
│   ├── globals.css           # Estilos globales con Tailwind
│   ├── layout.tsx           # Layout principal de la aplicación
│   └── page.tsx             # Página principal con formulario y lista
├── lib/
│   └── cleanup.ts           # Utilidades para limpieza de archivos
└── downloads/               # Carpeta temporal (excluida del git)
```

## Política de Limpieza de Archivos

La aplicación implementa un sistema automático de limpieza para evitar la acumulación de archivos temporales:

### 🕐 **Limpieza Automática**
- **Se ejecuta**: Antes de cada descarga
- **Criterios de eliminación**:
  - ⏰ Archivos más antiguos de 30 minutos
  - 📁 Más de 50 archivos en la carpeta
  - 💾 Carpeta excede 500 MB de tamaño

### 🧹 **Limpieza Manual**
- **Acceso**: Botón "Mostrar información de archivos temporales"
- **Funciones disponibles**:
  - Ver estadísticas actuales de la carpeta
  - Ejecutar limpieza inmediata
  - Actualizar información en tiempo real

### ⚙️ **Configuración**
Los parámetros de limpieza se pueden modificar en `src/lib/cleanup.ts`:
```typescript
export const DEFAULT_CLEANUP_OPTIONS = {
  maxAge: 30 * 60 * 1000,    // 30 minutos
  maxFiles: 50,              // 50 archivos máximo
  maxSize: 500 * 1024 * 1024 // 500 MB máximo
};
```

### POST `/api/mixcloud`

Consulta los episodios de un usuario de Mixcloud.

**Body**:
```json
{
  "url": "https://www.mixcloud.com/username/"
}
```

**Respuesta**:
```json
{
  "success": true,
  "episodes": [...],
  "total": 20,
  "user": "username"
}
```

## Scripts disponibles

- `npm run dev`: Ejecuta el servidor de desarrollo
- `npm run build`: Construye la aplicación para producción
- `npm run start`: Ejecuta la aplicación en modo producción
- `npm run lint`: Ejecuta el linter de código

## Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Haz fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT.
