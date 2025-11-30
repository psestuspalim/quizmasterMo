import React, { useState } from 'react';
import { Upload, FileJson, AlertCircle, Image, Microscope, ClipboardPaste } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import ImageQuizCreator from './ImageQuizCreator';
import TissueQuizCreator from './TissueQuizCreator';

export default function FileUploader({ onUploadSuccess }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('json');
  const [jsonText, setJsonText] = useState('');
  const [showPasteArea, setShowPasteArea] = useState(false);

  const processJsonData = async (data, fileName = 'Quiz') => {
    let questions = [];
    let title = fileName.replace('.json', '');
      
      let questions = [];
      let title = file.name.replace('.json', '');
      
      // Formato nuevo con quizMetadata y questions
                  if (data.questions && Array.isArray(data.questions)) {
                    title = data.quizMetadata?.title || title;
                    const totalQ = data.questions.length;
                    const easyCount = Math.ceil(totalQ * 0.2);
                    const hardCount = Math.ceil(totalQ * 0.2);

                    questions = data.questions.map((q, idx) => {
                      let difficulty = 'moderado';
                      if (idx < easyCount) {
                        difficulty = 'fácil';
                      } else if (idx >= totalQ - hardCount) {
                        difficulty = 'difícil';
                      }

                      return {
                        type: q.type || 'text',
                        question: q.questionText,
                        hint: q.cinephileTip || '',
                        feedback: q.analysis || '',
                        difficulty: q.difficulty || difficulty,
                        answerOptions: q.options.map(opt => ({
                          text: opt.text,
                          isCorrect: opt.isCorrect,
                          rationale: opt.feedback || ''
                        }))
                      };
                    });
                  }
      // Formato original con array "quiz"
                  else if (data.quiz && Array.isArray(data.quiz)) {
                    const totalQ = data.quiz.length;
                    const easyCount = Math.ceil(totalQ * 0.2);
                    const hardCount = Math.ceil(totalQ * 0.2);

                    questions = data.quiz.map((q, idx) => {
                      let difficulty = 'moderado';
                      if (idx < easyCount) {
                        difficulty = 'fácil';
                      } else if (idx >= totalQ - hardCount) {
                        difficulty = 'difícil';
                      }

                      return {
                        ...q,
                        type: q.type || 'text',
                        difficulty: q.difficulty || difficulty
                      };
                    });
                  }
      else {
        throw new Error('Formato de archivo inválido. Debe contener "quiz" o "questions"');
      }

      await onUploadSuccess({
                title,
                description: data.quizMetadata?.source || `Cuestionario con ${questions.length} preguntas`,
                questions,
                total_questions: questions.length,
                file_name: file.name,
                is_hidden: false
              });

    } catch (err) {
      setError(err.message || 'Error al procesar el archivo');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageQuizSave = async (questionData) => {
    // Si son múltiples preguntas
    if (questionData.multipleQuestions) {
      const questions = questionData.multipleQuestions.map(q => ({
        ...q,
        type: 'image'
      }));
      await onUploadSuccess({
        title: `Cuestionario con ${questions.length} imágenes`,
        description: 'Cuestionario con imágenes',
        questions,
        total_questions: questions.length
      });
    } else {
      await onUploadSuccess({
        title: questionData.question,
        description: questionData.description || 'Cuestionario con imagen',
        questions: [{
          ...questionData,
          type: 'image'
        }],
        total_questions: 1
      });
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="json">
                    <FileJson className="w-4 h-4 mr-2" />
                    JSON
                  </TabsTrigger>
                  <TabsTrigger value="image">
                    <Image className="w-4 h-4 mr-2" />
                    Imagen
                  </TabsTrigger>
                  <TabsTrigger value="tissue">
                    <Microscope className="w-4 h-4 mr-2" />
                    Tejidos
                  </TabsTrigger>
                </TabsList>

        <TabsContent value="json">
          <Card
            className={`border-2 border-dashed transition-all duration-200 ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50/50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="p-12 text-center">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                  <FileJson className="w-10 h-10 text-gray-400" />
                </div>
              </div>
              
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Cargar archivo de cuestionario
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Arrastra un archivo JSON o haz clic para seleccionar
              </p>

              <label htmlFor="file-upload">
                <Button
                  type="button"
                  disabled={isProcessing}
                  className="bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => document.getElementById('file-upload').click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isProcessing ? 'Procesando...' : 'Seleccionar archivo'}
                </Button>
              </label>
              
              <input
                id="file-upload"
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => handleFile(e.target.files[0])}
              />
            </div>
          </Card>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="image">
                    <ImageQuizCreator 
                      onSave={handleImageQuizSave}
                      onCancel={() => setActiveTab('json')}
                    />
                  </TabsContent>

                  <TabsContent value="tissue">
                    <TissueQuizCreator 
                      onSave={handleImageQuizSave}
                      onCancel={() => setActiveTab('json')}
                    />
                  </TabsContent>
                </Tabs>
    </div>
  );
}