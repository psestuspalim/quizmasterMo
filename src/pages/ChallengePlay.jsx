import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Swords } from 'lucide-react';
import { motion } from 'framer-motion';
import QuestionView from '../components/quiz/QuestionView';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ChallengePlayPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [challenge, setChallenge] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState([]);
  const [correctAnswers, setCorrectAnswers] = useState([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [finalResult, setFinalResult] = useState(null);
  
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadData = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
      
      const urlParams = new URLSearchParams(window.location.search);
      const challengeId = urlParams.get('id');
      
      if (challengeId) {
        const challenges = await base44.entities.Challenge.filter({ id: challengeId });
        if (challenges.length > 0) {
          setChallenge(challenges[0]);
        }
      }
    };
    loadData();
  }, []);

  const updateChallengeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Challenge.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['active-challenges']);
      queryClient.invalidateQueries(['completed-challenges']);
    }
  });

  const handleAnswer = async (isCorrect, selectedOption, question) => {
    const newScore = isCorrect ? score + 1 : score;
    
    if (isCorrect) {
      setScore(newScore);
      setCorrectAnswers([...correctAnswers, {
        question: question.question,
        selected_answer: selectedOption.text
      }]);
    } else {
      setWrongAnswers([...wrongAnswers, {
        question: question.question,
        selected_answer: selectedOption.text,
        correct_answer: question.answerOptions.find(opt => opt.isCorrect)?.text
      }]);
    }

    const isLastQuestion = currentQuestionIndex >= challenge.questions.length - 1;
    
    if (!isLastQuestion) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Finalizar reto
      await finishChallenge(newScore);
    }
  };

  const finishChallenge = async (finalScore) => {
    const isChallenger = challenge.challenger_email === currentUser.email;
    
    const updateData = isChallenger 
      ? { challenger_score: finalScore, challenger_finished: true }
      : { opponent_score: finalScore, opponent_finished: true };

    // Verificar si el otro jugador ya terminó
    const otherFinished = isChallenger ? challenge.opponent_finished : challenge.challenger_finished;
    const otherScore = isChallenger ? challenge.opponent_score : challenge.challenger_score;

    if (otherFinished) {
      // Ambos terminaron, determinar ganador
      let winner = null;
      if (finalScore > otherScore) {
        winner = currentUser.email;
      } else if (otherScore > finalScore) {
        winner = isChallenger ? challenge.opponent_email : challenge.challenger_email;
      }

      updateData.status = 'completed';
      updateData.winner_email = winner;

      await updateChallengeMutation.mutateAsync({
        id: challenge.id,
        data: updateData
      });

      setFinalResult({
        myScore: finalScore,
        opponentScore: otherScore,
        isWinner: finalScore > otherScore,
        isTie: finalScore === otherScore
      });
      setIsCompleted(true);
    } else {
      // Esperar al otro jugador
      await updateChallengeMutation.mutateAsync({
        id: challenge.id,
        data: updateData
      });
      setWaitingForOpponent(true);

      // Polling para verificar si el otro terminó
      const checkOpponent = setInterval(async () => {
        const updated = await base44.entities.Challenge.filter({ id: challenge.id });
        if (updated.length > 0 && updated[0].status === 'completed') {
          clearInterval(checkOpponent);
          const c = updated[0];
          const myFinalScore = isChallenger ? c.challenger_score : c.opponent_score;
          const oppScore = isChallenger ? c.opponent_score : c.challenger_score;
          
          setFinalResult({
            myScore: myFinalScore,
            opponentScore: oppScore,
            isWinner: myFinalScore > oppScore,
            isTie: myFinalScore === oppScore
          });
          setWaitingForOpponent(false);
          setIsCompleted(true);
        }
      }, 3000);
    }
  };

  const handleBack = () => {
    window.location.href = '/Quizzes';
  };

  const getOpponentName = () => {
    return challenge?.challenger_email === currentUser?.email 
      ? challenge?.opponent_username 
      : challenge?.challenger_username;
  };

  if (!challenge || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Pantalla de espera
  if (waitingForOpponent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="animate-pulse mb-6">
              <Swords className="w-16 h-16 mx-auto text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">¡Terminaste!</h2>
            <p className="text-gray-600 mb-4">Tu puntaje: {score}/{challenge.questions.length}</p>
            <p className="text-sm text-gray-500">
              Esperando a que {getOpponentName()} termine...
            </p>
            <div className="mt-6">
              <div className="animate-bounce">
                <div className="w-2 h-2 bg-indigo-600 rounded-full mx-auto"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pantalla de resultado
  if (isCompleted && finalResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full"
        >
          <Card className={`border-2 ${finalResult.isWinner ? 'border-green-400' : finalResult.isTie ? 'border-gray-400' : 'border-red-400'}`}>
            <CardContent className="p-8 text-center">
              <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${
                finalResult.isWinner ? 'bg-green-100' : finalResult.isTie ? 'bg-gray-100' : 'bg-red-100'
              }`}>
                <Swords className={`w-10 h-10 ${
                  finalResult.isWinner ? 'text-green-600' : finalResult.isTie ? 'text-gray-600' : 'text-red-600'
                }`} />
              </div>
              
              <h2 className={`text-3xl font-bold mb-2 ${
                finalResult.isWinner ? 'text-green-600' : finalResult.isTie ? 'text-gray-600' : 'text-red-600'
              }`}>
                {finalResult.isWinner ? '¡Victoria!' : finalResult.isTie ? 'Empate' : 'Derrota'}
              </h2>
              
              <p className="text-gray-600 mb-6">vs {getOpponentName()}</p>
              
              <div className="flex justify-center gap-12 mb-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-indigo-600">{finalResult.myScore}</div>
                  <div className="text-sm text-gray-500">Tú</div>
                </div>
                <div className="text-2xl text-gray-400 self-center">-</div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-gray-600">{finalResult.opponentScore}</div>
                  <div className="text-sm text-gray-500">{getOpponentName()}</div>
                </div>
              </div>

              <Badge className="mb-6">
                {challenge.quiz_title}
              </Badge>

              <Button onClick={handleBack} className="w-full">
                Volver a cuestionarios
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Juego en progreso
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Button onClick={handleBack} variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Salir
          </Button>
          <Badge variant="outline" className="flex items-center gap-2">
            <Swords className="w-4 h-4" />
            vs {getOpponentName()}
          </Badge>
        </div>

        <QuestionView
          key={currentQuestionIndex}
          question={challenge.questions[currentQuestionIndex]}
          questionNumber={currentQuestionIndex + 1}
          totalQuestions={challenge.questions.length}
          correctAnswers={score}
          wrongAnswers={wrongAnswers.length}
          onAnswer={handleAnswer}
        />
      </div>
    </div>
  );
}