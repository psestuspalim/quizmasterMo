import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileJson, Upload, CheckCircle2, XCircle, ArrowLeft, 
  Code, Download, AlertCircle, Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { toCompactFormat, fromCompactFormat, isCompactFormat } from '../components/utils/quizFormats';

export default function AdminJsonManager() {
  const [jsonInput, setJsonInput] = useState('');
  const [validationResult, setValidationResult] = useState(null);
  const [formattedJson, setFormattedJson] = useState('');
  const [convertedJson, setConvertedJson] = useState('');

  const validateJson = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      setValidationResult({
        valid: true,
        message: 'JSON válido',
        data: parsed
      });
      toast.success('JSON válido');
    } catch (error) {
      setValidationResult({
        valid: false,
        message: error.message,
        line: error.message.match(/position (\d+)/)?.[1]
      });
      toast.error('JSON inválido');
    }
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      const formatted = JSON.stringify(parsed, null, 2);
      setFormattedJson(formatted);
      toast.success('JSON formateado');
    } catch (error) {
      toast.error('No se puede formatear JSON inválido');
    }
  };

  const convertToCompact = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      
      // Verificar si ya es compacto
      if (isCompactFormat(parsed)) {
        toast.info('El JSON ya está en formato compacto');
        setConvertedJson(JSON.stringify(parsed, null, 2));
        return;
      }

      // Convertir a compacto
      const compact = toCompactFormat(parsed);
      setConvertedJson(JSON.stringify(compact, null, 2));
      toast.success('Convertido a formato compacto');
    } catch (error) {
      toast.error('Error al convertir: ' + error.message);
    }
  };

  const convertToFull = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      
      // Verificar si es compacto
      if (!isCompactFormat(parsed)) {
        toast.info('El JSON no está en formato compacto');
        setConvertedJson(JSON.stringify(parsed, null, 2));
        return;
      }

      // Expandir
      const full = fromCompactFormat(parsed);
      setConvertedJson(JSON.stringify(full, null, 2));
      toast.success('Convertido a formato completo');
    } catch (error) {
      toast.error('Error al expandir: ' + error.message);
    }
  };

  const downloadJson = (content, filename) => {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Archivo descargado');
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setJsonInput(e.target.result);
      toast.success('Archivo cargado');
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link to={createPageUrl('AdminHome')}>
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al panel
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <FileJson className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">JSON Manager</h1>
              <p className="text-gray-600">Validar, formatear y convertir archivos JSON</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="validate" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="validate">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Validar
            </TabsTrigger>
            <TabsTrigger value="format">
              <Code className="w-4 h-4 mr-2" />
              Formatear
            </TabsTrigger>
            <TabsTrigger value="convert">
              <Sparkles className="w-4 h-4 mr-2" />
              Convertir
            </TabsTrigger>
          </TabsList>

          <TabsContent value="validate" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Subir y Validar JSON</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* File upload */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-all">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="json-upload"
                  />
                  <label htmlFor="json-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">Click para subir archivo JSON</p>
                    <p className="text-gray-400 text-sm mt-1">o pega el contenido abajo</p>
                  </label>
                </div>

                {/* JSON Input */}
                <Textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder='{"title": "Mi Quiz", "questions": [...]}'
                  className="min-h-[300px] font-mono text-sm"
                />

                {/* Validate button */}
                <Button onClick={validateJson} className="w-full bg-indigo-600 hover:bg-indigo-700">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Validar JSON
                </Button>

                {/* Validation result */}
                {validationResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className={validationResult.valid ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {validationResult.valid ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className={`font-semibold ${validationResult.valid ? 'text-green-800' : 'text-red-800'}`}>
                              {validationResult.message}
                            </p>
                            {validationResult.valid && validationResult.data && (
                              <div className="mt-2 text-sm text-green-700">
                                <p>Propiedades detectadas: {Object.keys(validationResult.data).join(', ')}</p>
                              </div>
                            )}
                            {!validationResult.valid && validationResult.line && (
                              <p className="text-sm text-red-600 mt-1">
                                Posición: {validationResult.line}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="format" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Formatear JSON</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder='{"title":"Mi Quiz","questions":[...]}'
                  className="min-h-[200px] font-mono text-sm"
                />

                <Button onClick={formatJson} className="w-full bg-indigo-600 hover:bg-indigo-700">
                  <Code className="w-4 h-4 mr-2" />
                  Formatear con indentación
                </Button>

                {formattedJson && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-700">JSON Formateado:</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadJson(formattedJson, 'formatted.json')}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Descargar
                        </Button>
                      </div>
                      <Textarea
                        value={formattedJson}
                        readOnly
                        className="min-h-[300px] font-mono text-sm bg-gray-50"
                      />
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="convert" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Convertir Formatos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Formatos soportados:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li><strong>Compacto:</strong> Formato optimizado con claves cortas (t, q, o, c)</li>
                        <li><strong>Completo:</strong> Formato legible con claves descriptivas</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder='Pega tu JSON aquí...'
                  className="min-h-[200px] font-mono text-sm"
                />

                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={convertToCompact} variant="outline">
                    <Sparkles className="w-4 h-4 mr-2" />
                    A Compacto
                  </Button>
                  <Button onClick={convertToFull} variant="outline">
                    <Code className="w-4 h-4 mr-2" />
                    A Completo
                  </Button>
                </div>

                {convertedJson && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-700">JSON Convertido:</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadJson(convertedJson, 'converted.json')}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Descargar
                        </Button>
                      </div>
                      <Textarea
                        value={convertedJson}
                        readOnly
                        className="min-h-[300px] font-mono text-sm bg-gray-50"
                      />
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}