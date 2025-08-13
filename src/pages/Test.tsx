import React from 'react';

const Test = () => {
  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <h1 style={{ color: '#333' }}>Teste de Carregamento</h1>
      <p style={{ color: '#666' }}>Se você consegue ver esta página, o React está funcionando!</p>
      <div style={{ border: '1px solid #ccc', padding: '10px', marginTop: '20px' }}>
        <strong>Status:</strong> Aplicação carregada com sucesso
      </div>
    </div>
  );
};

export default Test;