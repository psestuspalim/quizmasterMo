import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Key, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CourseJoinModal({ open, onClose, currentUser }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const queryClient = useQueryClient();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim() || loading) return;

    setLoading(true);
    try {
      const codeUpper = code.toUpperCase();
      
      // Buscar código
      const codes = await base44.entities.CourseAccessCode.filter({ code: codeUpper });
      if (codes.length === 0) {
        toast.error('Código inválido');
        return;
      }

      const accessCode = codes[0];

      // Validaciones
      if (!accessCode.is_active) {
        toast.error('Este código está desactivado');
        return;
      }

      if (accessCode.expires_at && new Date(accessCode.expires_at) < new Date()) {
        toast.error('Este código ha expirado');
        return;
      }

      if (accessCode.max_uses && accessCode.current_uses >= accessCode.max_uses) {
        toast.error('Este código ha alcanzado su límite de usos');
        return;
      }

      // Verificar si ya solicitó
      const existing = await base44.entities.CourseEnrollment.filter({
        user_email: currentUser.email,
        course_id: accessCode.course_id
      });

      if (existing.length > 0) {
        const status = existing[0].status;
        if (status === 'pending') {
          toast.info('Ya tienes una solicitud pendiente para este curso');
          return;
        } else if (status === 'approved') {
          toast.info('Ya estás inscrito en este curso');
          return;
        } else if (status === 'rejected') {
          await base44.entities.CourseEnrollment.update(existing[0].id, {
            status: 'pending',
            access_code: codeUpper,
            rejection_reason: null
          });
          toast.success('Solicitud reenviada');
          queryClient.invalidateQueries({ queryKey: ['enrollments'] });
          queryClient.invalidateQueries({ queryKey: ['enrollment-requests'] });
          setCode('');
          onClose();
          return;
        }
      }

      // Crear solicitud y actualizar código en transacción
      await base44.entities.CourseEnrollment.create({
        user_email: currentUser.email,
        username: currentUser.username,
        course_id: accessCode.course_id,
        course_name: accessCode.course_name,
        access_code: codeUpper,
        status: 'pending'
      });

      // Recargar código para obtener valor actualizado
      const updatedCodes = await base44.entities.CourseAccessCode.filter({ code: codeUpper });
      const updatedAccessCode = updatedCodes[0];
      
      await base44.entities.CourseAccessCode.update(accessCode.id, {
        current_uses: (updatedAccessCode?.current_uses || 0) + 1
      });

      toast.success('Solicitud enviada');
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['enrollment-requests'] });
      setCode('');
      onClose();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al procesar el código');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-600" />
            Unirse a un Curso
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label>Código de Acceso</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Ej: ABC12345"
              maxLength={8}
              className="uppercase font-mono text-lg"
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              Ingresa el código proporcionado por tu instructor
            </p>
          </div>
          <Button 
            type="submit" 
            disabled={!code.trim() || loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Procesando...
              </>
            ) : (
              'Enviar Solicitud'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}