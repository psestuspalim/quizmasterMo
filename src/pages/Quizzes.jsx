import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, BookOpen, FolderPlus, RotateCcw, TrendingUp, Crown, Award, Folder, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
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
import QuizEditor from '../components/quiz/QuizEditor';
import QuestionView from '../components/quiz/QuestionView';
import ResultsView from '../components/quiz/ResultsView';
import SubjectCard from '../components/quiz/SubjectCard';
import SubjectEditor from '../components/quiz/SubjectEditor';
import UsernamePrompt from '../components/quiz/UsernamePrompt';
import FolderCard from '../components/quiz/FolderCard';
import PointsDisplay from '../components/gamification/PointsDisplay';
import BadgeUnlockModal from '../components/gamification/BadgeUnlockModal';
import { calculatePoints, calculateLevel, checkNewBadges, POINTS } from '../components/gamification/GamificationService';
import OnlineUsersPanel from '../components/challenge/OnlineUsersPanel';
import ChallengeNotifications from '../components/challenge/ChallengeNotifications';

export default function QuizzesPage() {
  const [view, setView] = useState('subjects'); // 'subjects', 'list', 'upload', 'quiz', 'results'
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState([]);
  const [correctAnswers, setCorrectAnswers] = useState([]);
  const [markedQuestions, setMarkedQuestions] = useState([]);
  const [showUploader, setShowUploader] = useState(false);
  const [showSubjectDialog, setShowSubjectDialog] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: '', description: '', color: '#6366f1' });
  const [selectedSubjectForUpload, setSelectedSubjectForUpload] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [deckType, setDeckType] = useState('all');
  const [userStats, setUserStats] = useState(null);
  const [newBadge, setNewBadge] = useState(null);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [editingSubject, setEditingSubject] = useState(null);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [newFolder, setNewFolder] = useState({ name: '', description: '', color: '#f59e0b' });
  const [editingFolder, setEditingFolder] = useState(null);

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

  const { data: folders = [] } = useQuery({
    queryKey: ['folders'],
    queryFn: () => base44.entities.Folder.list('-created_date'),
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

  // Cargar estadísticas de gamificación
  const { data: userStatsData } = useQuery({
    queryKey: ['user-stats', currentUser?.email],
    queryFn: async () => {
      const stats = await base44.entities.UserStats.filter({ user_email: currentUser?.email });
      return stats[0] || null;
    },
    enabled: !!currentUser?.email,
  });

  useEffect(() => {
    if (userStatsData) {
      setUserStats(userStatsData);
    }
  }, [userStatsData]);

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

  const updateQuizMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Quiz.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['quizzes']);
      setEditingQuiz(null);
    },
  });

  const deleteSubjectMutation = useMutation({
    mutationFn: (subjectId) => base44.entities.Subject.delete(subjectId),
    onSuccess: () => {
      queryClient.invalidateQueries(['subjects']);
    },
  });

  const updateSubjectMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Subject.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['subjects']);
      setEditingSubject(null);
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: (folderData) => base44.entities.Folder.create(folderData),
    onSuccess: () => {
      queryClient.invalidateQueries(['folders']);
      setShowFolderDialog(false);
      setNewFolder({ name: '', description: '', color: '#f59e0b' });
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (folderId) => base44.entities.Folder.delete(folderId),
    onSuccess: () => {
      queryClient.invalidateQueries(['folders']);
    },
  });

  const updateFolderMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Folder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['folders']);
      setEditingFolder(null);
    },
  });

  const handleCreateFolder = async () => {
    if (newFolder.name.trim()) {
      await createFolderMutation.mutateAsync({
        ...newFolder,
        parent_id: currentFolderId
      });
    }
  };

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
    enabled: currentUser?.role === 'admin',
  });

  const saveAttemptMutation = useMutation({
    mutationFn: (attemptData) => base44.entities.QuizAttempt.create(attemptData),
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

  const updateGamificationStats = async (correctCount, totalCount, isPerfect) => {
    const isFirstQuiz = !userStats;
    const streakDays = userStats?.streak_days || 0;
    const earnedPoints = calculatePoints(correctCount, totalCount, isPerfect, isFirstQuiz, 0);
    
    const newTotalPoints = (userStats?.total_points || 0) + earnedPoints;
    const newLevel = calculateLevel(newTotalPoints);
    const newTotalCorrect = (userStats?.total_correct || 0) + correctCount;
    const newTotalQuestions = (userStats?.total_questions || 0) + totalCount;
    const newPerfectScores = (userStats?.perfect_scores || 0) + (isPerfect ? 1 : 0);

    // Calcular racha
    let newStreakDays = streakDays;
    const lastActivity = userStats?.last_activity ? new Date(userStats.last_activity) : null;
    const today = new Date();
    if (lastActivity) {
      const diffDays = Math.floor((today - lastActivity) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        newStreakDays = streakDays + 1;
      } else if (diffDays > 1) {
        newStreakDays = 1;
      }
    } else {
      newStreakDays = 1;
    }

    const updatedStats = {
      total_points: newTotalPoints,
      level: newLevel,
      total_correct: newTotalCorrect,
      total_questions: newTotalQuestions,
      perfect_scores: newPerfectScores,
      streak_days: newStreakDays,
      last_activity: today.toISOString(),
      badges: userStats?.badges || []
    };

    // Verificar nuevas insignias
    const subjectsAttempted = [...new Set(attempts.map(a => a.subject_id))];
    const newBadges = checkNewBadges(updatedStats, subjectsAttempted, subjects.length);
    
    if (newBadges.length > 0) {
      const badgesWithDate = newBadges.map(b => ({
        ...b,
        earned_at: new Date().toISOString()
      }));
      updatedStats.badges = [...(userStats?.badges || []), ...badgesWithDate];
      setNewBadge(badgesWithDate[0]);
    }

    if (userStats?.id) {
      await updateUserStatsMutation.mutateAsync({ id: userStats.id, data: updatedStats });
    } else {
      await createUserStatsMutation.mutateAsync({
        user_email: currentUser.email,
        username: currentUser.username,
        ...updatedStats
      });
    }
  };

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
          await createSubjectMutation.mutateAsync({
            ...newSubject,
            folder_id: currentFolderId
          });
        }
      };

  const handleUploadSuccess = async (quizData) => {
    await createQuizMutation.mutateAsync({
      ...quizData,
      subject_id: selectedSubject.id
    });
  };

  const [currentAttemptId, setCurrentAttemptId] = useState(null);

  const handleStartQuiz = async (quiz, questionCount, selectedDeck = 'all', quizAttempts = []) => {
    let filteredQuestions = [...quiz.questions];
    
    // Si es modo repaso SRS, filtrar por preguntas que necesitan revisión
    if (selectedDeck === 'review') {
      try {
        const difficulties = await base44.entities.QuestionDifficulty.filter({
          user_email: currentUser.email,
          quiz_id: quiz.id
        });
        
        const now = new Date();
        const dueQuestions = difficulties.filter(d => 
          new Date(d.next_review) <= now
        );
        
        if (dueQuestions.length > 0) {
          // Ordenar por prioridad (más difíciles primero, luego por fecha)
          dueQuestions.sort((a, b) => {
            if (b.difficulty_rating !== a.difficulty_rating) {
              return b.difficulty_rating - a.difficulty_rating;
            }
            return new Date(a.next_review) - new Date(b.next_review);
          });
          
          const dueTexts = dueQuestions.map(d => d.question_text);
          filteredQuestions = quiz.questions.filter(q => 
            dueTexts.includes(q.question)
          );
        } else {
          // Si no hay preguntas pendientes, mostrar las más difíciles
          const hardQuestions = difficulties
            .filter(d => d.difficulty_rating >= 4)
            .map(d => d.question_text);
          
          if (hardQuestions.length > 0) {
            filteredQuestions = quiz.questions.filter(q => 
              hardQuestions.includes(q.question)
            );
          }
        }
      } catch (error) {
        console.error('Error loading SRS data:', error);
      }
    }
    
    if (selectedDeck === 'wrong') {
      // Solo preguntas incorrectas
      const wrongQuestionsMap = new Map();
      quizAttempts.forEach(attempt => {
        attempt.wrong_questions?.forEach(wq => {
          wrongQuestionsMap.set(wq.question, wq);
        });
      });
      filteredQuestions = Array.from(wrongQuestionsMap.values());
    } else if (selectedDeck === 'remaining') {
      // Solo preguntas que nunca se han contestado
      const answeredQuestions = new Set();
      quizAttempts.forEach(attempt => {
        attempt.wrong_questions?.forEach(wq => {
          answeredQuestions.add(wq.question);
        });
      });
      filteredQuestions = quiz.questions.filter(q => !answeredQuestions.has(q.question));
    } else if (selectedDeck === 'correct') {
      // Preguntas contestadas correctamente
      const wrongQuestionsSet = new Set();
      quizAttempts.forEach(attempt => {
        attempt.wrong_questions?.forEach(wq => {
          wrongQuestionsSet.add(wq.question);
        });
      });
      const answeredQuestions = new Set();
      quizAttempts.forEach(attempt => {
        attempt.wrong_questions?.forEach(wq => {
          answeredQuestions.add(wq.question);
        });
      });
      filteredQuestions = quiz.questions.filter(q => answeredQuestions.has(q.question) && !wrongQuestionsSet.has(q.question));
    } else if (selectedDeck === 'marked') {
      // Solo preguntas marcadas
      const markedQuestionsMap = new Map();
      quizAttempts.forEach(attempt => {
        attempt.marked_questions?.forEach(mq => {
          markedQuestionsMap.set(mq.question, mq);
        });
      });
      filteredQuestions = Array.from(markedQuestionsMap.values());
    }
    
    const shuffledQuestions = [...filteredQuestions]
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(questionCount, filteredQuestions.length))
      .map(q => ({
        ...q,
        difficulty: q.difficulty || 'moderado',
        answerOptions: [...(q.answerOptions || [])].sort(() => Math.random() - 0.5)
      }));
    
    const shuffledQuiz = {
      ...quiz,
      questions: shuffledQuestions
    };
    
    // Crear intento inicial
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
    setSelectedQuiz(shuffledQuiz);
    setCurrentQuestionIndex(0);
    setScore(0);
    setWrongAnswers([]);
    setCorrectAnswers([]);
    setMarkedQuestions([]);
    setDeckType(selectedDeck);
    setView('quiz');
  };
  
  const handleMarkForReview = async (question, isMarked) => {
    const newMarked = isMarked 
      ? [...markedQuestions, question]
      : markedQuestions.filter(q => q.question !== question.question);
    
    setMarkedQuestions(newMarked);
    
    await updateAttemptMutation.mutateAsync({
      id: currentAttemptId,
      data: {
        marked_questions: newMarked
      }
    });
  };

  const saveDifficultyRating = async (question, difficultyRating, quizId) => {
    if (!difficultyRating || !currentUser?.email) return;
    
    try {
      const existing = await base44.entities.QuestionDifficulty.filter({
        user_email: currentUser.email,
        quiz_id: quizId,
        question_text: question.question
      });

      // Calcular nuevo intervalo y ease factor usando SM-2
      let easeFactor = 2.5;
      let interval = 1;
      let repetitions = 0;

      if (existing.length > 0) {
        easeFactor = existing[0].ease_factor || 2.5;
        interval = existing[0].interval || 1;
        repetitions = existing[0].repetitions || 0;
      }

      // Ajustar ease factor según la dificultad percibida (1-5)
      // 1=muy fácil -> +0.15, 5=muy difícil -> -0.30
      const adjustment = (3 - difficultyRating) * 0.15;
      easeFactor = Math.max(1.3, easeFactor + adjustment);

      // Calcular nuevo intervalo
      if (difficultyRating <= 2) {
        // Fácil: aumentar intervalo
        repetitions++;
        if (repetitions === 1) interval = 1;
        else if (repetitions === 2) interval = 6;
        else interval = Math.round(interval * easeFactor);
      } else if (difficultyRating === 3) {
        // Normal: mantener progreso
        repetitions++;
        interval = Math.round(interval * 1.2);
      } else {
        // Difícil: resetear o reducir intervalo
        repetitions = 0;
        interval = 1;
      }

      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + interval);

      const data = {
        user_email: currentUser.email,
        quiz_id: quizId,
        question_text: question.question,
        difficulty_rating: difficultyRating,
        ease_factor: easeFactor,
        interval: interval,
        repetitions: repetitions,
        next_review: nextReview.toISOString(),
        last_reviewed: new Date().toISOString()
      };

      if (existing.length > 0) {
        await base44.entities.QuestionDifficulty.update(existing[0].id, data);
      } else {
        await base44.entities.QuestionDifficulty.create(data);
      }
    } catch (error) {
      console.error('Error saving difficulty rating:', error);
    }
  };

  const handleAnswer = async (isCorrect, selectedOption, question) => {
    // Guardar rating de dificultad para SRS
    if (selectedOption.difficultyRating) {
      await saveDifficultyRating(question, selectedOption.difficultyRating, selectedQuiz.id);
    }
    // Si estamos en el deck de incorrectas y se responde correctamente, removerla del deck de incorrectas
    let updatedWrongQuestions = wrongAnswers;
    if (deckType === 'wrong' && isCorrect) {
      // Remover de todas las preguntas incorrectas en la base de datos
      const allAttempts = await base44.entities.QuizAttempt.filter({ 
        quiz_id: selectedQuiz.id,
        user_email: currentUser.email 
      });
      
      for (const attempt of allAttempts) {
        const filteredWrong = (attempt.wrong_questions || []).filter(
          wq => wq.question !== question.question
        );
        if (filteredWrong.length !== (attempt.wrong_questions || []).length) {
          await base44.entities.QuizAttempt.update(attempt.id, {
            wrong_questions: filteredWrong
          });
        }
      }
    }
    
    const newScore = isCorrect ? score + 1 : score;
    const newWrongAnswers = !isCorrect ? [...wrongAnswers, {
      question: question.question,
      selected_answer: selectedOption.text,
      correct_answer: question.answerOptions.find(opt => opt.isCorrect).text,
      answerOptions: question.answerOptions,
      hint: question.hint,
      difficulty: question.difficulty
    }] : wrongAnswers;
    
    const newCorrectAnswers = isCorrect ? [...correctAnswers, {
      question: question.question,
      selected_answer: selectedOption.text,
      answerOptions: question.answerOptions,
      hint: question.hint,
      difficulty: question.difficulty
    }] : correctAnswers;

    if (isCorrect) {
      setScore(newScore);
      setCorrectAnswers(newCorrectAnswers);
    } else {
      setWrongAnswers(newWrongAnswers);
      updatedWrongQuestions = newWrongAnswers;
    }

    const isLastQuestion = currentQuestionIndex >= selectedQuiz.questions.length - 1;
    
    // Actualizar intento después de cada respuesta
    await updateAttemptMutation.mutateAsync({
      id: currentAttemptId,
      data: {
        score: newScore,
        answered_questions: currentQuestionIndex + 1,
        wrong_questions: updatedWrongQuestions,
        is_completed: isLastQuestion,
        completed_at: isLastQuestion ? new Date().toISOString() : undefined
      }
    });

    if (!isLastQuestion) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Actualizar gamificación al completar
      const finalScore = newScore;
      const finalTotal = selectedQuiz.questions.length;
      const isPerfect = finalScore === finalTotal;
      await updateGamificationStats(finalScore, finalTotal, isPerfect);
      
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
    
    // Crear nuevo intento
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
    
    // Crear nuevo intento
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
    // Marcar como parcial si no está completo
    if (currentAttemptId) {
      await updateAttemptMutation.mutateAsync({
        id: currentAttemptId,
        data: {
          is_completed: false
        }
      });
      queryClient.invalidateQueries(['attempts']);
    }
    setView('results');
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

  const isAdmin = currentUser?.role === 'admin';

  // Filtrar materias según visibilidad
      const visibleSubjects = subjects.filter(subject => {
        if (isAdmin) return true;
        if (subject.is_hidden) return false;
        if (subject.visibility === 'specific') {
          return subject.allowed_users?.includes(currentUser?.email);
        }
        return true;
      });

      // Filtrar carpetas y materias según la carpeta actual
      const currentFolders = folders.filter(f => f.parent_id === currentFolderId);
      const currentSubjects = visibleSubjects.filter(s => s.folder_id === currentFolderId);

      // Obtener la carpeta actual para mostrar breadcrumb
      const currentFolder = currentFolderId ? folders.find(f => f.id === currentFolderId) : null;

      // Función para contar elementos en una carpeta
      const getFolderItemCount = (folderId) => {
        const subFolders = folders.filter(f => f.parent_id === folderId).length;
        const subSubjects = visibleSubjects.filter(s => s.folder_id === folderId).length;
        return subFolders + subSubjects;
      };

  const subjectQuizzes = selectedSubject 
    ? quizzes.filter(q => q.subject_id === selectedSubject.id && (isAdmin || !q.is_hidden))
    : [];

  const getSubjectStats = (subjectId) => {
    const subjectQuizzes = quizzes.filter(q => q.subject_id === subjectId);
    const subjectQuizIds = subjectQuizzes.map(q => q.id);
    const subjectAttempts = attempts.filter(a => subjectQuizIds.includes(a.quiz_id));
    
    if (subjectAttempts.length === 0) {
      return { totalCorrect: 0, totalWrong: 0, totalAnswered: 0 };
    }
    
    // Contar preguntas únicas correctas e incorrectas
    const wrongQuestions = new Set();
    const correctQuestions = new Set();
    
    subjectAttempts.forEach(attempt => {
      attempt.wrong_questions?.forEach(wq => {
        wrongQuestions.add(wq.question);
      });
    });
    
    // Las correctas son preguntas que fueron contestadas pero no están en wrong
    subjectQuizzes.forEach(quiz => {
      quiz.questions?.forEach(q => {
        if (!wrongQuestions.has(q.question)) {
          // Verificar si fue contestada en algún intento
          const wasAnswered = subjectAttempts.some(attempt => 
            attempt.quiz_id === quiz.id && attempt.answered_questions > 0
          );
          if (wasAnswered) {
            correctQuestions.add(q.question);
          }
        }
      });
    });
    
    const totalCorrect = correctQuestions.size;
    const totalWrong = wrongQuestions.size;
    const totalAnswered = totalCorrect + totalWrong;
    
    return { totalCorrect, totalWrong, totalAnswered };
  };

  // Mostrar prompt de username si no tiene
  if (!currentUser || !currentUser.username) {
    return <UsernamePrompt onSubmit={handleUsernameSubmit} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <AnimatePresence mode="wait">
          {/* Subject Editor View */}
                      {editingSubject && (
                        <motion.div
                          key="subject-editor"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                        >
                          <Button
                            onClick={() => setEditingSubject(null)}
                            variant="ghost"
                            className="mb-6"
                          >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Volver
                          </Button>
                          <SubjectEditor
                            subject={editingSubject}
                            users={allUsers}
                            onSave={(data) => updateSubjectMutation.mutate({ id: editingSubject.id, data })}
                            onCancel={() => setEditingSubject(null)}
                          />
                        </motion.div>
                      )}

                      {/* Subjects View */}
                      {view === 'subjects' && !editingSubject && (
            <motion.div
              key="subjects"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Challenge Notifications */}
                              <ChallengeNotifications 
                                currentUser={currentUser}
                                onStartChallenge={(challenge) => {
                                  window.location.href = `/ChallengePlay?id=${challenge.id}`;
                                }}
                              />

                              {/* Points Display and Online Users */}
                              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                                {userStats && (
                                  <div className="flex-1 max-w-md">
                                    <PointsDisplay 
                                      points={userStats.total_points || 0} 
                                      level={userStats.level || 1} 
                                    />
                                  </div>
                                )}
                                <div className="w-full sm:w-64">
                                  <OnlineUsersPanel 
                                    currentUser={currentUser}
                                    quizzes={quizzes}
                                    subjects={subjects}
                                  />
                                </div>
                              </div>

              <div className="mb-4 sm:mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4">
                  <div>
                    <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">
                      Materias
                    </h1>
                    <p className="text-sm sm:text-base text-gray-600">
                      Selecciona una materia para ver sus cuestionarios
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    <Link to={createPageUrl('Leaderboard')}>
                      <Button variant="outline" className="border-yellow-500 text-yellow-600 hover:bg-yellow-50 text-xs sm:text-sm h-8 sm:h-10 px-2 sm:px-4">
                        <Crown className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                        <span className="hidden sm:inline">Ranking</span>
                      </Button>
                    </Link>
                    <Link to={createPageUrl('Badges')}>
                      <Button variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50 text-xs sm:text-sm h-8 sm:h-10 px-2 sm:px-4">
                        <Award className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                        <span className="hidden sm:inline">Insignias</span>
                      </Button>
                    </Link>
                    <Link to={createPageUrl('Progress')}>
                      <Button variant="outline" className="border-indigo-600 text-indigo-600 hover:bg-indigo-50 text-xs sm:text-sm h-8 sm:h-10 px-2 sm:px-4">
                        <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                        <span className="hidden sm:inline">Progreso</span>
                      </Button>
                    </Link>
                    <Dialog open={showSubjectDialog} onOpenChange={setShowSubjectDialog}>
                    <DialogTrigger asChild>
                      <Button className="bg-indigo-600 hover:bg-indigo-700 text-xs sm:text-sm h-8 sm:h-10 px-2 sm:px-4">
                        <FolderPlus className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                        <span className="hidden sm:inline">Nueva materia</span>
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
              </div>

              {visibleSubjects.length === 0 ? (
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                                      {visibleSubjects.map((subject) => (
                                        <SubjectCard
                                          key={subject.id}
                                          subject={subject}
                                          quizCount={quizzes.filter(q => q.subject_id === subject.id).length}
                                          stats={getSubjectStats(subject.id)}
                                          isAdmin={isAdmin}
                                          onDelete={(id) => deleteSubjectMutation.mutate(id)}
                                          onEdit={(subject) => setEditingSubject(subject)}
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

          {/* Quiz Editor View */}
                      {editingQuiz && (
                        <motion.div
                          key="editor"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                        >
                          <Button
                            onClick={() => setEditingQuiz(null)}
                            variant="ghost"
                            className="mb-6"
                          >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Volver
                          </Button>
                          <QuizEditor
                            quiz={editingQuiz}
                            onSave={(updatedQuiz) => updateQuizMutation.mutate({ id: editingQuiz.id, data: updatedQuiz })}
                            onCancel={() => setEditingQuiz(null)}
                          />
                        </motion.div>
                      )}

                      {/* List View */}
                      {view === 'list' && !showUploader && !editingQuiz && selectedSubject && (
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

              <div className="mb-4 sm:mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h1 className="text-xl sm:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">
                      {selectedSubject.name}
                    </h1>
                    <p className="text-sm sm:text-base text-gray-600">
                      {selectedSubject.description || 'Cuestionarios de esta materia'}
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowUploader(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-xs sm:text-sm h-9 sm:h-10"
                  >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                  {subjectQuizzes.map((quiz) => (
                    <QuizCard
                                              key={quiz.id}
                                              quiz={quiz}
                                              attempts={attempts}
                                              onStart={handleStartQuiz}
                                              onDelete={(id) => deleteQuizMutation.mutate(id)}
                                              onEdit={(quiz) => setEditingQuiz(quiz)}
                                              isAdmin={isAdmin}
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
                onClick={handleExitQuiz}
                variant="ghost"
                className="mb-6"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Salir del cuestionario
              </Button>

              <QuestionView
                key={currentQuestionIndex}
                question={selectedQuiz.questions[currentQuestionIndex]}
                questionNumber={currentQuestionIndex + 1}
                totalQuestions={selectedQuiz.questions.length}
                correctAnswers={score}
                wrongAnswers={wrongAnswers.length}
                onAnswer={handleAnswer}
                onBack={currentQuestionIndex > 0 ? () => setCurrentQuestionIndex(currentQuestionIndex - 1) : null}
                onMarkForReview={handleMarkForReview}
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
                correctAnswers={correctAnswers}
                answeredQuestions={score + wrongAnswers.length}
                isPartial={score + wrongAnswers.length < selectedQuiz.questions.length}
                onRetry={handleRetry}
                onRetryWrong={handleRetryWrongQuestions}
                onHome={handleHome}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Badge Unlock Modal */}
        <BadgeUnlockModal 
          badge={newBadge} 
          open={!!newBadge} 
          onClose={() => setNewBadge(null)} 
        />
      </div>
    </div>
  );
}