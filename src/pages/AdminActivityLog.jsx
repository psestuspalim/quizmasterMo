import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Clock, Trophy, BookOpen, TrendingUp, Download } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import AdminShell from '../components/admin/AdminShell';

export default function AdminActivityLog() {
  const [selectedDateKey, setSelectedDateKey] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [currentUser, setCurrentUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: attempts = [] } = useQuery({
    queryKey: ['attempts-all'],
    queryFn: () => base44.entities.QuizAttempt.list('-created_date', 1000),
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions-all'],
    queryFn: () => base44.entities.QuizSession.list('-created_date', 1000),
  });

  const { data: quizzes = [] } = useQuery({
    queryKey: ['quizzes'],
    queryFn: () => base44.entities.Quiz.list(),
  });

  // Agrupar actividad por día
  const activityByDate = React.useMemo(() => {
    const grouped = {};
    
    attempts.forEach(attempt => {
      const date = format(new Date(attempt.created_date), 'yyyy-MM-dd');
      if (!grouped[date]) {
        grouped[date] = {
          date,
          users: new Set(),
          attempts: [],
          sessions: [],
          totalTime: 0,
          totalQuestions: 0,
          totalCorrect: 0
        };
      }
      grouped[date].users.add(attempt.user_email);
      grouped[date].attempts.push(attempt);
      grouped[date].totalQuestions += attempt.total_questions || 0;
      grouped[date].totalCorrect += attempt.score || 0;
      
      // Calcular tiempo total de response_times
      if (attempt.response_times && Array.isArray(attempt.response_times)) {
        grouped[date].totalTime += attempt.response_times.reduce((sum, t) => sum + t, 0);
      }
    });

    sessions.forEach(session => {
      const date = format(new Date(session.created_date), 'yyyy-MM-dd');
      if (grouped[date]) {
        grouped[date].sessions.push(session);
      }
    });

    // Convertir Set a array
    Object.keys(grouped).forEach(date => {
      grouped[date].users = Array.from(grouped[date].users);
    });

    return grouped;
  }, [attempts, sessions]);

  // Obtener actividad del día seleccionado
  const dayActivity = activityByDate[selectedDateKey] || {
    users: [],
    attempts: [],
    sessions: [],
    totalTime: 0,
    totalQuestions: 0,
    totalCorrect: 0
  };

  // Agrupar por usuario
  const userActivity = React.useMemo(() => {
    const grouped = {};
    
    dayActivity.attempts.forEach(attempt => {
      if (!grouped[attempt.user_email]) {
        grouped[attempt.user_email] = {
          email: attempt.user_email,
          username: attempt.username,
          attempts: [],
          totalTime: 0,
          totalScore: 0,
          totalQuestions: 0
        };
      }
      grouped[attempt.user_email].attempts.push(attempt);
      grouped[attempt.user_email].totalScore += attempt.score || 0;
      grouped[attempt.user_email].totalQuestions += attempt.total_questions || 0;
      
      if (attempt.response_times && Array.isArray(attempt.response_times)) {
        grouped[attempt.user_email].totalTime += attempt.response_times.reduce((sum, t) => sum + t, 0);
      }
    });

    return Object.values(grouped);
  }, [dayActivity.attempts]);

  const formatTime = (seconds) => {
    if (!seconds) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getQuizTitle = (quizId) => {
    const quiz = quizzes.find(q => q.id === quizId);
    return quiz?.title || quiz?.t || 'Quiz sin título';
  };

  const exportToCSV = () => {
    const rows = [
      ['Fecha', 'Usuario', 'Email', 'Quiz', 'Calificación', 'Total Preguntas', 'Porcentaje', 'Tiempo (seg)', 'Hora']
    ];

    dayActivity.attempts.forEach(attempt => {
      const totalTime = attempt.response_times?.reduce((sum, t) => sum + t, 0) || 0;
      const percentage = attempt.total_questions > 0 
        ? Math.round((attempt.score / attempt.total_questions) * 100) 
        : 0;
      
      rows.push([
        format(new Date(attempt.created_date), 'yyyy-MM-dd'),
        attempt.username || 'Sin nombre',
        attempt.user_email,
        getQuizTitle(attempt.quiz_id),
        attempt.score,
        attempt.total_questions,
        `${percentage}%`,
        totalTime,
        format(new Date(attempt.created_date), 'HH:mm:ss')
      ]);
    });

    const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `actividad_${selectedDateKey}.csv`;
    link.click();
  };

  const allDates = Object.keys(activityByDate).sort().reverse();

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acceso Denegado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Solo los administradores pueden ver esta página.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AdminShell currentPage="activity-log">
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Registro de Actividad</h1>
              <p className="text-gray-600">Seguimiento diario de usuarios y rendimiento</p>
            </div>
            {dayActivity.attempts.length > 0 && (
              <Button onClick={exportToCSV} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
            )}
          </div>

          {/* Selector de fecha */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Seleccionar Día
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {allDates.slice(0, 30).map(dateKey => {
                  const isSelected = dateKey === selectedDateKey;
                  const dateObj = new Date(dateKey + 'T12:00:00');
                  const activity = activityByDate[dateKey];
                  
                  return (
                    <button
                      key={dateKey}
                      onClick={() => setSelectedDateKey(dateKey)}
                      className={`flex flex-col items-start p-3 h-auto rounded-md border transition-colors ${
                        isSelected 
                          ? 'bg-primary text-primary-foreground border-primary' 
                          : 'bg-background border-input hover:bg-accent hover:text-accent-foreground'
                      }`}
                    >
                      <span className="font-semibold pointer-events-none">
                        {format(dateObj, 'd MMM', { locale: es })}
                      </span>
                      <span className="text-xs opacity-70 pointer-events-none">
                        {activity.users.length} usuarios
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Resumen del día */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Usuarios</p>
                    <p className="text-2xl font-bold">{dayActivity.users.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <BookOpen className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Intentos</p>
                    <p className="text-2xl font-bold">{dayActivity.attempts.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Clock className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tiempo Total</p>
                    <p className="text-2xl font-bold">{formatTime(dayActivity.totalTime)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-100 rounded-lg">
                    <Trophy className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Promedio</p>
                    <p className="text-2xl font-bold">
                      {dayActivity.totalQuestions > 0 
                        ? Math.round((dayActivity.totalCorrect / dayActivity.totalQuestions) * 100) 
                        : 0}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actividad por usuario */}
          {userActivity.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Detalle de Actividad - {format(new Date(selectedDateKey + 'T12:00:00'), "d 'de' MMMM, yyyy", { locale: es })}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {userActivity.map((user) => {
                  const percentage = user.totalQuestions > 0 
                    ? Math.round((user.totalScore / user.totalQuestions) * 100) 
                    : 0;

                  return (
                    <div key={user.email} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <p className="font-semibold">{user.username || 'Sin nombre'}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Tiempo</p>
                            <p className="font-semibold">{formatTime(user.totalTime)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Rendimiento</p>
                            <Badge variant={percentage >= 70 ? "default" : "destructive"}>
                              {percentage}%
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {user.attempts.map((attempt, idx) => {
                          const attemptPercentage = attempt.total_questions > 0 
                            ? Math.round((attempt.score / attempt.total_questions) * 100) 
                            : 0;
                          const attemptTime = attempt.response_times?.reduce((sum, t) => sum + t, 0) || 0;

                          return (
                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <BookOpen className="w-4 h-4 text-gray-400" />
                                <div>
                                  <p className="font-medium text-sm">{getQuizTitle(attempt.quiz_id)}</p>
                                  <p className="text-xs text-gray-500">
                                    {format(new Date(attempt.created_date), 'HH:mm', { locale: es })} · 
                                    {attempt.score}/{attempt.total_questions} correctas
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <p className="text-xs text-gray-500">Tiempo</p>
                                  <p className="text-sm font-medium">{formatTime(attemptTime)}</p>
                                </div>
                                <Badge variant={attemptPercentage >= 70 ? "default" : "destructive"}>
                                  {attemptPercentage}%
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Sin actividad</h3>
                <p className="text-gray-500">No hay registro de actividad para este día</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AdminShell>
  );
}