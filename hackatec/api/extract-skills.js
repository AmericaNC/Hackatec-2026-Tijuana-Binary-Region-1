import { GoogleGenAI, Type } from '@google/genai';
import { Buffer } from 'node:buffer';
import process from 'node:process';

const MAX_PDF_BYTES = 3 * 1024 * 1024;

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    carrera: {
      type: Type.OBJECT,
      properties: {
        clave: { type: Type.STRING },
        nombre: { type: Type.STRING },
      },
      required: ['clave', 'nombre'],
    },
    asignatura: {
      type: Type.OBJECT,
      properties: {
        clave: { type: Type.STRING },
        nombre: { type: Type.STRING },
      },
      required: ['clave', 'nombre'],
    },
    competencias: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          nombre: { type: Type.STRING },
          descripcion: { type: Type.STRING },
        },
        required: ['id', 'nombre', 'descripcion'],
      },
    },
  },
  required: ['carrera', 'asignatura', 'competencias'],
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
  }

  const { GEMINI_API_KEY } = process.env;
  if (!GEMINI_API_KEY) {
    console.error('Falta configurar GEMINI_API_KEY en el entorno de Vercel.');
    return res.status(500).json({ error: 'El servicio de extracción no está configurado.' });
  }

  const { pdfBase64, mimeType } = req.body ?? {};
  if (mimeType !== 'application/pdf' || typeof pdfBase64 !== 'string' || !pdfBase64) {
    return res.status(400).json({ error: 'Envía un archivo PDF válido.' });
  }

  const pdf = Buffer.from(pdfBase64, 'base64');
  if (pdf.length === 0 || pdf.subarray(0, 5).toString('ascii') !== '%PDF-') {
    return res.status(400).json({ error: 'El archivo enviado no es un PDF válido.' });
  }
  if (pdf.length > MAX_PDF_BYTES) {
    return res.status(413).json({ error: 'El PDF debe tener un tamaño máximo de 3 MB.' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: pdf.toString('base64'),
          },
        },
        {
          text: [
            'Analiza el programa de estudios TecNM del PDF y devuelve únicamente la información respaldada por el documento.',
            'Usa exactamente esta estructura: carrera { clave, nombre }, asignatura { clave, nombre }, competencias [{ id, nombre, descripcion }].',
            'Extrae las competencias específicas de la asignatura. No incluyas competencias genéricas, temas ni competencias previas.',
            'Si el documento no proporciona una clave, usa una cadena vacía; no inventes claves ni nombres.',
            'Asigna a cada competencia un identificador único y consecutivo con el formato CE-01, CE-02, etc.',
          ].join(' '),
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema,
        temperature: 0.1,
      },
    });

    const data = JSON.parse(response.text);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error en /api/extract-skills:', error);
    return res.status(500).json({
      error: 'No se pudo procesar el PDF. Inténtalo de nuevo.',
    });
  }
}
