import { obtenerTemariosCarrera } from './_lib/temarios.js';

export default async function handler(req, res) {
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

  let materias;
  try {
    materias = await obtenerTemariosCarrera(clave);
  } catch (error) {
    console.error(`Error consultando temarios para la carrera ${clave}:`, error);
    return res.status(500).json({
      error: 'No se pudieron consultar los temarios en media ni en el bucket de Storage.',
    });
  }

  if (materias.length === 0) {
    return res.status(404).json({
      error: `No se encontraron temarios para la clave de carrera: ${clave}`,
    });
  }

  return res.status(200).json({
    success: true,
    claveCarrera: clave,
    totalMaterias: materias.length,
    materias,
  });
}