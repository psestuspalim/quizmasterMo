import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, PlayCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function QuizCard({ quiz, onStart, onDelete }) {
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
        <div className="flex items-center justify-between mb-4">
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

        <Button
          onClick={() => onStart(quiz)}
          className="w-full bg-indigo-600 hover:bg-indigo-700"
        >
          <PlayCircle className="w-4 h-4 mr-2" />
          Comenzar cuestionario
        </Button>
      </CardContent>
    </Card>
  );
}