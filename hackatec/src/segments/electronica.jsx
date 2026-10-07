export default function ElectronicaDashboard({ user, perfil }) {
  return (
    <div style={{ padding: '30px', fontFamily: 'sans-serif' }}>
      <h1>⚡ Panel de Ingeniería Electrónica</h1>
      <p>Bienvenido, <strong>{perfil?.nombre || user?.email}</strong> (Matrícula: {perfil?.matricula})</p>
      <p>UID del usuario: <code>{user?.id}</code></p>
    </div>
  )
}