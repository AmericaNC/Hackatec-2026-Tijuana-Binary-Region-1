-- 1. Crear la tabla 'alumnos'
CREATE TABLE public.alumnos (
    uid UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    carrera TEXT NOT NULL,
    matricula TEXT NOT NULL UNIQUE,
    academia TEXT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar Seguridad a Nivel de Fila (RLS)
ALTER TABLE public.alumnos ENABLE ROW LEVEL SECURITY;

-- 3. Crear política para permitir la lectura/consulta desde la aplicación web
CREATE POLICY "Permitir lectura publica de alumnos" 
ON public.alumnos 
FOR SELECT 
USING (true);

-- 4. Datos de prueba para validación con OCR y QR
INSERT INTO public.alumnos (nombre, carrera, matricula, academia, activo) VALUES
('LUIS ALBERTO ROLDAN CASTRO', 'Ingeniería en Sistemas Computacionales', '22211648', 'Sistemas y Computación', true),
('EDER IGNACIO CHAVEZ GONZALEZ', 'Ingeniería en Sistemas Computacionales', '25213366', 'Sistemas y Computación', true),
('AMERICA NEVAREZ', 'Ingeniería en Inteligencia Artificial', '22211649', 'Ciencias de la Computación', false);