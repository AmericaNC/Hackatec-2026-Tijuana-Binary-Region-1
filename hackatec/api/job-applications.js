import { createClient } from '@supabase/supabase-js';
import process from 'node:process';

function getBearerToken(req) {
  const authorization = req.headers?.authorization || req.headers?.Authorization || '';
  return authorization.match(/^Bearer\s+(.+)$/i)?.[1] || null;
}

function getJobId(value) {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ error: 'Método no permitido. Usa GET o POST.' });
  }

  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: 'Inicia sesión para aplicar a una vacante.' });

  const empleoId = getJobId(req.method === 'GET' ? req.query?.empleoId : req.body?.empleoId);
  if (!empleoId) return res.status(400).json({ error: 'Indica una vacante válida.' });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Falta configurar SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.');
    return res.status(500).json({ error: 'El servicio de postulaciones no está configurado.' });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'La sesión no es válida. Vuelve a iniciar sesión.' });
    }

    const { data: student, error: studentError } = await supabase
      .from('alumnos')
      .select('uid, carrera, activo')
      .eq('uid', user.id)
      .maybeSingle();
    if (studentError) throw new Error(`No se pudo verificar el registro del alumno: ${studentError.message}`);
    if (!student || !student.activo) {
      return res.status(403).json({ error: 'Solo los alumnos activos pueden aplicar a vacantes.' });
    }

    const { data: job, error: jobError } = await supabase
      .from('empleos')
      .select('id, carreras_dirigidas')
      .eq('id', empleoId)
      .maybeSingle();
    if (jobError) throw new Error(`No se pudo consultar la vacante: ${jobError.message}`);
    if (!job || !job.carreras_dirigidas?.includes(student.carrera)) {
      return res.status(404).json({ error: 'No se encontró una vacante disponible para tu carrera.' });
    }

    if (req.method === 'GET') {
      const { data: application, error: applicationError } = await supabase
        .from('solicitudes_empleo')
        .select('id')
        .eq('empleo_id', job.id)
        .eq('alumno_id', student.uid)
        .maybeSingle();
      if (applicationError) {
        throw new Error(`No se pudo consultar la postulación: ${applicationError.message}`);
      }
      return res.status(200).json({ aplicada: Boolean(application) });
    }

    const { error: insertError } = await supabase
      .from('solicitudes_empleo')
      .insert({ empleo_id: job.id, alumno_id: student.uid });

    if (insertError && insertError.code !== '23505') {
      throw new Error(`No se pudo guardar la postulación: ${insertError.message}`);
    }

    return res.status(insertError ? 200 : 201).json({ success: true, aplicada: true });
  } catch (error) {
    console.error('Error al gestionar la postulación a una vacante:', error);
    return res.status(500).json({ error: 'No se pudo completar la postulación. Inténtalo de nuevo.' });
  }
}
