import Joi from 'joi';

// Schema para criação de usuário
export const userCreateSchema = Joi.object({
  firstName: Joi.string()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-ZÀ-ÿ\s\-']+$/)
    .required()
    .messages({
      'string.base': 'Nome deve ser um texto',
      'string.empty': 'Nome é obrigatório',
      'string.min': 'Nome deve ter pelo menos 2 caracteres',
      'string.max': 'Nome deve ter no máximo 50 caracteres',
      'string.pattern.base': 'Nome contém caracteres inválidos',
      'any.required': 'Nome é obrigatório'
    }),

  lastName: Joi.string()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-ZÀ-ÿ\s\-']+$/)
    .required()
    .messages({
      'string.base': 'Sobrenome deve ser um texto',
      'string.empty': 'Sobrenome é obrigatório',
      'string.min': 'Sobrenome deve ter pelo menos 2 caracteres',
      'string.max': 'Sobrenome deve ter no máximo 50 caracteres',
      'string.pattern.base': 'Sobrenome contém caracteres inválidos',
      'any.required': 'Sobrenome é obrigatório'
    }),

  loginName: Joi.string()
    .min(3)
    .max(50)
    .pattern(/^[a-zA-Z0-9._-]+$/)
    .custom((value, helpers) => {
      if (value.includes('..') || value.startsWith('.') || value.endsWith('.')) {
        return helpers.error('string.dotRule');
      }
      return value.toLowerCase();
    })
    .required()
    .messages({
      'string.base': 'Nome de login deve ser um texto',
      'string.empty': 'Nome de login é obrigatório',
      'string.min': 'Nome de login deve ter pelo menos 3 caracteres',
      'string.max': 'Nome de login deve ter no máximo 50 caracteres',
      'string.pattern.base': 'Nome de login deve conter apenas letras, números, pontos, traços e sublinhados',
      'string.dotRule': 'Nome de login não pode começar/terminar com ponto ou ter pontos consecutivos',
      'any.required': 'Nome de login é obrigatório'
    }),

  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).*$/)
    .required()
    .messages({
      'string.base': 'Senha deve ser um texto',
      'string.empty': 'Senha é obrigatória',
      'string.min': 'Senha deve ter pelo menos 8 caracteres',
      'string.pattern.base': 'Senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial',
      'any.required': 'Senha é obrigatória'
    })
});

// Schema para validação de senha
export const passwordValidationSchema = Joi.object({
  password: Joi.string()
    .min(1)
    .required()
    .messages({
      'string.base': 'Senha deve ser um texto',
      'string.empty': 'Senha é obrigatória',
      'any.required': 'Senha é obrigatória'
    })
});

// Schema para sugestão de nome de usuário
export const usernameValidationSchema = Joi.object({
  firstName: Joi.string()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-ZÀ-ÿ\s\-']+$/)
    .required()
    .messages({
      'string.base': 'Nome deve ser um texto',
      'string.empty': 'Nome é obrigatório',
      'string.min': 'Nome deve ter pelo menos 2 caracteres',
      'string.max': 'Nome deve ter no máximo 50 caracteres',
      'string.pattern.base': 'Nome contém caracteres inválidos',
      'any.required': 'Nome é obrigatório'
    }),

  lastName: Joi.string()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-ZÀ-ÿ\s\-']+$/)
    .required()
    .messages({
      'string.base': 'Sobrenome deve ser um texto',
      'string.empty': 'Sobrenome é obrigatório',
      'string.min': 'Sobrenome deve ter pelo menos 2 caracteres',
      'string.max': 'Sobrenome deve ter no máximo 50 caracteres',
      'string.pattern.base': 'Sobrenome contém caracteres inválidos',
      'any.required': 'Sobrenome é obrigatório'
    })
});

// Schema para validação de parâmetros de rota
export const loginNameParamSchema = Joi.object({
  loginName: Joi.string()
    .min(3)
    .max(50)
    .pattern(/^[a-zA-Z0-9._-]+$/)
    .required()
    .messages({
      'string.base': 'Nome de login deve ser um texto',
      'string.empty': 'Nome de login é obrigatório',
      'string.min': 'Nome de login deve ter pelo menos 3 caracteres',
      'string.max': 'Nome de login deve ter no máximo 50 caracteres',
      'string.pattern.base': 'Nome de login deve conter apenas letras, números, pontos, traços e sublinhados',
      'any.required': 'Nome de login é obrigatório'
    })
}); 