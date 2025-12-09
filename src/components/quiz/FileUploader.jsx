import React, { useState } from 'react';
import { Upload, FileJson, AlertCircle, Image, Microscope, ClipboardPaste, Wrench, Loader2, FileText } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import ImageQuizCreator from './ImageQuizCreator';
import TissueQuizCreator from './TissueQuizCreator';
import TextQuizCreator from './TextQuizCreator';
import { toCompactFormat, fromCompactFormat } from '../utils/quizFormats';

export default function FileUploader({ onUploadSuccess }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('text');
  const [jsonText, setJsonText] = useState('');
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [jsonErrors, setJsonErrors] = useState([]);

  const processJsonData = async (data, fileName = 'Quiz') => {
    let questions = [];
    let title = fileName.replace('.json', '');
    let description = '';
    
    // Mapeo de dificultad inglés a español
    const difficultyMap = {
      'easy': 'fácil',
      'medium': 'moderado',
      'hard': 'difícil',
      'moderate': 'moderado',
      1: 'fácil',
      2: 'moderado',
      3: 'difícil'
    };

    // Mapeo de Bloom codes
    const bloomMap = {
      1: 'Recordar',
      2: 'Comprender',
      3: 'Aplicar',
      4: 'Analizar',
      5: 'Evaluar'
    };

    // FORMATO NUEVO {t, q} con estructura compacta
    if (data.t && data.q && Array.isArray(data.q) && !data.m) {
      const expandedQuiz = fromCompactFormat(data);
      await onUploadSuccess({
        ...toCompactFormat(expandedQuiz),
        file_name: fileName,
        is_hidden: false
      });
      return;
    }

    // ARRAY DIRECTO DE PREGUNTAS cQ-v2 (sin wrapper m/q)
    if (Array.isArray(data) && data.length > 0 && data[0].i && data[0].x && data[0].o) {
      // Es un array directo de preguntas en formato cQ-v2
      const compactData = {
        m: {
          t: title,
          s: description,
          v: 'cQ-v2',
          c: data.length
        },
        q: data
      };

      // Procesar usando fromCompactFormat
      const expandedQuiz = fromCompactFormat(compactData);
      await onUploadSuccess({
        ...toCompactFormat(expandedQuiz),
        file_name: fileName,
        is_hidden: false
      });
      return;
    }

    // FORMATO cQ COMPACTO (cQ-v2, cQ-v3.3Pro, etc.)
    if (data.m && data.q && Array.isArray(data.q) && data.m.v && data.m.v.startsWith('cQ-v')) {
      // Guardar AMBOS formatos: el compacto original (m/q) Y el expandido (questions)
      const expanded = fromCompactFormat(data);

      await onUploadSuccess({
        title: data.m.t || fileName,
        description: data.m.s || data.m.f || '',
        total_questions: data.m.c || data.q.length,
        questions: expanded.questions,
        m: data.m,
        q: data.q,
        file_name: fileName,
        is_hidden: false
      });
      return;
    }
    
    // FORMATO COMPACTO MÁXIMO (m + q con array p) - legacy
    if (data.m && data.q && Array.isArray(data.q)) {
      title = data.m.title || title;
      description = data.m.fmt || '';

      questions = data.q.map((q) => {
        if (!q.p || !Array.isArray(q.p)) return null;
        
        const [id, bloomCode, diffNum, questionText, ...optionsArrays] = q.p;
        
        return {
          type: 'text',
          question: questionText,
          feedback: q.ana || '',
          difficulty: difficultyMap[diffNum] || 'moderado',
          bloomLevel: bloomMap[bloomCode] || bloomCode || '',
          answerOptions: optionsArrays.map(opt => ({
            text: opt[1],
            isCorrect: opt[2] === 1,
            rationale: opt[3] ? `Tipo de error: ${opt[3]}` : ''
          }))
        };
      }).filter(q => q !== null);
    }
    // FORMATO META + Q (formato modular)
    else if (data.meta && data.q && Array.isArray(data.q)) {
      title = data.meta.title || title;
      description = data.meta.src || '';

      questions = data.q.map((q) => ({
        type: 'text',
        question: q.txt,
        hint: q.ana || '',
        difficulty: difficultyMap[q.dif] || 'moderado',
        answerOptions: (q.ops || []).map(opt => ({
          text: opt.val,
          isCorrect: opt.ok === true,
          rationale: opt.err ? `Error común: ${opt.err}` : ''
        }))
      }));
    }
    // FORMATO COMPACTO (qm, q, etc.)
    else if (data.qm && data.q && Array.isArray(data.q)) {
      title = data.qm.ttl || title;
      description = data.qm.foc || '';

      questions = data.q.map((q) => ({
        type: 'text',
        question: q.t,
        hint: q.ct || '',
        difficulty: difficultyMap[q.d] || 'moderado',
        bloomLevel: bloomMap[q.b] || '',
        answerOptions: (q.o || []).map(opt => ({
          text: opt.t,
          isCorrect: opt.c === true || opt.c === 1,
          rationale: opt.r || ''
        }))
      }));
    }
    // Formato con quizMetadata y questions
    else if (data.questions && Array.isArray(data.questions)) {
      title = data.quizMetadata?.title || data.title || title;
      description = data.quizMetadata?.focus || data.quizMetadata?.source || data.description || '';

      questions = data.questions.map((q, idx) => {
        // Normalizar answerOptions
        let normalizedOptions = [];

        if (q.answerOptions && Array.isArray(q.answerOptions) && q.answerOptions.length > 0) {
          normalizedOptions = q.answerOptions
            .filter(opt => opt && typeof opt === 'object' && opt.text && opt.text.trim().length > 0)
            .map(opt => ({
              text: opt.text.trim(),
              isCorrect: opt.isCorrect === true || opt.isCorrect === 1 || opt.isCorrect === '1',
              rationale: (opt.rationale || opt.feedback || opt.explanation || '').trim()
            }));
        }

        // Si answerOptions no funcionó, intentar con options
        if (normalizedOptions.length === 0 && q.options && Array.isArray(q.options) && q.options.length > 0) {
          normalizedOptions = q.options
            .filter(opt => opt && (opt.text || typeof opt === 'string'))
            .map(opt => ({
              text: (opt.label ? `${opt.label}. ${opt.text}` : (opt.text || opt)).trim(),
              isCorrect: opt.isCorrect === true || opt.isCorrect === 1 || opt.isCorrect === '1',
              rationale: (opt.feedback || opt.rationale || opt.analysis || '').trim()
            }));
        }

        const questionText = (q.questionText || q.question || q.text || '').trim();

        if (!questionText) {
          console.warn(`Pregunta ${idx + 1} sin texto válido, omitida`);
          return null;
        }

        if (normalizedOptions.length === 0) {
          console.warn(`Pregunta ${idx + 1} ("${questionText.slice(0, 50)}...") sin opciones válidas, omitida`);
          return null;
        }

        return {
          type: q.type || 'text',
          question: questionText,
          hint: (q.hint || q.cinephileTip || q.analysis || '').trim(),
          feedback: (q.analysis || q.feedback || '').trim(),
          difficulty: difficultyMap[q.difficulty] || q.difficulty || 'moderado',
          bloomLevel: q.bloomLevel || '',
          imageUrl: q.imageUrl || null,
          answerOptions: normalizedOptions
        };
      }).filter(q => q !== null);
    }
    // Formato original con array "quiz"
    else if (data.quiz && Array.isArray(data.quiz)) {
      title = data.title || title;
      description = data.description || '';
      
      questions = data.quiz.map((q) => {
        const options = q.answerOptions || q.options || [];
        return {
          type: q.type || 'text',
          question: q.questionText || q.question || q.text,
          hint: q.hint || q.cinephileTip || '',
          difficulty: difficultyMap[q.difficulty] || q.difficulty || 'moderado',
          answerOptions: options.map(opt => ({
            text: opt.text || opt,
            isCorrect: opt.isCorrect === true || opt.isCorrect === 1,
            rationale: opt.feedback || opt.rationale || ''
          }))
        };
      });
    }
    else {
      throw new Error('Formato de archivo inválido. Debe contener "m/q", "meta/q", "qm/q", "quiz" o "questions"');
    }

    // Convertir a formato compacto cQ-v2 antes de guardar
    const compactQuiz = toCompactFormat({
      title,
      description: description || `Cuestionario con ${questions.length} preguntas`,
      questions,
      total_questions: questions.length
    });

    await onUploadSuccess({
      ...compactQuiz,
      file_name: fileName,
      is_hidden: false
    });
  };

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    
    setIsProcessing(true);
    setError(null);

    try {
      let successCount = 0;
      let errorCount = 0;
      
      for (const file of files) {
        if (file.type !== 'application/json') {
          errorCount++;
          continue;
        }

        try {
          const text = await file.text();
          const data = JSON.parse(text);
          await processJsonData(data, file.name);
          successCount++;
        } catch (err) {
          console.error(`Error en ${file.name}:`, err);
          errorCount++;
        }
      }
      
      if (successCount > 0) {
        setError(null);
      }
      if (errorCount > 0) {
        setError(`${successCount} archivos cargados correctamente, ${errorCount} con errores`);
      }
    } catch (err) {
      setError(err.message || 'Error al procesar los archivos');
    } finally {
      setIsProcessing(false);
    }
  };

  const validateJsonSchema = (data) => {
    const errors = [];
    const warnings = [];
    const info = [];

    if (typeof data !== 'object' || data === null) {
      errors.push('❌ El JSON debe ser un objeto');
      return { errors, warnings, info };
    }

    // NUEVO FORMATO: {t, q}
    if (data.t && data.q && !data.m) {
      if (!Array.isArray(data.q)) {
        errors.push('❌ "q" debe ser un array de preguntas');
        return { errors, warnings, info };
      }
      if (data.q.length === 0) {
        errors.push('❌ El array "q" está vacío');
        return { errors, warnings, info };
      }

      info.push(`✅ Formato nuevo detectado: ${data.q.length} preguntas`);

      data.q.forEach((q, idx) => {
        const qNum = idx + 1;
        if (!q.x || q.x.trim() === '') errors.push(`❌ Q${qNum}: falta "x" (texto)`);
        if (!q.dif || q.dif < 1 || q.dif > 3) warnings.push(`⚠️ Q${qNum}: "dif" debe ser 1-3`);
        if (!q.id) warnings.push(`⚠️ Q${qNum}: falta "id"`);

        if (!q.o || !Array.isArray(q.o)) {
          errors.push(`❌ Q${qNum}: falta "o" (opciones)`);
        } else {
          const correctCount = q.o.filter(opt => opt.c === true).length;
          if (correctCount === 0) errors.push(`❌ Q${qNum}: ninguna opción correcta`);
          if (correctCount > 1) warnings.push(`⚠️ Q${qNum}: múltiples correctas`);

          q.o.forEach((opt, optIdx) => {
            if (!opt.text || opt.text.trim() === '') errors.push(`❌ Q${qNum} Op${optIdx + 1}: falta "text"`);
            if (typeof opt.c !== 'boolean') errors.push(`❌ Q${qNum} Op${optIdx + 1}: "c" debe ser boolean`);
          });
        }
      });

      return { errors, warnings, info };
    }

    // FORMATO VIEJO: {m, q}
    if (!data.m && !data.q) {
      errors.push('❌ Formato incorrecto: debe tener {t, q} o {m, q}');
      return { errors, warnings, info };
    }

    if (!data.m) errors.push('❌ Falta el campo "m"');
    else {
      if (!data.m.t) errors.push('❌ m.t: título obligatorio');
      if (!data.m.v) errors.push('❌ m.v: versión obligatoria');
    }

    if (!data.q || !Array.isArray(data.q) || data.q.length === 0) {
      errors.push('❌ Falta o está vacío "q"');
    }

    return { errors, warnings, info };
  };

  const handlePasteSubmit = async () => {
    if (!jsonText.trim()) {
      setError('Por favor, pega el contenido JSON');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setJsonErrors([]);

    try {
      const data = JSON.parse(jsonText);

      // Validar esquema
      const validation = validateJsonSchema(data);
      const allIssues = [...validation.errors, ...validation.warnings];

      if (validation.errors.length > 0) {
        setJsonErrors(allIssues);
        setError(`❌ ${validation.errors.length} error(es) crítico(s) encontrado(s)`);
        setIsProcessing(false);
        return;
      }

      if (validation.warnings.length > 0) {
        setJsonErrors([...validation.warnings, ...validation.info]);
      }

      const fileName = data.t || data.m?.t || data.quizMetadata?.title || data.title || 'Quiz pegado';
      await processJsonData(data, fileName);
      setJsonText('');
      setShowPasteArea(false);
      setJsonErrors([]);
    } catch (err) {
      console.error('Error procesando JSON:', err);
      if (err instanceof SyntaxError) {
        setError(`❌ Error de sintaxis JSON: ${err.message}`);
        setJsonErrors(['💡 Revisa comillas, comas y llaves faltantes']);
      } else {
        setError('❌ JSON inválido. Usa "Reparar JSON" para intentar corregirlo.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

      const handleRepairJson = async () => {
        if (!jsonText.trim()) {
          setError('Por favor, pega el contenido JSON primero');
          return;
        }

        setIsRepairing(true);
        setError(null);

        try {
          const result = await base44.integrations.Core.InvokeLLM({
            prompt: `Repara este JSON mal formateado. Corrige errores comunes como:
  - Comillas faltantes o incorrectas
  - Comas extras o faltantes
  - Corchetes/llaves sin cerrar
  - Caracteres especiales no escapados
  - Formato incorrecto

  JSON a reparar:
  ${jsonText}

  IMPORTANTE: Devuelve SOLO el JSON reparado, sin explicaciones. Mantén toda la estructura y datos originales.`,
            response_json_schema: {
              type: "object",
              properties: {
                repaired_json: { type: "string", description: "El JSON reparado como string" },
                changes_made: { type: "array", items: { type: "string" }, description: "Lista de cambios realizados" }
              }
            }
          });

          if (result.repaired_json) {
            // Intentar parsear para verificar que es válido
            const parsed = JSON.parse(result.repaired_json);
            setJsonText(JSON.stringify(parsed, null, 2));
            setError(null);
          }
        } catch (err) {
          setError('No se pudo reparar el JSON. Revisa manualmente el formato.');
        } finally {
          setIsRepairing(false);
        }
      };

  const handleImageQuizSave = async (questionData) => {
    // Si son múltiples preguntas
    if (questionData.multipleQuestions) {
      const questions = questionData.multipleQuestions.map(q => ({
        ...q,
        type: 'image'
      }));
      await onUploadSuccess({
        title: `Cuestionario con ${questions.length} imágenes`,
        description: 'Cuestionario con imágenes',
        questions,
        total_questions: questions.length
      });
    } else {
      await onUploadSuccess({
        title: questionData.question,
        description: questionData.description || 'Cuestionario con imagen',
        questions: [{
          ...questionData,
          type: 'image'
        }],
        total_questions: 1
      });
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="text">
                    <FileText className="w-4 h-4 mr-2" />
                    Texto
                  </TabsTrigger>
                  <TabsTrigger value="image">
                    <Image className="w-4 h-4 mr-2" />
                    Imagen
                  </TabsTrigger>
                  <TabsTrigger value="tissue">
                    <Microscope className="w-4 h-4 mr-2" />
                    Tejidos
                  </TabsTrigger>
                </TabsList>



        <TabsContent value="text">
          <TextQuizCreator 
            onSave={onUploadSuccess}
            onCancel={() => setActiveTab('json')}
          />
        </TabsContent>

        <TabsContent value="image">
                    <ImageQuizCreator 
                      onSave={handleImageQuizSave}
                      onCancel={() => setActiveTab('text')}
                    />
                  </TabsContent>

                  <TabsContent value="tissue">
                    <TissueQuizCreator 
                      onSave={handleImageQuizSave}
                      onCancel={() => setActiveTab('json')}
                    />
                  </TabsContent>
                </Tabs>
    </div>
  );
}