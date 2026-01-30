import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Users, FileJson, Activity, LayoutDashboard, Key, BarChart3, ClipboardList, TrendingUp, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import AdminShell from '../components/admin/AdminShell';
import AdminPageHeader from '../components/admin/AdminPageHeader';
import AdminKpiCard from '../components/admin/AdminKpiCard';
import AdminDashboardCard from '../components/admin/AdminDashboardCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import FixQuizzesButton from '../components/admin/FixQuizzesButton';
import RemoveDuplicatesButton from '../components/admin/RemoveDuplicatesButton';
import RemoveDuplicateQuestionsButton from '../components/admin/RemoveDuplicateQuestionsButton';
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

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => base44.entities.Subject.list('order'),
    enabled: currentUser?.role === 'admin'
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

  const { data: assignedTasks = [] } = useQuery({
    queryKey: ['assigned-tasks'],
    queryFn: () => base44.entities.AssignedTask.list('-created_date', 20),
    enabled: currentUser?.role === 'admin'
  });

  const { data: featureUsage = [] } = useQuery({
    queryKey: ['feature-usage'],
    queryFn: () => base44.entities.FeatureUsage.list('-created_date', 100),
    enabled: currentUser?.role === 'admin'
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

  const adminMenuItems = [
    {
      title: 'Gestión de Cursos',
      description: 'Códigos de acceso y solicitudes de inscripción',
      icon: Key,
      href: 'CourseManagement',
      color: 'blue',
      stats: `${enrollments.length} solicitudes pendientes`
    },
    {
      title: 'Sesiones en Vivo',
      description: 'Monitorea estudiantes en tiempo real',
      icon: Activity,
      href: 'LiveSessions',
      color: 'green',
      stats: `${sessions.length} sesiones activas`
    },
    {
      title: 'Progreso Estudiantes',
      description: 'Estadísticas y análisis de rendimiento',
      icon: BarChart3,
      href: 'AdminProgress',
      color: 'purple',
      stats: `${allUsers.filter(u => u.role === 'user').length} estudiantes`
    },
    {
      title: 'Tareas Asignadas',
      description: 'Gestiona y supervisa tareas',
      icon: ClipboardList,
      href: 'AdminTasks',
      color: 'amber',
      stats: `${assignedTasks.length} tareas activas`
    },
    {
      title: 'Analytics de Funcionalidades',
      description: 'Estadísticas de uso del sistema',
      icon: TrendingUp,
      href: null,
      color: 'indigo',
      stats: `${featureUsage.length} eventos registrados`,
      isModal: true
    }
  ];

  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200'
  };

  return (
    <AdminShell>
      <AdminPageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        subtitle={`Bienvenido, ${currentUser.full_name || currentUser.email}`}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <AdminKpiCard
          icon={BookOpen}
          label="Cursos"
          value={courses.length}
        />
        <AdminKpiCard
          icon={Users}
          label="Estudiantes"
          value={allUsers.filter(u => u.role === 'user').length}
        />
        <AdminKpiCard
          icon={FileJson}
          label="Quizzes"
          value={quizzes.length}
        />
        <AdminKpiCard
          icon={Activity}
          label="Sesiones Activas"
          value={sessions.length}
        />
      </div>

      {/* Admin Menu Grid */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Panel de Control</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {adminMenuItems.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
            >
              {item.isModal ? (
                <Card className={`p-6 border-2 hover:shadow-lg transition-all cursor-pointer ${colorClasses[item.color]}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-lg ${colorClasses[item.color]}`}>
                      <item.icon className="w-6 h-6" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                  <p className="text-xs font-medium text-gray-500">{item.stats}</p>
                </Card>
              ) : (
                <Link to={createPageUrl(item.href)}>
                  <Card className={`p-6 border-2 hover:shadow-lg transition-all ${colorClasses[item.color]}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-lg ${colorClasses[item.color]}`}>
                        <item.icon className="w-6 h-6" />
                      </div>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                    <p className="text-xs font-medium text-gray-500">{item.stats}</p>
                  </Card>
                </Link>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumen Rápido</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <AdminDashboardCard
              title="Contenido"
              description="Gestiona cursos, materias y quizzes"
              count={courses.length + subjects.length}
              items={recentCourses}
              primaryActionLabel="Gestionar contenido"
              primaryActionTo="AdminContent"
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
      </div>

      {/* Maintenance Tools */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Wrench className="w-5 h-5" />
          Herramientas de Mantenimiento
        </h2>
        <Card className="p-6">
          <div className="flex flex-wrap gap-3">
            <FixQuizzesButton />
            <RemoveDuplicatesButton />
            <RemoveDuplicateQuestionsButton />
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}