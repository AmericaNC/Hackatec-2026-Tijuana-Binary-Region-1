import { createClient } from '@supabase/supabase-js';
import process from 'node:process';
import { carrerasDisponibles } from '../src/constants/carreras.js';

function getBearerToken(req) {
  const authorization = req.headers?.authorization || req.headers?.Authorization || '';
  return authorization.match(/^Bearer\s+(.+)$/i)?.[1] || null;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido. Usa GET.' });
  }

  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: 'Inicia sesión para consultar candidatos.' });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'El servicio de candidatos no está configurado.' });
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
    if (!company) return res.status(403).json({ error: 'Solo las cuentas de empresa pueden consultar candidatos.' });

    const { data: jobs, error: jobsError } = await supabase
      .from('empleos')
      .select('id, nombre_empleo, puesto_trabajo, carreras_dirigidas')
      .eq('empresa_id', user.id)
      .order('created_at', { ascending: false });

    if (jobsError) throw new Error(`No se pudieron consultar las vacantes: ${jobsError.message}`);

    const careerFilter = typeof req.query?.carrera === 'string' ? req.query.carrera : '';
    if (careerFilter && !carrerasDisponibles.includes(careerFilter)) {
      return res.status(400).json({ error: 'La carrera seleccionada no es válida.' });
    }

    const vacancyCareers = [...new Set((jobs || []).flatMap(({ carreras_dirigidas: careers }) => (
      Array.isArray(careers) ? careers.filter((career) => carrerasDisponibles.includes(career)) : []
    )))];
    const careersToSearch = careerFilter ? [careerFilter] : vacancyCareers;
    if (!careersToSearch.length) return res.status(200).json({ vacantes: jobs || [], candidatos: [] });

    const { data: students, error: studentsError } = await supabase
      .from('alumnos')
      .select('uid, nombre, carrera')
      .eq('activo', true)
      .in('carrera', careersToSearch)
      .order('nombre', { ascending: true })
      .limit(1000);

    if (studentsError) throw new Error(`No se pudieron consultar los estudiantes: ${studentsError.message}`);

    const studentIds = (students || []).map(({ uid }) => uid).filter(Boolean);
    let skillsByStudent = {};
    if (studentIds.length) {
      const { data: skills, error: skillsError } = await supabase
        .from('skills')
        .select('alumno_id, nombre, descripcion, progreso_pct')
        .eq('origen', 'curricular')
        .in('alumno_id', studentIds);

      if (skillsError) throw new Error(`No se pudieron consultar las competencias curriculares: ${skillsError.message}`);
      skillsByStudent = (skills || []).reduce((result, skill) => {
        result[skill.alumno_id] ||= [];
        result[skill.alumno_id].push({
          nombre: skill.nombre,
          descripcion: skill.descripcion || '',
          progreso_pct: skill.progreso_pct,
        });
        return result;
      }, {});
    }

    const candidates = (students || []).map((student) => ({
      id: student.uid,
      nombre: student.nombre,
      carrera: student.carrera,
      competencias: skillsByStudent[student.uid] || [],
      vacantesAfin: (jobs || [])
        .filter(({ carreras_dirigidas: careers }) => careers?.includes(student.carrera))
        .map(({ id, nombre_empleo, puesto_trabajo }) => ({ id, nombre_empleo, puesto_trabajo })),
    }));

    return res.status(200).json({ vacantes: jobs || [], candidatos: candidates });
  } catch (error) {
    console.error('Error al buscar candidatos para empresa:', error);
    return res.status(500).json({ error: 'No se pudieron cargar los candidatos. Inténtalo de nuevo.' });
  }
}