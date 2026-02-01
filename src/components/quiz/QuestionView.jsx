import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Lightbulb, ChevronRight, ChevronLeft, Bookmark, RefreshCw, BookOpen, Loader2, Workflow, ChevronDown, MessageSquare } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import MathText from './MathText';
import ImageQuestionView from './ImageQuestionView';
import ErrorAnalysis from './ErrorAnalysis';


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
  userEmail,
  settings = {},
  quizTitle = '',
  subjectId = null,
  sessionId = null
}) {
  // Configuraciones con valores por defecto
  const showFeedbackSetting = settings.show_feedback !== false;
  const showReflection = settings.show_reflection !== false;
  const showErrorAnalysis = settings.show_error_analysis !== false;
  const showSchema = settings.show_schema !== false;
  const showNotes = settings.show_notes !== false;
  const showHintSetting = settings.show_hint !== false;
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
  const [showNotesField, setShowNotesField] = useState(false);
  const [answerStartTime, setAnswerStartTime] = useState(Date.now());

  // Resetear estados cuando cambia la pregunta
  useEffect(() => {
    setSelectedAnswer(null);
    setShowFeedback(false);
    setShowHint(false);
    setIsMarked(false);
    setUserNote('');
    setReflectionText('');
    setRephrasedQuestion(null);
    setEtymology(null);
    setSchema(null);
    setShowNotesField(false);
    setAnswerStartTime(Date.now());

    // Actualizar sesión
    const updateSession = async () => {
      if (sessionId) {
        try {
          await base44.entities.QuizSession.update(sessionId, {
            current_question: questionNumber,
            score: correctAnswers,
            wrong_count: wrongAnswers,
            last_activity: new Date().toISOString()
          });
        } catch (error) {
          console.error('Error updating session:', error);
        }
      }
    };
    updateSession();
  }, [questionNumber]);

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
    onAnswer(isCorrect, selectedOption, question);
  };

  const canProceed = selectedOption?.isCorrect || !showReflection || reflectionText.trim().length >= 10;
  const answeredQuestions = correctAnswers + wrongAnswers;
  const progressPercent = (questionNumber / totalQuestions) * 100;

  return (
    <div className="max-w-3xl mx-auto px-2 sm:px-0">
      {/* Header compacto con progreso y score */}
      <div className="bg-white/95 backdrop-blur-sm sticky top-0 z-10 rounded-xl shadow-sm border border-gray-200 mb-4 p-3">
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
              <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
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

      {/* Question Card */}
      <Card className="border-0 shadow-lg overflow-hidden bg-white">
        {/* Question Header */}
        <div className="bg-gray-50 p-4 border-b border-gray-200">
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
                <div className="mt-3 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                  <img 
                    src={question.imageUrl} 
                    alt="Pregunta" 
                    className="w-full h-auto max-h-[200px] object-contain"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Answer Options */}
        <CardContent className="p-3 sm:p-4 relative bg-white">
          <div className="grid grid-cols-1 gap-3">
            {question.answerOptions.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = option.isCorrect;
              const showCorrect = showFeedback && isCorrect;
              const showIncorrect = showFeedback && isSelected && !isCorrect;

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <button
                    onClick={() => handleSelectAnswer(index)}
                    disabled={showFeedback}
                    className={`w-full p-3 rounded-lg border-2 text-left transition-all duration-200 ${
                      showCorrect
                        ? 'border-green-500 bg-green-50'
                        : showIncorrect
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 font-semibold text-xs mt-0.5 ${
                          showCorrect || showIncorrect
                            ? 'border-transparent'
                            : 'border-gray-300 text-gray-600'
                        }`}
                      >
                        {showCorrect ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : showIncorrect ? (
                          <XCircle className="w-5 h-5 text-red-600" />
                        ) : (
                          String.fromCharCode(65 + index) + '.'
                        )}
                      </div>
                      <div className="flex-1">
                        <span className="text-sm text-gray-800">
                          <MathText text={option.text} />
                        </span>
                        
                        {/* Feedback expandido dentro de la opción */}
                        {showFeedback && (showCorrect || showIncorrect) && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-2 pt-2 border-t border-gray-200"
                          >
                            <div className="flex items-start gap-2">
                              {showCorrect ? (
                                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                              )}
                              <div>
                                <p className={`text-xs font-medium ${showCorrect ? 'text-green-700' : 'text-red-700'}`}>
                                  {showCorrect ? 'Respuesta correcta' : 'No exactamente'}
                                </p>
                                {option.rationale && (
                                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                                    <MathText text={option.rationale} />
                                  </p>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </div>

          {/* Mostrar pista + feedback adicional */}
          <AnimatePresence>
            {showFeedback && selectedOption && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 space-y-3"
              >

                {/* Campo de reflexión obligatorio para respuestas incorrectas */}
                  {!selectedOption.isCorrect && showReflection && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <label className="block text-sm font-medium text-gray-800 mb-2">
                        ✍️ ¿Por qué crees que te equivocaste? <span className="text-gray-500">(obligatorio)</span>
                      </label>
                      <textarea
                        value={reflectionText}
                        onChange={(e) => setReflectionText(e.target.value)}
                        placeholder="Escribe tu reflexión sobre el error (mínimo 10 caracteres)..."
                        className="w-full p-2.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                        rows={2}
                      />
                      {reflectionText.length > 0 && reflectionText.length < 10 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {10 - reflectionText.length} caracteres más...
                        </p>
                      )}
                    </div>
                  )}

                  {/* Análisis de error con IA */}
                  {!selectedOption.isCorrect && showErrorAnalysis && (
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

                  
                </motion.div>
            )}
          </AnimatePresence>

          {/* Botones de navegación - fuera del AnimatePresence */}
          {showFeedback && selectedOption && (
            <div className="flex gap-3 mt-4">
              {onBack && questionNumber > 1 && (
                <Button
                  variant="ghost"
                  onClick={onBack}
                  className="flex-1 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-gray-100 border border-gray-700"
                >
                  Atrás
                </Button>
              )}
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleNext();
                }}
                disabled={!canProceed}
                className={`flex-1 h-11 font-medium ${
                  canProceed 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                {canProceed ? 'Siguiente' : 'Completa tu reflexión'}
              </Button>
            </div>
          )}

          {/* Pista - dentro del CardContent pero fuera del AnimatePresence */}
          {showFeedback && selectedOption && (
            <div className="mt-4 space-y-3">



              {/* Mostrar pista - Solo si existe hint */}
              {question.hint && showHintSetting && !showHint && (
                <Button
                  variant="ghost"
                  onClick={() => setShowHint(true)}
                  className="w-full justify-start text-gray-400 hover:text-gray-200 hover:bg-gray-800 border border-gray-700"
                >
                  <ChevronDown className="w-4 h-4 mr-2" />
                  Mostrar pista
                </Button>
              )}
              
              {/* Pista expandida */}
              {showHint && question.hint && showHintSetting && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-gray-800 border border-gray-700 rounded-lg p-3"
                >
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-400"><MathText text={question.hint} /></p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}