import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Trash2, Pencil, CheckCircle2, XCircle, TrendingUp, EyeOff, Award } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SubjectCard({ subject, quizCount, stats, isAdmin, onDelete, onEdit, onClick, onReviewWrong }) {
  const { totalCorrect = 0, totalWrong = 0, totalAnswered = 0 } = stats;
  const correctPercent = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
  const wrongPercent = totalAnswered > 0 ? Math.round((totalWrong / totalAnswered) * 100) : 0;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-0 overflow-hidden relative"
        onClick={onClick}
      >
        {/* Banner superior con gradiente */}
        <div 
          className="h-24 relative overflow-hidden"
          style={{ 
            background: `linear-gradient(135deg, ${subject.color || '#6366f1'}, ${subject.color || '#6366f1'}dd)`
          }}
        >
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_120%,_rgba(255,255,255,0.5),_transparent)]" />
          <div className="absolute top-3 right-3 flex gap-1">
            {subject.is_hidden && (
              <Badge variant="secondary" className="bg-white/90 text-gray-700 text-xs">
                <EyeOff className="w-3 h-3 mr-1" /> Oculto
              </Badge>
            )}
            {isAdmin && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={(e) => { e.stopPropagation(); onEdit(subject); }}
                  className="h-7 w-7 bg-white/90 hover:bg-white text-gray-700"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={(e) => { e.stopPropagation(); onDelete(subject.id); }}
                  className="h-7 w-7 bg-white/90 hover:bg-white text-red-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
          {/* Ícono flotante */}
          <div className="absolute -bottom-6 left-4">
            <div 
              className="w-14 h-14 rounded-2xl shadow-lg flex items-center justify-center border-4 border-white"
              style={{ backgroundColor: subject.color || '#6366f1' }}
            >
              <BookOpen className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>

        <CardContent className="pt-8 pb-4 px-4">
          <h3 className="font-bold text-gray-900 text-lg mb-1 truncate">
            {subject.name}
          </h3>
          {subject.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-3">{subject.description}</p>
          )}
          
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="outline" className="text-xs font-medium">
              {quizCount} {quizCount === 1 ? 'quiz' : 'quizzes'}
            </Badge>
            {totalAnswered > 0 && (
              <Badge 
                className="text-xs font-medium"
                style={{ 
                  backgroundColor: correctPercent >= 70 ? '#10b981' : correctPercent >= 50 ? '#f59e0b' : '#ef4444',
                  color: 'white'
                }}
              >
                <Award className="w-3 h-3 mr-1" />
                {correctPercent}%
              </Badge>
            )}
          </div>

          {totalAnswered > 0 && (
            <div className="space-y-3">
              <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full flex">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${correctPercent}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="bg-gradient-to-r from-green-400 to-green-500"
                  />
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${wrongPercent}%` }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                    className="bg-gradient-to-r from-red-400 to-red-500"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-green-600 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{totalCorrect} correctas</span>
                </div>
                <div className="flex items-center gap-1.5 text-red-600 font-medium">
                  <XCircle className="w-4 h-4" />
                  <span>{totalWrong} incorrectas</span>
                </div>
              </div>

              {onReviewWrong && totalWrong > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onReviewWrong(subject.id); }}
                  className="w-full text-xs h-8 border-orange-300 text-orange-600 hover:bg-orange-50 font-medium"
                >
                  <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
                  Repasar {totalWrong} errores
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}