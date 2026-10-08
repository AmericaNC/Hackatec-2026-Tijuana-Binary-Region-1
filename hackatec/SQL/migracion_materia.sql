-- 1. CREACIÓN DE LA TABLA 'materias'
CREATE TABLE public.materias (
    id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    carrera_id bigint NOT NULL,
    clave text NOT NULL,
    nombre text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    
    CONSTRAINT materias_pkey PRIMARY KEY (id),
    -- Garantiza que una materia no esté duplicada dentro de la misma carrera
    CONSTRAINT materias_carrera_clave_unique UNIQUE (carrera_id, clave),
    -- Relación con la tabla 'carreras'
    CONSTRAINT materias_carrera_id_fkey FOREIGN KEY (carrera_id) 
        REFERENCES public.carreras(id) ON DELETE CASCADE
);

-- 2. CREACIÓN DE LA TABLA 'calificaciones'
CREATE TABLE public.calificaciones (
    id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    alumno_id uuid NOT NULL,
    materia_id bigint NOT NULL,
    calificacion numeric(5, 2) CHECK (calificacion >= 0 AND calificacion <= 100),
    periodo text NOT NULL, -- Ej. '2026-1' o 'Ene-Jun 2026'
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT calificaciones_pkey PRIMARY KEY (id),
    -- Un alumno puede registrar una calificación por materia en cada periodo
    CONSTRAINT calificaciones_alumno_materia_periodo_unique UNIQUE (alumno_id, materia_id, periodo),
    -- Relación con la tabla 'alumnos' (vía su uid)
    CONSTRAINT calificaciones_alumno_id_fkey FOREIGN KEY (alumno_id) 
        REFERENCES public.alumnos(uid) ON DELETE CASCADE,
    -- Relación con la tabla 'materias'
    CONSTRAINT calificaciones_materia_id_fkey FOREIGN KEY (materia_id) 
        REFERENCES public.materias(id) ON DELETE CASCADE
);

-- 3. ÍNDICES RECOMENDADOS PARA OPTIMIZAR BÚSQUEDAS
CREATE INDEX idx_materias_carrera_id ON public.materias(carrera_id);
CREATE INDEX idx_materias_clave ON public.materias(clave);
CREATE INDEX idx_calificaciones_alumno_id ON public.calificaciones(alumno_id);
CREATE INDEX idx_calificaciones_materia_id ON public.calificaciones(materia_id);