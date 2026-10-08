import fs from 'fs';
import path from 'path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const STORAGE_BUCKET = 'temarios-json';

function leerMateriasLocales(clave) {
  const folderPath = path.join(process.cwd(), 'media', clave);
  if (!fs.existsSync(folderPath)) return [];

  const jsonFiles = fs.readdirSync(folderPath)
    .filter((file) => file.toLowerCase().endsWith('.json'));

  return jsonFiles.map((file) => ({
    archivo: file,
    claveMateria: path.basename(file, '.json'),
    contenido: JSON.parse(fs.readFileSync(path.join(folderPath, file), 'utf-8')),
  }));
}

async function leerMateriasStorage(clave) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_ANON_KEY
    || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (o una clave anon con permisos de lectura) en Vercel.',
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: files, error: listError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list(clave, { limit: 1000 });

  if (listError) {
    throw new Error(`No se pudo listar el bucket ${STORAGE_BUCKET}: ${listError.message}`);
  }

  const jsonFiles = (files || []).filter(
    (file) => file.name.toLowerCase().endsWith('.json'),
  );

  return Promise.all(jsonFiles.map(async (file) => {
    const storagePath = `${clave}/${file.name}`;
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(storagePath);

    if (error) {
      throw new Error(`No se pudo descargar ${storagePath}: ${error.message}`);
    }

    return {
      archivo: file.name,
      claveMateria: path.basename(file.name, '.json'),
      contenido: JSON.parse(await data.text()),
    };
  }));
}

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
    materias = leerMateriasLocales(clave);
  } catch (error) {
    console.warn(`No se pudieron leer los temarios locales para ${clave}; se intentará Storage:`, error);
    materias = [];
  }

  if (materias.length === 0) {
    try {
      materias = await leerMateriasStorage(clave);
    } catch (error) {
      console.error(`Error consultando Storage para la carrera ${clave}:`, error);
      return res.status(500).json({
        error: 'No se pudieron consultar los temarios en media ni en el bucket de Storage.',
      });
    }
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