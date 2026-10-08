import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const STORAGE_BUCKET = 'temarios-json';

export async function obtenerTemariosCarrera(claveCarrera, supabaseClient) {
  const folderPath = path.join(process.cwd(), 'media', claveCarrera);

  try {
    if (fs.existsSync(folderPath)) {
      const archivos = fs.readdirSync(folderPath)
        .filter((file) => file.toLowerCase().endsWith('.json'));
      const materias = archivos.map((archivo) => ({
        archivo,
        claveMateria: path.basename(archivo, '.json'),
        contenido: JSON.parse(
          fs.readFileSync(path.join(folderPath, archivo), 'utf-8'),
        ),
      }));

      if (materias.length > 0) return materias;
    }
  } catch (error) {
    console.warn(`No se pudieron leer los temarios locales para ${claveCarrera}:`, error);
  }

  let supabase = supabaseClient;
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      || process.env.SUPABASE_ANON_KEY
      || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Faltan variables de entorno de Supabase para consultar Storage.');
    }

    supabase = createClient(supabaseUrl, supabaseKey);
  }

  const { data: archivos, error: listError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list(claveCarrera, { limit: 1000 });

  if (listError) {
    throw new Error(`No se pudo listar ${STORAGE_BUCKET}/${claveCarrera}: ${listError.message}`);
  }

  const jsonFiles = (archivos || []).filter(
    (archivo) => archivo.name.toLowerCase().endsWith('.json'),
  );

  return Promise.all(jsonFiles.map(async (archivo) => {
    const storagePath = `${claveCarrera}/${archivo.name}`;
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(storagePath);

    if (error) {
      throw new Error(`No se pudo descargar ${storagePath}: ${error.message}`);
    }

    return {
      archivo: archivo.name,
      claveMateria: path.basename(archivo.name, '.json'),
      contenido: JSON.parse(await data.text()),
    };
  }));
}
