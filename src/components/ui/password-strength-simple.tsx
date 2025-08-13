import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: PasswordRequirement[] = [
  { label: 'Pelo menos 8 caracteres', test: (p) => p.length >= 8 },
  { label: 'Ao menos uma letra maiúscula', test: (p) => /[A-Z]/.test(p) },
  { label: 'Ao menos uma letra minúscula', test: (p) => /[a-z]/.test(p) },
  { label: 'Ao menos um número', test: (p) => /\d/.test(p) },
  { label: 'Ao menos um caractere especial', test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

export const PasswordStrengthSimple: React.FC<PasswordStrengthProps> = ({
  password,
  className,
}) => {
  if (!password) return null;

  const metRequirements = requirements.filter(req => req.test(password));
  const strength = metRequirements.length;
  
  const getStrengthInfo = () => {
    if (strength <= 2) return { label: 'Fraca', color: 'text-red-600', bgColor: 'bg-red-100 border-red-200' };
    if (strength === 3) return { label: 'Média', color: 'text-orange-600', bgColor: 'bg-orange-100 border-orange-200' };
    if (strength === 4) return { label: 'Boa', color: 'text-blue-600', bgColor: 'bg-blue-100 border-blue-200' };
    return { label: 'Forte', color: 'text-green-600', bgColor: 'bg-green-100 border-green-200' };
  };

  const strengthInfo = getStrengthInfo();

  return (
    <div className={cn('space-y-3 p-4 rounded-lg border', strengthInfo.bgColor, className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Força da senha:</span>
        <span className={cn('text-sm font-semibold', strengthInfo.color)}>
          {strengthInfo.label} ({strength}/5)
        </span>
      </div>
      
      <div className="space-y-2">
        {requirements.map((req, index) => {
          const isValid = req.test(password);
          return (
            <div key={index} className="flex items-center gap-2 text-sm">
              {isValid ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-gray-400" />
              )}
              <span className={isValid ? 'text-green-700' : 'text-gray-600'}>
                {req.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};