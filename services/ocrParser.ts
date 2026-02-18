
import Tesseract from 'tesseract.js';

export interface ScannedData {
  nombre: string;
  apellidos: string;
  documento: string;
  tipo_documento: 'DNI' | 'PASAPORTE' | 'OTRO';
  fecha_nacimiento: string; // YYYY-MM-DD
  fecha_expedicion?: string;
  fecha_caducidad?: string;
  nacionalidad?: string;
  sexo?: string;
  raw_text?: string;
}

// Utilidad para limpiar texto OCR
const cleanText = (text: string) => text.replace(/[^a-zA-Z0-9<]/g, '').toUpperCase();

// Parsear fecha formato MRZ (YYMMDD) a YYYY-MM-DD
const parseMRZDate = (dateStr: string, isExpiry: boolean = false): string => {
  if (!dateStr || dateStr.length !== 6) return '';
  const yy = parseInt(dateStr.substring(0, 2));
  const mm = dateStr.substring(2, 4);
  const dd = dateStr.substring(4, 6);

  // Heurística simple para siglo: Si es fecha de caducidad y yy < 60, es 20yy. 
  // Si es nacimiento y yy > 24, es 19yy (ajustar según necesidad)
  const currentYear = new Date().getFullYear() % 100;
  const century = (isExpiry || yy <= currentYear) ? '20' : '19';

  return `${century}${yy}-${mm}-${dd}`;
};

export const processImage = async (imageFile: File | string, onProgress: (p: number) => void): Promise<ScannedData> => {
  // 1. Pre-procesamiento de imagen (Canvas)
  // Convertimos a escala de grises y aumentamos contraste para ayudar a Tesseract
  const preprocessImage = (input: File | string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(typeof input === 'string' ? input : URL.createObjectURL(input)); return; }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Binarización simple
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i];
          const g = d[i + 1];
          const b = d[i + 2];
          // Grayscale (formula luminosidad)
          let v = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          // Threshold (contrast)
          v = (v >= 128) ? 255 : 0;
          d[i] = d[i + 1] = d[i + 2] = v;
        }
        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = typeof input === 'string' ? input : URL.createObjectURL(input);
    });
  };

  const processedImage = await preprocessImage(imageFile);

  // 2. Ejecutar Tesseract (OFFLINE CONFIG)
  const worker = await Tesseract.createWorker({
    workerPath: '/tesseract/worker.min.js',
    langPath: '/tesseract',
    corePath: '/tesseract/tesseract-core.wasm.js',
    logger: m => {
      if (m.status === 'recognizing text') {
        onProgress(m.progress);
      }
    }
  });

  try {
    await worker.load();
    await worker.loadLanguage('spa+eng');
    await worker.initialize('spa+eng');
    const { data: { text } } = await worker.recognize(processedImage);
    await worker.terminate();

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 5);

    let data: ScannedData = {
      nombre: '',
      apellidos: '',
      documento: '',
      tipo_documento: 'OTRO',
      fecha_nacimiento: '',
      raw_text: text
    };

    // 3. Lógica de Parsing (MRZ - Machine Readable Zone)
    // Busca líneas que contienen muchos '<<<<'
    const mrzLines = lines.filter(l => l.includes('<<'));

    if (mrzLines.length >= 2) {
      // Probablemente Pasaporte (2 líneas) o DNI 3.0 (3 líneas)
      // Pasaporte Línea 1: P<ESPAPELLIDO<<NOMBRE<<<<<<<<
      // DNI Línea 1: IDESP...

      const line1 = cleanText(mrzLines[0]);
      const line2 = cleanText(mrzLines[1]);

      // Tipo Documento
      if (line1.startsWith('P')) data.tipo_documento = 'PASAPORTE';
      else if (line1.startsWith('I') || line1.startsWith('A') || line1.startsWith('C')) data.tipo_documento = 'DNI';

      // Extracción Pasaporte (Formato TD3)
      if (data.tipo_documento === 'PASAPORTE') {
        // Nombre y Apellido
        const nameParts = line1.substring(5).split('<<');
        data.apellidos = nameParts[0].replace(/</g, ' ').trim();
        data.nombre = nameParts[1]?.replace(/</g, ' ').trim() || '';

        // Número documento (Line 2, chars 0-9)
        data.documento = line2.substring(0, 9).replace(/</g, '');

        // Nacionalidad (Line 1, chars 2-5)
        data.nacionalidad = line1.substring(2, 5).replace(/</g, '');

        // Fecha Nacimiento (Line 2, chars 13-19, YYMMDD)
        data.fecha_nacimiento = parseMRZDate(line2.substring(13, 19));

        // Sexo (Line 2, char 20)
        data.sexo = line2.charAt(20);

        // Caducidad (Line 2, chars 21-27)
        data.fecha_caducidad = parseMRZDate(line2.substring(21, 27), true);
      }
      // Extracción ID Card (Formato TD1 - DNI Español reverso)
      else if (data.tipo_documento === 'DNI') {
        // IDESP...
        // Line 1: IDESP{NUMERO}<{CHECK}<<<<<<<<<<
        // Line 2: {YYMMDD}(Nacimiento){CHECK}{SEXO}{YYMMDD}(Caducidad)...
        // Line 3: {APELLIDOS}<<{NOMBRE}

        // Nota: El orden de líneas en OCR a veces baila. Buscamos patrones.

        // Intentar encontrar línea de nombres (contiene << y letras)
        const nameLine = mrzLines.find(l => l.includes('<<') && !l.match(/\d{6}/));
        if (nameLine) {
          const parts = cleanText(nameLine).split('<<');
          data.apellidos = parts[0].replace(/</g, ' ').trim();
          data.nombre = parts[1]?.replace(/</g, ' ').trim() || '';
        }

        // Intentar encontrar número DNI
        // DNI Español suele empezar por IDESP seguido del numero
        const idLine = mrzLines.find(l => l.includes('IDESP'));
        if (idLine) {
          data.documento = cleanText(idLine).substring(5, 14);
          data.nacionalidad = 'ESP';
        }

        // Intentar encontrar fechas en la línea numérica
        const dateLine = mrzLines.find(l => l.match(/\d{6}.{1}[MF<].{1}\d{6}/)); // Patron fecha nac + sexo + fecha cad
        if (dateLine) {
          const cleanL = cleanText(dateLine);
          data.fecha_nacimiento = parseMRZDate(cleanL.substring(0, 6));
          data.sexo = cleanL.charAt(7);
          data.fecha_caducidad = parseMRZDate(cleanL.substring(8, 14), true);
        }
      }
    }

    // 4. Fallback Regex (Si no hay MRZ claro, buscar patrones de DNI)
    if (!data.documento) {
      const dniRegex = /(\d{8})[- ]?([A-Z])/; // 12345678A
      const nieRegex = /([XYZ])[- ]?(\d{7})[- ]?([A-Z])/; // X1234567A

      const dniMatch = text.match(dniRegex);
      const nieMatch = text.match(nieRegex);

      if (nieMatch) {
        data.documento = `${nieMatch[1]}${nieMatch[2]}${nieMatch[3]}`;
        data.tipo_documento = 'DNI'; // NIE técnicamente es documento ID
      } else if (dniMatch) {
        data.documento = `${dniMatch[1]}${dniMatch[2]}`;
        data.tipo_documento = 'DNI';
      }
    }

    // Fallback Nombre: Si no hay MRZ, es muy difícil saber qué es nombre y qué es apellido.
    // Dejamos vacío para que el usuario rellene, o intentamos buscar palabras en mayúsculas.

    return data;
  } catch (error) {
    console.error("OCR Error:", error);
    throw error;
  }
};
