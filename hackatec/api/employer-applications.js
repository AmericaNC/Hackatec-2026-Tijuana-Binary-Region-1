import { createClient } from '@supabase/supabase-js';
import process from 'node:process';

function getBearerToken(req) {
  const authorization = req.headers?.authorization || req.headers?.Authorization || '';
  return authorization.match(/^Bearer\s+(.+)$/i)?.[1] || null;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido. Usa GET.' });
  }

  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: 'Inicia sesión para consultar postulaciones.' });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
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

    const { data: company, error: companyError } = await supabase
      .from('empresas')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();
    if (companyError) throw new Error(`No se pudo validar la empresa: ${companyError.message}`);
    if (!company) return res.status(403).json({ error: 'Solo las cuentas de empresa pueden consultar postulaciones.' });

    const { data: jobs, error: jobsError } = await supabase
      .from('empleos')
      .select('id, nombre_empleo, puesto_trabajo')
      .eq('empresa_id', user.id);
    if (jobsError) throw new Error(`No se pudieron consultar las vacantes: ${jobsError.message}`);
    if (!jobs?.length) return res.status(200).json({ postulaciones: [] });

    const jobsById = new Map(jobs.map((job) => [job.id, job]));
    const { data: applications, error: applicationsError } = await supabase
      .from('solicitudes_empleo')
      .select('id, empleo_id, alumno_id, created_at')
      .in('empleo_id', jobs.map(({ id }) => id))
      .order('created_at', { ascending: false })
      .limit(100);
    if (applicationsError) throw new Error(`No se pudieron consultar las postulaciones: ${applicationsError.message}`);
    if (!applications?.length) return res.status(200).json({ postulaciones: [] });

    const studentIds = [...new Set(applications.map(({ alumno_id: studentId }) => studentId))];
    const { data: students, error: studentsError } = await supabase
      .from('alumnos')
      .select('uid, nombre, carrera')
      .in('uid', studentIds);
    if (studentsError) throw new Error(`No se pudieron consultar los perfiles postulantes: ${studentsError.message}`);

    const studentsById = new Map((students || []).map((student) => [student.uid, student]));
    const postulaciones = applications.flatMap((application) => {
      const student = studentsById.get(application.alumno_id);
      const job = jobsById.get(application.empleo_id);
      if (!student || !job) return [];

      return [{
        id: application.id,
        alumnoNombre: student.nombre,
        carrera: student.carrera,
        empleoNombre: job.nombre_empleo,
        puestoTrabajo: job.puesto_trabajo,
        createdAt: application.created_at,
      }];
    });

    return res.status(200).json({ postulaciones });
  } catch (error) {
    console.error('Error al cargar postulaciones de empresa:', error);
    return res.status(500).json({ error: 'No se pudieron cargar las postulaciones. Inténtalo de nuevo.' });
  }
}