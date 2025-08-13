import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UsernameCheckerProps {
  username: string;
  onAvailabilityChange?: (available: boolean | null) => void;
  className?: string;
}

type AvailabilityStatus = 'checking' | 'available' | 'unavailable' | 'error' | null;

export const UsernameCheckerSimple: React.FC<UsernameCheckerProps> = ({
  username,
  onAvailabilityChange,
  className,
}) => {
  const [status, setStatus] = useState<AvailabilityStatus>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentUsernameRef = useRef<string>('');

  const checkUsernameAvailability = async (usernameToCheck: string) => {
    // Evita checagens desnecessárias
    if (currentUsernameRef.current === usernameToCheck) return;
    currentUsernameRef.current = usernameToCheck;

    try {
      setStatus('checking');
      
      const response = await fetch(`/api/v1/users/exists/${encodeURIComponent(usernameToCheck)}`);
      
      if (response.ok) {
        const data = await response.json();
        const isAvailable = !data.exists;
        setStatus(isAvailable ? 'available' : 'unavailable');
        if (onAvailabilityChange) {
          onAvailabilityChange(isAvailable);
        }
      } else {
        setStatus('error');
        if (onAvailabilityChange) {
          onAvailabilityChange(null);
        }
      }
    } catch (error) {
      setStatus('error');
      if (onAvailabilityChange) {
        onAvailabilityChange(null);
      }
    }
  };

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!username || username.length < 3) {
      setStatus(null);
      currentUsernameRef.current = '';
      if (onAvailabilityChange) {
        onAvailabilityChange(null);
      }
      return;
    }

    // Debounce de 800ms para reduzir chamadas à API
    const timer = setTimeout(() => {
      checkUsernameAvailability(username);
    }, 800);

    debounceTimerRef.current = timer;

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [username]); // Só depende do username

  if (!username || username.length < 3) return null;

  const getStatusDisplay = () => {
    switch (status) {
      case 'checking':
        return {
          icon: Loader2,
          text: 'Verificando disponibilidade...',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 border-blue-200',
          iconProps: { className: 'animate-spin' },
        };
      case 'available':
        return {
          icon: CheckCircle,
          text: 'Nome de usuário disponível',
          color: 'text-green-600',
          bgColor: 'bg-green-50 border-green-200',
          iconProps: {},
        };
      case 'unavailable':
        return {
          icon: XCircle,
          text: 'Nome de usuário já existe',
          color: 'text-red-600',
          bgColor: 'bg-red-50 border-red-200',
          iconProps: {},
        };
      case 'error':
        return {
          icon: XCircle,
          text: 'Erro ao verificar disponibilidade',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50 border-yellow-200',
          iconProps: {},
        };
      default:
        return null;
    }
  };

  const statusDisplay = getStatusDisplay();

  if (!statusDisplay) return null;

  const { icon: Icon, text, color, bgColor, iconProps } = statusDisplay;

  return (
    <div className={cn('flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition-all duration-200', bgColor, className)}>
      <Icon className={cn('w-4 h-4', color)} {...iconProps} />
      <span className={color}>{text}</span>
    </div>
  );
};