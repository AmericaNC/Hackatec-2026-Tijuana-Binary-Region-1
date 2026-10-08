import { GoogleGenAI, Type } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import process from 'node:process';
import { obtenerTemariosCarrera } from './_lib/temarios.js';

const planSchema = {
  type: Type.OBJECT,
  properties: {
    resumen: { type: Type.STRING },
    prioridades: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          materia: { type: Type.STRING },
          calificacion: { type: Type.NUMBER },
          prioridad: { type: Type.STRING },
          recomendacion: { type: Type.STRING },
        },
        required: ['materia', 'calificacion', 'prioridad', 'recomendacion'],
      },
    },
    planSemanal: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          semana: { type: Type.INTEGER },
          objetivo: { type: Type.STRING },
          actividades: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ['semana', 'objetivo', 'actividades'],
      },
    },
    recomendacionesGenerales: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ['resumen', 'prioridades', 'planSemanal', 'recomendacionesGenerales'],
};

function getBearerToken(req) {
  const authorization = req.headers?.authorization || req.headers?.Authorization || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
  }

  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Debes iniciar sesión para generar tu plan.' });
  }

  const periodo = typeof req.body?.periodo === 'string' ? req.body.periodo.trim() : '';
  if (!periodo || periodo.length > 50) {
    return res.status(400).json({ error: 'Indica un periodo válido (máximo 50 caracteres).' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!supabaseUrl || !serviceRoleKey || !geminiApiKey) {
    console.error('Falta configurar SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY o GEMINI_API_KEY.');
    return res.status(500).json({ error: 'El servicio de planes de estudio no está configurado.' });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'La sesión no es válida. Vuelve a iniciar sesión.' });
    }

    const { data: perfil, error: perfilError } = await supabase
      .from('perfiles')
      .select('nombre, carrera, matricula')
      .eq('id', user.id)
      .maybeSingle();

    if (perfilError) throw new Error(`No se pudo consultar el perfil: ${perfilError.message}`);
    if (!perfil?.carrera || !perfil.matricula) {
      return res.status(400).json({ error: 'Tu perfil debe incluir carrera y matrícula.' });
    }

    const { data: alumno, error: alumnoError } = await supabase
      .from('alumnos')
      .select('uid, matricula, carrera')
      .eq('uid', user.id)
      .eq('matricula', perfil.matricula)
      .maybeSingle();

    if (alumnoError) throw new Error(`No se pudo consultar el registro del alumno: ${alumnoError.message}`);
    if (!alumno) {
      return res.status(400).json({
        error: 'La matrícula del perfil no está vinculada al usuario en la tabla alumnos.',
      });
    }

    const { data: carreraData, error: carreraError } = await supabase
      .from('carreras')
      .select('id, clave, nombre')
      .eq('nombre', perfil.carrera)
      .maybeSingle();

    if (carreraError) throw new Error(`No se pudo consultar la carrera: ${carreraError.message}`);
    if (!carreraData?.clave) {
      return res.status(404).json({ error: 'La carrera del perfil no tiene una clave configurada.' });
    }

    const { data: calificaciones, error: calificacionesError } = await supabase
      .from('calificaciones')
      .select('materia_id, calificacion, periodo')
      .eq('alumno_id', alumno.uid)
      .eq('periodo', periodo)
      .not('calificacion', 'is', null);

    if (calificacionesError) {
      throw new Error(`No se pudieron consultar las calificaciones: ${calificacionesError.message}`);
    }
    if (!calificaciones?.length) {
      return res.status(404).json({
        error: `No hay calificaciones guardadas para el periodo ${periodo}. Guarda tus calificaciones antes de generar el plan.`,
      });
    }

    const materiaIds = [...new Set(calificaciones.map(({ materia_id }) => materia_id))];
    const { data: materiasDb, error: materiasError } = await supabase
      .from('materias')
      .select('id, clave, nombre')
      .eq('carrera_id', carreraData.id)
      .in('id', materiaIds);

    if (materiasError) throw new Error(`No se pudieron consultar las materias: ${materiasError.message}`);

    const materiaPorId = new Map((materiasDb || []).map((materia) => [materia.id, materia]));
    const temarios = await obtenerTemariosCarrera(carreraData.clave, supabase);
    const temarioPorClave = new Map(temarios.map(({ claveMateria, contenido }) => [
      contenido.asignatura?.clave || claveMateria,
      contenido,
    ]));

    const progreso = calificaciones.map((registro) => {
      const materia = materiaPorId.get(registro.materia_id);
      if (!materia) {
        throw new Error(`No se encontró la materia ${registro.materia_id} de una calificación.`);
      }

      const temario = temarioPorClave.get(materia.clave);
      return {
        materia: materia.nombre,
        clave: materia.clave,
        calificacion: Number(registro.calificacion),
        competencias: temario?.competencias || [],
      };
    });

    const prompt = [
      'Actúa como tutor académico de TecNM y crea un plan de estudio práctico, respetuoso y personalizado.',
      'Usa exclusivamente las calificaciones y competencias proporcionadas; no inventes notas ni contenido curricular.',
      'Prioriza materias con calificación menor. No juzgues al estudiante y presenta acciones concretas.',
      'El plan debe cubrir cuatro semanas, distribuir actividades realistas y relacionar las actividades con las competencias disponibles.',
      `Carrera: ${carreraData.nombre} (${carreraData.clave}). Periodo: ${periodo}.`,
      `Datos del periodo: ${JSON.stringify(progreso)}`,
      'Devuelve el resultado con el esquema JSON solicitado.',
    ].join('\n\n');

    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const generated = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: planSchema,
        temperature: 0.3,
      },
    });

    const plan = JSON.parse(generated.text);
    const { data: savedPlan, error: saveError } = await supabase
      .from('planes_estudio')
      .upsert(
        {
          alumno_id: alumno.uid,
          periodo,
          prompt,
          plan,
          calificaciones: progreso.map(({ materia, clave, calificacion }) => ({
            materia,
            clave,
            calificacion,
          })),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'alumno_id,periodo' },
      )
      .select('id, periodo, plan, created_at, updated_at')
      .single();

    if (saveError) throw new Error(`No se pudo guardar el plan: ${saveError.message}`);

    return res.status(200).json({ success: true, data: savedPlan });
  } catch (error) {
    console.error('Error generando el plan de estudio:', error);
    return res.status(500).json({
      error: 'No se pudo generar o guardar el plan de estudio. Inténtalo de nuevo.',
    });
  }
}
