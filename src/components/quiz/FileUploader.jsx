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

export default function FileUploader({ onUploadSuccess }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('json');
  const [jsonText, setJsonText] = useState('');
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);

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

    // FORMATO COMPACTO (qm, q, etc.)
    if (data.qm && data.q && Array.isArray(data.q)) {
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

      questions = data.questions.map((q) => {
        const options = q.options || q.answerOptions || [];
        return {
          type: q.type || 'text',
          question: q.questionText || q.question || q.text,
          hint: q.cinephileTip || q.hint || q.analysis || '',
          feedback: q.analysis || q.feedback || '',
          difficulty: difficultyMap[q.difficulty] || q.difficulty || 'moderado',
          bloomLevel: q.bloomLevel || '',
          answerOptions: options.map(opt => ({
            text: opt.label ? `${opt.label}. ${opt.text}` : (opt.text || opt),
            isCorrect: opt.isCorrect === true || opt.isCorrect === 1,
            rationale: opt.feedback || opt.rationale || opt.analysis || q.analysis || ''
          }))
        };
      });
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
      throw new Error('Formato de archivo inválido. Debe contener "qm/q", "quiz" o "questions"');
    }

    await onUploadSuccess({
      title,
      description: description || `Cuestionario con ${questions.length} preguntas`,
      questions,
      total_questions: questions.length,
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

  const handlePasteSubmit = async () => {
        if (!jsonText.trim()) {
          setError('Por favor, pega el contenido JSON');
          return;
        }

        setIsProcessing(true);
        setError(null);

        try {
          const data = JSON.parse(jsonText);
          await processJsonData(data, data.quizMetadata?.title || 'Quiz pegado');
          setJsonText('');
          setShowPasteArea(false);
        } catch (err) {
          setError('JSON inválido. Usa "Reparar JSON" para intentar corregirlo automáticamente.');
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

        <TabsContent value="json">
          {!showPasteArea ? (
            <Card
              className={`border-2 border-dashed transition-all duration-200 ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50/50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <div className="p-12 text-center">
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                    <FileJson className="w-10 h-10 text-gray-400" />
                  </div>
                </div>
                
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Cargar archivos de cuestionario
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Arrastra uno o múltiples archivos JSON
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    type="button"
                    disabled={isProcessing}
                    className="bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => document.getElementById('file-upload').click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isProcessing ? 'Procesando...' : 'Seleccionar archivo'}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPasteArea(true)}
                  >
                    <ClipboardPaste className="w-4 h-4 mr-2" />
                    Pegar JSON
                  </Button>
                </div>
                
                <input
                  id="file-upload"
                  type="file"
                  accept=".json"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(Array.from(e.target.files))}
                />
              </div>
            </Card>
          ) : (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Pegar JSON
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const exampleJson = `{
  "quizMetadata": {
    "title": "Nombre del Quiz"
  },
  "questions": [
    {
      "questionText": "¿Tu pregunta aquí?",
      "options": [
        { "text": "Opción correcta", "isCorrect": true, "feedback": "Explicación" },
        { "text": "Opción incorrecta", "isCorrect": false, "feedback": "Por qué no" }
      ],
      "cinephileTip": "Pista opcional"
    }
  ]
}`;
                    setJsonText(exampleJson);
                  }}
                  className="text-indigo-600 hover:text-indigo-700 text-xs"
                >
                  📋 Copiar estructura base
                </Button>
              </div>
              <Textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder='{"quiz": [{"question": "...", "answerOptions": [...]}]}'
                className="min-h-[200px] font-mono text-sm mb-4"
              />
              <div className="flex flex-wrap gap-3">
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        setShowPasteArea(false);
                                        setJsonText('');
                                        setError(null);
                                      }}
                                    >
                                      Cancelar
                                    </Button>
                                    <Button
                                      variant="outline"
                                      onClick={handleRepairJson}
                                      disabled={isRepairing || !jsonText.trim()}
                                      className="text-amber-600 border-amber-300 hover:bg-amber-50"
                                    >
                                      {isRepairing ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      ) : (
                                        <Wrench className="w-4 h-4 mr-2" />
                                      )}
                                      Reparar JSON
                                    </Button>
                                    <Button
                                      onClick={handlePasteSubmit}
                                      disabled={isProcessing || !jsonText.trim()}
                                      className="bg-indigo-600 hover:bg-indigo-700"
                                    >
                                      {isProcessing ? 'Procesando...' : 'Cargar cuestionario'}
                                    </Button>
                                  </div>
            </Card>
          )}

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </TabsContent>

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