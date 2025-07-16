// Interfaces para dados de usuário
export interface UserCreateRequest {
  firstName: string;
  lastName: string;
  loginName: string;
  password: string;
}

export interface UserInfo {
  loginName: string;
  displayName: string;
  email: string;
  distinguished_name: string;
  created_at: Date;
}

export interface UserCreateResponse {
  success: boolean;
  message: string;
  user?: UserInfo;
}

export interface UserExistsResponse {
  exists: boolean;
  loginName: string;
  message: string;
}

export interface PasswordValidationRequest {
  password: string;
}

export interface PasswordValidationResponse {
  valid: boolean;
  message: string;
  requirements: {
    min_length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    numbers: boolean;
    special_chars: boolean;
  };
}

export interface ErrorResponse {
  detail: string;
  error_code?: string;
}

export interface UsernameValidationRequest {
  firstName: string;
  lastName: string;
}

export interface UsernameValidationResponse {
  suggested_username: string;
  message: string;
}

export interface ConnectionTestResponse {
  connection_status: 'success' | 'failed';
  message: string;
  timestamp: string;
}

// Tipos para LDAP
export interface LDAPUser {
  dn: string;
  displayName: string;
  mail: string;
  sAMAccountName: string;
  userPrincipalName: string;
  cn: string;
  givenName: string;
  sn: string;
  objectClass: string[];
  whenCreated: Date;
} 