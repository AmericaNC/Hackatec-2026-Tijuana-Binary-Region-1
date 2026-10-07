import fs from 'fs';
import path from 'path';
import process from 'node:process';

export default function handler(req, res) {
  // Manejo de Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido. Usa GET.' });
  }

  // Obtener la clave recibida como query parameter (ej: /api/carrera?clave=ISIC-2010-224)
  const clave = typeof req.query.clave === 'string' ? req.query.clave.trim() : '';

  if (!/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(clave)) {
    return res.status(400).json({ error: 'El parámetro "clave" es requerido y debe ser válido.' });
  }

  try {
    // Definir la ruta a la carpeta de la carrera específica dentro de media
    const folderPath = path.join(process.cwd(), 'media', clave);

    // Verificar si la carpeta de la clave existe
    if (!fs.existsSync(folderPath)) {
      return res.status(404).json({ 
        error: `No se encontraron temarios para la clave de carrera: ${clave}` 
      });
    }

    // Leer los archivos de la carpeta
    const files = fs.readdirSync(folderPath);
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    if (jsonFiles.length === 0) {
      return res.status(404).json({
        error: `No se encontraron temarios para la clave de carrera: ${clave}`
      });
    }

    // Cargar y parsear cada materia
    const materias = jsonFiles.map(file => {
      const filePath = path.join(folderPath, file);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      
      return {
        archivo: file,
        claveMateria: path.basename(file, '.json'),
        contenido: JSON.parse(fileContent)
      };
    });

    return res.status(200).json({
      success: true,
      claveCarrera: clave,
      totalMaterias: materias.length,
      materias: materias
    });

  } catch (error) {
    console.error("❌ Error leyendo los archivos de la carrera:", error);
    return res.status(500).json({
      error: 'Error interno al procesar los archivos de la carrera.',
    });
  }
}