// Demo utility para testar o backend sem conexão LDAP real
// Remove este arquivo quando tiver um servidor LDAP configurado

export const createDemoEnv = (): void => {
  process.env.AD_SERVER = 'ldap://demo-server:389';
  process.env.AD_DOMAIN = 'demo.local';
  process.env.AD_BASE_DN = 'DC=demo,DC=local';
  process.env.AD_USERNAME = 'admin';
  process.env.AD_PASSWORD = 'password';
  process.env.AD_USE_SSL = 'false';
  process.env.AD_USERS_OU = 'OU=Users,DC=demo,DC=local';
  process.env.SECRET_KEY = 'demo-secret-key';
  process.env.BACKEND_CORS_ORIGINS = 'http://localhost:3000';
  
  console.log('🚀 Demo environment variables set');
  console.log('⚠️  This is for demo purposes only - configure real LDAP server for production');
};

export const demoUsers = [
  {
    loginName: 'john.doe',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@demo.local',
    displayName: 'John Doe'
  },
  {
    loginName: 'jane.smith',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@demo.local',
    displayName: 'Jane Smith'
  }
];

export const isDemoMode = (): boolean => {
  return process.env.AD_SERVER?.includes('demo-server') || false;
}; 