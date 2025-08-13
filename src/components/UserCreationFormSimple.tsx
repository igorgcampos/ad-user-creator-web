import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { PasswordStrengthSimple } from '@/components/ui/password-strength-simple';
import { UsernameCheckerSimple } from '@/components/ui/username-checker-simple';
import { ThemeToggleSimple } from '@/components/ui/theme-toggle-simple';
import { Users, Eye, EyeOff } from 'lucide-react';

interface UserFormData {
  firstName: string;
  lastName: string;
  loginName: string;
  password: string;
}

export const UserCreationFormSimple = () => {
  const [formData, setFormData] = useState<UserFormData>({
    firstName: '',
    lastName: '',
    loginName: '',
    password: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
  const { toast } = useToast();

  const handleInputChange = (field: keyof UserFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.loginName || !formData.password) {
      toast({
        title: 'Erro de validação',
        description: 'Todos os campos são obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/v1/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: 'Usuário criado com sucesso!',
          description: `O usuário ${formData.loginName} foi criado no Active Directory.`,
        });
        
        // Reset form
        setFormData({
          firstName: '',
          lastName: '',
          loginName: '',
          password: ''
        });
      } else {
        const error = await response.json();
        toast({
          title: 'Erro ao criar usuário',
          description: error.message || 'Falha na criação do usuário.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro de conexão',
        description: 'Não foi possível conectar ao servidor.',
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
          <CardHeader className="space-y-1 pb-8 relative">
            <div className="absolute top-4 right-4">
              <ThemeToggleSimple />
            </div>
            <div className="flex items-center justify-center mb-6">
              <div className="bg-gradient-to-r from-red-600 to-red-500 p-3 rounded-full" style={{background: 'linear-gradient(to right, #e53935, #f44336)'}}>
                <Users className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent" style={{background: 'linear-gradient(to right, #e53935, #f44336)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>
              Criação de Usuários AD
            </CardTitle>
            <CardDescription className="text-center text-lg text-muted-foreground">
              Crie novos usuários no Active Directory de forma simples e segura
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-medium">
                    Nome *
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="Digite o nome"
                    className="h-11"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm font-medium">
                    Sobrenome *
                  </Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="Digite o sobrenome"
                    className="h-11"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="loginName" className="text-sm font-medium">
                  Nome da Conta *
                </Label>
                <Input
                  id="loginName"
                  type="text"
                  value={formData.loginName}
                  onChange={(e) => handleInputChange('loginName', e.target.value)}
                  placeholder="Digite o nome de usuário"
                  className="h-11"
                  required
                />
                {formData.loginName && formData.loginName.length >= 3 && (
                  <UsernameCheckerSimple 
                    username={formData.loginName}
                    onAvailabilityChange={setIsUsernameAvailable}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Senha *
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="Digite a senha"
                    className="h-11 pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-11 w-11 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {formData.password && (
                  <PasswordStrengthSimple password={formData.password} />
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-white font-semibold text-lg shadow-lg transition-all duration-200"
                style={{
                  background: 'linear-gradient(to right, #e53935, #f44336)',
                  ':hover': {
                    background: 'linear-gradient(to right, #d32f2f, #e53935)'
                  }
                }}
                disabled={isLoading}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(to right, #d32f2f, #e53935)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(to right, #e53935, #f44336)';
                }}
              >
                {isLoading ? 'Criando usuário...' : 'Criar Usuário'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};