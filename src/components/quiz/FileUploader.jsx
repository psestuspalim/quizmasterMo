import React, { useState } from 'react';
import { Upload, FileJson, AlertCircle, Image, Microscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ImageQuizCreator from './ImageQuizCreator';
import TissueQuizCreator from './TissueQuizCreator';

export default function FileUploader({ onUploadSuccess }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('json');

  const handleFile = async (file) => {
    if (!file) return;
    
    if (file.type !== 'application/json') {
      setError('Por favor, selecciona un archivo JSON válido');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!data.quiz || !Array.isArray(data.quiz)) {
        throw new Error('Formato de archivo inválido. Debe contener un array "quiz"');
      }

      // Agregar tipo 'text' a preguntas existentes
      const questionsWithType = data.quiz.map(q => ({
        ...q,
        type: q.type || 'text'
      }));

      await onUploadSuccess({
        title: file.name.replace('.json', ''),
        description: `Cuestionario con ${data.quiz.length} preguntas`,
        questions: questionsWithType,
        total_questions: data.quiz.length,
        file_name: file.name
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