import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, ChevronDown, ChevronUp, Users, GraduationCap, User } from 'lucide-react';

export default function StudentSelector({ 
  users, 
  courses, 
  attempts, 
  selectedStudent, 
  onSelectStudent,
  currentUser
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCourses, setExpandedCourses] = useState({});

  // Calcular estadísticas por estudiante
  const getStudentStats = (email) => {
    const studentAttempts = attempts.filter(a => a.user_email === email);
    const totalCorrect = studentAttempts.reduce((sum, a) => sum + (a.score || 0), 0);
    const totalQuestions = studentAttempts.reduce((sum, a) => sum + (a.total_questions || 0), 0);
    return {
      attempts: studentAttempts.length,
      avgScore: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0
    };
  };

  // Agrupar usuarios por curso (basado en allowed_users de cursos)
  const groupedByCourse = courses.map(course => {
    const courseUsers = course.visibility === 'specific' && course.allowed_users?.length > 0
      ? users.filter(u => course.allowed_users.includes(u.email))
      : users;
    
    return {
      ...course,
      students: courseUsers.filter(u => 
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.username || u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    };
  }).filter(c => c.students.length > 0);

  // Usuarios sin curso específico
  const unassignedUsers = users.filter(u => {
    const isInAnyCourse = courses.some(c => 
      c.visibility === 'specific' && c.allowed_users?.includes(u.email)
    );
    return !isInAnyCourse && (
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.username || u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const toggleCourse = (courseId) => {
    setExpandedCourses(prev => ({
      ...prev,
      [courseId]: !prev[courseId]
    }));
  };

  const StudentItem = ({ user }) => {
    const stats = getStudentStats(user.email);
    const isSelected = selectedStudent?.email === user.email;
    const isCurrentUser = user.email === currentUser?.email;
    
    return (
      <button
        onClick={() => onSelectStudent(user)}
        className={`w-full text-left p-3 rounded-lg border transition-all ${
          isSelected
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <User className="w-4 h-4 text-gray-400 shrink-0" />
            <div className="min-w-0">
              <div className="font-medium text-gray-900 text-sm truncate">
                {user.username || user.full_name || 'Sin nombre'}
                {isCurrentUser && <span className="text-indigo-600 ml-1">(Tú)</span>}
              </div>
              <div className="text-xs text-gray-500 truncate">{user.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-500">{stats.attempts} int.</span>
            <Badge className={`text-xs ${
              stats.avgScore >= 70 ? 'bg-green-100 text-green-800' :
              stats.avgScore >= 50 ? 'bg-yellow-100 text-yellow-800' :
              stats.avgScore > 0 ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-600'
            }`}>
              {stats.avgScore}%
            </Badge>
          </div>
        </div>
      </button>
    );
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="w-5 h-5 text-indigo-600" />
          Seleccionar Estudiante
        </CardTitle>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar estudiante..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent className="max-h-[400px] overflow-y-auto space-y-3">
        {/* Mi progreso */}
        <button
          onClick={() => onSelectStudent(null)}
          className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
            !selectedStudent
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-600" />
            <span className="font-semibold text-indigo-600">Mi Progreso</span>
          </div>
        </button>

        {/* Cursos con estudiantes */}
        {groupedByCourse.map(course => (
          <Collapsible 
            key={course.id} 
            open={expandedCourses[course.id]}
            onOpenChange={() => toggleCourse(course.id)}
          >
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-gray-600" />
                  <span className="font-medium text-gray-900">{course.icon} {course.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {course.students.length}
                  </Badge>
                </div>
                {expandedCourses[course.id] ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2 pl-2">
              {course.students.map(user => (
                <StudentItem key={user.email} user={user} />
              ))}
            </CollapsibleContent>
          </Collapsible>
        ))}

        {/* Estudiantes sin curso */}
        {unassignedUsers.length > 0 && (
          <Collapsible 
            open={expandedCourses['unassigned']}
            onOpenChange={() => toggleCourse('unassigned')}
          >
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-600" />
                  <span className="font-medium text-gray-900">Todos los estudiantes</span>
                  <Badge variant="outline" className="text-xs">
                    {unassignedUsers.length}
                  </Badge>
                </div>
                {expandedCourses['unassigned'] ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2 pl-2">
              {unassignedUsers.map(user => (
                <StudentItem key={user.email} user={user} />
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}