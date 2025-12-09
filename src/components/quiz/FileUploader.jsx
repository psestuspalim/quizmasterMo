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
      console.log('📦 Formato detectado: {t, q} compacto');
      // Expandir el formato compacto
      const expandedQuiz = fromCompactFormat(data);
      console.log('📦 Quiz expandido:', expandedQuiz);

      const quizData = {
        title: data.t,
        description: '',
        total_questions: data.q.length,
        questions: expandedQuiz.questions,
        file_name: fileName,
        is_hidden: false
      };

      console.log('💾 Guardando quiz:', quizData);
      await onUploadSuccess(quizData);
      console.log('✅ Quiz guardado exitosamente');
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

    // FORMATO: {t, q}
    if (data.t && data.q && !data.m) {
      if (!Array.isArray(data.q)) {
        errors.push('❌ "q" debe ser un array de preguntas');
        return { errors, warnings, info };
      }
      if (data.q.length === 0) {
        errors.push('❌ El array "q" está vacío');
        return { errors, warnings, info };
      }

      info.push(`✅ Formato válido: ${data.q.length} pregunta${data.q.length > 1 ? 's' : ''} detectada${data.q.length > 1 ? 's' : ''}`);

      data.q.forEach((q, idx) => {
        const qNum = idx + 1;

        // Validar campos obligatorios de pregunta
        if (!q.x || q.x.trim() === '') errors.push(`❌ Pregunta ${qNum}: falta "x" (texto de la pregunta)`);
        if (!q.dif) warnings.push(`⚠️ Pregunta ${qNum}: falta "dif" (dificultad)`);
        else if (q.dif < 1 || q.dif > 3) warnings.push(`⚠️ Pregunta ${qNum}: "dif" debe ser 1, 2 o 3`);

        if (!q.qt) warnings.push(`⚠️ Pregunta ${qNum}: falta "qt" (tipo de pregunta)`);
        if (!q.id) warnings.push(`⚠️ Pregunta ${qNum}: falta "id" (identificador)`);

        // Validar opciones
        if (!q.o || !Array.isArray(q.o)) {
          errors.push(`❌ Pregunta ${qNum}: falta "o" (array de opciones)`);
        } else {
          if (q.o.length === 0) {
            errors.push(`❌ Pregunta ${qNum}: el array "o" está vacío`);
          }

          const correctCount = q.o.filter(opt => opt.c === true).length;
          if (correctCount === 0) errors.push(`❌ Pregunta ${qNum}: ninguna opción marcada como correcta`);
          if (correctCount > 1) warnings.push(`⚠️ Pregunta ${qNum}: ${correctCount} opciones correctas (multi-respuesta)`);

          q.o.forEach((opt, optIdx) => {
            if (!opt.text || opt.text.trim() === '') {
              errors.push(`❌ Pregunta ${qNum}, Opción ${optIdx + 1}: falta "text"`);
            }
            if (typeof opt.c !== 'boolean') {
              errors.push(`❌ Pregunta ${qNum}, Opción ${optIdx + 1}: "c" debe ser true o false`);
            }
            if (!opt.r || opt.r.trim() === '') {
              warnings.push(`⚠️ Pregunta ${qNum}, Opción ${optIdx + 1}: falta "r" (razonamiento)`);
            }
          });
        }
      });

      return { errors, warnings, info };
    }

    // Formato no reconocido
    errors.push('❌ Formato incorrecto: debe tener la estructura {"t": "Título", "q": [...]}');
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
      console.log('🔍 Parseando JSON...');
      const data = JSON.parse(jsonText);
      console.log('✅ JSON parseado:', data);

      // Validar esquema solo si el formato es el esperado
      if (data.t && data.q) {
        console.log('🔍 Validando esquema formato {t, q}...');
        const validation = validateJsonSchema(data);

        if (validation.errors.length > 0) {
          console.log('❌ Errores de validación:', validation.errors);
          setJsonErrors([...validation.errors, ...validation.warnings, ...validation.info]);
          setError(`Se encontraron ${validation.errors.length} error(es) crítico(s)`);
          setIsProcessing(false);
          return;
        }

        if (validation.warnings.length > 0 || validation.info.length > 0) {
          console.log('⚠️ Advertencias:', validation.warnings);
          setJsonErrors([...validation.info, ...validation.warnings]);
        }
      }

      const fileName = data.t || data.m?.t || 'Quiz cargado';
      console.log('📝 Procesando quiz:', fileName);
      await processJsonData(data, fileName);
      console.log('✅ Quiz procesado exitosamente');

      setJsonText('');
      setJsonErrors([]);
      setError(null);
      setIsProcessing(false);
    } catch (err) {
      console.error('❌ Error procesando JSON:', err);
      if (err instanceof SyntaxError) {
        setError(`Error de sintaxis JSON: ${err.message}`);
        setJsonErrors(['💡 Verifica comillas, comas y llaves. Cada línea excepto la última debe terminar en coma.']);
      } else {
        setError(`Error al procesar: ${err.message}`);
      }
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
                <TabsList className="grid w-full grid-cols-4 mb-6">
                  <TabsTrigger value="text">
                    <FileText className="w-4 h-4 mr-2" />
                    Texto
                  </TabsTrigger>
                  <TabsTrigger value="json">
                    <FileJson className="w-4 h-4 mr-2" />
                    JSON
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

        <TabsContent value="json">
          <Card className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Pegar JSON del quiz
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Formato: <code className="bg-gray-100 px-2 py-1 rounded text-xs">{"{"}"t": "Título", "q": [{"{"}"x": "...", "dif": 1-3, "o": [...]{"}"}, ...]{"}"}</code>
              </p>
            </div>
            
            <Textarea
              id="quiz-json-input"
              name="quiz-json"
              value={jsonText}
              onChange={(e) => {
                const text = e.target.value;
                setJsonText(text);
                setJsonErrors([]);
                setError(null);

                // Validación en tiempo real
                if (text.trim()) {
                  try {
                    const parsed = JSON.parse(text);
                    const validation = validateJsonSchema(parsed);
                    if (validation.errors.length > 0) {
                      setJsonErrors([...validation.errors, ...validation.warnings, ...validation.info]);
                      setError(`${validation.errors.length} error(es) encontrado(s)`);
                    } else if (validation.warnings.length > 0 || validation.info.length > 0) {
                      setJsonErrors([...validation.info, ...validation.warnings]);
                    }
                  } catch (err) {
                    if (err instanceof SyntaxError) {
                      setError(`Sintaxis JSON inválida: ${err.message}`);
                    }
                  }
                }
              }}
              placeholder='{"t": "Título del quiz", "q": [{"x": "Pregunta...", "dif": 2, "qt": "mcq", "id": "Q001", "o": [{"text": "Opción", "c": true, "r": "Explicación"}]}]}'
              className="min-h-[300px] max-h-[500px] font-mono text-xs mb-4 resize-y"
              rows={15}
            />

            {jsonErrors.length > 0 && (
              <div className={`mb-4 p-3 rounded-lg max-h-60 overflow-y-auto border ${
                error ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
              }`}>
                <p className="text-xs font-semibold mb-2 flex items-center gap-1">
                  {error ? (
                    <>
                      <AlertCircle className="w-3 h-3 text-red-600" />
                      <span className="text-red-900">Errores de validación:</span>
                    </>
                  ) : (
                    <>
                      <span className="text-blue-900">✓ Información:</span>
                    </>
                  )}
                </p>
                <ul className="text-xs space-y-1">
                  {jsonErrors.map((err, idx) => (
                    <li key={idx} className={
                      err.startsWith('❌') ? 'text-red-700 font-medium' :
                      err.startsWith('⚠️') ? 'text-amber-700' :
                      'text-blue-700'
                    }>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {error && !jsonErrors.length && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handlePasteSubmit}
                disabled={isProcessing || !jsonText.trim() || error}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {isProcessing ? 'Procesando...' : 'Cargar cuestionario'}
              </Button>
            </div>
          </Card>
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