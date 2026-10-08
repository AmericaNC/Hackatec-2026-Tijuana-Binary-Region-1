function normalizarClave(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function obtenerSkillsCurriculares(temarios = []) {
  return temarios.flatMap(({ claveMateria, contenido }) => {
    const materiaClave = contenido.asignatura?.clave || claveMateria
    return (contenido.competencias || []).filter((competencia) => competencia.nombre).map((competencia) => ({
      skill_key: `curriculum:${materiaClave}:${competencia.id || normalizarClave(competencia.nombre)}`,
      nombre: competencia.nombre,
      descripcion: competencia.descripcion || '',
      materia_clave: materiaClave,
      origen: 'curricular',
    }))
  })
}

export function resumirProgresoSkills(skillsCurriculares, skillsGuardadas) {
  const progresoPorClave = new Map(
    skillsGuardadas.map((skill) => [skill.skill_key, Number(skill.progreso_pct) || 0]),
  )
  const total = skillsCurriculares.length
  const suma = skillsCurriculares.reduce(
    (acumulado, skill) => acumulado + (progresoPorClave.get(skill.skill_key) || 0),
    0,
  )

  return {
    porcentaje_general: total ? Math.round(suma / total) : 0,
    competencias_evaluadas: skillsCurriculares.filter((skill) => progresoPorClave.has(skill.skill_key)).length,
    competencias_totales: total,
  }
}
