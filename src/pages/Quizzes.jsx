import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, ArrowLeft, BookOpen, FolderPlus, TrendingUp, Crown, Award, Folder, ChevronRight, Pencil, Trash2, Upload, Swords, ClipboardList, Music, GraduationCap, Home, Trophy, Settings, Sparkles, FolderInput } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { buildContainers } from '../components/utils/contentTree';
import { moveItemsInBackend } from '../components/utils/moveItems';
import { fromCompactFormat, isCompactFormat } from '../components/utils/quizFormats';
import { DragDropContext } from '@hello-pangea/dnd';
import DraggableItem from '../components/dnd/DraggableItem';
import DroppableArea from '../components/dnd/DroppableArea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import FileUploader from '../components/quiz/FileUploader';
import BulkSectionUploader from '../components/quiz/BulkSectionUploader';
import QuizEditor from '../components/quiz/QuizEditor';
import QuestionView from '../components/quiz/QuestionView';
import ResultsView from '../components/quiz/ResultsView';
import SubjectCard from '../components/quiz/SubjectCard';
import SubjectEditor from '../components/quiz/SubjectEditor';
import UsernamePrompt from '../components/quiz/UsernamePrompt';
import FolderCard from '../components/quiz/FolderCard';
import FolderEditor from '../components/quiz/FolderEditor';
import AudioList from '../components/audio/AudioList';
import CourseCard from '../components/course/CourseCard';
import CourseEditor from '../components/course/CourseEditor';
import QuizListItem from '../components/quiz/QuizListItem';
import PointsDisplay from '../components/gamification/PointsDisplay';
import BadgeUnlockModal from '../components/gamification/BadgeUnlockModal';
import { calculatePoints, calculateLevel, checkNewBadges } from '../components/gamification/GamificationService';
import OnlineUsersPanel from '../components/challenge/OnlineUsersPanel';
import ChallengeNotifications from '../components/challenge/ChallengeNotifications';
import SessionTimer from '../components/ui/SessionTimer';
import TaskProgressFloat from '../components/tasks/TaskProgressFloat';
import ContentManager from '../components/admin/ContentManager';
import AdminMenu from '../components/admin/AdminMenu';
import useQuizSettings from '../components/quiz/useQuizSettings';
import SwipeQuizMode from '../components/quiz/SwipeQuizMode';
import AIQuizGenerator from '../components/quiz/AIQuizGenerator';
import FileExplorer from '../components/explorer/FileExplorer';
import MoveQuizModal from '../components/quiz/MoveQuizModal';
import QuizExporter from '../components/admin/QuizExporter';

export default function QuizzesPage() {
  const [view, setView] = useState('home');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState([]);
  const [correctAnswers, setCorrectAnswers] = useState([]);
  const [markedQuestions, setMarkedQuestions] = useState([]);
  const [showUploader, setShowUploader] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [deckType, setDeckType] = useState('all');
  const [userStats, setUserStats] = useState(null);
  const [newBadge, setNewBadge] = useState(null);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [editingSubject, setEditingSubject] = useState(null);
  const [editingFolder, setEditingFolder] = useState(null);
  const [editingCourse, setEditingCourse] = useState(null);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [showBulkUploader, setShowBulkUploader] = useState(false);
  const [activeSubjectTab, setActiveSubjectTab] = useState('quizzes');
  const [swipeMode, setSwipeMode] = useState(false);
    const [responseTimes, setResponseTimes] = useState([]);
    const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  
  // Dialogs
  const [showCourseDialog, setShowCourseDialog] = useState(false);
  const [showSubjectDialog, setShowSubjectDialog] = useState(false);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [showContentManager, setShowContentManager] = useState(false);
const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [explorerMode, setExplorerMode] = useState(false);
  const [movingQuiz, setMovingQuiz] = useState(null);
  const [showQuizExporter, setShowQuizExporter] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', description: '', color: '#6366f1' });

  const queryClient = useQueryClient();

  // Quiz settings hook
  const { settings: quizSettings } = useQuizSettings(
    selectedQuiz?.id,
    selectedSubject?.id,
    currentFolderId,
    selectedCourse?.id
  );

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
  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list('order'),
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => base44.entities.Subject.list('order'),
  });

  const { data: folders = [] } = useQuery({
    queryKey: ['folders'],
    queryFn: () => base44.entities.Folder.list('order'),
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

  // Mutations
  const createCourseMutation = useMutation({
    mutationFn: (data) => base44.entities.Course.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['courses']);
      setShowCourseDialog(false);
      setNewItem({ name: '', description: '', color: '#6366f1' });
    },
  });

  const updateCourseMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Course.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['courses']);
      setEditingCourse(null);
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: (id) => base44.entities.Course.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['courses']),
  });

  const createSubjectMutation = useMutation({
    mutationFn: (data) => base44.entities.Subject.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['subjects']);
      setShowSubjectDialog(false);
      setNewItem({ name: '', description: '', color: '#6366f1' });
    },
  });

  const updateSubjectMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Subject.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['subjects']);
      setEditingSubject(null);
    },
  });

  const deleteSubjectMutation = useMutation({
    mutationFn: (id) => base44.entities.Subject.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['subjects']),
  });

  const createFolderMutation = useMutation({
    mutationFn: (data) => base44.entities.Folder.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['folders']);
      setShowFolderDialog(false);
      setNewItem({ name: '', description: '', color: '#f59e0b' });
    },
  });

  const updateFolderMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Folder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['folders']);
      setEditingFolder(null);
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (id) => base44.entities.Folder.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['folders']),
  });

  const createQuizMutation = useMutation({
    mutationFn: (data) => base44.entities.Quiz.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['quizzes']);
      setShowUploader(false);
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

  // Bulk delete handlers
  const handleBulkDeleteCourses = async (ids) => {
    for (const id of ids) {
      await base44.entities.Course.delete(id);
    }
    queryClient.invalidateQueries(['courses']);
  };

  const handleBulkDeleteFolders = async (ids) => {
    for (const id of ids) {
      await base44.entities.Folder.delete(id);
    }
    queryClient.invalidateQueries(['folders']);
  };

  const handleBulkDeleteSubjects = async (ids) => {
    for (const id of ids) {
      await base44.entities.Subject.delete(id);
    }
    queryClient.invalidateQueries(['subjects']);
  };

  const handleUpdateCourse = async (id, data) => {
    await base44.entities.Course.update(id, data);
    queryClient.invalidateQueries(['courses']);
  };

  const handleUpdateFolder = async (id, data) => {
    await base44.entities.Folder.update(id, data);
    queryClient.invalidateQueries(['folders']);
  };

  const handleUpdateSubject = async (id, data) => {
    await base44.entities.Subject.update(id, data);
    queryClient.invalidateQueries(['subjects']);
  };

  // Drag and drop handler
  const handleDragEnd = async (result) => {
    const { draggableId, destination, source, type } = result;
    
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const destParts = destination.droppableId.split('-');
    const destType = destParts[0]; // 'course', 'folder', 'root'
    const destId = destParts[1] || null;

    if (type === 'COURSE') {
      const course = courses.find(c => c.id === draggableId);
      if (course) {
        await updateCourseMutation.mutateAsync({ id: course.id, data: { order: destination.index } });
      }
    } else if (type === 'FOLDER') {
      const folder = folders.find(f => f.id === draggableId);
      if (folder) {
        const newData = { order: destination.index };
        if (destType === 'course') {
          newData.course_id = destId;
          newData.parent_id = null;
        } else if (destType === 'folder') {
          newData.parent_id = destId;
        } else if (destType === 'root') {
          newData.course_id = null;
          newData.parent_id = null;
        }
        await updateFolderMutation.mutateAsync({ id: folder.id, data: newData });
      }
    } else if (type === 'SUBJECT') {
      const subject = subjects.find(s => s.id === draggableId);
      if (subject) {
        const newData = { order: destination.index };
        if (destType === 'course') {
          newData.course_id = destId;
          newData.folder_id = null;
        } else if (destType === 'folder') {
          newData.folder_id = destId;
        } else if (destType === 'root') {
          newData.course_id = null;
          newData.folder_id = null;
        }
        await updateSubjectMutation.mutateAsync({ id: subject.id, data: newData });
      }
    }

    queryClient.invalidateQueries(['courses']);
    queryClient.invalidateQueries(['folders']);
    queryClient.invalidateQueries(['subjects']);
  };

  const saveAttemptMutation = useMutation({
    mutationFn: (data) => base44.entities.QuizAttempt.create(data),
  });

  const updateAttemptMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.QuizAttempt.update(id, data),
  });

  const createUserStatsMutation = useMutation({
    mutationFn: (data) => base44.entities.UserStats.create(data),
    onSuccess: (data) => {
      setUserStats(data);
      queryClient.invalidateQueries(['user-stats']);
    }
  });

  const updateUserStatsMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.UserStats.update(id, data),
    onSuccess: (data) => {
      setUserStats(data);
      queryClient.invalidateQueries(['user-stats']);
    }
  });

  const updateUsernameMutation = useMutation({
    mutationFn: (username) => base44.auth.updateMe({ username }),
    onSuccess: (updatedUser) => setCurrentUser(updatedUser),
  });

  // Visibility helpers
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

  // Filtered data
  const visibleCourses = courses.filter(c => canUserAccess(c));
  const unassignedSubjects = subjects.filter(s => !s.course_id && canUserAccess(s));
  const unassignedFolders = folders.filter(f => !f.course_id && !f.parent_id && canUserAccess(f));
  const currentCourseSubjects = selectedCourse 
    ? subjects.filter(s => s.course_id === selectedCourse.id && canUserAccess(s, selectedCourse))
    : [];
  const currentCourseFolders = selectedCourse
    ? folders.filter(f => f.course_id === selectedCourse.id && f.parent_id === currentFolderId && canUserAccess(f, selectedCourse))
    : currentFolderId 
    ? folders.filter(f => f.parent_id === currentFolderId && canUserAccess(f))
    : [];
  const currentFolderSubjects = currentFolderId
    ? subjects.filter(s => s.folder_id === currentFolderId && canUserAccess(s))
    : currentCourseSubjects.filter(s => !s.folder_id);

  const subjectQuizzes = selectedSubject
    ? quizzes.filter(q => q.subject_id === selectedSubject.id && (isAdmin || !q.is_hidden))
    : [];

  const [currentAttemptId, setCurrentAttemptId] = useState(null);

  // Quiz handlers
  const handleStartQuiz = async (quiz, questionCount, selectedDeck = 'all', quizAttempts = []) => {
    // Convertir de formato compacto si es necesario
    let expandedQuiz = quiz;
    if (isCompactFormat(quiz)) {
      expandedQuiz = fromCompactFormat(quiz);
    } else if (!quiz.questions && quiz.q) {
      // Si tiene q pero no questions, expandir
      expandedQuiz = fromCompactFormat(quiz);
    }

    if (!expandedQuiz.questions || expandedQuiz.questions.length === 0) {
      alert('Este quiz no tiene preguntas');
      return;
    }

    let filteredQuestions = [...expandedQuiz.questions];

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
      subject_id: quiz.subject_id || expandedQuiz.subject_id,
      user_email: currentUser.email,
      username: currentUser.username,
      score: 0,
      total_questions: shuffledQuestions.length,
      answered_questions: 0,
      is_completed: false,
      wrong_questions: []
    });

    setCurrentAttemptId(attempt.id);
    setSelectedQuiz({ ...quiz, id: quiz.id, subject_id: quiz.subject_id, title: expandedQuiz.title, questions: shuffledQuestions });
    setCurrentQuestionIndex(0);
    setScore(0);
    setWrongAnswers([]);
    setCorrectAnswers([]);
    setMarkedQuestions([]);
    setResponseTimes([]);
    setQuestionStartTime(Date.now());
    setDeckType(selectedDeck);
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
      hint: question.hint,
      difficulty: question.difficulty
    }] : wrongAnswers;

    if (isCorrect) {
      setScore(newScore);
      setCorrectAnswers([...correctAnswers, { 
        question: question.question,
        difficulty: question.difficulty,
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
        setView('list');
      };

      const handleStartSwipeMode = (quiz) => {
        const expandedQuiz = isCompactFormat(quiz) ? fromCompactFormat(quiz) : quiz;

        if (!expandedQuiz.questions || expandedQuiz.questions.length === 0) {
          alert('Este quiz no tiene preguntas');
          return;
        }
        setSelectedQuiz({ ...quiz, questions: expandedQuiz.questions });
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
        setView('list');
      };

  const handleHome = () => {
        setSelectedQuiz(null);
        setSelectedSubject(null);
        setSelectedCourse(null);
        setCurrentFolderId(null);
        setView('home');
        setShowUploader(false);
      };

      const handleReviewWrongBySubject = async (subjectId) => {
        // Obtener todos los quizzes de la materia
        const subjectQuizIds = quizzes.filter(q => q.subject_id === subjectId).map(q => q.id);

        // Obtener todas las preguntas incorrectas de esa materia
        const wrongQuestionsMap = new Map();
        attempts
          .filter(a => subjectQuizIds.includes(a.quiz_id))
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

        // Crear quiz temporal con preguntas incorrectas
        const reviewQuiz = {
          id: `review-${subjectId}`,
          title: `Repaso: ${subjects.find(s => s.id === subjectId)?.name || 'Materia'}`,
          subject_id: subjectId,
          questions: wrongQuestions.map(q => ({
            ...q,
            answerOptions: [...(q.answerOptions || [])].sort(() => Math.random() - 0.5)
          }))
        };

        const attempt = await saveAttemptMutation.mutateAsync({
          quiz_id: reviewQuiz.id,
          subject_id: subjectId,
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

  const getSubjectStats = (subjectId) => {
    const subjectQuizzes = quizzes.filter(q => q.subject_id === subjectId);
    const subjectQuizIds = subjectQuizzes.map(q => q.id);
    const subjectAttempts = attempts.filter(a => subjectQuizIds.includes(a.quiz_id));
    
    if (subjectAttempts.length === 0) return { totalCorrect: 0, totalWrong: 0, totalAnswered: 0 };
    
    const wrongQuestions = new Set();
    subjectAttempts.forEach(attempt => {
      attempt.wrong_questions?.forEach(wq => wrongQuestions.add(wq.question));
    });
    
    const totalWrong = wrongQuestions.size;
    const totalCorrect = subjectAttempts.reduce((sum, a) => sum + a.score, 0);
    const totalAnswered = totalCorrect + totalWrong;
    
    return { totalCorrect, totalWrong, totalAnswered };
  };

  // Username prompt
  if (!currentUser || !currentUser.username) {
    return <UsernamePrompt onSubmit={(username) => updateUsernameMutation.mutateAsync(username)} />;
  }

  // Breadcrumb
  const Breadcrumb = () => (
    <div className="flex items-center gap-2 text-sm flex-wrap mb-4">
      <Button variant="ghost" size="sm" onClick={handleHome} className="text-gray-600 hover:text-gray-900 px-2">
        <Home className="w-4 h-4 mr-1" />
        Inicio
      </Button>
      {selectedCourse && (
        <>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSelectedSubject(null); setCurrentFolderId(null); setView('subjects'); }}
            className={`px-2 ${!selectedSubject ? 'font-medium text-gray-900' : 'text-gray-600'}`}
          >
            {selectedCourse.icon} {selectedCourse.name}
          </Button>
        </>
      )}
      {currentFolderId && (
        <>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="font-medium text-gray-900">
            {folders.find(f => f.id === currentFolderId)?.name}
          </span>
        </>
      )}
      {selectedSubject && (
        <>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="font-medium text-gray-900">{selectedSubject.name}</span>
        </>
      )}
    </div>
  );

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <AnimatePresence mode="wait">
          {/* Course Editor */}
          {editingCourse && (
            <motion.div key="course-editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Button onClick={() => setEditingCourse(null)} variant="ghost" className="mb-6">
                <ArrowLeft className="w-4 h-4 mr-2" /> Volver
              </Button>
              <CourseEditor
                course={editingCourse}
                users={allUsers}
                onSave={(data) => updateCourseMutation.mutate({ id: editingCourse.id, data })}
                onCancel={() => setEditingCourse(null)}
              />
            </motion.div>
          )}

          {/* Subject Editor */}
          {editingSubject && !editingCourse && (
            <motion.div key="subject-editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Button onClick={() => setEditingSubject(null)} variant="ghost" className="mb-6">
                <ArrowLeft className="w-4 h-4 mr-2" /> Volver
              </Button>
              <SubjectEditor
                subject={editingSubject}
                users={allUsers}
                onSave={(data) => updateSubjectMutation.mutate({ id: editingSubject.id, data })}
                onCancel={() => setEditingSubject(null)}
              />
            </motion.div>
          )}

          {/* Folder Editor */}
          {editingFolder && !editingSubject && !editingCourse && (
            <motion.div key="folder-editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Button onClick={() => setEditingFolder(null)} variant="ghost" className="mb-6">
                <ArrowLeft className="w-4 h-4 mr-2" /> Volver
              </Button>
              <FolderEditor
                folder={editingFolder}
                users={allUsers}
                onSave={(data) => updateFolderMutation.mutate({ id: editingFolder.id, data })}
                onCancel={() => setEditingFolder(null)}
              />
            </motion.div>
          )}

          {/* Quiz Editor */}
          {editingQuiz && !editingFolder && !editingSubject && !editingCourse && (
            <motion.div key="quiz-editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Button onClick={() => setEditingQuiz(null)} variant="ghost" className="mb-6">
                <ArrowLeft className="w-4 h-4 mr-2" /> Volver
              </Button>
              <QuizEditor
                quiz={editingQuiz}
                subjects={subjects}
                onSave={(data) => updateQuizMutation.mutate({ id: editingQuiz.id, data })}
                onCancel={() => setEditingQuiz(null)}
              />
            </motion.div>
          )}

          {/* Home View - Courses + Unassigned Subjects */}
          {view === 'home' && !editingCourse && !editingSubject && !editingFolder && !editingQuiz && !explorerMode && (
            <motion.div key="courses" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <ChallengeNotifications currentUser={currentUser} onStartChallenge={(c) => window.location.href = `/ChallengePlay?id=${c.id}`} />

              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                {userStats && (
                  <div className="flex-1 max-w-md">
                    <PointsDisplay points={userStats.total_points || 0} level={userStats.level || 1} />
                  </div>
                )}
                <div className="w-full sm:w-64">
                  <OnlineUsersPanel currentUser={currentUser} quizzes={quizzes} subjects={subjects} />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl sm:text-4xl font-bold text-gray-900">Mis Cursos</h1>
                  <p className="text-gray-600">Selecciona un curso para ver sus materias</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {isAdmin && (
                    <Button 
                      onClick={() => setExplorerMode(true)} 
                      variant="outline"
                      className="text-xs sm:text-sm h-9 border-purple-300 text-purple-600 hover:bg-purple-50"
                    >
                      <FolderInput className="w-4 h-4 mr-2" /> 
                      Explorador
                    </Button>
                  )}
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
                      <AdminMenu 
                        compact 
                        onOpenContentManager={() => setShowContentManager(true)}
                        onOpenQuizExporter={() => setShowQuizExporter(true)}
                      />
                      <Dialog open={showCourseDialog} onOpenChange={setShowCourseDialog}>
                        <DialogTrigger asChild>
                          <Button className="bg-indigo-600 hover:bg-indigo-700 text-xs sm:text-sm h-9">
                            <Plus className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Nuevo curso</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Crear nuevo curso</DialogTitle></DialogHeader>
                          <div className="space-y-4 mt-4">
                            <div>
                              <Label>Nombre</Label>
                              <Input value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} placeholder="Ej: Semestre Selectivo" />
                            </div>
                            <div>
                              <Label>Descripción</Label>
                              <Input value={newItem.description} onChange={(e) => setNewItem({...newItem, description: e.target.value})} placeholder="Descripción opcional" />
                            </div>
                            <div>
                              <Label>Color</Label>
                              <input type="color" value={newItem.color} onChange={(e) => setNewItem({...newItem, color: e.target.value})} className="w-full h-10 rounded-md border cursor-pointer" />
                            </div>
                            <Button onClick={() => createCourseMutation.mutate(newItem)} className="w-full bg-indigo-600 hover:bg-indigo-700">
                              Crear curso
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </>
                  )}
                </div>
              </div>

              {/* Cursos */}
              {visibleCourses.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5" /> Cursos
                  </h2>
                  <DroppableArea droppableId="root-courses" type="COURSE" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {visibleCourses.map((course, index) => (
                      <DraggableItem key={course.id} id={course.id} index={index} isAdmin={isAdmin}>
                        <CourseCard
                          course={course}
                          subjectCount={subjects.filter(s => s.course_id === course.id).length}
                          isAdmin={isAdmin}
                          onEdit={setEditingCourse}
                          onDelete={(id) => deleteCourseMutation.mutate(id)}
                          onClick={() => { setSelectedCourse(course); setView('subjects'); }}
                        />
                      </DraggableItem>
                    ))}
                  </DroppableArea>
                </div>
              )}

              {/* Carpetas sin curso */}
              {unassignedFolders.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Folder className="w-5 h-5" /> Carpetas
                  </h2>
                  <DroppableArea droppableId="root-folders" type="FOLDER" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {unassignedFolders.map((folder, index) => (
                      <DraggableItem key={folder.id} id={folder.id} index={index} isAdmin={isAdmin}>
                        <FolderCard
                          folder={folder}
                          itemCount={subjects.filter(s => s.folder_id === folder.id).length}
                          isAdmin={isAdmin}
                          onDelete={(id) => deleteFolderMutation.mutate(id)}
                          onEdit={setEditingFolder}
                          onClick={() => { setCurrentFolderId(folder.id); setView('subjects'); }}
                        />
                      </DraggableItem>
                    ))}
                  </DroppableArea>
                </div>
              )}

              {/* Materias sin curso */}
              {unassignedSubjects.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <BookOpen className="w-5 h-5" /> Materias
                  </h2>
                  <DroppableArea droppableId="root-subjects" type="SUBJECT" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {unassignedSubjects.map((subject, index) => (
                      <DraggableItem key={subject.id} id={subject.id} index={index} isAdmin={isAdmin}>
                        <SubjectCard
                          subject={subject}
                          quizCount={quizzes.filter(q => q.subject_id === subject.id).length}
                          stats={getSubjectStats(subject.id)}
                          isAdmin={isAdmin}
                          onDelete={(id) => deleteSubjectMutation.mutate(id)}
                          onEdit={setEditingSubject}
                          onClick={() => { setSelectedSubject(subject); setView('list'); }}
                          onReviewWrong={handleReviewWrongBySubject}
                        />
                      </DraggableItem>
                    ))}
                  </DroppableArea>
                </div>
              )}

              {visibleCourses.length === 0 && unassignedFolders.length === 0 && unassignedSubjects.length === 0 && (
                <div className="text-center py-16">
                  <GraduationCap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay contenido</h3>
                  <p className="text-gray-500">Comienza creando tu primer curso o materia</p>
                </div>
              )}
            </motion.div>
            )}

            {/* Explorer Mode - Unified */}
            {explorerMode && !editingCourse && !editingSubject && !editingFolder && !editingQuiz && (
            <motion.div key="explorer-unified" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">🗂️ Explorador General</h1>
                  <p className="text-gray-600">Arrastra elementos para organizarlos, expande contenedores y cambia tipos</p>
                </div>
                <Button 
                  onClick={() => setExplorerMode(false)} 
                  variant="outline"
                  className="text-xs sm:text-sm h-9"
                >
                  Salir
                </Button>
              </div>

              <FileExplorer
                containers={buildContainers(courses, folders, subjects)}
                quizzes={quizzes}
                isAdmin={isAdmin}
                currentContainerId={null}
                onMoveItems={async (items, targetId, targetType) => {
                  await moveItemsInBackend(items, targetId, targetType, {
                    updateFolder: (params) => updateFolderMutation.mutateAsync(params),
                    updateSubject: (params) => updateSubjectMutation.mutateAsync(params),
                    updateQuiz: (params) => updateQuizMutation.mutateAsync(params)
                  });
                  queryClient.invalidateQueries(['quizzes']);
                  queryClient.invalidateQueries(['subjects']);
                  queryClient.invalidateQueries(['folders']);
                  queryClient.invalidateQueries(['courses']);
                }}
                onChangeType={async (itemId, fromType, toType) => {
                  try {
                    let originalItem;
                    if (fromType === 'course') {
                      originalItem = courses.find(c => c.id === itemId);
                    } else if (fromType === 'folder') {
                      originalItem = folders.find(f => f.id === itemId);
                    } else if (fromType === 'subject') {
                      originalItem = subjects.find(s => s.id === itemId);
                    }

                    if (!originalItem) return;

                    const { id, created_date, updated_date, created_by, ...commonData } = originalItem;

                    if (fromType === 'course') {
                      await base44.entities.Course.delete(itemId);
                    } else if (fromType === 'folder') {
                      await base44.entities.Folder.delete(itemId);
                    } else if (fromType === 'subject') {
                      await base44.entities.Subject.delete(itemId);
                    }

                    if (toType === 'course') {
                      await base44.entities.Course.create(commonData);
                    } else if (toType === 'folder') {
                      await base44.entities.Folder.create(commonData);
                    } else if (toType === 'subject') {
                      await base44.entities.Subject.create(commonData);
                    }

                    queryClient.invalidateQueries(['courses']);
                    queryClient.invalidateQueries(['folders']);
                    queryClient.invalidateQueries(['subjects']);
                  } catch (error) {
                    console.error('Error cambiando tipo:', error);
                  }
                }}
                onItemClick={(type, item) => {
                  if (type === 'quiz') {
                    const quiz = quizzes.find(q => q.id === item.id);
                    if (quiz) {
                      setExplorerMode(false);
                      handleStartQuiz(quiz, quiz.total_questions, 'all', attempts.filter(a => a.quiz_id === quiz.id));
                    }
                  }
                }}
              />
            </motion.div>
            )}

            {/* Subjects View (inside a course or folder) */}
                            {view === 'subjects' && (selectedCourse || currentFolderId) && !editingCourse && !editingSubject && !editingFolder && !editingQuiz && !showBulkUploader && !showAIGenerator && !showUploader && !explorerMode && (
                              <motion.div key="subjects" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                                <Breadcrumb />

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                  <div>
                                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                                      {selectedCourse ? (
                                        <>{selectedCourse.icon} {selectedCourse.name}</>
                                      ) : currentFolderId ? (
                                        <><Folder className="w-6 h-6" /> {folders.find(f => f.id === currentFolderId)?.name}</>
                                      ) : null}
                                    </h1>
                                    <p className="text-gray-600">
                                      {selectedCourse?.description || folders.find(f => f.id === currentFolderId)?.description || 'Contenido'}
                                    </p>
                                  </div>
                                  {isAdmin && (
                                                          <div className="flex flex-wrap gap-2">
                                                            <Button 
                                                              onClick={() => setExplorerMode(true)} 
                                                              variant="outline"
                                                              className="text-xs sm:text-sm h-9 border-purple-300 text-purple-600 hover:bg-purple-50"
                                                            >
                                                              <FolderInput className="w-4 h-4 mr-2" /> 
                                                              Explorador
                                                            </Button>
                                                            <Button onClick={() => setShowAIGenerator(true)} variant="outline" className="border-purple-600 text-purple-600 hover:bg-purple-50 text-xs sm:text-sm h-9">
                                                              <Sparkles className="w-4 h-4 mr-2" /> Subir JSON
                                                            </Button>
                                                            <Button onClick={() => setShowUploader(true)} variant="outline" className="text-xs sm:text-sm h-9">
                                                              <Upload className="w-4 h-4 mr-2" /> Subir archivo
                                                            </Button>
                                                          <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
                                      <DialogTrigger asChild>
                                        <Button variant="outline" className="text-xs sm:text-sm h-9">
                                          <Folder className="w-4 h-4 mr-2" /> Nueva carpeta
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent>
                                        <DialogHeader><DialogTitle>Crear carpeta (parcial)</DialogTitle></DialogHeader>
                                        <div className="space-y-4 mt-4">
                                          <div>
                                            <Label>Nombre</Label>
                                            <Input value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} placeholder="Ej: Parcial 1" />
                                          </div>
                                          <Button onClick={() => createFolderMutation.mutate({ ...newItem, course_id: selectedCourse?.id, parent_id: currentFolderId })} className="w-full bg-amber-500 hover:bg-amber-600">
                                            Crear carpeta
                                          </Button>
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                    <Dialog open={showSubjectDialog} onOpenChange={setShowSubjectDialog}>
                                      <DialogTrigger asChild>
                                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-xs sm:text-sm h-9">
                                          <Plus className="w-4 h-4 mr-2" /> Nueva materia
                                        </Button>
                                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Crear nueva materia</DialogTitle></DialogHeader>
                        <div className="space-y-4 mt-4">
                          <div>
                            <Label>Nombre</Label>
                            <Input value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} placeholder="Ej: Anatomía" />
                          </div>
                          <div>
                            <Label>Descripción</Label>
                            <Input value={newItem.description} onChange={(e) => setNewItem({...newItem, description: e.target.value})} />
                          </div>
                          <div>
                            <Label>Color</Label>
                            <input type="color" value={newItem.color} onChange={(e) => setNewItem({...newItem, color: e.target.value})} className="w-full h-10 rounded-md border cursor-pointer" />
                          </div>
                          <Button onClick={() => createSubjectMutation.mutate({ ...newItem, course_id: selectedCourse?.id, folder_id: currentFolderId })} className="w-full bg-indigo-600 hover:bg-indigo-700">
                            Crear materia
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>

              <DroppableArea 
                droppableId={currentFolderId ? `folder-${currentFolderId}` : `course-${selectedCourse?.id}`} 
                type="FOLDER" 
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4"
              >
                {currentCourseFolders.map((folder, index) => (
                  <DraggableItem key={folder.id} id={folder.id} index={index} isAdmin={isAdmin}>
                    <FolderCard
                      folder={folder}
                      itemCount={subjects.filter(s => s.folder_id === folder.id).length}
                      isAdmin={isAdmin}
                      onDelete={(id) => deleteFolderMutation.mutate(id)}
                      onEdit={setEditingFolder}
                      onClick={() => setCurrentFolderId(folder.id)}
                    />
                  </DraggableItem>
                ))}
              </DroppableArea>
              <DroppableArea 
                droppableId={currentFolderId ? `folder-${currentFolderId}` : `course-${selectedCourse?.id}`} 
                type="SUBJECT" 
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {currentFolderSubjects.map((subject, index) => (
                  <DraggableItem key={subject.id} id={subject.id} index={index} isAdmin={isAdmin}>
                    <SubjectCard
                      subject={subject}
                      quizCount={quizzes.filter(q => q.subject_id === subject.id).length}
                      stats={getSubjectStats(subject.id)}
                      isAdmin={isAdmin}
                      onDelete={(id) => deleteSubjectMutation.mutate(id)}
                      onEdit={setEditingSubject}
                      onClick={() => { setSelectedSubject(subject); setView('list'); }}
                      onReviewWrong={handleReviewWrongBySubject}
                    />
                  </DraggableItem>
                ))}
              </DroppableArea>

              {currentCourseFolders.length === 0 && currentFolderSubjects.length === 0 && (
                                    <div className="text-center py-16">
                                      <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                      <h3 className="text-xl font-semibold text-gray-900 mb-2">Curso vacío</h3>
                                      <p className="text-gray-500">Agrega carpetas o materias</p>
                                    </div>
                                  )}
                                  </motion.div>
                                  )}



                                  {/* File Uploader - Folder Level */}
                                              {view === 'subjects' && (selectedCourse || currentFolderId) && showUploader && (
                                                <motion.div key="uploader-folder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                                  <Button onClick={() => setShowUploader(false)} variant="ghost" className="mb-6">
                                                    <ArrowLeft className="w-4 h-4 mr-2" /> Volver
                                                  </Button>
                                                  <div className="mb-6">
                                                    <Label>Materia destino *</Label>
                                                    <select
                                                      className="w-full mt-1 p-2 border rounded-md"
                                                      value={selectedSubject?.id || ''}
                                                      onChange={(e) => {
                                                        const subject = currentFolderSubjects.find(s => s.id === e.target.value);
                                                        setSelectedSubject(subject);
                                                      }}
                                                    >
                                                      <option value="">Selecciona una materia</option>
                                                      {currentFolderSubjects.map(s => (
                                                        <option key={s.id} value={s.id}>{s.name}</option>
                                                      ))}
                                                    </select>
                                                  </div>
                                                  {selectedSubject ? (
                                                    <FileUploader onUploadSuccess={(data) => {
                                                      createQuizMutation.mutate({ ...data, subject_id: selectedSubject.id });
                                                      setShowUploader(false);
                                                      setSelectedSubject(null);
                                                    }} />
                                                  ) : (
                                                    <p className="text-center text-gray-500 py-8">Selecciona una materia para continuar</p>
                                                  )}
                                                </motion.div>
                                              )}

                                              {/* AI Quiz Generator - Folder Level */}
                                              {view === 'subjects' && (selectedCourse || currentFolderId) && showAIGenerator && !showUploader && (
                                <motion.div key="ai-generator-folder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                  <Button onClick={() => setShowAIGenerator(false)} variant="ghost" className="mb-6">
                                    <ArrowLeft className="w-4 h-4 mr-2" /> Volver
                                  </Button>
                                  <AIQuizGenerator
                                    subjectId={null}
                                    subjectName={selectedCourse?.name || folders.find(f => f.id === currentFolderId)?.name || 'Carpeta'}
                                    onQuizGenerated={() => {
                                      queryClient.invalidateQueries(['quizzes']);
                                      setShowAIGenerator(false);
                                    }}
                                    onCancel={() => setShowAIGenerator(false)}
                                    subjects={currentFolderSubjects}
                                    showSubjectSelector={true}
                                  />
                                </motion.div>
                              )}

                              {/* AI Quiz Generator - Subject Level */}
                                              {view === 'list' && selectedSubject && showAIGenerator && (
                            <motion.div key="ai-generator" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                              <AIQuizGenerator
                                subjectId={selectedSubject.id}
                                subjectName={selectedSubject.name}
                                onQuizGenerated={() => {
                                  queryClient.invalidateQueries(['quizzes']);
                                  setShowAIGenerator(false);
                                }}
                                onCancel={() => setShowAIGenerator(false)}
                              />
                            </motion.div>
                          )}

                          {/* Quiz List View */}
                                          {view === 'list' && selectedSubject && !showUploader && !editingQuiz && !showAIGenerator && !explorerMode && (
                            <motion.div key="list" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                              <Breadcrumb />

                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                <div>
                                  <h1 className="text-xl sm:text-3xl font-bold text-gray-900">{selectedSubject.name}</h1>
                                  <p className="text-gray-600">{selectedSubject.description || 'Cuestionarios de esta materia'}</p>
                                </div>
                                {isAdmin && (
                                                        <div className="flex gap-2">
                                                          <Button 
                                                              onClick={() => setExplorerMode(true)} 
                                                              variant="outline"
                                                              className="text-xs sm:text-sm h-9 border-purple-300 text-purple-600 hover:bg-purple-50"
                                                            >
                                                              <FolderInput className="w-4 h-4 mr-2" /> 
                                                              Explorador
                                                            </Button>
                                          <Button onClick={() => setShowAIGenerator(true)} variant="outline" className="border-purple-600 text-purple-600 hover:bg-purple-50 text-xs sm:text-sm h-9">
                                            <Sparkles className="w-4 h-4 mr-2" /> Generar con IA
                                          </Button>
                                          <Button onClick={() => setShowUploader(true)} className="bg-indigo-600 hover:bg-indigo-700 text-xs sm:text-sm h-9">
                                            <Plus className="w-4 h-4 mr-2" /> Subir archivo
                                          </Button>
                                        </div>
                                      )}
              </div>

              <Tabs value={activeSubjectTab} onValueChange={setActiveSubjectTab} className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="quizzes" className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" /> Cuestionarios ({subjectQuizzes.length})
                  </TabsTrigger>
                  <TabsTrigger value="audios" className="flex items-center gap-2">
                    <Music className="w-4 h-4" /> Audios
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="quizzes">
                  {subjectQuizzes.length === 0 ? (
                    <div className="text-center py-12">
                      <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay cuestionarios</h3>
                      <p className="text-gray-500 mb-4">Comienza cargando tu primer cuestionario</p>
                      {isAdmin && (
                        <Button onClick={() => setShowUploader(true)} className="bg-indigo-600 hover:bg-indigo-700">
                          <Plus className="w-4 h-4 mr-2" /> Cargar cuestionario
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {subjectQuizzes.map((quiz) => (
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
                  <AudioList subjectId={selectedSubject.id} isAdmin={isAdmin} />
                </TabsContent>
              </Tabs>
            </motion.div>
          )}



          {/* Upload View */}
          {view === 'list' && showUploader && (
            <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Button onClick={() => setShowUploader(false)} variant="ghost" className="mb-6">
                <ArrowLeft className="w-4 h-4 mr-2" /> Volver
              </Button>
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Cargar nuevo cuestionario</h2>
                <p className="text-gray-600">Sube un archivo JSON con el formato de preguntas</p>
              </div>
              <FileUploader onUploadSuccess={(data) => createQuizMutation.mutate({ ...data, subject_id: selectedSubject.id })} />
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
                            onHome={() => { setSelectedQuiz(null); setView('list'); }}
                          />
                        </motion.div>
                      )}
        </AnimatePresence>

        <BadgeUnlockModal badge={newBadge} open={!!newBadge} onClose={() => setNewBadge(null)} />
        <SessionTimer />
        <TaskProgressFloat />

        {/* Move Quiz Modal */}
        <MoveQuizModal
          open={!!movingQuiz}
          onClose={() => setMovingQuiz(null)}
          quiz={movingQuiz}
          containers={subjects}
          onMove={async (quizId, newSubjectId) => {
            await updateQuizMutation.mutateAsync({ id: quizId, data: { subject_id: newSubjectId } });
            setMovingQuiz(null);
          }}
        />

        {/* Content Manager Modal */}
        {showContentManager && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl">
              <ContentManager
                courses={courses}
                folders={folders}
                subjects={subjects}
                quizzes={quizzes}
                onDeleteCourses={handleBulkDeleteCourses}
                onDeleteFolders={handleBulkDeleteFolders}
                onDeleteSubjects={handleBulkDeleteSubjects}
                onUpdateCourse={handleUpdateCourse}
                onUpdateFolder={handleUpdateFolder}
                onUpdateSubject={handleUpdateSubject}
                onClose={() => setShowContentManager(false)}
              />
            </div>
          </div>
        )}

        {/* Quiz Exporter Modal */}
        {showQuizExporter && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <QuizExporter onClose={() => setShowQuizExporter(false)} />
          </div>
        )}
      </div>
    </div>
    </DragDropContext>
  );
}