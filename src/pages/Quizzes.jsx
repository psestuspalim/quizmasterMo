import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, BookOpen, FolderPlus, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import FileUploader from '../components/quiz/FileUploader';
import QuizCard from '../components/quiz/QuizCard';
import QuestionView from '../components/quiz/QuestionView';
import ResultsView from '../components/quiz/ResultsView';
import SubjectCard from '../components/quiz/SubjectCard';
import UsernamePrompt from '../components/quiz/UsernamePrompt';

export default function QuizzesPage() {
  const [view, setView] = useState('subjects'); // 'subjects', 'list', 'upload', 'quiz', 'results'
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState([]);
  const [showUploader, setShowUploader] = useState(false);
  const [showSubjectDialog, setShowSubjectDialog] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: '', description: '', color: '#6366f1' });
  const [selectedSubjectForUpload, setSelectedSubjectForUpload] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  const queryClient = useQueryClient();

  // Cargar usuario actual
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        
        // Si no tiene username, no hacer nada (UsernamePrompt se mostrará)
        if (!user.username) {
          return;
        }
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };
    loadUser();
  }, []);

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => base44.entities.Subject.list('-created_date'),
  });

  const { data: quizzes = [] } = useQuery({
    queryKey: ['quizzes'],
    queryFn: () => base44.entities.Quiz.list('-created_date'),
  });

  const { data: attempts = [] } = useQuery({
    queryKey: ['attempts', currentUser?.email],
    queryFn: () => base44.entities.QuizAttempt.filter({ user_email: currentUser?.email }, '-created_date'),
    enabled: !!currentUser?.email,
  });

  const createSubjectMutation = useMutation({
    mutationFn: (subjectData) => base44.entities.Subject.create(subjectData),
    onSuccess: () => {
      queryClient.invalidateQueries(['subjects']);
      setShowSubjectDialog(false);
      setNewSubject({ name: '', description: '', color: '#6366f1' });
    },
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

  const saveAttemptMutation = useMutation({
    mutationFn: (attemptData) => base44.entities.QuizAttempt.create(attemptData),
  });

  const updateUsernameMutation = useMutation({
    mutationFn: (username) => base44.auth.updateMe({ username }),
    onSuccess: (updatedUser) => {
      setCurrentUser(updatedUser);
    },
  });

  const handleUsernameSubmit = async (username) => {
    await updateUsernameMutation.mutateAsync(username);
  };

  const handleCreateSubject = async () => {
    if (newSubject.name.trim()) {
      await createSubjectMutation.mutateAsync(newSubject);
    }
  };

  const handleUploadSuccess = async (quizData) => {
    await createQuizMutation.mutateAsync({
      ...quizData,
      subject_id: selectedSubject.id
    });
  };

  const handleStartQuiz = (quiz, questionCount) => {
    const shuffledQuestions = [...quiz.questions]
      .sort(() => Math.random() - 0.5)
      .slice(0, questionCount)
      .map(q => ({
        ...q,
        answerOptions: [...q.answerOptions].sort(() => Math.random() - 0.5)
      }));
    
    const shuffledQuiz = {
      ...quiz,
      questions: shuffledQuestions
    };
    setSelectedQuiz(shuffledQuiz);
    setCurrentQuestionIndex(0);
    setScore(0);
    setWrongAnswers([]);
    setView('quiz');
  };

  const handleAnswer = (isCorrect, selectedOption, question) => {
    if (!isCorrect) {
      const correctOption = question.answerOptions.find(opt => opt.isCorrect);
      setWrongAnswers([...wrongAnswers, {
        question: question.question,
        selected_answer: selectedOption.text,
        correct_answer: correctOption.text,
        answerOptions: question.answerOptions,
        hint: question.hint
      }]);
    } else {
      setScore(score + 1);
    }

    if (currentQuestionIndex < selectedQuiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Guardar intento
      saveAttemptMutation.mutate({
        quiz_id: selectedQuiz.id,
        user_email: currentUser.email,
        username: currentUser.username,
        score: isCorrect ? score + 1 : score,
        total_questions: selectedQuiz.questions.length,
        wrong_questions: isCorrect ? wrongAnswers : [...wrongAnswers, {
          question: question.question,
          selected_answer: selectedOption.text,
          correct_answer: question.answerOptions.find(opt => opt.isCorrect).text,
          answerOptions: question.answerOptions,
          hint: question.hint
        }],
        completed_at: new Date().toISOString()
      });
      setView('results');
    }
  };

  const handleRetry = () => {
    const shuffledQuiz = {
      ...selectedQuiz,
      questions: selectedQuiz.questions.map(q => ({
        ...q,
        answerOptions: [...q.answerOptions].sort(() => Math.random() - 0.5)
      }))
    };
    setSelectedQuiz(shuffledQuiz);
    setCurrentQuestionIndex(0);
    setScore(0);
    setWrongAnswers([]);
    setView('quiz');
  };

  const handleRetryWrongQuestions = () => {
    if (wrongAnswers.length === 0) return;
    
    const wrongQuestionsQuiz = {
      ...selectedQuiz,
      title: `Repaso: ${selectedQuiz.title}`,
      questions: wrongAnswers.map(wa => ({
        question: wa.question,
        answerOptions: [...wa.answerOptions].sort(() => Math.random() - 0.5),
        hint: wa.hint
      }))
    };
    
    setSelectedQuiz(wrongQuestionsQuiz);
    setCurrentQuestionIndex(0);
    setScore(0);
    setWrongAnswers([]);
    setView('quiz');
  };

  const handleHome = () => {
    setSelectedQuiz(null);
    setSelectedSubject(null);
    setView('subjects');
    setShowUploader(false);
  };

  const handleBackToSubjects = () => {
    setSelectedSubject(null);
    setView('subjects');
    setShowUploader(false);
  };

  const subjectQuizzes = selectedSubject 
    ? quizzes.filter(q => q.subject_id === selectedSubject.id)
    : [];

  const getSubjectStats = (subjectId) => {
    const subjectQuizIds = quizzes.filter(q => q.subject_id === subjectId).map(q => q.id);
    const subjectAttempts = attempts.filter(a => subjectQuizIds.includes(a.quiz_id));
    
    if (subjectAttempts.length === 0) {
      return { totalCorrect: 0, totalWrong: 0, totalAnswered: 0 };
    }
    
    const totalCorrect = subjectAttempts.reduce((sum, a) => sum + a.score, 0);
    const totalAnswered = subjectAttempts.reduce((sum, a) => sum + a.total_questions, 0);
    const totalWrong = totalAnswered - totalCorrect;
    
    return { totalCorrect, totalWrong, totalAnswered };
  };

  // Mostrar prompt de username si no tiene
  if (!currentUser || !currentUser.username) {
    return <UsernamePrompt onSubmit={handleUsernameSubmit} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* Subjects View */}
          {view === 'subjects' && (
            <motion.div
              key="subjects"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                      Materias
                    </h1>
                    <p className="text-gray-600">
                      Selecciona una materia para ver sus cuestionarios
                    </p>
                  </div>
                  <Dialog open={showSubjectDialog} onOpenChange={setShowSubjectDialog}>
                    <DialogTrigger asChild>
                      <Button className="bg-indigo-600 hover:bg-indigo-700">
                        <FolderPlus className="w-5 h-5 mr-2" />
                        Nueva materia
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Crear nueva materia</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div>
                          <Label>Nombre</Label>
                          <Input
                            value={newSubject.name}
                            onChange={(e) => setNewSubject({...newSubject, name: e.target.value})}
                            placeholder="Ej: Física"
                          />
                        </div>
                        <div>
                          <Label>Descripción</Label>
                          <Input
                            value={newSubject.description}
                            onChange={(e) => setNewSubject({...newSubject, description: e.target.value})}
                            placeholder="Descripción opcional"
                          />
                        </div>
                        <div>
                          <Label>Color</Label>
                          <input
                            type="color"
                            value={newSubject.color}
                            onChange={(e) => setNewSubject({...newSubject, color: e.target.value})}
                            className="w-full h-10 rounded-md border cursor-pointer"
                          />
                        </div>
                        <Button 
                          onClick={handleCreateSubject}
                          className="w-full bg-indigo-600 hover:bg-indigo-700"
                        >
                          Crear materia
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {subjects.length === 0 ? (
                <div className="text-center py-16">
                  <div className="flex justify-center mb-6">
                    <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center">
                      <BookOpen className="w-12 h-12 text-gray-400" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No hay materias
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Comienza creando tu primera materia
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {subjects.map((subject) => (
                    <SubjectCard
                      key={subject.id}
                      subject={subject}
                      quizCount={quizzes.filter(q => q.subject_id === subject.id).length}
                      stats={getSubjectStats(subject.id)}
                      onClick={() => {
                        setSelectedSubject(subject);
                        setView('list');
                      }}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* List View */}
          {view === 'list' && !showUploader && selectedSubject && (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Button
                onClick={handleBackToSubjects}
                variant="ghost"
                className="mb-6"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver a materias
              </Button>

              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                      {selectedSubject.name}
                    </h1>
                    <p className="text-gray-600">
                      {selectedSubject.description || 'Cuestionarios de esta materia'}
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

              {subjectQuizzes.length === 0 ? (
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
                    Comienza cargando tu primer cuestionario
                  </p>
                  <Button
                    onClick={() => setShowUploader(true)}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Cargar cuestionario
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {subjectQuizzes.map((quiz) => (
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
                correctAnswers={score}
                wrongAnswers={wrongAnswers.length}
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
                wrongAnswers={wrongAnswers}
                onRetry={handleRetry}
                onRetryWrong={handleRetryWrongQuestions}
                onHome={handleHome}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}