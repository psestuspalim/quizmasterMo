import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Home, RotateCcw, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ResultsView({ 
  score, 
  totalQuestions, 
  onRetry, 
  onHome 
}) {
  const percentage = Math.round((score / totalQuestions) * 100);
  
  const getGrade = () => {
    if (percentage >= 90) return { text: '¡Excelente!', color: 'text-green-600', bg: 'bg-green-100' };
    if (percentage >= 70) return { text: 'Muy bien', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (percentage >= 50) return { text: 'Bien', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { text: 'Necesitas practicar', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const grade = getGrade();

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-0 shadow-2xl overflow-hidden">
          {/* Header with gradient */}
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-8 text-white">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Trophy className="w-10 h-10" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-center mb-2">
              Cuestionario completado
            </h2>
            <p className="text-center text-indigo-100">
              Has terminado todas las preguntas
            </p>
          </div>

          <CardContent className="p-8">
            {/* Score Circle */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <svg className="w-48 h-48 transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="#e5e7eb"
                    strokeWidth="12"
                    fill="none"
                  />
                  <motion.circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="#4f46e5"
                    strokeWidth="12"
                    fill="none"
                    strokeLinecap="round"
                    initial={{ strokeDasharray: '0 552' }}
                    animate={{ strokeDasharray: `${(percentage / 100) * 552} 552` }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-5xl font-bold text-gray-900">
                    {percentage}%
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {score}/{totalQuestions}
                  </div>
                </div>
              </div>
            </div>

            {/* Grade Badge */}
            <div className="flex justify-center mb-8">
              <div className={`${grade.bg} px-6 py-3 rounded-full`}>
                <span className={`${grade.color} font-semibold text-lg`}>
                  {grade.text}
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <Card className="bg-gray-50 border-0">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{score}</div>
                  <div className="text-xs text-gray-500 mt-1">Correctas</div>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-50 border-0">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {totalQuestions - score}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Incorrectas</div>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-50 border-0">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-indigo-600">
                    {totalQuestions}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Total</div>
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={onRetry}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Intentar de nuevo
              </Button>
              
              <Button
                onClick={onHome}
                variant="outline"
                className="w-full"
              >
                <Home className="w-4 h-4 mr-2" />
                Volver al inicio
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}