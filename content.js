// Este arquivo permite que a extensão interaja com as páginas
console.log('Gerenciador de Senhas carregado');

// Escutar mensagens do popup para preencher credenciais
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fillCredentials') {
    const { email, password } = request.data;
    
    // Tentar encontrar campos de email
    const emailSelectors = [
      'input[type="email"]',
      'input[name*="email" i]',
      'input[id*="email" i]',
      'input[name*="user" i]',
      'input[id*="user" i]',
      'input[autocomplete="username"]',
      'input[autocomplete="email"]'
    ];
    
    // Tentar encontrar campos de senha
    const passwordSelectors = [
      'input[type="password"]',
      'input[name*="pass" i]',
      'input[id*="pass" i]',
      'input[autocomplete="current-password"]'
    ];
    
    let emailField = null;
    let passwordField = null;
    
    // Buscar campo de email
    for (const selector of emailSelectors) {
      emailField = document.querySelector(selector);
      if (emailField) break;
    }
    
    // Buscar campo de senha
    for (const selector of passwordSelectors) {
      passwordField = document.querySelector(selector);
      if (passwordField) break;
    }
    
    // Preencher campos
    if (emailField) {
      emailField.value = email;
      emailField.dispatchEvent(new Event('input', { bubbles: true }));
      emailField.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    if (passwordField) {
      passwordField.value = password;
      passwordField.dispatchEvent(new Event('input', { bubbles: true }));
      passwordField.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    if (!emailField && !passwordField) {
      console.warn('Campos de login não encontrados nesta página');
      sendResponse({ success: false, message: 'Campos de login não encontrados' });
    } else {
      sendResponse({ success: true });
    }
    
    return true; // Mantém o canal de mensagem aberto para resposta assíncrona
  }
});
