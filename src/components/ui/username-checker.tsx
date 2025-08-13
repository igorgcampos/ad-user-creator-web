import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle, XCircle, Loader2, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UsernameCheckerProps {
  username: string;
  onAvailabilityChange?: (available: boolean | null) => void;
  className?: string;
}

type AvailabilityStatus = 'checking' | 'available' | 'unavailable' | 'error' | null;

export const UsernameChecker: React.FC<UsernameCheckerProps> = ({
  username,
  onAvailabilityChange,
  className,
}) => {
  const [status, setStatus] = useState<AvailabilityStatus>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const checkUsernameAvailability = useCallback(async (usernameToCheck: string) => {
    try {
      setStatus('checking');
      
      const response = await fetch(`/api/v1/users/exists/${encodeURIComponent(usernameToCheck)}`);
      
      if (response.ok) {
        const data = await response.json();
        const isAvailable = !data.exists;
        setStatus(isAvailable ? 'available' : 'unavailable');
        onAvailabilityChange?.(isAvailable);
      } else {
        setStatus('error');
        onAvailabilityChange?.(null);
      }
    } catch (error) {
      setStatus('error');
      onAvailabilityChange?.(null);
    }
  }, [onAvailabilityChange]);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!username || username.length < 3) {
      setStatus(null);
      onAvailabilityChange?.(null);
      return;
    }

    const timer = setTimeout(() => {
      checkUsernameAvailability(username);
    }, 500);

    debounceTimerRef.current = timer;

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [username, checkUsernameAvailability]);

  if (!username || username.length < 3) return null;

  const getStatusDisplay = () => {
    switch (status) {
      case 'checking':
        return {
          icon: Loader2,
          text: 'Verificando disponibilidade...',
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/30',
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
    <div className={cn('flex items-center gap-2 px-3 py-2 rounded-md border text-sm', bgColor, className)}>
      <Icon className={cn('w-4 h-4', color)} {...iconProps} />
      <span className={color}>{text}</span>
    </div>
  );
};