let folders = [];
let currentFolderId = null;

// Carregar dados salvos
chrome.storage.local.get(['folders'], (result) => {
  folders = result.folders || [];
  renderFolders();
});

// Função para escapar HTML e prevenir XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Renderizar pastas
function renderFolders() {
  const foldersList = document.getElementById('foldersList');
  const emptyState = document.getElementById('emptyState');
  
  if (folders.length === 0) {
    emptyState.style.display = 'block';
    foldersList.innerHTML = '';
    return;
  }
  
  emptyState.style.display = 'none';
  foldersList.innerHTML = folders.map((folder, index) => `
    <div class="folder" data-folder-index="${index}">
      <div class="folder-header" data-action="toggle">
        <div class="folder-name">
          <span class="material-icons" style="font-size: 18px; vertical-align: middle; margin-right: 5px;">folder</span>
          ${escapeHtml(folder.name)}
          <span style="font-size: 11px; opacity: 0.6;">(${folder.accounts.length})</span>
        </div>
        <div class="folder-actions">
          <button class="icon-btn" data-action="add-account" data-folder-index="${index}" title="Adicionar conta">
            <span class="material-icons">add</span>
          </button>
          <button class="icon-btn" data-action="delete-folder" data-folder-index="${index}" title="Excluir pasta">
            <span class="material-icons">delete</span>
          </button>
        </div>
      </div>
      <div class="accounts-list" id="accounts-${index}">
        ${folder.accounts.map((account, accIndex) => `
          <div class="account-item" data-folder-index="${index}" data-account-index="${accIndex}">
            <div class="account-info">
              <div class="account-title">${escapeHtml(account.title || account.email)}</div>
              <div class="account-email">
                <span class="material-icons" style="font-size: 12px; vertical-align: middle; margin-right: 5px; opacity: 0.6;">email</span>
                ${escapeHtml(account.email)}
              </div>
              <div class="account-password">••••••••</div>
            </div>
            <div style="display: flex; gap: 5px;">
              <button class="icon-btn" data-action="edit-account" data-folder-index="${index}" data-account-index="${accIndex}" title="Editar conta">
                <span class="material-icons">edit</span>
              </button>
              <button class="icon-btn" data-action="delete-account" data-folder-index="${index}" data-account-index="${accIndex}" title="Excluir conta">
                <span class="material-icons">delete</span>
              </button>
            </div>
          </div>
        `).join('')}
        ${folder.accounts.length === 0 ? '<div style="padding: 15px; text-align: center; color: #888; font-size: 12px;">Nenhuma conta adicionada</div>' : ''}
      </div>
    </div>
  `).join('');
  
  // Event delegation para todas as ações
  foldersList.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    const folderBtn = e.target.closest('.folder-header[data-action]');
    
    if (folderBtn && action === 'toggle') {
      const folderIndex = parseInt(folderBtn.closest('.folder').dataset.folderIndex);
      toggleFolder(folderIndex);
      return;
    }
    
    if (action === 'add-account') {
      const folderIndex = parseInt(e.target.closest('[data-folder-index]').dataset.folderIndex);
      e.stopPropagation();
      openAccountModal(folderIndex);
      return;
    }
    
    if (action === 'delete-folder') {
      const folderIndex = parseInt(e.target.closest('[data-folder-index]').dataset.folderIndex);
      e.stopPropagation();
      deleteFolder(folderIndex);
      return;
    }
    
    if (action === 'edit-account') {
      const btn = e.target.closest('[data-action="edit-account"]');
      const folderIndex = parseInt(btn.dataset.folderIndex);
      const accountIndex = parseInt(btn.dataset.accountIndex);
      e.stopPropagation();
      editAccount(folderIndex, accountIndex);
      return;
    }
    
    if (action === 'delete-account') {
      const btn = e.target.closest('[data-action="delete-account"]');
      const folderIndex = parseInt(btn.dataset.folderIndex);
      const accountIndex = parseInt(btn.dataset.accountIndex);
      e.stopPropagation();
      deleteAccount(folderIndex, accountIndex);
      return;
    }
    
    // Clique no item de conta para preencher
    const accountItem = e.target.closest('.account-item');
    if (accountItem && !e.target.closest('.icon-btn')) {
      const folderIndex = parseInt(accountItem.dataset.folderIndex);
      const accountIndex = parseInt(accountItem.dataset.accountIndex);
      
      if (folderIndex >= 0 && folderIndex < folders.length && 
          folders[folderIndex] && accountIndex >= 0 && accountIndex < folders[folderIndex].accounts.length) {
        const account = folders[folderIndex].accounts[accountIndex];
        fillCredentials(account.email, account.password);
      }
    }
  });
}

// Toggle pasta
function toggleFolder(index) {
  if (index < 0 || index >= folders.length) {
    console.error('Índice de pasta inválido:', index);
    return;
  }
  const accountsList = document.getElementById(`accounts-${index}`);
  if (accountsList) {
    accountsList.classList.toggle('open');
  }
}

// Abrir modal de nova pasta
document.getElementById('newFolderBtn').addEventListener('click', () => {
  document.getElementById('folderModal').classList.add('show');
  document.getElementById('folderNameInput').value = '';
  document.getElementById('folderNameInput').focus();
});

// Salvar pasta
document.getElementById('saveFolderBtn').addEventListener('click', () => {
  const name = document.getElementById('folderNameInput').value.trim();
  
  if (!name) {
    alert('Por favor, digite um nome para a pasta');
    return;
  }
  
  folders.push({
    name: name,
    accounts: []
  });
  
  chrome.storage.local.set({ folders }, () => {
    if (chrome.runtime.lastError) {
      alert('Erro ao salvar: ' + chrome.runtime.lastError.message);
      return;
    }
    renderFolders();
    document.getElementById('folderModal').classList.remove('show');
  });
});

// Cancelar pasta
document.getElementById('cancelFolderBtn').addEventListener('click', () => {
  document.getElementById('folderModal').classList.remove('show');
});

let currentAccountIndex = null; // Para edição

// Abrir modal de nova conta
function openAccountModal(folderId) {
  if (folderId < 0 || folderId >= folders.length) {
    alert('Erro: Pasta não encontrada');
    return;
  }
  currentFolderId = folderId;
  currentAccountIndex = null; // Nova conta
  document.getElementById('accountModalTitle').textContent = 'Nova Conta';
  document.getElementById('accountTitleInput').value = '';
  document.getElementById('accountEmailInput').value = '';
  document.getElementById('accountPasswordInput').value = '';
  document.getElementById('accountModal').classList.add('show');
  document.getElementById('accountTitleInput').focus();
}

// Editar conta
function editAccount(folderIndex, accountIndex) {
  if (folderIndex < 0 || folderIndex >= folders.length) {
    alert('Erro: Pasta não encontrada');
    return;
  }
  if (!folders[folderIndex] || accountIndex < 0 || accountIndex >= folders[folderIndex].accounts.length) {
    alert('Erro: Conta não encontrada');
    return;
  }
  
  const account = folders[folderIndex].accounts[accountIndex];
  currentFolderId = folderIndex;
  currentAccountIndex = accountIndex;
  
  document.getElementById('accountModalTitle').textContent = 'Editar Conta';
  document.getElementById('accountTitleInput').value = account.title || '';
  document.getElementById('accountEmailInput').value = account.email || '';
  document.getElementById('accountPasswordInput').value = account.password || '';
  document.getElementById('accountModal').classList.add('show');
  document.getElementById('accountTitleInput').focus();
}

// Salvar conta
document.getElementById('saveAccountBtn').addEventListener('click', () => {
  const title = document.getElementById('accountTitleInput').value.trim();
  const email = document.getElementById('accountEmailInput').value.trim();
  const password = document.getElementById('accountPasswordInput').value.trim();
  
  if (!email || !password) {
    alert('Por favor, preencha email e senha');
    return;
  }
  
  if (currentFolderId === null || currentFolderId === undefined || !folders[currentFolderId]) {
    alert('Erro: Pasta não encontrada. Por favor, tente novamente.');
    return;
  }
  
  const accountData = { 
    email, 
    password,
    ...(title && { title }) // Só adiciona title se não estiver vazio
  };
  
  // Se está editando
  if (currentAccountIndex !== null && currentAccountIndex !== undefined) {
    folders[currentFolderId].accounts[currentAccountIndex] = accountData;
  } else {
    // Nova conta
    folders[currentFolderId].accounts.push(accountData);
  }
  
  chrome.storage.local.set({ folders }, () => {
    if (chrome.runtime.lastError) {
      alert('Erro ao salvar: ' + chrome.runtime.lastError.message);
      return;
    }
    renderFolders();
    
    // Abrir a pasta automaticamente após adicionar/editar conta
    if (currentAccountIndex === null) {
      // Se é uma nova conta, abrir a pasta
      const accountsList = document.getElementById(`accounts-${currentFolderId}`);
      if (accountsList) {
        accountsList.classList.add('open');
      }
    }
    
    document.getElementById('accountModal').classList.remove('show');
  });
});

// Cancelar conta
document.getElementById('cancelAccountBtn').addEventListener('click', () => {
  document.getElementById('accountModal').classList.remove('show');
});

// Deletar pasta
function deleteFolder(index) {
  if (index < 0 || index >= folders.length) {
    alert('Erro: Pasta não encontrada');
    return;
  }
  if (confirm('Tem certeza que deseja excluir esta pasta e todas as contas?')) {
    folders.splice(index, 1);
    chrome.storage.local.set({ folders }, () => {
      if (chrome.runtime.lastError) {
        alert('Erro ao excluir: ' + chrome.runtime.lastError.message);
        return;
      }
      renderFolders();
    });
  }
}

// Deletar conta
function deleteAccount(folderIndex, accountIndex) {
  if (folderIndex < 0 || folderIndex >= folders.length) {
    alert('Erro: Pasta não encontrada');
    return;
  }
  if (!folders[folderIndex] || accountIndex < 0 || accountIndex >= folders[folderIndex].accounts.length) {
    alert('Erro: Conta não encontrada');
    return;
  }
  if (confirm('Tem certeza que deseja excluir esta conta?')) {
    folders[folderIndex].accounts.splice(accountIndex, 1);
    chrome.storage.local.set({ folders }, () => {
      if (chrome.runtime.lastError) {
        alert('Erro ao excluir: ' + chrome.runtime.lastError.message);
        return;
      }
      renderFolders();
    });
  }
}

// Preencher credenciais na página
function fillCredentials(email, password) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (chrome.runtime.lastError) {
      alert('Erro ao acessar a aba: ' + chrome.runtime.lastError.message);
      return;
    }
    
    if (!tabs || tabs.length === 0) {
      alert('Nenhuma aba ativa encontrada');
      return;
    }
    
    // Tentar usar content.js primeiro (envia mensagem)
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'fillCredentials',
      data: { email, password }
    }, (response) => {
      // Se não houver content script carregado ou falhar, usar executeScript como fallback
      if (chrome.runtime.lastError || !response || !response.success) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: (email, password) => {
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
              alert('Campos de login não encontrados nesta página');
            }
          },
          args: [email, password]
        }, (result) => {
          if (chrome.runtime.lastError) {
            alert('Erro ao preencher credenciais: ' + chrome.runtime.lastError.message);
            return;
          }
          // Popup permanece aberto
        });
      } else {
        // Sucesso ao usar content.js
        // Popup permanece aberto
      }
    });
  });
}