import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, PlayCircle, Trash2, CheckCircle2, XCircle, Clock, History } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function QuizCard({ quiz, attempts = [], onStart, onDelete }) {
  const [showDialog, setShowDialog] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [questionCount, setQuestionCount] = useState(quiz.total_questions);
  
  // Calcular estadísticas
  const quizAttempts = attempts.filter(a => a.quiz_id === quiz.id);
  const totalCorrect = quizAttempts.reduce((sum, a) => sum + a.score, 0);
  const totalWrong = quizAttempts.reduce((sum, a) => sum + (a.answered_questions || a.total_questions) - a.score, 0);
  
  // Calcular faltantes del banco total
  const totalAnswered = totalCorrect + totalWrong;
  const totalRemaining = quiz.total_questions - totalAnswered;
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border border-gray-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
              {quiz.title}
            </CardTitle>
            <p className="text-sm text-gray-500">{quiz.description}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(quiz.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              <span>{quiz.total_questions} preguntas</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{format(new Date(quiz.created_date), 'dd/MM/yyyy')}</span>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        {quizAttempts.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
              <div className="flex items-center justify-center gap-1 text-green-700">
                <CheckCircle2 className="w-3 h-3" />
                <span className="text-sm font-semibold">{totalCorrect}</span>
              </div>
              <div className="text-xs text-green-600 mt-0.5">Correctas</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-center">
              <div className="flex items-center justify-center gap-1 text-red-700">
                <XCircle className="w-3 h-3" />
                <span className="text-sm font-semibold">{totalWrong}</span>
              </div>
              <div className="text-xs text-red-600 mt-0.5">Incorrectas</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-center">
              <div className="flex items-center justify-center gap-1 text-gray-700">
                <Clock className="w-3 h-3" />
                <span className="text-sm font-semibold">{totalRemaining}</span>
              </div>
              <div className="text-xs text-gray-600 mt-0.5">Faltantes</div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={() => setShowDialog(true)}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700"
          >
            <PlayCircle className="w-4 h-4 mr-2" />
            Comenzar
          </Button>
          {quizAttempts.length > 0 && (
            <Button
              onClick={() => setShowHistory(true)}
              variant="outline"
              size="icon"
            >
              <History className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Dialog para configurar quiz */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configurar intento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Número de preguntas</Label>
                <Input
                  type="number"
                  min="1"
                  max={quiz.total_questions}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Math.min(quiz.total_questions, Math.max(1, parseInt(e.target.value) || 1)))}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Máximo: {quiz.total_questions} preguntas
                </p>
              </div>
              <Button
                onClick={() => {
                  onStart(quiz, questionCount);
                  setShowDialog(false);
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                Comenzar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog para historial */}
        <Dialog open={showHistory} onOpenChange={setShowHistory}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Historial de intentos</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-4">
              {quizAttempts.map((attempt) => {
                const percentage = attempt.total_questions > 0 
                  ? Math.round((attempt.score / attempt.total_questions) * 100) 
                  : 0;
                const isPartial = !attempt.is_completed;

                return (
                  <div key={attempt.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          {format(new Date(attempt.completed_at || attempt.created_date), 'dd/MM/yyyy HH:mm')}
                        </span>
                        {isPartial && (
                          <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                            Parcial
                          </Badge>
                        )}
                      </div>
                      <Badge
                        className={
                          percentage >= 70 ? 'bg-green-100 text-green-800' :
                          percentage >= 50 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }
                      >
                        {attempt.score}/{attempt.total_questions} ({percentage}%)
                      </Badge>
                    </div>
                    {isPartial && (
                      <div className="text-xs text-gray-500">
                        {attempt.answered_questions || 0} de {attempt.total_questions} respondidas
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}