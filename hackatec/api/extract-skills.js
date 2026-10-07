import { GoogleGenAI, Type } from '@google/genai';

// Instanciar el cliente usando la API Key definida en las Variables de Entorno
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Esquema de respuesta JSON estricto
const competenciaSchema = {
  type: Type.OBJECT,
  properties: {
    claveAsignatura: { type: Type.STRING },
    nombreAsignatura: { type: Type.STRING },
    carrera: { type: Type.STRING },
    competenciaEspecificaGeneral: { type: Type.STRING },
    competenciasPrevias: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    temasCompetencias: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          numeroTema: { type: Type.INTEGER },
          nombreTema: { type: Type.STRING },
          competenciasEspecificas: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          competenciasGenericas: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["numeroTema", "nombreTema", "competenciasEspecificas"]
      }
    }
  },
  required: ["claveAsignatura", "nombreAsignatura", "competenciaEspecificaGeneral", "temasCompetencias"]
};

export default async function handler(req, res) {
  // Manejo de Headers CORS para solicitudes desde el cliente React
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
  }

  try {
    const { text } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).json({ error: 'El campo "text" es requerido en el body.' });
    }

    const prompt = `
      Analiza el siguiente texto extraído de un programa de estudios o temario académico del TecNM y extrae la información requerida:
      - Clave y Nombre de la asignatura.
      - Carrera a la que pertenece.
      - Competencia específica general.
      - Competencias previas requeridas.
      - Temas con sus respectivas competencias específicas y genéricas.

      Texto a analizar:
      \"\"\"
      ${text}
      \"\"\"
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: competenciaSchema,
        temperature: 0.1
      }
    });

    const parsedData = JSON.parse(response.text);

    return res.status(200).json({
      success: true,
      data: parsedData
    });

  } catch (error) {
    console.error("❌ Error en Serverless Function /api/extract-skills:", error);
    return res.status(500).json({
      error: 'Error al procesar el temario con Gemini.',
      details: error.message
    });
  }
}