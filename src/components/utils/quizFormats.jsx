// Utilidades para conversión de formatos de quiz

// Mapeo de dificultades
const difficultyToNumber = {
  'fácil': 1,
  'easy': 1,
  'moderado': 2,
  'medium': 2,
  'moderate': 2,
  'difícil': 3,
  'hard': 3,
  'difficult': 3
};

const numberToDifficulty = {
  1: 'fácil',
  2: 'moderado',
  3: 'difícil'
};

// Mapeo de niveles Bloom
const bloomTextToNumber = {
  'Recordar': 1,
  'Comprender': 2,
  'Aplicar': 3,
  'Analizar': 4,
  'Evaluar': 5,
  'Crear': 6
};

/**
 * Convierte cualquier formato de quiz a cQ-v2 ultra-compacto
 */
export function toCompactFormat(quizData) {
  const { title, description, questions = [], total_questions } = quizData;
  
  return {
    m: {
      t: title || 'Quiz sin título',
      s: description || '',
      v: 'cQ-v2',
      c: total_questions || questions.length
    },
    q: questions.map((q, idx) => {
      const bloomLevel = typeof q.bloomLevel === 'string' 
        ? bloomTextToNumber[q.bloomLevel] 
        : q.bloomLevel;
      
      const diffNum = typeof q.difficulty === 'string'
        ? difficultyToNumber[q.difficulty.toLowerCase()] || 2
        : q.difficulty || 2;

      return {
        i: q.id || `Q${String(idx + 1).padStart(3, '0')}`,
        d: diffNum,
        ...(bloomLevel && { b: bloomLevel }),
        x: q.question || q.questionText || q.text || '',
        ...(q.feedback && { n: q.feedback }),
        ...(q.hint && { h: q.hint }),
        o: (q.answerOptions || q.options || []).map((opt, optIdx) => ({
          k: String.fromCharCode(65 + optIdx), // A, B, C, D...
          v: opt.text || opt,
          c: opt.isCorrect ? 1 : 0,
          ...(opt.errorType && { e: opt.errorType }),
          ...(opt.rationale && { f: opt.rationale })
        }))
      };
    })
  };
}

/**
 * Convierte de formato cQ-v2 a formato expandido para uso en componentes
 */
export function fromCompactFormat(compactData) {
  if (!compactData || !compactData.m || !compactData.q) {
    // Si no es formato compacto, asumir que ya está expandido
    return compactData;
  }

  const { m, q } = compactData;
  
  return {
    title: m.t,
    description: m.s || '',
    total_questions: m.c || q.length,
    questions: q.map(question => ({
      type: 'text',
      question: question.x,
      difficulty: numberToDifficulty[question.d] || 'moderado',
      bloomLevel: question.b || null,
      feedback: question.n || '',
      hint: question.h || '',
      answerOptions: (question.o || []).map(opt => ({
        text: opt.v,
        isCorrect: opt.c === 1,
        errorType: opt.e || '',
        rationale: opt.f || ''
      }))
    }))
  };
}

/**
 * Detecta si un quiz está en formato compacto
 */
export function isCompactFormat(data) {
  return data && data.m && data.q && data.m.v === 'cQ-v2';
}