import React from 'react';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

interface PasswordRule {
  label: string;
  test: (password: string) => boolean;
  icon: React.ComponentType<{ className?: string }>;
}

const passwordRules: PasswordRule[] = [
  {
    label: 'Pelo menos 8 caracteres',
    test: (password) => password.length >= 8,
    icon: CheckCircle,
  },
  {
    label: 'Pelo menos uma letra maiúscula',
    test: (password) => /[A-Z]/.test(password),
    icon: CheckCircle,
  },
  {
    label: 'Pelo menos uma letra minúscula',
    test: (password) => /[a-z]/.test(password),
    icon: CheckCircle,
  },
  {
    label: 'Pelo menos um número',
    test: (password) => /\d/.test(password),
    icon: CheckCircle,
  },
  {
    label: 'Pelo menos um caractere especial',
    test: (password) => /[!@#$%^&*(),.?":{}|<>]/.test(password),
    icon: CheckCircle,
  },
];

export const PasswordStrength: React.FC<PasswordStrengthProps> = ({
  password,
  className,
}) => {
  const passedRules = passwordRules.filter((rule) => rule.test(password));
  const strengthScore = passedRules.length;
  
  const getStrengthLevel = () => {
    if (strengthScore === 0) return { level: 'none', label: '', color: '' };
    if (strengthScore <= 2) return { level: 'weak', label: 'Fraca', color: 'text-red-500' };
    if (strengthScore <= 3) return { level: 'medium', label: 'Média', color: 'text-yellow-500' };
    if (strengthScore <= 4) return { level: 'good', label: 'Boa', color: 'text-blue-500' };
    return { level: 'strong', label: 'Forte', color: 'text-green-500' };
  };

  const strength = getStrengthLevel();

  if (!password) return null;

  return (
    <div className={cn('space-y-3 p-4 bg-muted/30 rounded-lg border', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Força da senha:</span>
        {strength.level !== 'none' && (
          <span className={cn('text-sm font-medium', strength.color)}>
            {strength.label}
          </span>
        )}
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className={cn(
            'h-2 rounded-full transition-all duration-300',
            strengthScore <= 2 && 'bg-red-500',
            strengthScore === 3 && 'bg-yellow-500',
            strengthScore === 4 && 'bg-blue-500',
            strengthScore === 5 && 'bg-green-500'
          )}
          style={{ width: `${(strengthScore / 5) * 100}%` }}
        />
      </div>

      {/* Password rules */}
      <div className="space-y-2">
        {passwordRules.map((rule, index) => {
          const passed = rule.test(password);
          const Icon = passed ? CheckCircle : XCircle;
          
          return (
            <div
              key={index}
              className={cn(
                'flex items-center gap-2 text-xs transition-colors duration-200',
                passed ? 'text-green-600' : 'text-muted-foreground'
              )}
            >
              <Icon className={cn('w-3 h-3', passed ? 'text-green-500' : 'text-muted-foreground')} />
              <span>{rule.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};