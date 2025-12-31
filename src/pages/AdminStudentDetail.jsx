import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, User, Mail, Calendar, Award, BookOpen, 
  TrendingUp, Activity, Code, CheckCircle2, XCircle 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export default function AdminStudentDetail() {
  const [currentUser, setCurrentUser] = useState(null);
  const urlParams = new URLSearchParams(window.location.search);
  const studentId = urlParams.get('id');

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const { data: student } = useQuery({
    queryKey: ['student', studentId],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.find(u => u.id === studentId);
    },
    enabled: !!studentId && currentUser?.role === 'admin'
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['student-enrollments', student?.email],
    queryFn: () => base44.entities.CourseEnrollment.filter({ 
      user_email: student.email,
      status: 'approved' 
    }),
    enabled: !!student
  });

  const { data: attempts = [] } = useQuery({
    queryKey: ['student-attempts', student?.email],
    queryFn: () => base44.entities.QuizAttempt.filter({ 
      user_email: student.email 
    }, '-created_date'),
    enabled: !!student
  });

  const { data: userStats } = useQuery({
    queryKey: ['student-stats', student?.email],
    queryFn: async () => {
      const stats = await base44.entities.UserStats.filter({ 
        user_email: student.email 
      });
      return stats[0] || null;
    },
    enabled: !!student
  });

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Acceso denegado</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  const totalQuestions = attempts.reduce((sum, a) => sum + (a.total_questions || 0), 0);
  const totalCorrect = attempts.reduce((sum, a) => sum + (a.score || 0), 0);
  const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Back button */}
        <Link to={createPageUrl('AdminStudents')}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a estudiantes
          </Button>
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border p-6 mb-6"
        >
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-3xl flex-shrink-0">
              {(student.username || student.full_name || student.email)[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  {student.username || student.full_name || 'Sin nombre'}
                </h1>
                <Badge variant="outline">{student.role}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {student.email}
                </span>
                {student.created_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Registrado {formatDistanceToNow(new Date(student.created_date), { addSuffix: true, locale: es })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="bg-indigo-50 rounded-lg p-3">
              <p className="text-xs text-indigo-600 mb-1">Cursos</p>
              <p className="text-2xl font-bold text-indigo-900">{enrollments.length}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-xs text-green-600 mb-1">Intentos</p>
              <p className="text-2xl font-bold text-green-900">{attempts.length}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <p className="text-xs text-purple-600 mb-1">Precisión</p>
              <p className="text-2xl font-bold text-purple-900">{accuracy}%</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3">
              <p className="text-xs text-amber-600 mb-1">Nivel</p>
              <p className="text-2xl font-bold text-amber-900">{userStats?.level || 1}</p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile">
              <User className="w-4 h-4 mr-2" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="enrollments">
              <BookOpen className="w-4 h-4 mr-2" />
              Inscripciones
            </TabsTrigger>
            <TabsTrigger value="performance">
              <TrendingUp className="w-4 h-4 mr-2" />
              Desempeño
            </TabsTrigger>
            <TabsTrigger value="activity">
              <Activity className="w-4 h-4 mr-2" />
              Actividad
            </TabsTrigger>
            <TabsTrigger value="raw">
              <Code className="w-4 h-4 mr-2" />
              Datos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Información del Perfil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Nombre completo</p>
                    <p className="font-medium">{student.full_name || 'No especificado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Username</p>
                    <p className="font-medium">{student.username || 'No especificado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{student.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Rol</p>
                    <Badge>{student.role}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">ID</p>
                    <p className="font-mono text-xs text-gray-600">{student.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Fecha de registro</p>
                    <p className="font-medium">
                      {student.created_date ? new Date(student.created_date).toLocaleDateString('es-ES') : 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="enrollments" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Cursos Inscritos ({enrollments.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {enrollments.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No hay inscripciones</p>
                ) : (
                  <div className="space-y-3">
                    {enrollments.map((enrollment) => (
                      <div key={enrollment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{enrollment.course_name}</p>
                          <p className="text-xs text-gray-500">
                            Código: {enrollment.access_code}
                          </p>
                        </div>
                        <Badge className="bg-green-100 text-green-800">Aprobado</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Estadísticas Generales</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Total de intentos</span>
                    <span className="font-bold text-2xl">{attempts.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Preguntas respondidas</span>
                    <span className="font-bold text-2xl">{totalQuestions}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      Respuestas correctas
                    </span>
                    <span className="font-bold text-2xl text-green-600">{totalCorrect}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-600" />
                      Respuestas incorrectas
                    </span>
                    <span className="font-bold text-2xl text-red-600">{totalQuestions - totalCorrect}</span>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t">
                    <span className="text-gray-600">Precisión promedio</span>
                    <span className="font-bold text-3xl text-indigo-600">{accuracy}%</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Gamificación</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Nivel actual</span>
                    <span className="font-bold text-2xl text-purple-600">{userStats?.level || 1}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Puntos totales</span>
                    <span className="font-bold text-2xl text-amber-600">{userStats?.total_points || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 flex items-center gap-2">
                      <Award className="w-4 h-4 text-indigo-600" />
                      Insignias
                    </span>
                    <span className="font-bold text-2xl text-indigo-600">
                      {userStats?.badges?.length || 0}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Últimos Intentos ({attempts.slice(0, 10).length})</CardTitle>
              </CardHeader>
              <CardContent>
                {attempts.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No hay actividad registrada</p>
                ) : (
                  <div className="space-y-2">
                    {attempts.slice(0, 10).map((attempt) => (
                      <div key={attempt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{attempt.quiz_title || 'Quiz'}</p>
                          <p className="text-xs text-gray-500">
                            {attempt.created_date ? formatDistanceToNow(new Date(attempt.created_date), { addSuffix: true, locale: es }) : 'Fecha desconocida'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">
                            {attempt.score}/{attempt.total_questions}
                          </p>
                          <p className="text-xs text-gray-500">
                            {Math.round((attempt.score / attempt.total_questions) * 100)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="raw" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Datos Completos (JSON)</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-xs">
                  {JSON.stringify({ student, enrollments, attempts, userStats }, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}