import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, TrendingUp, AlertCircle, FileText, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import MathText from '../components/quiz/MathText';

export default function AdminProgress() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  const { data: attempts = [] } = useQuery({
    queryKey: ['quiz-attempts'],
    queryFn: () => base44.entities.QuizAttempt.list('-created_date', 1000),
  });

  const { data: quizzes = [] } = useQuery({
    queryKey: ['quizzes'],
    queryFn: () => base44.entities.Quiz.list(),
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => base44.entities.Subject.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list('-created_date', 1000),
  });

  // Crear objeto con todos los usuarios
  const studentStats = users.reduce((acc, user) => {
    acc[user.email] = {
      email: user.email,
      username: user.username || user.full_name || 'Sin nombre',
      attempts: [],
      totalQuizzes: 0,
      totalCorrect: 0,
      totalQuestions: 0,
    };
    return acc;
  }, {});

  // Agregar intentos a los usuarios
  attempts.forEach(attempt => {
    if (studentStats[attempt.user_email]) {
      studentStats[attempt.user_email].attempts.push(attempt);
      studentStats[attempt.user_email].totalQuizzes += 1;
      studentStats[attempt.user_email].totalCorrect += attempt.score;
      studentStats[attempt.user_email].totalQuestions += attempt.total_questions;
    }
  });

  const students = Object.values(studentStats).filter(student =>
    student.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getQuizTitle = (quizId) => {
    const quiz = quizzes.find(q => q.id === quizId);
    return quiz?.title || 'Cuestionario eliminado';
  };

  const getSubjectName = (subjectId) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject?.name || 'Sin materia';
  };

  // Calcular estadísticas por quiz para el estudiante seleccionado
  const getQuizStats = (student) => {
    const quizStats = {};
    student.attempts.forEach(attempt => {
      if (!quizStats[attempt.quiz_id]) {
        quizStats[attempt.quiz_id] = {
          quizId: attempt.quiz_id,
          quizTitle: getQuizTitle(attempt.quiz_id),
          subjectId: attempt.subject_id,
          attempts: [],
          bestScore: 0,
          avgScore: 0,
          totalAttempts: 0
        };
      }
      const percentage = (attempt.score / attempt.total_questions) * 100;
      quizStats[attempt.quiz_id].attempts.push(attempt);
      quizStats[attempt.quiz_id].bestScore = Math.max(quizStats[attempt.quiz_id].bestScore, percentage);
      quizStats[attempt.quiz_id].totalAttempts += 1;
    });

    // Calcular promedio por quiz
    Object.values(quizStats).forEach(stat => {
      const total = stat.attempts.reduce((sum, att) => sum + (att.score / att.total_questions) * 100, 0);
      stat.avgScore = total / stat.attempts.length;
    });

    return Object.values(quizStats);
  };

  // Calcular estadísticas por tema
  const getSubjectStats = (student) => {
    const subjectStats = {};
    student.attempts.forEach(attempt => {
      const subjectId = attempt.subject_id || 'sin-materia';
      if (!subjectStats[subjectId]) {
        subjectStats[subjectId] = {
          subjectId,
          subjectName: getSubjectName(subjectId),
          totalCorrect: 0,
          totalQuestions: 0,
          attempts: []
        };
      }
      subjectStats[subjectId].totalCorrect += attempt.score;
      subjectStats[subjectId].totalQuestions += attempt.total_questions;
      subjectStats[subjectId].attempts.push(attempt);
    });

    return Object.values(subjectStats).map(stat => ({
      ...stat,
      avgPercentage: (stat.totalCorrect / stat.totalQuestions) * 100
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-2">
            Progreso de Estudiantes
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Panel administrativo para seguimiento de rendimiento
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Lista de estudiantes */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Estudiantes</CardTitle>
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar estudiante..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent className="max-h-[400px] sm:max-h-[600px] overflow-y-auto space-y-2 p-3 sm:p-6">
                {students.map((student) => {
                  const avgScore = student.totalQuestions > 0
                    ? Math.round((student.totalCorrect / student.totalQuestions) * 100)
                    : 0;

                  return (
                    <button
                      key={student.email}
                      onClick={() => setSelectedStudent(student)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        selectedStudent?.email === student.email
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-semibold text-gray-900">
                        {student.username || 'Sin nombre'}
                      </div>
                      <div className="text-sm text-gray-500 mb-2">
                        {student.email}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">
                          {student.totalQuizzes} intentos
                        </span>
                        <Badge
                          className={
                            avgScore >= 70 ? 'bg-green-100 text-green-800' :
                            avgScore >= 50 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }
                        >
                          {avgScore}%
                        </Badge>
                      </div>
                    </button>
                  );
                })}
                {students.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No se encontraron estudiantes
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detalles del estudiante */}
          <div className="lg:col-span-2">
            {selectedStudent ? (
              <div className="space-y-6">
                {/* Resumen */}
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {selectedStudent.username || 'Sin nombre'}
                    </CardTitle>
                    <p className="text-sm text-gray-500">{selectedStudent.email}</p>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6">
                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                      <div className="text-center">
                        <div className="text-xl sm:text-3xl font-bold text-indigo-600">
                          {selectedStudent.totalQuizzes}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500">Intentos</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl sm:text-3xl font-bold text-green-600">
                          {selectedStudent.totalCorrect}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500">Correctas</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl sm:text-3xl font-bold text-gray-900">
                          {Math.round((selectedStudent.totalCorrect / selectedStudent.totalQuestions) * 100)}%
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500">Promedio</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Progreso por Tema */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Progreso por Tema</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {getSubjectStats(selectedStudent).map((subjectStat) => (
                        <div key={subjectStat.subjectId} className="border rounded-lg p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                            <h4 className="font-semibold text-gray-900 text-sm sm:text-base">{subjectStat.subjectName}</h4>
                            <Badge className={
                              subjectStat.avgPercentage >= 70 ? 'bg-green-100 text-green-800' :
                              subjectStat.avgPercentage >= 50 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }>
                              {Math.round(subjectStat.avgPercentage)}%
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600">
                            {subjectStat.totalCorrect}/{subjectStat.totalQuestions} correctas • {subjectStat.attempts.length} intentos
                          </div>
                          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-600 transition-all"
                              style={{ width: `${subjectStat.avgPercentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Progreso por Quiz */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Progreso por Cuestionario</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {getQuizStats(selectedStudent).map((quizStat) => (
                        <div key={quizStat.quizId} className="border rounded-lg p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                            <h4 className="font-medium text-gray-900 text-sm sm:text-base">{quizStat.quizTitle}</h4>
                            <div className="flex gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                Mejor: {Math.round(quizStat.bestScore)}%
                              </Badge>
                              <Badge className={`text-xs ${
                                quizStat.avgScore >= 70 ? 'bg-green-100 text-green-800' :
                                quizStat.avgScore >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                Prom: {Math.round(quizStat.avgScore)}%
                              </Badge>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">
                            {quizStat.totalAttempts} {quizStat.totalAttempts === 1 ? 'intento' : 'intentos'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Historial de intentos */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Historial de Intentos</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 max-h-[400px] sm:max-h-[500px] overflow-y-auto p-3 sm:p-6">
                    {selectedStudent.attempts.map((attempt) => {
                      const percentage = Math.round((attempt.score / attempt.total_questions) * 100);
                      const isPartial = !attempt.is_completed;
                      
                      return (
                        <div key={attempt.id} className="border rounded-lg p-3 sm:p-4">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-semibold text-gray-900 text-sm sm:text-base break-words">
                                  {getQuizTitle(attempt.quiz_id)}
                                </h4>
                                {isPartial && (
                                  <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                                    Parcial
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 mt-1">
                                <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                                {format(new Date(attempt.completed_at || attempt.created_date), 'dd/MM/yyyy HH:mm')}
                              </div>
                            </div>
                            <div className="text-left sm:text-right flex-shrink-0">
                              <Badge
                                className={`text-xs ${
                                  percentage >= 70 ? 'bg-green-100 text-green-800' :
                                  percentage >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}
                              >
                                {attempt.score}/{attempt.total_questions} ({percentage}%)
                              </Badge>
                              {isPartial && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {attempt.answered_questions || 0} de {attempt.total_questions} respondidas
                                </div>
                              )}
                            </div>
                          </div>

                          {attempt.wrong_questions?.length > 0 && (
                            <div className="mt-3 sm:mt-4 border-t pt-3 sm:pt-4">
                              <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-red-600 mb-2 sm:mb-3">
                                <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                                Preguntas incorrectas ({attempt.wrong_questions.length})
                              </div>
                              <div className="space-y-2 sm:space-y-3">
                                {attempt.wrong_questions.map((wq, idx) => (
                                  <div key={idx} className="bg-red-50 rounded-lg p-2 sm:p-3 text-xs sm:text-sm">
                                    <p className="font-medium text-gray-900 mb-2 break-words">
                                      <MathText text={wq.question} />
                                    </p>
                                    <div className="space-y-1">
                                      <p className="text-red-700 break-words">
                                        ❌ Respondió: <MathText text={wq.selected_answer} />
                                      </p>
                                      <p className="text-green-700 break-words">
                                        ✓ Correcta: <MathText text={wq.correct_answer} />
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="h-full">
                <CardContent className="flex items-center justify-center h-full min-h-[400px]">
                  <div className="text-center text-gray-500">
                    <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p>Selecciona un estudiante para ver sus detalles</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}