import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, Plus, Trash2 } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ExamOverview({ courseId, subjects, currentUser, isAdmin }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
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

  // Exámenes próximos
  const sortedExams = allExams
    .map(exam => ({
      ...exam,
      daysRemaining: differenceInDays(new Date(exam.date), new Date())
    }))
    .filter(exam => exam.daysRemaining >= 0)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const getUrgencyBadge = (days) => {
    if (days === 0) return { label: 'Hoy', className: 'bg-red-600 text-white' };
    if (days === 1) return { label: 'Mañana', className: 'bg-orange-600 text-white' };
    if (days <= 3) return { label: `${days}d`, className: 'bg-orange-500 text-white' };
    if (days <= 7) return { label: `${days}d`, className: 'bg-yellow-500 text-white' };
    return { label: `${days}d`, className: 'bg-blue-500 text-white' };
  };

  return (
    <Card className="mb-6 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-600" />
          Próximos Exámenes
        </CardTitle>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 text-xs">
                <Plus className="w-3 h-3 mr-1" /> Agregar
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
      <CardContent className="p-3">
        {sortedExams.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No hay exámenes próximos</p>
        ) : (
          <div className="space-y-2">
            {sortedExams.map(exam => {
              const urgency = getUrgencyBadge(exam.daysRemaining);
              const subjectColor = subjects.find(s => s.id === exam.subject_id)?.color || '#6366f1';
              
              return (
                <div 
                  key={exam.id} 
                  className="flex items-center gap-2 p-2 rounded-lg border-l-4 hover:bg-gray-50 transition-colors"
                  style={{ borderLeftColor: subjectColor }}
                >
                  <Badge className={`${urgency.className} text-xs px-1.5 py-0.5 font-semibold shrink-0`}>
                    {urgency.label}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">
                      {exam.subject_name}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
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
      </CardContent>
    </Card>
  );
}