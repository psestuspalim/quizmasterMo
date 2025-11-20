import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import FileUploader from '../components/quiz/FileUploader';
import QuizCard from '../components/quiz/QuizCard';
import QuestionView from '../components/quiz/QuestionView';
import ResultsView from '../components/quiz/ResultsView';

export default function QuizzesPage() {
  const [view, setView] = useState('list'); // 'list', 'upload', 'quiz', 'results'
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showUploader, setShowUploader] = useState(false);

  const queryClient = useQueryClient();

  const { data: quizzes = [], isLoading } = useQuery({
    queryKey: ['quizzes'],
    queryFn: () => base44.entities.Quiz.list('-created_date'),
  });

  const createQuizMutation = useMutation({
    mutationFn: (quizData) => base44.entities.Quiz.create(quizData),
    onSuccess: () => {
      queryClient.invalidateQueries(['quizzes']);
      setShowUploader(false);
    },
  });

  const deleteQuizMutation = useMutation({
    mutationFn: (quizId) => base44.entities.Quiz.delete(quizId),
    onSuccess: () => {
      queryClient.invalidateQueries(['quizzes']);
    },
  });

  const handleUploadSuccess = async (quizData) => {
    await createQuizMutation.mutateAsync(quizData);
  };

  const handleStartQuiz = (quiz) => {
    setSelectedQuiz(quiz);
    setCurrentQuestionIndex(0);
    setScore(0);
    setView('quiz');
  };

  const handleAnswer = (isCorrect) => {
    if (isCorrect) {
      setScore(score + 1);
    }

    if (currentQuestionIndex < selectedQuiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setView('results');
    }
  };

  const handleRetry = () => {
    setCurrentQuestionIndex(0);
    setScore(0);
    setView('quiz');
  };

  const handleHome = () => {
    setSelectedQuiz(null);
    setView('list');
    setShowUploader(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* List View */}
          {view === 'list' && !showUploader && (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                      Cuestionarios
                    </h1>
                    <p className="text-gray-600">
                      Gestiona y realiza cuestionarios interactivos
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowUploader(true)}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Nuevo cuestionario
                  </Button>
                </div>
              </div>

              {/* Empty State */}
              {!isLoading && quizzes.length === 0 && (
                <div className="text-center py-16">
                  <div className="flex justify-center mb-6">
                    <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center">
                      <BookOpen className="w-12 h-12 text-gray-400" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No hay cuestionarios
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Comienza cargando tu primer archivo JSON
                  </p>
                  <Button
                    onClick={() => setShowUploader(true)}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Cargar cuestionario
                  </Button>
                </div>
              )}

              {/* Quiz Grid */}
              {quizzes.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {quizzes.map((quiz) => (
                    <QuizCard
                      key={quiz.id}
                      quiz={quiz}
                      onStart={handleStartQuiz}
                      onDelete={(id) => deleteQuizMutation.mutate(id)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Upload View */}
          {view === 'list' && showUploader && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Button
                onClick={() => setShowUploader(false)}
                variant="ghost"
                className="mb-6"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>

              <div className="mb-8 text-center">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Cargar nuevo cuestionario
                </h2>
                <p className="text-gray-600">
                  Sube un archivo JSON con el formato de preguntas
                </p>
              </div>

              <FileUploader onUploadSuccess={handleUploadSuccess} />
            </motion.div>
          )}

          {/* Quiz View */}
          {view === 'quiz' && selectedQuiz && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Button
                onClick={handleHome}
                variant="ghost"
                className="mb-6"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Salir del cuestionario
              </Button>

              <QuestionView
                question={selectedQuiz.questions[currentQuestionIndex]}
                questionNumber={currentQuestionIndex + 1}
                totalQuestions={selectedQuiz.questions.length}
                onAnswer={handleAnswer}
              />
            </motion.div>
          )}

          {/* Results View */}
          {view === 'results' && selectedQuiz && (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <ResultsView
                score={score}
                totalQuestions={selectedQuiz.questions.length}
                onRetry={handleRetry}
                onHome={handleHome}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}