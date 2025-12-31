import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, Users, FileJson, Activity, TrendingUp, 
  Settings, Shield, BarChart3
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import AdminDashboardCard from '../components/admin/AdminDashboardCard';
import { motion } from 'framer-motion';

export default function AdminHome() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list('order')
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
    enabled: currentUser?.role === 'admin'
  });

  const { data: quizzes = [] } = useQuery({
    queryKey: ['quizzes'],
    queryFn: () => base44.entities.Quiz.list('-created_date', 100)
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['all-enrollments'],
    queryFn: () => base44.entities.CourseEnrollment.filter({ status: 'pending' }),
    enabled: currentUser?.role === 'admin'
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['live-sessions'],
    queryFn: async () => {
      const allSessions = await base44.entities.QuizSession.filter({ is_active: true });
      return allSessions.slice(0, 5);
    },
    enabled: currentUser?.role === 'admin',
    refetchInterval: 5000
  });

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Acceso denegado</p>
      </div>
    );
  }

  const recentCourses = courses.slice(0, 5).map(c => ({
    primary: c.name,
    secondary: c.description,
    badge: `${c.icon || '📚'}`
  }));

  const recentStudents = allUsers
    .filter(u => u.role === 'user')
    .slice(0, 5)
    .map(u => ({
      primary: u.username || u.full_name || u.email,
      secondary: u.email,
      badge: u.role
    }));

  const jsonStats = quizzes.slice(0, 5).map(q => ({
    primary: q.title,
    secondary: `${q.total_questions || q.questions?.length || 0} preguntas`,
    badge: q.subject_id ? '📚' : '📄'
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Panel de Administrador</h1>
              <p className="text-gray-600">Bienvenido, {currentUser.full_name || currentUser.email}</p>
            </div>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm border p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{courses.length}</p>
                <p className="text-xs text-gray-500">Cursos</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {allUsers.filter(u => u.role === 'user').length}
                </p>
                <p className="text-xs text-gray-500">Estudiantes</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm border p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <FileJson className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{quizzes.length}</p>
                <p className="text-xs text-gray-500">Quizzes</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-sm border p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <Activity className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{sessions.length}</p>
                <p className="text-xs text-gray-500">En vivo</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Main Dashboard Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <AdminDashboardCard
              title="Cursos"
              description="Gestiona cursos y materias"
              count={courses.length}
              items={recentCourses}
              primaryActionLabel="Gestionar cursos"
              primaryActionTo="CourseManagement"
              icon={BookOpen}
              iconColor="text-blue-600"
              countColor="text-blue-600"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <AdminDashboardCard
              title="Estudiantes"
              description="Ver perfil y progreso"
              count={allUsers.filter(u => u.role === 'user').length}
              items={recentStudents}
              primaryActionLabel="Ver estudiantes"
              primaryActionTo="AdminStudents"
              icon={Users}
              iconColor="text-green-600"
              countColor="text-green-600"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <AdminDashboardCard
              title="JSON Manager"
              description="Gestionar archivos JSON"
              count={quizzes.length}
              items={jsonStats}
              primaryActionLabel="Administrar JSON"
              primaryActionTo="AdminJsonManager"
              icon={FileJson}
              iconColor="text-purple-600"
              countColor="text-purple-600"
            />
          </motion.div>
        </div>

        {/* Quick Access */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white rounded-xl shadow-sm border p-6"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-600" />
            Acceso Rápido
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link to={createPageUrl('LiveSessions')}>
              <Button variant="outline" className="w-full justify-start">
                <Activity className="w-4 h-4 mr-2" />
                Sesiones en vivo
              </Button>
            </Link>
            <Link to={createPageUrl('AdminProgress')}>
              <Button variant="outline" className="w-full justify-start">
                <BarChart3 className="w-4 h-4 mr-2" />
                Progreso
              </Button>
            </Link>
            <Link to={createPageUrl('AdminTasks')}>
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="w-4 h-4 mr-2" />
                Tareas
              </Button>
            </Link>
            <Link to={createPageUrl('Quizzes')}>
              <Button variant="outline" className="w-full justify-start">
                <BookOpen className="w-4 h-4 mr-2" />
                Quizzes
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}