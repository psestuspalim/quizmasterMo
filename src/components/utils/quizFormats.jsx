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
 * Convierte cualquier formato de quiz a formato compacto
 */
export function toCompactFormat(quizData) {
  const { title, description, questions = [], total_questions } = quizData;
  
  return {
    t: title || 'Quiz sin título',
    q: questions.map((q, idx) => {
      const diffNum = typeof q.difficulty === 'string'
        ? difficultyToNumber[q.difficulty.toLowerCase()] || 1
        : q.difficulty || 1;

      return {
        x: q.question || q.questionText || q.text || '',
        dif: diffNum,
        qt: q.type || 'mcq',
        id: q.id || `Q${String(idx + 1).padStart(3, '0')}`,
        sj: q.subject || '',
        tp: q.topic || '',
        sb: q.subtopic || '',
        o: (q.answerOptions || q.options || []).map((opt) => ({
          text: opt.text || opt,
          c: opt.isCorrect === true,
          r: opt.rationale || '',
          et: opt.errorType || ''
        }))
      };
    })
  };
}

/**
 * Convierte de formato compacto a formato expandido para uso en componentes
 */
export function fromCompactFormat(compactData) {
  // Detectar formato nuevo (t, q) vs viejo (m, q)
  const isNewFormat = compactData && compactData.t && compactData.q && !compactData.m;
  const isOldFormat = compactData && compactData.m && compactData.q;

  if (!isNewFormat && !isOldFormat) {
    // Ya está expandido
    return compactData;
  }

  // Formato nuevo
  if (isNewFormat) {
    const { t, q } = compactData;

    return {
      title: t || 'Quiz sin título',
      description: '',
      total_questions: q.length,
      questions: q.map(question => {
        // Buscar feedback general de opciones incorrectas
        let generalFeedback = '';
        if (question.o) {
          const incorrectOpts = question.o.filter(opt => opt.c === false || opt.c === 0);
          if (incorrectOpts.length > 0 && incorrectOpts[0].r) {
            generalFeedback = incorrectOpts[0].r;
          }
        }

        return {
          type: question.qt || 'text',
          question: question.x || '',
          difficulty: numberToDifficulty[question.dif] || 'moderado',
          bloomLevel: null,
          feedback: generalFeedback,
          hint: question.h || '',
          answerOptions: (question.o || []).map(opt => ({
            text: opt.text || '',
            isCorrect: opt.c === true,
            errorType: opt.et || '',
            rationale: opt.r || ''
          }))
        };
      })
    };
  }

  // Formato viejo (cQ-v2)
  const { m, q } = compactData;

  return {
    title: m.t,
    description: m.s || '',
    total_questions: m.c || q.length,
    questions: q.map(question => {
      let generalFeedback = question.n || '';
      if (!generalFeedback && question.o) {
        const incorrectOpts = question.o.filter(opt => opt.c !== 1);
        if (incorrectOpts.length > 0 && incorrectOpts[0].r) {
          generalFeedback = incorrectOpts[0].r;
        }
      }

      return {
        type: 'text',
        question: question.x,
        difficulty: numberToDifficulty[question.d] || 'moderado',
        bloomLevel: question.b || null,
        feedback: generalFeedback,
        hint: question.h || '',
        answerOptions: (question.o || []).map(opt => ({
          text: opt.text || opt.v,
          isCorrect: opt.c === true || opt.c === 1,
          errorType: opt.et || opt.e || '',
          rationale: opt.r || opt.f || ''
        }))
      };
    })
  };
}

/**
 * Detecta si un quiz está en formato compacto
 */
export function isCompactFormat(data) {
  // Formato nuevo: {t, q}
  const isNewFormat = data && data.t && data.q && !data.m;
  // Formato viejo: {m, q}
  const isOldFormat = data && data.m && data.q && data.m.v === 'cQ-v2';
  
  return isNewFormat || isOldFormat;
}