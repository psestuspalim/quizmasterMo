import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Target, AlertCircle, BookOpen, Award, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

import OverviewStats from '../components/progress/OverviewStats';
import SubjectProgress from '../components/progress/SubjectProgress';
import TrendAnalysis from '../components/progress/TrendAnalysis';
import WeakPoints from '../components/progress/WeakPoints';
import Recommendations from '../components/progress/Recommendations';

export default function ProgressPage() {
  const [currentUser, setCurrentUser] = useState(null);

  React.useEffect(() => {
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
    queryFn: () => base44.entities.QuizAttempt.filter(
      { user_email: currentUser?.email }, 
      '-created_date',
      1000
    ),
    enabled: !!currentUser?.email,
  });

  const analytics = useMemo(() => {
    if (!attempts.length) return null;

    // Estadísticas generales
    const totalAttempts = attempts.length;
    const completedAttempts = attempts.filter(a => a.is_completed);
    const totalQuestions = attempts.reduce((sum, a) => sum + a.total_questions, 0);
    const totalCorrect = attempts.reduce((sum, a) => sum + a.score, 0);
    const averageScore = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

    // Progreso por materia
    const subjectStats = subjects.map(subject => {
      const subjectQuizIds = quizzes.filter(q => q.subject_id === subject.id).map(q => q.id);
      const subjectAttempts = attempts.filter(a => subjectQuizIds.includes(a.quiz_id));
      
      const total = subjectAttempts.reduce((sum, a) => sum + a.total_questions, 0);
      const correct = subjectAttempts.reduce((sum, a) => sum + a.score, 0);
      const wrong = total - correct;
      
      return {
        ...subject,
        attempts: subjectAttempts.length,
        totalQuestions: total,
        correct,
        wrong,
        accuracy: total > 0 ? (correct / total) * 100 : 0
      };
    }).filter(s => s.attempts > 0);

    // Progreso por quiz
    const quizStats = quizzes.map(quiz => {
      const quizAttempts = attempts.filter(a => a.quiz_id === quiz.id);
      if (quizAttempts.length === 0) return null;
      
      const scores = quizAttempts.map(a => 
        a.total_questions > 0 ? (a.score / a.total_questions) * 100 : 0
      );
      const bestScore = Math.max(...scores);
      const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      
      return {
        ...quiz,
        attempts: quizAttempts.length,
        bestScore,
        avgScore,
        lastAttempt: quizAttempts[0]
      };
    }).filter(Boolean);

    // Tendencias temporales
    const last30Days = completedAttempts
      .filter(a => {
        const date = new Date(a.completed_at || a.created_date);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 30;
      })
      .sort((a, b) => new Date(a.completed_at || a.created_date) - new Date(b.completed_at || b.created_date));

    // Puntos débiles
    const allWrongQuestions = attempts.flatMap(a => a.wrong_questions || []);
    const wrongQuestionsMap = new Map();
    allWrongQuestions.forEach(wq => {
      const count = wrongQuestionsMap.get(wq.question) || 0;
      wrongQuestionsMap.set(wq.question, count + 1);
    });
    
    const weakPoints = Array.from(wrongQuestionsMap.entries())
      .map(([question, count]) => ({
        question,
        errorCount: count,
        details: allWrongQuestions.find(wq => wq.question === question)
      }))
      .sort((a, b) => b.errorCount - a.errorCount)
      .slice(0, 10);

    return {
      totalAttempts,
      totalQuestions,
      totalCorrect,
      averageScore,
      subjectStats,
      quizStats,
      last30Days,
      weakPoints
    };
  }, [attempts, subjects, quizzes]);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!attempts.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="container mx-auto px-4 py-8">
          <Link to={createPageUrl('Quizzes')}>
            <Button variant="ghost" className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a cuestionarios
            </Button>
          </Link>
          
          <div className="text-center py-16">
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center">
                <TrendingUp className="w-12 h-12 text-gray-400" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Sin datos de progreso
            </h3>
            <p className="text-gray-500 mb-6">
              Completa algunos cuestionarios para ver tu progreso
            </p>
            <Link to={createPageUrl('Quizzes')}>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <BookOpen className="w-4 h-4 mr-2" />
                Ir a cuestionarios
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        <Link to={createPageUrl('Quizzes')}>
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a cuestionarios
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Mi Progreso
          </h1>
          <p className="text-gray-600">
            Análisis detallado de tu desempeño y recomendaciones personalizadas
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto">
            <TabsTrigger value="overview">
              <Award className="w-4 h-4 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="subjects">
              <BookOpen className="w-4 h-4 mr-2" />
              Por Materia
            </TabsTrigger>
            <TabsTrigger value="trends">
              <TrendingUp className="w-4 h-4 mr-2" />
              Tendencias
            </TabsTrigger>
            <TabsTrigger value="weak">
              <AlertCircle className="w-4 h-4 mr-2" />
              Puntos Débiles
            </TabsTrigger>
            <TabsTrigger value="recommendations">
              <Target className="w-4 h-4 mr-2" />
              Recomendaciones
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <OverviewStats analytics={analytics} />
          </TabsContent>

          <TabsContent value="subjects" className="space-y-6">
            <SubjectProgress 
              subjectStats={analytics.subjectStats}
              quizzes={quizzes}
              attempts={attempts}
            />
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <TrendAnalysis 
              last30Days={analytics.last30Days}
              attempts={attempts}
            />
          </TabsContent>

          <TabsContent value="weak" className="space-y-6">
            <WeakPoints weakPoints={analytics.weakPoints} />
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-6">
            <Recommendations 
              analytics={analytics}
              quizzes={quizzes}
              subjects={subjects}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}