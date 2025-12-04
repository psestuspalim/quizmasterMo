import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, ArrowLeft, BookOpen, TrendingUp, Crown, ChevronRight, 
  Upload, Swords, Music, Home, Trophy, Sparkles, FolderPlus
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext } from '@hello-pangea/dnd';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import DraggableItem from '../components/dnd/DraggableItem';
import DroppableArea from '../components/dnd/DroppableArea';
import FileUploader from '../components/quiz/FileUploader';
import QuizEditor from '../components/quiz/QuizEditor';
import QuestionView from '../components/quiz/QuestionView';
import ResultsView from '../components/quiz/ResultsView';
import UsernamePrompt from '../components/quiz/UsernamePrompt';
import AudioList from '../components/audio/AudioList';
import QuizListItem from '../components/quiz/QuizListItem';
import PointsDisplay from '../components/gamification/PointsDisplay';
import BadgeUnlockModal from '../components/gamification/BadgeUnlockModal';
import OnlineUsersPanel from '../components/challenge/OnlineUsersPanel';
import ChallengeNotifications from '../components/challenge/ChallengeNotifications';
import SessionTimer from '../components/ui/SessionTimer';
import TaskProgressFloat from '../components/tasks/TaskProgressFloat';
import ContentManager from '../components/admin/ContentManager';
import AdminMenu from '../components/admin/AdminMenu';
import useQuizSettings from '../components/quiz/useQuizSettings';
import SwipeQuizMode from '../components/quiz/SwipeQuizMode';
import AIQuizGenerator from '../components/quiz/AIQuizGenerator';
import ContainerCard from '../components/container/ContainerCard';
import ContainerEditor from '../components/container/ContainerEditor';
import MoveQuizModal from '../components/quiz/MoveQuizModal';

export default function QuizzesPage() {
  // Navigation state
  const [currentContainerId, setCurrentContainerId] = useState(null);
  const [navigationStack, setNavigationStack] = useState([]);
  
  // Quiz state
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState([]);
  const [correctAnswers, setCorrectAnswers] = useState([]);
  const [markedQuestions, setMarkedQuestions] = useState([]);
  const [responseTimes, setResponseTimes] = useState([]);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [currentAttemptId, setCurrentAttemptId] = useState(null);
  const [swipeMode, setSwipeMode] = useState(false);
  
  // UI state
  const [view, setView] = useState('browse'); // browse, quiz, results
  const [showUploader, setShowUploader] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingContainer, setEditingContainer] = useState(null);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [showContentManager, setShowContentManager] = useState(false);
  const [activeTab, setActiveTab] = useState('content');
  const [movingQuiz, setMovingQuiz] = useState(null);
  
  // User state
  const [currentUser, setCurrentUser] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [newBadge, setNewBadge] = useState(null);

  const queryClient = useQueryClient();

  // Load user
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };
    loadUser();
  }, []);

  // Queries
  const { data: containers = [] } = useQuery({
    queryKey: ['containers'],
    queryFn: () => base44.entities.Container.list('order'),
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

  const { data: userStatsData } = useQuery({
    queryKey: ['user-stats', currentUser?.email],
    queryFn: async () => {
      const stats = await base44.entities.UserStats.filter({ user_email: currentUser?.email });
      return stats[0] || null;
    },
    enabled: !!currentUser?.email,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
    enabled: currentUser?.role === 'admin',
  });

  useEffect(() => {
    if (userStatsData) setUserStats(userStatsData);
  }, [userStatsData]);

  const isAdmin = currentUser?.role === 'admin';

  // Current container
  const currentContainer = currentContainerId 
    ? containers.find(c => c.id === currentContainerId) 
    : null;

  // Quiz settings
  const { settings: quizSettings } = useQuizSettings(
    selectedQuiz?.id,
    currentContainer?.type === 'subject' ? currentContainer?.id : null,
    currentContainer?.type === 'folder' ? currentContainer?.id : null,
    currentContainer?.type === 'course' ? currentContainer?.id : null
  );

  // Visibility helper
  const canUserAccess = (item, parentItem = null) => {
    if (isAdmin) return true;
    if (item.is_hidden) return false;
    
    if (item.visibility === 'inherit' && parentItem) {
      return canUserAccess(parentItem);
    }
    
    if (item.visibility === 'specific') {
      return item.allowed_users?.includes(currentUser?.email);
    }
    
    return true;
  };

  // Get all descendant container IDs (for quiz counting)
  const getDescendantIds = (containerId) => {
    const ids = [containerId];
    const children = containers.filter(c => c.parent_id === containerId);
    children.forEach(child => {
      ids.push(...getDescendantIds(child.id));
    });
    return ids;
  };

  // Filtered data
  const currentChildren = useMemo(() => {
    return containers
      .filter(c => c.parent_id === currentContainerId && canUserAccess(c, currentContainer))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [containers, currentContainerId, currentContainer, currentUser]);

  const currentQuizzes = useMemo(() => {
    if (!currentContainerId) return [];
    const descendantIds = getDescendantIds(currentContainerId);
    return quizzes.filter(q => descendantIds.includes(q.subject_id) && (isAdmin || !q.is_hidden));
  }, [quizzes, currentContainerId, containers, isAdmin]);

  const directQuizzes = useMemo(() => {
    return quizzes.filter(q => q.subject_id === currentContainerId && (isAdmin || !q.is_hidden));
  }, [quizzes, currentContainerId, isAdmin]);

  // Stats for containers
  const getContainerStats = (containerId) => {
    const descendantIds = getDescendantIds(containerId);
    const containerQuizIds = quizzes
      .filter(q => descendantIds.includes(q.subject_id))
      .map(q => q.id);
    const containerAttempts = attempts.filter(a => containerQuizIds.includes(a.quiz_id));
    
    if (containerAttempts.length === 0) return { totalCorrect: 0, totalWrong: 0, totalAnswered: 0 };
    
    const wrongQuestions = new Set();
    containerAttempts.forEach(attempt => {
      attempt.wrong_questions?.forEach(wq => wrongQuestions.add(wq.question));
    });
    
    const totalWrong = wrongQuestions.size;
    const totalCorrect = containerAttempts.reduce((sum, a) => sum + a.score, 0);
    const totalAnswered = totalCorrect + totalWrong;
    
    return { totalCorrect, totalWrong, totalAnswered };
  };

  const getQuizCount = (containerId) => {
    const descendantIds = getDescendantIds(containerId);
    return quizzes.filter(q => descendantIds.includes(q.subject_id)).length;
  };

  const getChildCount = (containerId) => {
    return containers.filter(c => c.parent_id === containerId).length;
  };

  // Mutations
  const createContainerMutation = useMutation({
    mutationFn: (data) => base44.entities.Container.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['containers']);
      setShowCreateDialog(false);
    },
  });

  const updateContainerMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Container.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['containers']);
      setEditingContainer(null);
    },
  });

  const deleteContainerMutation = useMutation({
    mutationFn: (id) => base44.entities.Container.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['containers']),
  });

  const createQuizMutation = useMutation({
    mutationFn: (data) => base44.entities.Quiz.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['quizzes']);
      setShowUploader(false);
      setShowAIGenerator(false);
    },
  });

  const updateQuizMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Quiz.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['quizzes']);
      setEditingQuiz(null);
    },
  });

  const deleteQuizMutation = useMutation({
    mutationFn: (id) => base44.entities.Quiz.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['quizzes']),
  });

  const saveAttemptMutation = useMutation({
    mutationFn: (data) => base44.entities.QuizAttempt.create(data),
  });

  const updateAttemptMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.QuizAttempt.update(id, data),
  });

  // Navigation
  const navigateTo = (containerId) => {
    if (currentContainerId) {
      setNavigationStack([...navigationStack, currentContainerId]);
    }
    setCurrentContainerId(containerId);
  };

  const navigateBack = () => {
    if (navigationStack.length > 0) {
      const newStack = [...navigationStack];
      const previousId = newStack.pop();
      setNavigationStack(newStack);
      setCurrentContainerId(previousId);
    } else {
      setCurrentContainerId(null);
    }
  };

  const navigateHome = () => {
    setNavigationStack([]);
    setCurrentContainerId(null);
    setSelectedQuiz(null);
    setView('browse');
    setShowUploader(false);
    setShowAIGenerator(false);
    setEditingContainer(null);
    setEditingQuiz(null);
  };

  // Quiz handlers
  const handleStartQuiz = async (quiz, questionCount, selectedDeck = 'all', quizAttempts = []) => {
    if (!quiz.questions || quiz.questions.length === 0) {
      alert('Este quiz no tiene preguntas');
      return;
    }
    
    let filteredQuestions = [...quiz.questions];
    
    if (selectedDeck === 'wrong') {
      const wrongQuestionsMap = new Map();
      quizAttempts.forEach(attempt => {
        attempt.wrong_questions?.forEach(wq => wrongQuestionsMap.set(wq.question, wq));
      });
      filteredQuestions = Array.from(wrongQuestionsMap.values());
    }
    
    const shuffledQuestions = [...filteredQuestions]
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(questionCount, filteredQuestions.length))
      .map(q => ({
        ...q,
        answerOptions: [...(q.answerOptions || [])].sort(() => Math.random() - 0.5)
      }));
    
    const attempt = await saveAttemptMutation.mutateAsync({
      quiz_id: quiz.id,
      subject_id: quiz.subject_id,
      user_email: currentUser.email,
      username: currentUser.username,
      score: 0,
      total_questions: shuffledQuestions.length,
      answered_questions: 0,
      is_completed: false,
      wrong_questions: []
    });
    
    setCurrentAttemptId(attempt.id);
    setSelectedQuiz({ ...quiz, questions: shuffledQuestions });
    setCurrentQuestionIndex(0);
    setScore(0);
    setWrongAnswers([]);
    setCorrectAnswers([]);
    setMarkedQuestions([]);
    setResponseTimes([]);
    setQuestionStartTime(Date.now());
    setView('quiz');
  };

  const handleAnswer = async (isCorrect, selectedOption, question) => {
    const responseTime = Math.round((Date.now() - questionStartTime) / 1000);
    const newResponseTimes = [...responseTimes, responseTime];
    setResponseTimes(newResponseTimes);

    const newScore = isCorrect ? score + 1 : score;
    const newWrongAnswers = !isCorrect ? [...wrongAnswers, {
      question: question.question,
      selected_answer: selectedOption.text,
      correct_answer: question.answerOptions.find(opt => opt.isCorrect)?.text,
      response_time: responseTime,
      answerOptions: question.answerOptions,
      hint: question.hint
    }] : wrongAnswers;

    if (isCorrect) {
      setScore(newScore);
      setCorrectAnswers([...correctAnswers, { 
        question: question.question,
        selected_answer: selectedOption.text
      }]);
    } else {
      setWrongAnswers(newWrongAnswers);
    }

    const isLastQuestion = currentQuestionIndex >= selectedQuiz.questions.length - 1;
    const answeredCount = currentQuestionIndex + 1;

    await updateAttemptMutation.mutateAsync({
      id: currentAttemptId,
      data: {
        score: newScore,
        answered_questions: answeredCount,
        wrong_questions: newWrongAnswers,
        response_times: newResponseTimes,
        is_completed: isLastQuestion,
        completed_at: isLastQuestion ? new Date().toISOString() : undefined
      }
    });

    if (!isLastQuestion) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setQuestionStartTime(Date.now());
    } else {
      queryClient.invalidateQueries(['attempts']);
      setView('results');
    }
  };

  const handleRetry = async () => {
    const shuffledQuiz = {
      ...selectedQuiz,
      questions: selectedQuiz.questions.map(q => ({
        ...q,
        answerOptions: [...q.answerOptions].sort(() => Math.random() - 0.5)
      }))
    };
    
    const attempt = await saveAttemptMutation.mutateAsync({
      quiz_id: selectedQuiz.id,
      subject_id: selectedQuiz.subject_id,
      user_email: currentUser.email,
      username: currentUser.username,
      score: 0,
      total_questions: selectedQuiz.questions.length,
      answered_questions: 0,
      is_completed: false,
      wrong_questions: []
    });
    
    setCurrentAttemptId(attempt.id);
    setSelectedQuiz(shuffledQuiz);
    setCurrentQuestionIndex(0);
    setScore(0);
    setWrongAnswers([]);
    setCorrectAnswers([]);
    setView('quiz');
  };

  const handleRetryWrongQuestions = async () => {
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
    
    const attempt = await saveAttemptMutation.mutateAsync({
      quiz_id: selectedQuiz.id,
      subject_id: selectedQuiz.subject_id,
      user_email: currentUser.email,
      username: currentUser.username,
      score: 0,
      total_questions: wrongQuestionsQuiz.questions.length,
      answered_questions: 0,
      is_completed: false,
      wrong_questions: []
    });
    
    setCurrentAttemptId(attempt.id);
    setSelectedQuiz(wrongQuestionsQuiz);
    setCurrentQuestionIndex(0);
    setScore(0);
    setWrongAnswers([]);
    setCorrectAnswers([]);
    setView('quiz');
  };

  const handleExitQuiz = async () => {
    if (currentAttemptId) {
      await updateAttemptMutation.mutateAsync({
        id: currentAttemptId,
        data: { is_completed: false }
      });
      queryClient.invalidateQueries(['attempts']);
    }
    setSelectedQuiz(null);
    setSwipeMode(false);
    setView('browse');
  };

  const handleStartSwipeMode = (quiz) => {
    if (!quiz.questions || quiz.questions.length === 0) {
      alert('Este quiz no tiene preguntas');
      return;
    }
    setSelectedQuiz(quiz);
    setSwipeMode(true);
    setView('quiz');
  };

  const handleSwipeComplete = async (score, total, wrongAnswers) => {
    await saveAttemptMutation.mutateAsync({
      quiz_id: selectedQuiz.id,
      subject_id: selectedQuiz.subject_id,
      user_email: currentUser.email,
      username: currentUser.username,
      score: score,
      total_questions: total,
      answered_questions: total,
      is_completed: true,
      wrong_questions: wrongAnswers.map(w => ({
        question: w.statement,
        selected_answer: w.userAnswer,
        correct_answer: w.correctAnswer
      })),
      completed_at: new Date().toISOString()
    });
    queryClient.invalidateQueries(['attempts']);
    setSwipeMode(false);
    setSelectedQuiz(null);
    setView('browse');
  };

  const handleReviewWrong = async (containerId) => {
    const descendantIds = getDescendantIds(containerId);
    const containerQuizIds = quizzes.filter(q => descendantIds.includes(q.subject_id)).map(q => q.id);
    
    const wrongQuestionsMap = new Map();
    attempts
      .filter(a => containerQuizIds.includes(a.quiz_id))
      .forEach(attempt => {
        attempt.wrong_questions?.forEach(wq => {
          if (!wrongQuestionsMap.has(wq.question)) {
            wrongQuestionsMap.set(wq.question, {
              question: wq.question,
              answerOptions: wq.answerOptions || [],
              hint: wq.hint
            });
          }
        });
      });

    const wrongQuestions = Array.from(wrongQuestionsMap.values());

    if (wrongQuestions.length === 0) {
      alert('No hay preguntas incorrectas para repasar');
      return;
    }

    const container = containers.find(c => c.id === containerId);
    const reviewQuiz = {
      id: `review-${containerId}`,
      title: `Repaso: ${container?.name || 'Contenedor'}`,
      subject_id: containerId,
      questions: wrongQuestions.map(q => ({
        ...q,
        answerOptions: [...(q.answerOptions || [])].sort(() => Math.random() - 0.5)
      }))
    };

    const attempt = await saveAttemptMutation.mutateAsync({
      quiz_id: reviewQuiz.id,
      subject_id: containerId,
      user_email: currentUser.email,
      username: currentUser.username,
      score: 0,
      total_questions: reviewQuiz.questions.length,
      answered_questions: 0,
      is_completed: false,
      wrong_questions: []
    });

    setCurrentAttemptId(attempt.id);
    setSelectedQuiz(reviewQuiz);
    setCurrentQuestionIndex(0);
    setScore(0);
    setWrongAnswers([]);
    setCorrectAnswers([]);
    setMarkedQuestions([]);
    setResponseTimes([]);
    setQuestionStartTime(Date.now());
    setView('quiz');
  };

  // Drag and drop
  const handleDragEnd = async (result) => {
    const { draggableId, destination, source } = result;
    
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const container = containers.find(c => c.id === draggableId);
    if (container) {
      const newParentId = destination.droppableId === 'root' ? null : destination.droppableId;
      await updateContainerMutation.mutateAsync({ 
        id: container.id, 
        data: { parent_id: newParentId, order: destination.index } 
      });
    }
  };

  // Get containers where quizzes can be added (any container can have quizzes now)
  const getAvailableContainers = () => {
    if (!currentContainerId) return containers;
    const descendantIds = getDescendantIds(currentContainerId);
    return containers.filter(c => descendantIds.includes(c.id));
  };

  // Username prompt
  if (!currentUser || !currentUser.username) {
    return <UsernamePrompt onSubmit={(username) => base44.auth.updateMe({ username }).then(u => setCurrentUser(u))} />;
  }

  // Breadcrumb
  const getBreadcrumb = () => {
    const crumbs = [];
    let current = currentContainer;
    while (current) {
      crumbs.unshift(current);
      current = containers.find(c => c.id === current.parent_id);
    }
    return crumbs;
  };

  const Breadcrumb = () => (
    <div className="flex items-center gap-2 text-sm flex-wrap mb-4">
      <Button variant="ghost" size="sm" onClick={navigateHome} className="text-gray-600 hover:text-gray-900 px-2">
        <Home className="w-4 h-4 mr-1" />
        Inicio
      </Button>
      {getBreadcrumb().map((item, idx) => (
        <React.Fragment key={item.id}>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const crumbs = getBreadcrumb();
              const newStack = crumbs.slice(0, idx).map(c => c.id);
              setNavigationStack(newStack.slice(0, -1));
              setCurrentContainerId(item.id);
            }}
            className={`px-2 ${item.id === currentContainerId ? 'font-medium text-gray-900' : 'text-gray-600'}`}
          >
            {item.icon} {item.name}
          </Button>
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
          <AnimatePresence mode="wait">
            {/* Container Editor */}
            {editingContainer && (
              <motion.div key="container-editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Button onClick={() => setEditingContainer(null)} variant="ghost" className="mb-6">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Volver
                </Button>
                <ContainerEditor
                  container={editingContainer}
                  users={allUsers}
                  onSave={(data) => updateContainerMutation.mutate({ id: editingContainer.id, data })}
                  onCancel={() => setEditingContainer(null)}
                />
              </motion.div>
            )}

            {/* Quiz Editor */}
            {editingQuiz && !editingContainer && (
              <motion.div key="quiz-editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Button onClick={() => setEditingQuiz(null)} variant="ghost" className="mb-6">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Volver
                </Button>
                <QuizEditor
                  quiz={editingQuiz}
                  subjects={containers.filter(c => c.type === 'subject')}
                  onSave={(data) => updateQuizMutation.mutate({ id: editingQuiz.id, data })}
                  onCancel={() => setEditingQuiz(null)}
                />
              </motion.div>
            )}

            {/* File Uploader */}
            {showUploader && !editingContainer && !editingQuiz && (
              <motion.div key="uploader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Button onClick={() => setShowUploader(false)} variant="ghost" className="mb-6">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Volver
                </Button>
                
                {currentContainerId ? (
                  <FileUploader onUploadSuccess={(data) => {
                    createQuizMutation.mutate({ ...data, subject_id: currentContainerId });
                  }} />
                ) : (
                  <div className="max-w-xl mx-auto">
                    <div className="mb-6">
                      <Label>Contenedor destino *</Label>
                      <select
                        className="w-full mt-1 p-2 border rounded-md"
                        id="subject-select"
                        defaultValue=""
                      >
                        <option value="">Selecciona un contenedor</option>
                        {containers.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <FileUploader onUploadSuccess={(data) => {
                      const subjectId = document.getElementById('subject-select').value;
                      if (!subjectId) {
                        alert('Selecciona un contenedor');
                        return;
                      }
                      createQuizMutation.mutate({ ...data, subject_id: subjectId });
                    }} />
                  </div>
                )}
              </motion.div>
            )}

            {/* AI Generator */}
            {showAIGenerator && !showUploader && !editingContainer && !editingQuiz && (
              <motion.div key="ai-generator" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <AIQuizGenerator
                  subjectId={currentContainerId}
                  subjectName={currentContainer?.name || 'General'}
                  onQuizGenerated={() => {
                    queryClient.invalidateQueries(['quizzes']);
                    setShowAIGenerator(false);
                  }}
                  onCancel={() => setShowAIGenerator(false)}
                  subjects={currentContainerId ? getAvailableContainers() : containers}
                  showSubjectSelector={!currentContainerId}
                />
              </motion.div>
            )}

            {/* Browse View */}
            {view === 'browse' && !editingContainer && !editingQuiz && !showUploader && !showAIGenerator && (
              <motion.div key="browse" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <ChallengeNotifications currentUser={currentUser} onStartChallenge={(c) => window.location.href = `/ChallengePlay?id=${c.id}`} />
                
                {/* Header */}
                {!currentContainerId ? (
                  <>
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                      {userStats && (
                        <div className="flex-1 max-w-md">
                          <PointsDisplay points={userStats.total_points || 0} level={userStats.level || 1} />
                        </div>
                      )}
                      <div className="w-full sm:w-64">
                        <OnlineUsersPanel currentUser={currentUser} quizzes={quizzes} subjects={containers.filter(c => c.type === 'subject')} />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <div>
                        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900">Mi Contenido</h1>
                        <p className="text-gray-600">Cursos, carpetas y materias</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link to={createPageUrl('Leaderboard')}>
                          <Button variant="outline" className="border-yellow-500 text-yellow-600 hover:bg-yellow-50 text-xs sm:text-sm h-9">
                            <Crown className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Ranking</span>
                          </Button>
                        </Link>
                        <Link to={createPageUrl('Progress')}>
                          <Button variant="outline" className="border-indigo-600 text-indigo-600 hover:bg-indigo-50 text-xs sm:text-sm h-9">
                            <TrendingUp className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Progreso</span>
                          </Button>
                        </Link>
                        <Link to={createPageUrl('GameLobby')}>
                          <Button variant="outline" className="border-purple-600 text-purple-600 hover:bg-purple-50 text-xs sm:text-sm h-9">
                            <Swords className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Desafío</span>
                          </Button>
                        </Link>
                        <Link to={createPageUrl('TournamentLobby')}>
                          <Button variant="outline" className="border-amber-600 text-amber-600 hover:bg-amber-50 text-xs sm:text-sm h-9">
                            <Trophy className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Torneo</span>
                          </Button>
                        </Link>
                        {isAdmin && (
                          <>
                            <AdminMenu compact onOpenContentManager={() => setShowContentManager(true)} />
                            <Button onClick={() => setShowCreateDialog(true)} className="bg-indigo-600 hover:bg-indigo-700 text-xs sm:text-sm h-9">
                              <Plus className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Nuevo</span>
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <Breadcrumb />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <div>
                        <h1 className="text-xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                          {currentContainer.icon && <span>{currentContainer.icon}</span>}
                          {currentContainer.name}
                        </h1>
                        <p className="text-gray-600">{currentContainer.description || 'Contenido'}</p>
                      </div>
                      {isAdmin && (
                        <div className="flex flex-wrap gap-2">
                          <Button onClick={() => setShowAIGenerator(true)} variant="outline" className="border-purple-600 text-purple-600 hover:bg-purple-50 text-xs sm:text-sm h-9">
                            <Sparkles className="w-4 h-4 mr-2" /> Generar IA
                          </Button>
                          <Button onClick={() => setShowUploader(true)} variant="outline" className="text-xs sm:text-sm h-9">
                            <Upload className="w-4 h-4 mr-2" /> Subir archivo
                          </Button>
                          <Button onClick={() => setShowCreateDialog(true)} className="bg-indigo-600 hover:bg-indigo-700 text-xs sm:text-sm h-9">
                            <Plus className="w-4 h-4 mr-2" /> Nuevo
                          </Button>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Content */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  {currentContainerId && (
                    <TabsList className="mb-4">
                      <TabsTrigger value="content" className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4" /> Contenido
                      </TabsTrigger>
                      <TabsTrigger value="quizzes" className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4" /> Cuestionarios ({directQuizzes.length})
                      </TabsTrigger>
                      <TabsTrigger value="audios" className="flex items-center gap-2">
                        <Music className="w-4 h-4" /> Audios
                      </TabsTrigger>
                    </TabsList>
                  )}

                  <TabsContent value="content">
                    <DroppableArea 
                      droppableId={currentContainerId || 'root'} 
                      type="CONTAINER" 
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                    >
                      {currentChildren.map((container, index) => (
                        <DraggableItem key={container.id} id={container.id} index={index} isAdmin={isAdmin}>
                          <ContainerCard
                            container={container}
                            childCount={getChildCount(container.id)}
                            quizCount={getQuizCount(container.id)}
                            stats={getContainerStats(container.id)}
                            isAdmin={isAdmin}
                            onEdit={setEditingContainer}
                            onDelete={(id) => deleteContainerMutation.mutate(id)}
                            onClick={() => navigateTo(container.id)}
                            onReviewWrong={handleReviewWrong}
                          />
                        </DraggableItem>
                      ))}
                    </DroppableArea>

                    {currentChildren.length === 0 && !currentContainerId && (
                      <div className="text-center py-16">
                        <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">Sin contenido</h3>
                        <p className="text-gray-500 mb-4">Comienza creando tu primer curso o materia</p>
                        {isAdmin && (
                          <Button onClick={() => setShowCreateDialog(true)} className="bg-indigo-600 hover:bg-indigo-700">
                            <Plus className="w-4 h-4 mr-2" /> Crear contenido
                          </Button>
                        )}
                      </div>
                    )}

                    {currentChildren.length === 0 && currentContainerId && (
                      <div className="text-center py-12">
                        <FolderPlus className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Vacío</h3>
                        <p className="text-gray-500 mb-4">Agrega contenido o cuestionarios</p>
                      </div>
                    )}
                  </TabsContent>

                  {currentContainerId && (
                    <>
                      <TabsContent value="quizzes">
                        {directQuizzes.length === 0 ? (
                          <div className="text-center py-12">
                            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sin cuestionarios</h3>
                            <p className="text-gray-500 mb-4">Sube tu primer cuestionario</p>
                            {isAdmin && (
                              <Button onClick={() => setShowUploader(true)} className="bg-indigo-600 hover:bg-indigo-700">
                                <Plus className="w-4 h-4 mr-2" /> Subir cuestionario
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {directQuizzes.map((quiz) => (
                              <QuizListItem
                                key={quiz.id}
                                quiz={quiz}
                                attempts={attempts.filter(a => a.quiz_id === quiz.id)}
                                isAdmin={isAdmin}
                                onStart={handleStartQuiz}
                                onEdit={setEditingQuiz}
                                onDelete={(id) => deleteQuizMutation.mutate(id)}
                                onStartSwipe={handleStartSwipeMode}
                                onMove={setMovingQuiz}
                              />
                            ))}
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="audios">
                        <AudioList subjectId={currentContainerId} isAdmin={isAdmin} />
                      </TabsContent>
                    </>
                  )}
                </Tabs>
              </motion.div>
            )}

            {/* Quiz View */}
            {view === 'quiz' && selectedQuiz && !swipeMode && (
              <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Button onClick={handleExitQuiz} variant="ghost" className="mb-6">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Salir del cuestionario
                </Button>
                <QuestionView
                  key={currentQuestionIndex}
                  question={selectedQuiz.questions[currentQuestionIndex]}
                  questionNumber={currentQuestionIndex + 1}
                  totalQuestions={selectedQuiz.questions.length}
                  correctAnswers={score}
                  wrongAnswers={wrongAnswers.length}
                  onAnswer={handleAnswer}
                  previousAttempts={attempts.filter(a => a.quiz_id === selectedQuiz.id)}
                  quizId={selectedQuiz.id}
                  userEmail={currentUser?.email}
                  settings={quizSettings}
                />
              </motion.div>
            )}

            {/* Swipe Quiz Mode */}
            {view === 'quiz' && selectedQuiz && swipeMode && (
              <motion.div key="swipe-quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <SwipeQuizMode
                  questions={selectedQuiz.questions}
                  onComplete={handleSwipeComplete}
                  onExit={handleExitQuiz}
                />
              </motion.div>
            )}

            {/* Results View */}
            {view === 'results' && selectedQuiz && (
              <motion.div key="results" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                <ResultsView
                  score={score}
                  totalQuestions={selectedQuiz.questions.length}
                  wrongAnswers={wrongAnswers}
                  correctAnswers={correctAnswers}
                  answeredQuestions={score + wrongAnswers.length}
                  isPartial={score + wrongAnswers.length < selectedQuiz.questions.length}
                  onRetry={handleRetry}
                  onRetryWrong={handleRetryWrongQuestions}
                  onHome={() => { setSelectedQuiz(null); setView('browse'); }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Create Dialog */}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Crear nuevo contenido</DialogTitle>
              </DialogHeader>
              <ContainerEditor
                container={{ parent_id: currentContainerId }}
                users={allUsers}
                defaultType={currentContainerId ? 'folder' : 'course'}
                onSave={(data) => createContainerMutation.mutate({ ...data, parent_id: currentContainerId })}
                onCancel={() => setShowCreateDialog(false)}
              />
            </DialogContent>
          </Dialog>

          <BadgeUnlockModal badge={newBadge} open={!!newBadge} onClose={() => setNewBadge(null)} />
          <SessionTimer />
          <TaskProgressFloat />

          {/* Move Quiz Modal */}
          <MoveQuizModal
            open={!!movingQuiz}
            onClose={() => setMovingQuiz(null)}
            quiz={movingQuiz}
            containers={containers}
            onMove={async (quizId, newContainerId) => {
              await updateQuizMutation.mutateAsync({ id: quizId, data: { subject_id: newContainerId } });
              setMovingQuiz(null);
            }}
          />

          {showContentManager && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-3xl">
                <ContentManager
                  courses={containers.filter(c => c.type === 'course')}
                  folders={containers.filter(c => c.type === 'folder')}
                  subjects={containers.filter(c => c.type === 'subject')}
                  quizzes={quizzes}
                  onDeleteCourses={async (ids) => { for (const id of ids) await deleteContainerMutation.mutateAsync(id); }}
                  onDeleteFolders={async (ids) => { for (const id of ids) await deleteContainerMutation.mutateAsync(id); }}
                  onDeleteSubjects={async (ids) => { for (const id of ids) await deleteContainerMutation.mutateAsync(id); }}
                  onUpdateCourse={async (id, data) => await updateContainerMutation.mutateAsync({ id, data })}
                  onUpdateFolder={async (id, data) => await updateContainerMutation.mutateAsync({ id, data })}
                  onUpdateSubject={async (id, data) => await updateContainerMutation.mutateAsync({ id, data })}
                  onClose={() => setShowContentManager(false)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </DragDropContext>
  );
}