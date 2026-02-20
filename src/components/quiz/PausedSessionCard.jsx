import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Clock, Play, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PausedSessionCard({ session, quiz, onResume, onDelete, isDeleting }) {
  if (!quiz) return null;

  const progress = session.total_questions > 0 
    ? (session.current_question / session.total_questions) * 100 
    : 0;

  const timeElapsed = session.last_activity && session.started_at
    ? Math.floor((new Date(session.last_activity) - new Date(session.started_at)) / 1000)
    : 0;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg text-amber-900 dark:text-amber-200">
                {quiz.title || session.quiz_title}
              </CardTitle>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                Sesión pausada • {session.current_question} de {session.total_questions} preguntas
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-amber-700 dark:text-amber-300">Progreso</span>
              <span className="font-medium text-amber-900 dark:text-amber-100">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="bg-white dark:bg-amber-900/20 rounded p-2 text-center">
              <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{session.score}</div>
              <div className="text-xs text-amber-700 dark:text-amber-400">Correctas</div>
            </div>
            <div className="bg-white dark:bg-amber-900/20 rounded p-2 text-center">
              <div className="text-lg font-bold text-red-600 dark:text-red-400">{session.wrong_count || 0}</div>
              <div className="text-xs text-amber-700 dark:text-amber-400">Errores</div>
            </div>
            <div className="bg-white dark:bg-amber-900/20 rounded p-2 text-center flex flex-col items-center justify-center">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 mb-0.5" />
              <div className="text-xs font-mono text-amber-700 dark:text-amber-400">{formatTime(timeElapsed)}</div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => onResume(session.id)}
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-700 dark:hover:bg-amber-600"
            >
              <Play className="w-4 h-4 mr-2" /> Reanudar
            </Button>
            <Button
              onClick={() => onDelete(session.id)}
              disabled={isDeleting}
              variant="ghost"
              size="icon"
              className="text-amber-600 hover:text-red-600 hover:bg-red-50 dark:text-amber-400 dark:hover:bg-red-900/20"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}