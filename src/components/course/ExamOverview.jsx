import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ExamOverview({ courseId, subjects, currentUser, isAdmin }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [newExam, setNewExam] = useState({
    subject_id: '',
    subject_name: '',
    exam_type: '1º Parcial',
    date: '',
    notes: ''
  });

  const { data: allExams = [] } = useQuery({
    queryKey: ['exam-dates', courseId],
    queryFn: () => base44.entities.ExamDate.filter({ course_id: courseId }, 'date'),
    enabled: !!courseId
  });

  const createExamMutation = useMutation({
    mutationFn: (data) => base44.entities.ExamDate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['exam-dates']);
      setOpen(false);
      setNewExam({ subject_id: '', subject_name: '', exam_type: '1º Parcial', date: '', notes: '' });
    }
  });

  const deleteExamMutation = useMutation({
    mutationFn: (id) => base44.entities.ExamDate.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['exam-dates'])
  });

  const handleCreate = () => {
    if (!newExam.subject_id || !newExam.date) return;
    createExamMutation.mutate({
      ...newExam,
      course_id: courseId
    });
  };

  const canDelete = (exam) => {
    return isAdmin || exam.created_by === currentUser?.email;
  };

  // Calendario: obtener días del mes actual
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Calcular inicio de la semana (lunes anterior si el mes no empieza en lunes)
  const startDay = monthStart.getDay();
  const paddingDays = startDay === 0 ? 6 : startDay - 1;

  // Exámenes próximos
  const sortedExams = allExams
    .map(exam => ({
      ...exam,
      daysRemaining: differenceInDays(new Date(exam.date), new Date())
    }))
    .filter(exam => exam.daysRemaining >= 0)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // Mapa de exámenes por día
  const examsByDay = useMemo(() => {
    const map = {};
    allExams.forEach(exam => {
      const dateKey = format(new Date(exam.date), 'yyyy-MM-dd');
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(exam);
    });
    return map;
  }, [allExams]);

  const getUrgencyBadge = (days) => {
    if (days === 0) return { label: 'Hoy', className: 'bg-red-600 text-white' };
    if (days === 1) return { label: 'Mañana', className: 'bg-orange-600 text-white' };
    if (days <= 3) return { label: `${days}d`, className: 'bg-orange-500 text-white' };
    if (days <= 7) return { label: `${days}d`, className: 'bg-yellow-500 text-white' };
    return { label: `${days}d`, className: 'bg-blue-500 text-white' };
  };

  return (
    <Card className="mb-6 shadow-md overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-3 bg-gradient-to-r from-indigo-50 to-blue-50">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          Próximos Exámenes
        </CardTitle>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                <Plus className="w-4 h-4 mr-1" /> Agregar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Agregar Fecha de Examen</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Materia</Label>
                  <Select
                    value={newExam.subject_id}
                    onValueChange={(value) => {
                      const subject = subjects.find(s => s.id === value);
                      setNewExam({ ...newExam, subject_id: value, subject_name: subject?.name || '' });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una materia" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(subject => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipo de Examen</Label>
                  <Select value={newExam.exam_type} onValueChange={(value) => setNewExam({ ...newExam, exam_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1º Parcial">1º Parcial</SelectItem>
                      <SelectItem value="2º Parcial">2º Parcial</SelectItem>
                      <SelectItem value="3º Parcial">3º Parcial</SelectItem>
                      <SelectItem value="4º Parcial">4º Parcial</SelectItem>
                      <SelectItem value="Final">Final</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Fecha</Label>
                  <Input type="date" value={newExam.date} onChange={(e) => setNewExam({ ...newExam, date: e.target.value })} />
                </div>
                <div>
                  <Label>Notas (opcional)</Label>
                  <Input value={newExam.notes} onChange={(e) => setNewExam({ ...newExam, notes: e.target.value })} placeholder="Ej: Aula 202" />
                </div>
                <Button onClick={handleCreate} className="w-full bg-indigo-600 hover:bg-indigo-700">
                  Agregar Examen
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent className="p-4">
        {/* Calendario Mensual */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="h-8"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h3 className="text-sm font-semibold text-gray-900 capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="h-8"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Días del mes */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: paddingDays }).map((_, i) => (
              <div key={`pad-${i}`} className="aspect-square" />
            ))}
            {daysInMonth.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayExams = examsByDay[dateKey] || [];
              const isToday = isSameDay(day, new Date());
              
              return (
                <div
                  key={dateKey}
                  className={`aspect-square rounded-md flex flex-col items-center justify-center text-xs relative ${
                    isToday ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-gray-100'
                  }`}
                >
                  <span className={isToday ? 'text-white' : 'text-gray-700'}>
                    {format(day, 'd')}
                  </span>
                  {dayExams.length > 0 && (
                    <div className="absolute bottom-0.5 flex gap-0.5">
                      {dayExams.slice(0, 3).map((exam, i) => (
                        <div
                          key={i}
                          className="w-1 h-1 rounded-full"
                          style={{ 
                            backgroundColor: subjects.find(s => s.id === exam.subject_id)?.color || '#6366f1'
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Lista de próximos exámenes */}
        <div className="border-t pt-4">
          <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Próximos exámenes</h4>
          {sortedExams.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No hay exámenes próximos</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {sortedExams.map(exam => {
                const urgency = getUrgencyBadge(exam.daysRemaining);
                const subjectColor = subjects.find(s => s.id === exam.subject_id)?.color || '#6366f1';
                
                return (
                  <div 
                    key={exam.id} 
                    className="flex items-center gap-3 p-2.5 rounded-lg border-l-4 hover:bg-gray-50 transition-colors"
                    style={{ borderLeftColor: subjectColor }}
                  >
                    <Badge className={`${urgency.className} text-xs px-1.5 py-0.5 font-semibold shrink-0`}>
                      {urgency.label}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">
                        {exam.subject_name}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <span className="font-medium">{exam.exam_type}</span>
                        <span>•</span>
                        <span>{format(new Date(exam.date), "d MMM", { locale: es })}</span>
                        {exam.notes && (
                          <>
                            <span>•</span>
                            <span className="truncate">{exam.notes}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {isAdmin && (canDelete(exam) || currentUser?.email === exam.created_by) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteExamMutation.mutate(exam.id)}
                        className="text-gray-400 hover:text-red-600 shrink-0 h-7 w-7"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}