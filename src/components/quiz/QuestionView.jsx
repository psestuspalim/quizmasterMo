import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Lightbulb, ChevronRight, ChevronLeft, Bookmark, RefreshCw, BookOpen, Loader2, Workflow, ChevronDown, MessageSquare } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import MathText from './MathText';
import ImageQuestionView from './ImageQuestionView';
import ErrorAnalysis from './ErrorAnalysis';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export default function QuestionView({ 
  question, 
  questionNumber, 
  totalQuestions,
  correctAnswers = 0,
  wrongAnswers = 0,
  onAnswer,
  onBack,
  onMarkForReview,
  previousAttempts = [],
  quizId,
  userEmail
}) {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isMarked, setIsMarked] = useState(false);
  const [userNote, setUserNote] = useState('');
  const [reflectionText, setReflectionText] = useState('');
  const [rephrasing, setRephrasing] = useState(false);
  const [rephrasedQuestion, setRephrasedQuestion] = useState(null);
  const [loadingEtymology, setLoadingEtymology] = useState(false);
  const [etymology, setEtymology] = useState(null);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [schema, setSchema] = useState(null);
  const [showNotes, setShowNotes] = useState(false);
  const [answerStartTime, setAnswerStartTime] = useState(Date.now());

  const handleRephrase = async () => {
    setRephrasing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Reformula esta pregunta de forma más simple y clara para un estudiante que no la entiende. NO des la respuesta, solo explica qué se está preguntando de forma más accesible:

Pregunta: "${question.question}"

Responde en español con una explicación breve y clara.`,
        response_json_schema: {
          type: "object",
          properties: {
            rephrased: { type: "string", description: "La pregunta reformulada de forma más simple" }
          }
        }
      });
      setRephrasedQuestion(result.rephrased);
    } catch (error) {
      console.error('Error rephrasing:', error);
    } finally {
      setRephrasing(false);
    }
  };

  const handleEtymology = async () => {
    setLoadingEtymology(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Extrae los términos médicos de esta pregunta y DESCOMPÓNLOS en prefijos, raíces y sufijos griegos/latinos.

REGLAS ESTRICTAS:
1. SOLO muestra la descomposición morfológica (prefijo + raíz + sufijo)
2. NO des definiciones médicas ni explicaciones clínicas
3. Cada parte debe mostrar: la partícula + su origen (griego/latín) + significado LITERAL

FORMATO EXACTO:
"hipoglucemia" → hipo- (gr. bajo) + gluc- (gr. dulce) + -emia (gr. sangre)
"taquicardia" → taqui- (gr. rápido) + -cardia (gr. corazón)
"hepatomegalia" → hepato- (gr. hígado) + -megalia (gr. agrandamiento)

Pregunta: "${question.question}"

Descompón SOLO la estructura morfológica. Nada de explicaciones médicas.`,
        response_json_schema: {
          type: "object",
          properties: {
            terms: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  term: { type: "string", description: "El término médico completo" },
                  breakdown: { type: "string", description: "Descomposición en formato: parte1- (origen: significado) + parte2- (origen: significado)" }
                }
              }
            }
          }
        }
      });
      setEtymology(result.terms);
    } catch (error) {
      console.error('Error getting etymology:', error);
    } finally {
      setLoadingEtymology(false);
    }
  };

  const handleGenerateSchema = async () => {
    setLoadingSchema(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Genera una representación gráfica esquemática usando emojis y texto del proceso o concepto al que se refiere esta pregunta. Usa flechas (→, ↓), viñetas, y emojis relevantes para crear un diagrama visual de texto que ayude al estudiante a entender el proceso.

Pregunta: "${question.question}"
Respuesta correcta: "${question.answerOptions?.find(opt => opt.isCorrect)?.text || ''}"

Crea un esquema visual claro y educativo en español. Usa saltos de línea para organizar la información.`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string", description: "Título breve del proceso/concepto" },
            schema: { type: "string", description: "El esquema visual con emojis y flechas" },
            summary: { type: "string", description: "Resumen de una línea del concepto clave" }
          }
        }
      });
      setSchema(result);
    } catch (error) {
      console.error('Error generating schema:', error);
    } finally {
      setLoadingSchema(false);
    }
  };

  // Si es pregunta de imagen (sin answerOptions), usar el componente especializado
  if (question.type === 'image' && !question.answerOptions) {
    return (
      <ImageQuestionView
        question={question}
        questionNumber={questionNumber}
        totalQuestions={totalQuestions}
        onAnswer={(isCorrect, details) => onAnswer(isCorrect, details, question)}
      />
    );
  }

  const handleSelectAnswer = (index) => {
    if (showFeedback) return;
    setSelectedAnswer(index);
    setShowFeedback(true);
  };

  const responseTime = showFeedback ? Math.round((Date.now() - answerStartTime) / 1000) : null;

  const selectedOption = selectedAnswer !== null ? question.answerOptions[selectedAnswer] : null;

  const handleNext = () => {
    const isCorrect = selectedOption.isCorrect;
    onAnswer(isCorrect, { ...selectedOption, userNote, reflection: reflectionText }, question);
    setUserNote('');
    setReflectionText('');
  };

  const canProceed = selectedOption?.isCorrect || reflectionText.trim().length >= 10;
  const answeredQuestions = correctAnswers + wrongAnswers;
  const progressPercent = (questionNumber / totalQuestions) * 100;

  return (
    <div className="max-w-3xl mx-auto px-2 sm:px-0">
      {/* Header compacto con progreso y score */}
      <div className="bg-white/80 backdrop-blur-sm sticky top-0 z-10 rounded-xl shadow-sm border mb-4 p-3">
        <div className="flex items-center justify-between gap-4">
          {/* Score badges */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
              <CheckCircle2 className="w-3 h-3" />
              {correctAnswers}
            </div>
            <div className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">
              <XCircle className="w-3 h-3" />
              {wrongAnswers}
            </div>
          </div>

          {/* Progress */}
          <div className="flex-1 max-w-[200px]">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <span className="text-xs font-medium text-gray-600 whitespace-nowrap">
                {questionNumber}/{totalQuestions}
              </span>
            </div>
          </div>

          {/* Mark for review */}
          {onMarkForReview && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsMarked(!isMarked);
                onMarkForReview(question, !isMarked);
              }}
              className={`h-8 w-8 p-0 ${isMarked ? 'text-yellow-600' : 'text-gray-400'}`}
            >
              <Bookmark className={`w-4 h-4 ${isMarked ? 'fill-yellow-600' : ''}`} />
            </Button>
          )}
        </div>
      </div>

      {/* Question Card - Más compacta */}
      <Card className="border-0 shadow-lg overflow-hidden">
        {/* Question Header */}
        <div className="bg-gradient-to-r from-slate-50 to-gray-50 p-4 border-b">
          <div className="flex items-start gap-3">
            <Badge className="bg-indigo-600 text-white text-xs shrink-0">
              {questionNumber}
            </Badge>
            <div className="flex-1 min-w-0">
              <p className="text-sm sm:text-base font-medium text-gray-900 leading-relaxed">
                <MathText text={question.question} />
              </p>
              
              {/* Imagen si existe */}
              {question.imageUrl && (
                <div className="mt-3 rounded-lg overflow-hidden border bg-gray-100">
                  <img 
                    src={question.imageUrl} 
                    alt="Pregunta" 
                    className="w-full h-auto max-h-[200px] object-contain"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Botones de ayuda - Inline */}
          <div className="flex flex-wrap items-center gap-1.5 mt-3 ml-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRephrase}
              disabled={rephrasing || rephrasedQuestion}
              className="h-7 px-2 text-xs text-blue-600 hover:bg-blue-50"
            >
              {rephrasing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              <span className="ml-1 hidden sm:inline">Reformular</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEtymology}
              disabled={loadingEtymology || etymology}
              className="h-7 px-2 text-xs text-purple-600 hover:bg-purple-50"
            >
              {loadingEtymology ? <Loader2 className="w-3 h-3 animate-spin" /> : <BookOpen className="w-3 h-3" />}
              <span className="ml-1 hidden sm:inline">Etimología</span>
            </Button>
            {question.hint && !showFeedback && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHint(!showHint)}
                className="h-7 px-2 text-xs text-amber-600 hover:bg-amber-50"
              >
                <Lightbulb className="w-3 h-3" />
                <span className="ml-1 hidden sm:inline">Pista</span>
              </Button>
            )}
          </div>

          {/* Contenido expandible de ayudas */}
          <AnimatePresence>
            {(rephrasedQuestion || etymology || showHint) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 ml-8 space-y-2"
              >
                {rephrasedQuestion && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs">
                    <span className="font-medium text-blue-800">En otras palabras: </span>
                    <span className="text-blue-900">{rephrasedQuestion}</span>
                  </div>
                )}
                {etymology && etymology.length > 0 && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 text-xs space-y-1">
                    <span className="font-medium text-purple-800">Etimología: </span>
                    {etymology.map((term, idx) => (
                      <div key={idx} className="text-purple-900">
                        <strong>{term.term}</strong> → {term.breakdown}
                      </div>
                    ))}
                  </div>
                )}
                {showHint && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs">
                    <span className="font-medium text-amber-800">💡 Pista: </span>
                    <span className="text-amber-900"><MathText text={question.hint} /></span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Answer Options */}
        <CardContent className="p-3 sm:p-4 relative">
          <div className="grid grid-cols-1 gap-2">
            {question.answerOptions.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = option.isCorrect;
              const showCorrect = showFeedback && isCorrect;
              const showIncorrect = showFeedback && isSelected && !isCorrect;

              return (
                <motion.button
                  key={index}
                  whileHover={{ scale: showFeedback ? 1 : 1.005 }}
                  whileTap={{ scale: showFeedback ? 1 : 0.995 }}
                  onClick={() => handleSelectAnswer(index)}
                  disabled={showFeedback}
                  className={`w-full p-3 rounded-xl border-2 text-left transition-all duration-200 ${
                    showCorrect
                      ? 'border-green-500 bg-green-50 shadow-green-100 shadow-md'
                      : showIncorrect
                      ? 'border-red-500 bg-red-50 shadow-red-100 shadow-md'
                      : isSelected
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 font-semibold text-xs transition-all ${
                        showCorrect
                          ? 'border-green-500 bg-green-500 text-white'
                          : showIncorrect
                          ? 'border-red-500 bg-red-500 text-white'
                          : isSelected
                          ? 'border-indigo-500 bg-indigo-500 text-white'
                          : 'border-gray-300 text-gray-500'
                      }`}
                    >
                      {showCorrect ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : showIncorrect ? (
                        <XCircle className="w-4 h-4" />
                      ) : (
                        String.fromCharCode(65 + index)
                      )}
                    </div>
                    <span className={`text-sm flex-1 ${showCorrect || showIncorrect ? 'font-medium' : ''}`}>
                      <MathText text={option.text} />
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Feedback Section - Compacto */}
          <AnimatePresence>
            {showFeedback && selectedOption && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 space-y-3"
              >
                {/* Resultado */}
                <div className={`rounded-xl p-3 ${
                  selectedOption.isCorrect
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200'
                    : 'bg-gradient-to-r from-red-50 to-rose-50 border border-red-200'
                }`}>
                  <div className="flex items-start gap-2">
                    {selectedOption.isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm ${selectedOption.isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                        {selectedOption.isCorrect ? '¡Correcto!' : 'Incorrecto'}
                      </p>
                      <p className={`text-xs mt-1 ${selectedOption.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                        <MathText text={selectedOption.isCorrect ? selectedOption.rationale : (question.feedback || selectedOption.rationale)} />
                      </p>
                    </div>
                  </div>
                </div>

                {/* Campo de reflexión obligatorio para respuestas incorrectas */}
                  {!selectedOption.isCorrect && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <label className="block text-sm font-medium text-amber-800 mb-2">
                        ✍️ ¿Por qué crees que te equivocaste? <span className="text-amber-600">(obligatorio)</span>
                      </label>
                      <textarea
                        value={reflectionText}
                        onChange={(e) => setReflectionText(e.target.value)}
                        placeholder="Escribe tu reflexión sobre el error (mínimo 10 caracteres)..."
                        className="w-full p-2.5 text-sm border border-amber-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400 resize-none"
                        rows={2}
                      />
                      {reflectionText.length > 0 && reflectionText.length < 10 && (
                        <p className="text-xs text-amber-600 mt-1">
                          {10 - reflectionText.length} caracteres más...
                        </p>
                      )}
                    </div>
                  )}

                  {/* Botón siguiente */}
                  <div className="pointer-events-auto">
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleNext();
                      }}
                      disabled={!canProceed}
                      className={`w-full h-11 text-white font-medium shadow-lg relative z-50 ${
                        canProceed 
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-200'
                          : 'bg-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {canProceed ? 'Siguiente pregunta' : 'Completa tu reflexión'}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>

                {/* Análisis de error con IA */}
                {!selectedOption.isCorrect && (
                  <ErrorAnalysis
                    question={question}
                    selectedAnswer={selectedOption.text}
                    correctAnswer={question.answerOptions.find(opt => opt.isCorrect)?.text}
                    responseTime={responseTime}
                    userEmail={userEmail}
                    quizId={quizId}
                    previousAttempts={previousAttempts}
                  />
                )}

                {/* Herramientas adicionales para incorrectas */}
                {!selectedOption.isCorrect && (
                  <div className="flex flex-wrap gap-2">
                    {!schema && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateSchema}
                        disabled={loadingSchema}
                        className="h-8 text-xs text-teal-600 border-teal-200 hover:bg-teal-50"
                      >
                        {loadingSchema ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Workflow className="w-3 h-3 mr-1" />}
                        Ver esquema
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowNotes(!showNotes)}
                      className={`h-8 text-xs ${showNotes ? 'bg-amber-50 border-amber-300' : 'border-amber-200'} text-amber-600 hover:bg-amber-50`}
                    >
                      <MessageSquare className="w-3 h-3 mr-1" />
                      {showNotes ? 'Ocultar notas' : 'Agregar nota'}
                    </Button>
                  </div>
                )}

                {/* Esquema generado */}
                {schema && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-teal-50 border border-teal-200 rounded-xl p-3"
                  >
                    <p className="text-xs font-semibold text-teal-800 mb-2">{schema.title}</p>
                    <pre className="text-xs text-teal-900 whitespace-pre-wrap font-sans bg-white/60 rounded p-2">
                      {schema.schema}
                    </pre>
                    <p className="text-xs text-teal-600 mt-2">💡 {schema.summary}</p>
                  </motion.div>
                )}

                {/* Campo de notas - Colapsable */}
                <AnimatePresence>
                  {showNotes && !selectedOption.isCorrect && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <textarea
                        value={userNote}
                        onChange={(e) => setUserNote(e.target.value)}
                        placeholder="Escribe tus dudas o notas..."
                        className="w-full p-2 text-xs border border-amber-200 rounded-lg bg-amber-50 focus:ring-2 focus:ring-amber-300 focus:border-amber-300 resize-none"
                        rows={2}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Tip Cinéfilo */}
                {question.hint && (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
                    <div className="flex items-start gap-2">
                      <span className="text-lg">🎬</span>
                      <div>
                        <p className="font-medium text-purple-800 text-xs">Tip Cinéfilo</p>
                        <p className="text-xs text-purple-700 mt-0.5"><MathText text={question.hint} /></p>
                      </div>
                    </div>
                  </div>
                )}

                </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}