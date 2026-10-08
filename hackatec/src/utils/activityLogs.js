import { supabase } from '../supabaseClient'

export async function registrarActividad({
  eventType,
  description,
  affectedUserId,
  affectedName,
  audienceCareers = [],
}) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return

    let actorName = user.email || 'Usuario'
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('nombre')
      .eq('id', user.id)
      .maybeSingle()
    if (perfil?.nombre) actorName = perfil.nombre

    if (!perfil?.nombre) {
      const { data: empresa } = await supabase
        .from('empresas')
        .select('nombre')
        .eq('id', user.id)
        .maybeSingle()
      if (empresa?.nombre) actorName = empresa.nombre
    }

    const { error: insertError } = await supabase.from('activity_logs').insert({
      actor_id: user.id,
      actor_name: actorName,
      affected_user_id: affectedUserId === undefined ? user.id : affectedUserId,
      affected_name: affectedName || actorName,
      audience_careers: audienceCareers,
      event_type: eventType,
      description: description.slice(0, 500),
    })

    if (insertError) {
      console.warn('No se pudo guardar el evento de actividad:', insertError.message)
      return
    }

    window.dispatchEvent(new Event('activity-log-updated'))
  } catch (error) {
    console.warn('No se pudo guardar el evento de actividad:', error)
  }
}