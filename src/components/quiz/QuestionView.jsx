import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Lightbulb, ChevronRight, ChevronLeft, Bookmark } from 'lucide-react';
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

  const selectedOption = selectedAnswer !== null ? question.answerOptions[selectedAnswer] : null;

  const answeredQuestions = correctAnswers + wrongAnswers;
  const correctPercentage = answeredQuestions > 0 ? (correctAnswers / answeredQuestions) * 100 : 0;
  const wrongPercentage = answeredQuestions > 0 ? (wrongAnswers / answeredQuestions) * 100 : 0;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Score Bar */}
      <div className="mb-6">
        <div className="flex h-4 rounded-full overflow-hidden shadow-md bg-gray-200">
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
          <span className="text-green-600 font-medium">✓ {correctAnswers} correctas</span>
          <span className="text-red-600 font-medium">✗ {wrongAnswers} incorrectas</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">
            Pregunta {questionNumber} de {totalQuestions}
          </span>
          <span className="text-sm text-gray-500">
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
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between mb-4">
            <Badge variant="outline" className="text-indigo-600 border-indigo-200">
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
                <Bookmark className={`w-5 h-5 ${isMarked ? 'fill-yellow-600' : ''}`} />
              </Button>
            )}
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900 leading-relaxed">
            <MathText text={question.question} />
          </CardTitle>
          
          {/* Imagen si existe */}
          {question.imageUrl && (
            <div className="mt-4 rounded-lg overflow-hidden border">
              <img 
                src={question.imageUrl} 
                alt="Pregunta" 
                className="w-full h-auto max-h-[400px] object-contain bg-gray-100"
              />
            </div>
          )}
        </CardHeader>

        <CardContent>
          <div className="flex gap-6">
            {/* Back Button - To the left of answers */}
            {onBack && questionNumber > 1 && (
              <div className="flex items-center">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {question.answerOptions.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrect = option.isCorrect;
            const showCorrect = showFeedback && isCorrect;
            const showIncorrect = showFeedback && isSelected && !isCorrect;

            return (
              <motion.button
                key={index}
                whileHover={{ scale: showFeedback ? 1 : 1.01 }}
                whileTap={{ scale: showFeedback ? 1 : 0.99 }}
                onClick={() => handleSelectAnswer(index)}
                disabled={showFeedback}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                  showCorrect
                    ? 'border-green-500 bg-green-50'
                    : showIncorrect
                    ? 'border-red-500 bg-red-50'
                    : isSelected
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 font-semibold text-sm ${
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
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    ) : showIncorrect ? (
                      <XCircle className="w-5 h-5 text-white" />
                    ) : (
                      String.fromCharCode(65 + index)
                    )}
                  </div>
                  <span
                    className={`text-sm flex-1 ${
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
              className="w-full text-gray-600 hover:text-indigo-600"
            >
              <Lightbulb className="w-4 h-4 mr-2" />
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
                className="bg-amber-50 border border-amber-200 rounded-lg p-4"
              >
                <div className="flex gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-900">
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
                className="rounded-lg p-4 bg-amber-50 border border-amber-200"
              >
                <label className="text-sm text-amber-800 font-medium mb-2 block">
                  📝 Escribe tus dudas o notas para repasar:
                </label>
                <textarea
                  value={userNote}
                  onChange={(e) => setUserNote(e.target.value)}
                  placeholder="Anota aquí lo que no entendiste..."
                  className="w-full p-3 text-sm border border-amber-200 rounded-md bg-white focus:ring-2 focus:ring-amber-300 focus:border-amber-300 resize-none"
                  rows={3}
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
                className={`rounded-lg p-4 ${
                  selectedOption.isCorrect
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                <div className="flex gap-3">
                  {selectedOption.isCorrect ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <h4
                      className={`font-semibold mb-2 ${
                        selectedOption.isCorrect ? 'text-green-900' : 'text-red-900'
                      }`}
                    >
                      {selectedOption.isCorrect ? '¡Correcto!' : 'Incorrecto'}
                    </h4>
                    <p
                      className={`text-sm ${
                        selectedOption.isCorrect ? 'text-green-800' : 'text-red-800'
                      }`}
                    >
                      <MathText text={selectedOption.rationale} />
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
            </div>

            {/* Next Button - To the right of answers */}
            {showFeedback && (
              <div className="flex items-center">
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
        </CardContent>
      </Card>
        </div>
        );
        }