import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { PasswordStrength } from '@/components/ui/password-strength';
import { UsernameChecker } from '@/components/ui/username-checker';
import { LoadingDots } from '@/components/ui/loading-dots';
// import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Users, Eye, EyeOff, Shield, UserPlus, Sparkles, CheckCircle2 } from 'lucide-react';

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

interface FormTouched {
  firstName: boolean;
  lastName: boolean;
  loginName: boolean;
  password: boolean;
}

type FormStep = 'personal' | 'account' | 'review';

export const UserCreationForm = () => {
  const [formData, setFormData] = useState<UserFormData>({
    firstName: '',
    lastName: '',
    loginName: '',
    password: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<FormTouched>({
    firstName: false,
    lastName: false,
    loginName: false,
    password: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState<FormStep>('personal');
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);
  const { toast } = useToast();

  const validateField = useCallback((field: keyof UserFormData, value: string): string | undefined => {
    switch (field) {
      case 'firstName':
        if (!value.trim()) return 'Nome é obrigatório';
        if (value.trim().length < 2) return 'Nome deve ter pelo menos 2 caracteres';
        break;
      case 'lastName':
        if (!value.trim()) return 'Sobrenome é obrigatório';
        if (value.trim().length < 2) return 'Sobrenome deve ter pelo menos 2 caracteres';
        break;
      case 'loginName':
        if (!value.trim()) return 'Nome da conta é obrigatório';
        if (value.length < 3) return 'Nome da conta deve ter pelo menos 3 caracteres';
        if (!/^[a-zA-Z0-9._-]+$/.test(value)) {
          return 'Use apenas letras, números, pontos, traços e sublinhados';
        }
        if (isUsernameAvailable === false) return 'Este nome de usuário já está em uso';
        break;
      case 'password':
        if (!value) return 'Senha é obrigatória';
        if (value.length < 8) return 'Senha deve ter pelo menos 8 caracteres';
        break;
    }
    return undefined;
  }, [isUsernameAvailable]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    (Object.keys(formData) as Array<keyof UserFormData>).forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) newErrors[field] = error;
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof UserFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Mark field as touched
    setTouched(prev => ({
      ...prev,
      [field]: true
    }));

    // Real-time validation
    const error = validateField(field, value);
    setErrors(prev => ({
      ...prev,
      [field]: error
    }));
  };

  const handleFieldBlur = (field: keyof UserFormData) => {
    setTouched(prev => ({
      ...prev,
      [field]: true
    }));
    
    const error = validateField(field, formData[field]);
    setErrors(prev => ({
      ...prev,
      [field]: error
    }));
  };

  const generateLoginSuggestion = async () => {
    if (!formData.firstName || !formData.lastName) return;
    
    setIsGeneratingSuggestion(true);
    
    try {
      const response = await fetch(`/api/v1/users/suggest-username/${encodeURIComponent(formData.firstName)}/${encodeURIComponent(formData.lastName)}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.suggestions && data.suggestions.length > 0) {
          handleInputChange('loginName', data.suggestions[0]);
          toast({
            title: 'Sugestão gerada',
            description: `Nome de usuário "${data.suggestions[0]}" foi sugerido e está disponível.`,
          });
        }
      } else {
        // Fallback to simple suggestion
        const suggestion = `${formData.firstName.toLowerCase()}.${formData.lastName.toLowerCase()}`;
        handleInputChange('loginName', suggestion);
      }
    } catch (error) {
      // Fallback to simple suggestion
      const suggestion = `${formData.firstName.toLowerCase()}.${formData.lastName.toLowerCase()}`;
      handleInputChange('loginName', suggestion);
    } finally {
      setIsGeneratingSuggestion(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: 'Formulário incompleto',
        description: 'Por favor, corrija os erros antes de continuar.',
        variant: 'destructive',
      });
      return;
    }

    if (isUsernameAvailable === false) {
      toast({
        title: 'Nome de usuário indisponível',
        description: 'O nome de usuário escolhido já está em uso. Escolha outro.',
        variant: 'destructive',
      });
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

  const getStepProgress = () => {
    if (currentStep === 'personal') return 33;
    if (currentStep === 'account') return 66;
    return 100;
  };

  return (
    <div className="min-h-screen py-4 sm:py-8 px-4">
      <div className="max-w-2xl mx-auto slide-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-between items-center mb-6 scale-in">
            <div className="flex-1" />
            <div className="flex justify-center">
              <div className="p-4 bg-gradient-admin rounded-2xl shadow-admin relative">
                <Users className="w-10 h-10 text-admin-primary-foreground" />
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-admin-success rounded-full flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
              </div>
            </div>
            <div className="flex-1 flex justify-end">
              {/* <ThemeToggle /> */}
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-3 bg-gradient-to-r from-admin-primary to-admin-primary/70 bg-clip-text text-transparent">
            Criação de Usuários AD
          </h1>
          <p className="text-lg text-muted-foreground mb-6">
            Sistema administrativo para criação de contas no Active Directory
          </p>
          
          {/* Progress indicator */}
          <div className="max-w-md mx-auto scale-in">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Progresso</span>
              <span className="text-sm font-medium text-admin-primary">{getStepProgress()}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-gradient-admin h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${getStepProgress()}%` }}
              />
            </div>
          </div>
        </div>

        {/* Form Card */}
        <Card className="bg-gradient-card shadow-card-admin border-border card-enhanced backdrop-blur-sm">
          <CardHeader className="text-center pb-6 px-4 sm:px-6">
            <CardTitle className="flex items-center justify-center gap-3 text-2xl">
              <UserPlus className="w-6 h-6 text-admin-primary" />
              Novo Usuário
            </CardTitle>
            <CardDescription className="text-base">
              Preencha os campos abaixo para criar uma nova conta no Active Directory
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 sm:space-y-8 px-4 sm:px-6">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Nome e Sobrenome */}
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground mb-2">Informações Pessoais</h3>
                  <p className="text-sm text-muted-foreground">Dados básicos do usuário</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="form-field-wrapper">
                    <Label htmlFor="firstName" className="text-sm font-medium">Nome *</Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      onBlur={() => handleFieldBlur('firstName')}
                      placeholder="Ex: João"
                      className={`input-enhanced ${
                        errors.firstName && touched.firstName ? 'border-destructive focus:border-destructive' : 
                        !errors.firstName && touched.firstName && formData.firstName ? 'border-admin-success focus:border-admin-success' : ''
                      }`}
                      aria-describedby={errors.firstName ? 'firstName-error' : undefined}
                      aria-invalid={!!errors.firstName}
                    />
                    {errors.firstName && touched.firstName && (
                      <p id="firstName-error" className="text-sm text-destructive flex items-center gap-1">
                        <span className="w-4 h-4 rounded-full bg-destructive/20 flex items-center justify-center text-xs">!</span>
                        {errors.firstName}
                      </p>
                    )}
                    {!errors.firstName && touched.firstName && formData.firstName && (
                      <p className="text-sm text-admin-success flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        Perfeito!
                      </p>
                    )}
                  </div>

                  <div className="form-field-wrapper">
                    <Label htmlFor="lastName" className="text-sm font-medium">Sobrenome *</Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      onBlur={() => handleFieldBlur('lastName')}
                      placeholder="Ex: Silva"
                      className={`input-enhanced ${
                        errors.lastName && touched.lastName ? 'border-destructive focus:border-destructive' : 
                        !errors.lastName && touched.lastName && formData.lastName ? 'border-admin-success focus:border-admin-success' : ''
                      }`}
                      aria-describedby={errors.lastName ? 'lastName-error' : undefined}
                      aria-invalid={!!errors.lastName}
                    />
                    {errors.lastName && touched.lastName && (
                      <p id="lastName-error" className="text-sm text-destructive flex items-center gap-1">
                        <span className="w-4 h-4 rounded-full bg-destructive/20 flex items-center justify-center text-xs">!</span>
                        {errors.lastName}
                      </p>
                    )}
                    {!errors.lastName && touched.lastName && formData.lastName && (
                      <p className="text-sm text-admin-success flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        Perfeito!
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Nome da conta */}
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground mb-2">Conta de Usuário</h3>
                  <p className="text-sm text-muted-foreground">Definições de acesso e segurança</p>
                </div>
                
                <div className="form-field-wrapper">
                  <Label htmlFor="loginName" className="text-sm font-medium">Nome da conta de logon *</Label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      id="loginName"
                      type="text"
                      value={formData.loginName}
                      onChange={(e) => handleInputChange('loginName', e.target.value)}
                      onBlur={() => handleFieldBlur('loginName')}
                      placeholder="Ex: joao.silva"
                      className={`input-enhanced flex-1 ${
                        errors.loginName && touched.loginName ? 'border-destructive focus:border-destructive' : 
                        !errors.loginName && touched.loginName && formData.loginName && isUsernameAvailable ? 'border-admin-success focus:border-admin-success' : ''
                      }`}
                      aria-describedby="loginName-help loginName-error"
                      aria-invalid={!!errors.loginName}
                    />
                    <Button
                      type="button"
                      variant="admin-outline"
                      size="default"
                      onClick={generateLoginSuggestion}
                      disabled={!formData.firstName || !formData.lastName || isGeneratingSuggestion}
                      className="shrink-0 w-full sm:w-auto"
                    >
                      {isGeneratingSuggestion ? (
                        <LoadingDots size="sm" className="text-admin-primary" />
                      ) : (
                        'Sugerir'
                      )}
                    </Button>
                  </div>
                  
                  {formData.loginName && (
                    <UsernameChecker
                      username={formData.loginName}
                      onAvailabilityChange={setIsUsernameAvailable}
                      className="mt-2"
                    />
                  )}
                  
                  {errors.loginName && touched.loginName && (
                    <p id="loginName-error" className="text-sm text-destructive flex items-center gap-1">
                      <span className="w-4 h-4 rounded-full bg-destructive/20 flex items-center justify-center text-xs">!</span>
                      {errors.loginName}
                    </p>
                  )}
                  
                  {!errors.loginName && touched.loginName && formData.loginName && isUsernameAvailable && (
                    <p className="text-sm text-admin-success flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Nome de usuário disponível!
                    </p>
                  )}
                  
                  <p id="loginName-help" className="text-xs text-muted-foreground">
                    Use apenas letras, números, pontos, traços e sublinhados
                  </p>
                </div>
              </div>

              {/* Senha */}
              <div className="form-field-wrapper">
                <Label htmlFor="password" className="text-sm font-medium">Senha *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    onBlur={() => handleFieldBlur('password')}
                    placeholder="Digite uma senha segura"
                    className={`input-enhanced pr-12 ${
                      errors.password && touched.password ? 'border-destructive focus:border-destructive' : 
                      !errors.password && touched.password && formData.password ? 'border-admin-success focus:border-admin-success' : ''
                    }`}
                    aria-describedby={errors.password ? 'password-error' : 'password-strength'}
                    aria-invalid={!!errors.password}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                {formData.password && (
                  <PasswordStrength password={formData.password} />
                )}
                
                {errors.password && touched.password && (
                  <p id="password-error" className="text-sm text-destructive flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-destructive/20 flex items-center justify-center text-xs">!</span>
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Security Notice */}
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground mb-2">Confirmação</h3>
                  <p className="text-sm text-muted-foreground">Revise as informações antes de criar a conta</p>
                </div>
                
                <div className="flex items-start gap-4 p-6 bg-gradient-to-r from-admin-accent/10 to-admin-accent/5 rounded-xl border border-admin-accent/20">
                  <div className="p-2 bg-admin-primary/10 rounded-lg">
                    <Shield className="w-6 h-6 text-admin-primary flex-shrink-0" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-admin-primary mb-2">Aviso de Segurança</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Esta operação criará uma nova conta no Active Directory local. 
                      Certifique-se de que todos os dados estão corretos antes de prosseguir, 
                      pois algumas alterações podem requerer privilégios administrativos adicionais.
                    </p>
                    
                    {/* Summary */}
                    {formData.firstName && formData.lastName && formData.loginName && (
                      <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                        <p className="text-xs font-medium text-muted-foreground mb-2">RESUMO DA CONTA:</p>
                        <p className="text-sm">
                          <span className="font-medium">{formData.firstName} {formData.lastName}</span> 
                          <span className="text-muted-foreground"> • </span>
                          <span className="font-mono text-admin-primary">{formData.loginName}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <Button
                  type="submit"
                  variant="admin"
                  size="lg"
                  disabled={isLoading || !validateForm() || isUsernameAvailable === false}
                  className="w-full relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  {isLoading ? (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-admin-primary-foreground border-t-transparent rounded-full animate-spin" />
                      <span>Criando usuário</span>
                      <LoadingDots size="sm" className="text-admin-primary-foreground" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <UserPlus className="w-5 h-5" />
                      <span className="font-semibold">Criar Usuário no Active Directory</span>
                    </div>
                  )}
                </Button>
                
                <p className="text-xs text-center text-muted-foreground mt-3">
                  Ao criar a conta, você concorda com as políticas de segurança da organização
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-12 space-y-4">
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 bg-admin-success rounded-full animate-pulse" />
              Sistema ativo
            </span>
            <span>•</span>
            <span>Active Directory Management</span>
            <span>•</span>
            <span>Versão 2.0</span>
          </div>
          <p className="text-xs text-muted-foreground/70">
            Desenvolvido com segurança e confiabilidade em mente
          </p>
        </div>
      </div>
    </div>
  );
};