import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Lightbulb, ChevronRight, ChevronLeft, Bookmark, RefreshCw, BookOpen, Loader2, Workflow } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import MathText from './MathText';
import ImageQuestionView from './ImageQuestionView';

export default function QuestionView({ 
  question, 
  questionNumber, 
  totalQuestions,
  correctAnswers = 0,
  wrongAnswers = 0,
  onAnswer,
  onBack,
  onMarkForReview
}) {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isMarked, setIsMarked] = useState(false);
  const [userNote, setUserNote] = useState('');
  const [difficultyRating, setDifficultyRating] = useState(null);
  const [showDifficultySelector, setShowDifficultySelector] = useState(false);
  const [rephrasing, setRephrasing] = useState(false);
  const [rephrasedQuestion, setRephrasedQuestion] = useState(null);
  const [loadingEtymology, setLoadingEtymology] = useState(false);
  const [etymology, setEtymology] = useState(null);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [schema, setSchema] = useState(null);

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
        prompt: `Analiza esta pregunta y encuentra todos los términos médicos/científicos. Para cada término, identifica sus prefijos, sufijos y raíces, dando su significado etimológico (griego/latín).

Pregunta: "${question.question}"

Responde en español. Sé conciso pero informativo.`,
        response_json_schema: {
          type: "object",
          properties: {
            terms: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  term: { type: "string" },
                  parts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        part: { type: "string", description: "El prefijo, sufijo o raíz" },
                        type: { type: "string", description: "prefijo, sufijo o raíz" },
                        meaning: { type: "string", description: "Significado" }
                      }
                    }
                  },
                  fullMeaning: { type: "string", description: "Significado completo del término" }
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

  const handleNext = () => {
    const selectedOption = question.answerOptions[selectedAnswer];
    const isCorrect = selectedOption.isCorrect;
    onAnswer(isCorrect, { ...selectedOption, userNote }, question);
    setUserNote('');
  };

  const difficultyOptions = [
    { value: 1, label: 'Muy fácil', color: 'bg-green-500 hover:bg-green-600', emoji: '😄' },
    { value: 2, label: 'Fácil', color: 'bg-green-400 hover:bg-green-500', emoji: '🙂' },
    { value: 3, label: 'Normal', color: 'bg-yellow-400 hover:bg-yellow-500', emoji: '😐' },
    { value: 4, label: 'Difícil', color: 'bg-orange-400 hover:bg-orange-500', emoji: '😓' },
    { value: 5, label: 'Muy difícil', color: 'bg-red-500 hover:bg-red-600', emoji: '😰' },
  ];

  const selectedOption = selectedAnswer !== null ? question.answerOptions[selectedAnswer] : null;

  const answeredQuestions = correctAnswers + wrongAnswers;
  const correctPercentage = answeredQuestions > 0 ? (correctAnswers / answeredQuestions) * 100 : 0;
  const wrongPercentage = answeredQuestions > 0 ? (wrongAnswers / answeredQuestions) * 100 : 0;

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-0">
      {/* Score Bar */}
      <div className="mb-4 sm:mb-6">
        <div className="flex h-3 sm:h-4 rounded-full overflow-hidden shadow-md bg-gray-200">
          <motion.div
            className="bg-green-500"
            initial={{ width: 0 }}
            animate={{ width: `${correctPercentage}%` }}
            transition={{ duration: 0.5 }}
          />
          <motion.div
            className="bg-red-500"
            initial={{ width: 0 }}
            animate={{ width: `${wrongPercentage}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span className="text-green-600 font-medium">✓ {correctAnswers}</span>
          <span className="text-red-600 font-medium">✗ {wrongAnswers}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4 sm:mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs sm:text-sm font-medium text-gray-600">
            Pregunta {questionNumber} de {totalQuestions}
          </span>
          <span className="text-xs sm:text-sm text-gray-500">
            {Math.round((questionNumber / totalQuestions) * 100)}%
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-indigo-600"
            initial={{ width: 0 }}
            animate={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Question Card */}
              <Card className="border-0 shadow-xl">
                <CardHeader className="pb-3 sm:pb-4 p-4 sm:p-6">
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <Badge variant="outline" className="text-indigo-600 border-indigo-200 text-xs sm:text-sm">
                      Pregunta {questionNumber}
                    </Badge>
                    {onMarkForReview && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsMarked(!isMarked);
                          onMarkForReview(question, !isMarked);
                        }}
                        className={isMarked ? 'text-yellow-600' : 'text-gray-400'}
                      >
                        <Bookmark className={`w-4 h-4 sm:w-5 sm:h-5 ${isMarked ? 'fill-yellow-600' : ''}`} />
                      </Button>
                    )}
                  </div>
                  <CardTitle className="text-base sm:text-xl font-semibold text-gray-900 leading-relaxed">
                                            <MathText text={question.question} />
                                          </CardTitle>

                                          {/* Botones de ayuda */}
                                          <div className="flex flex-wrap gap-2 mt-3">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={handleRephrase}
                                              disabled={rephrasing || rephrasedQuestion}
                                              className="text-xs h-7 text-blue-600 border-blue-200 hover:bg-blue-50"
                                            >
                                              {rephrasing ? (
                                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                              ) : (
                                                <RefreshCw className="w-3 h-3 mr-1" />
                                              )}
                                              Reformular
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={handleEtymology}
                                              disabled={loadingEtymology || etymology}
                                              className="text-xs h-7 text-purple-600 border-purple-200 hover:bg-purple-50"
                                            >
                                              {loadingEtymology ? (
                                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                              ) : (
                                                <BookOpen className="w-3 h-3 mr-1" />
                                              )}
                                              Raíces etimológicas
                                            </Button>
                                          </div>

                                          {/* Pregunta reformulada */}
                                          <AnimatePresence>
                                            {rephrasedQuestion && (
                                              <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3"
                                              >
                                                <div className="flex gap-2">
                                                  <RefreshCw className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                                  <div>
                                                    <p className="text-xs font-medium text-blue-800 mb-1">En otras palabras:</p>
                                                    <p className="text-sm text-blue-900">{rephrasedQuestion}</p>
                                                  </div>
                                                </div>
                                              </motion.div>
                                            )}
                                          </AnimatePresence>

                                          {/* Etimología */}
                                          <AnimatePresence>
                                            {etymology && etymology.length > 0 && (
                                              <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="bg-purple-50 border border-purple-200 rounded-lg p-3 mt-3"
                                              >
                                                <div className="flex gap-2">
                                                  <BookOpen className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                                                  <div className="flex-1">
                                                    <p className="text-xs font-medium text-purple-800 mb-2">Raíces etimológicas:</p>
                                                    <div className="space-y-2">
                                                      {etymology.map((term, idx) => (
                                                        <div key={idx} className="bg-white/60 rounded p-2">
                                                          <p className="text-sm font-semibold text-purple-900">{term.term}</p>
                                                          <div className="flex flex-wrap gap-1 mt-1">
                                                            {term.parts?.map((part, pidx) => (
                                                              <span key={pidx} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                                                                <strong>{part.part}</strong> ({part.type}): {part.meaning}
                                                              </span>
                                                            ))}
                                                          </div>
                                                          <p className="text-xs text-purple-600 mt-1">→ {term.fullMeaning}</p>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  </div>
                                                </div>
                                              </motion.div>
                                            )}
                                          </AnimatePresence>

                                          {/* Imagen si existe */}
                  {question.imageUrl && (
                    <div className="mt-3 sm:mt-4 rounded-lg overflow-hidden border">
                      <img 
                        src={question.imageUrl} 
                        alt="Pregunta" 
                        className="w-full h-auto max-h-[250px] sm:max-h-[400px] object-contain bg-gray-100"
                      />
                    </div>
                  )}
                </CardHeader>

        <CardContent className="p-4 sm:p-6">
                    {/* Navigation buttons - Mobile: bottom fixed, Desktop: sides */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
                      {/* Back Button - Hidden on mobile, shown on desktop */}
                      {onBack && questionNumber > 1 && (
                        <div className="hidden sm:flex items-center">
                          <Button
                            onClick={onBack}
                            variant="outline"
                            size="icon"
                            className="w-12 h-12"
                          >
                            <ChevronLeft className="w-6 h-6" />
                          </Button>
                        </div>
                      )}

                      <div className="flex-1 space-y-3">
                    <div className="grid grid-cols-1 gap-2 sm:gap-3">
          {question.answerOptions.map((option, index) => {
                            const isSelected = selectedAnswer === index;
                            const isCorrect = option.isCorrect;
                            const showCorrect = showFeedback && isCorrect;
                            const showIncorrect = showFeedback && isSelected && !isCorrect;

                            return (
                              <motion.button
                                key={index}
                                whileHover={{ scale: showFeedback ? 1 : 1.01 }}
                                whileTap={{ scale: showFeedback ? 1 : 0.98 }}
                                onClick={() => handleSelectAnswer(index)}
                                disabled={showFeedback}
                                className={`w-full p-3 sm:p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                                  showCorrect
                                    ? 'border-green-500 bg-green-50'
                                    : showIncorrect
                                    ? 'border-red-500 bg-red-50'
                                    : isSelected
                                    ? 'border-indigo-600 bg-indigo-50'
                                    : 'border-gray-200 hover:border-gray-300 bg-white active:bg-gray-50'
                                }`}
                              >
                                <div className="flex items-start gap-2 sm:gap-3">
                                  <div
                                    className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 font-semibold text-xs sm:text-sm ${
                                      showCorrect
                                        ? 'border-green-500 bg-green-500 text-white'
                                        : showIncorrect
                                        ? 'border-red-500 bg-red-500 text-white'
                                        : isSelected
                                        ? 'border-indigo-600 bg-indigo-600 text-white'
                                        : 'border-gray-300 text-gray-600'
                                    }`}
                                  >
                                    {showCorrect ? (
                                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                                    ) : showIncorrect ? (
                                      <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                                    ) : (
                                      String.fromCharCode(65 + index)
                                    )}
                                  </div>
                                  <span
                                    className={`text-xs sm:text-sm flex-1 ${
                                      showCorrect || showIncorrect ? 'font-medium' : ''
                                    }`}
                                  >
                                    <MathText text={option.text} />
                                  </span>
                                </div>
                              </motion.button>
                            );
                          })}
          </div>

          {/* Hint Button */}
                      {question.hint && !showFeedback && (
                        <Button
                          variant="ghost"
                          onClick={() => setShowHint(!showHint)}
                          className="w-full text-gray-600 hover:text-indigo-600 text-xs sm:text-sm"
                        >
                          <Lightbulb className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                          {showHint ? 'Ocultar pista' : 'Ver pista'}
                        </Button>
                      )}

                      {/* Hint */}
                      <AnimatePresence>
                        {showHint && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4"
                          >
                            <div className="flex gap-2">
                              <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                              <p className="text-xs sm:text-sm text-amber-900">
                                <MathText text={question.hint} />
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

          {/* Campo de notas para respuestas incorrectas - ARRIBA del feedback */}
                      <AnimatePresence>
                        {showFeedback && selectedOption && !selectedOption.isCorrect && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-lg p-3 sm:p-4 bg-amber-50 border border-amber-200"
                          >
                            <label className="text-xs sm:text-sm text-amber-800 font-medium mb-2 block">
                              📝 Escribe tus dudas o notas para repasar:
                            </label>
                            <textarea
                              value={userNote}
                              onChange={(e) => setUserNote(e.target.value)}
                              placeholder="Anota aquí lo que no entendiste..."
                              className="w-full p-2 sm:p-3 text-xs sm:text-sm border border-amber-200 rounded-md bg-white focus:ring-2 focus:ring-amber-300 focus:border-amber-300 resize-none"
                              rows={2}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Feedback */}
                      <AnimatePresence>
                        {showFeedback && selectedOption && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`rounded-lg p-3 sm:p-4 ${
                              selectedOption.isCorrect
                                ? 'bg-green-50 border border-green-200'
                                : 'bg-red-50 border border-red-200'
                            }`}
                          >
                            <div className="flex gap-2 sm:gap-3">
                              {selectedOption.isCorrect ? (
                                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0" />
                              ) : (
                                <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <h4
                                  className={`font-semibold mb-1 sm:mb-2 text-sm sm:text-base ${
                                    selectedOption.isCorrect ? 'text-green-900' : 'text-red-900'
                                  }`}
                                >
                                  {selectedOption.isCorrect ? '¡Correcto!' : 'Incorrecto'}
                                </h4>
                                <p
                                  className={`text-xs sm:text-sm break-words ${
                                    selectedOption.isCorrect ? 'text-green-800' : 'text-red-800'
                                  }`}
                                >
                                  <MathText text={selectedOption.isCorrect ? selectedOption.rationale : (question.feedback || selectedOption.rationale)} />
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Cinephile Tip / Hint después de responder */}
                                              <AnimatePresence>
                                                {showFeedback && question.hint && (
                                                  <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="rounded-lg p-3 sm:p-4 bg-purple-50 border border-purple-200"
                                                  >
                                                    <div className="flex gap-2 sm:gap-3">
                                                      <span className="text-base sm:text-xl flex-shrink-0">🎬</span>
                                                      <div className="flex-1 min-w-0">
                                                        <h4 className="font-semibold mb-1 text-purple-900 text-sm sm:text-base">Tip Cinéfilo</h4>
                                                        <p className="text-xs sm:text-sm text-purple-800 break-words">
                                                          <MathText text={question.hint} />
                                                        </p>
                                                      </div>
                                                    </div>
                                                  </motion.div>
                                                )}
                                              </AnimatePresence>


            </div>

                          {/* Next Button - Desktop only */}
                                                                                      {showFeedback && (
                                                                                        <div className="hidden sm:flex items-center">
                                                                                          <Button
                                                                                            onClick={handleNext}
                                                                                            className="bg-indigo-600 hover:bg-indigo-700 w-12 h-12"
                                                                                            size="icon"
                                                                                          >
                                                                                            <ChevronRight className="w-6 h-6" />
                                                                                          </Button>
                                                                                        </div>
                                                                                      )}
                                                                                    </div>

                                                                                    {/* Mobile Navigation - Fixed at bottom */}
                                                                                    {showFeedback && (
                                                      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-3 flex gap-3 z-50">
                                                        {onBack && questionNumber > 1 && (
                                                          <Button
                                                            onClick={onBack}
                                                            variant="outline"
                                                            className="flex-1 h-12"
                                                          >
                                                            <ChevronLeft className="w-5 h-5 mr-1" />
                                                            Anterior
                                                          </Button>
                                                        )}
                                                        <Button
                                                          onClick={handleNext}
                                                          className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700"
                                                        >
                                                          Siguiente
                                                          <ChevronRight className="w-5 h-5 ml-1" />
                                                        </Button>
                                                      </div>
                                                    )}
                      </CardContent>
                    </Card>

                    {/* Spacer for mobile fixed buttons */}
                    {showFeedback && <div className="h-20 sm:hidden" />}
                      </div>
                      );
        }