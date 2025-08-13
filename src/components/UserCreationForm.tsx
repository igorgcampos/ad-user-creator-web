import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Users, Eye, EyeOff, Shield, UserPlus } from 'lucide-react';

interface UserFormData {
  firstName: string;
  lastName: string;
  loginName: string;
  password: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  loginName?: string;
  password?: string;
}

export const UserCreationForm = () => {
  const [formData, setFormData] = useState<UserFormData>({
    firstName: '',
    lastName: '',
    loginName: '',
    password: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Nome é obrigatório';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Sobrenome é obrigatório';
    }

    if (!formData.loginName.trim()) {
      newErrors.loginName = 'Nome da conta é obrigatório';
    } else if (!/^[a-zA-Z0-9._-]+$/.test(formData.loginName)) {
      newErrors.loginName = 'Nome da conta deve conter apenas letras, números, pontos, traços e sublinhados';
    }

    if (!formData.password) {
      newErrors.password = 'Senha é obrigatória';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Senha deve ter pelo menos 8 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof UserFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const generateLoginSuggestion = () => {
    if (formData.firstName && formData.lastName) {
      const suggestion = `${formData.firstName.toLowerCase()}.${formData.lastName.toLowerCase()}`;
      setFormData(prev => ({
        ...prev,
        loginName: suggestion
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Chamada da API - usa proxy do Nginx quando em produção
      const apiUrl = '';
      const response = await fetch(`${apiUrl}/api/v1/users/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Usuário criado com sucesso!',
          description: data.message || `A conta ${formData.loginName} foi criada no Active Directory.`,
        });

        // Limpar formulário
        setFormData({
          firstName: '',
          lastName: '',
          loginName: '',
          password: ''
        });
      } else {
        // Trata diferentes tipos de erro
        if (response.status === 409) {
          toast({
            title: 'Usuário já existe',
            description: data.detail || 'Este nome de usuário já está em uso.',
            variant: 'destructive',
          });
        } else if (response.status === 400) {
          toast({
            title: 'Dados inválidos',
            description: data.detail || 'Verifique os dados inseridos.',
            variant: 'destructive',
          });
        } else if (response.status === 503) {
          toast({
            title: 'Erro de conexão',
            description: data.detail || 'Não foi possível conectar ao Active Directory.',
            variant: 'destructive',
          });
        } else {
          throw new Error(data.detail || 'Erro ao criar usuário');
        }
      }
    } catch (error) {
      toast({
        title: 'Erro ao criar usuário',
        description: error instanceof Error ? error.message : 'Não foi possível criar o usuário no Active Directory. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-gradient-admin rounded-full shadow-admin">
              <Users className="w-8 h-8 text-admin-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Criação de Usuários AD
          </h1>
          <p className="text-muted-foreground">
            Sistema administrativo para criação de contas no Active Directory
          </p>
        </div>

        {/* Form Card */}
        <Card className="bg-gradient-card shadow-card-admin border-border">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <UserPlus className="w-5 h-5" />
              Novo Usuário
            </CardTitle>
            <CardDescription>
              Preencha os campos abaixo para criar uma nova conta no Active Directory
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nome e Sobrenome */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nome *</Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="Ex: João"
                    className={errors.firstName ? 'border-destructive' : ''}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-destructive">{errors.firstName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Sobrenome *</Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="Ex: Silva"
                    className={errors.lastName ? 'border-destructive' : ''}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-destructive">{errors.lastName}</p>
                  )}
                </div>
              </div>

              {/* Nome da conta */}
              <div className="space-y-2">
                <Label htmlFor="loginName">Nome da conta de logon *</Label>
                <div className="flex gap-2">
                  <Input
                    id="loginName"
                    type="text"
                    value={formData.loginName}
                    onChange={(e) => handleInputChange('loginName', e.target.value)}
                    placeholder="Ex: joao.silva"
                    className={errors.loginName ? 'border-destructive' : ''}
                  />
                  <Button
                    type="button"
                    variant="admin-outline"
                    size="sm"
                    onClick={generateLoginSuggestion}
                    disabled={!formData.firstName || !formData.lastName}
                  >
                    Sugerir
                  </Button>
                </div>
                {errors.loginName && (
                  <p className="text-sm text-destructive">{errors.loginName}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Use apenas letras, números, pontos, traços e sublinhados
                </p>
              </div>

              {/* Senha */}
              <div className="space-y-2">
                <Label htmlFor="password">Senha *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="Digite uma senha segura"
                    className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Mínimo de 8 caracteres
                </p>
              </div>

              {/* Security Notice */}
              <div className="flex items-start gap-3 p-4 bg-admin-accent/20 rounded-lg border border-admin-accent/30">
                <Shield className="w-5 h-5 text-admin-primary mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-admin-primary mb-1">Aviso de Segurança</p>
                  <p className="text-muted-foreground">
                    Esta operação criará uma nova conta no Active Directory local. 
                    Certifique-se de que os dados estão corretos antes de prosseguir.
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="admin"
                size="lg"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-admin-primary-foreground border-t-transparent rounded-full animate-spin" />
                    Criando usuário...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Criar Usuário no AD
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>Sistema administrativo interno • Active Directory Management</p>
        </div>
      </div>
    </div>
  );
};