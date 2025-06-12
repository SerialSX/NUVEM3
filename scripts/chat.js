let chatAberto = false;
let chatAtivo = null;

document.addEventListener('DOMContentLoaded', async function() {
    await carregarHistoricoChat();
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && chatAberto) {
            fecharChat();
        }
    });
});

async function carregarHistoricoChat() {
    const chatMensagens = document.getElementById('chat-mensagens');
    chatMensagens.innerHTML = '<p class="loading-chat">Carregando mensagens...</p>';
    
    try {
        const paciente = await getPacienteAtual();
        if (!paciente) throw new Error('Paciente não encontrado');
        
        const mensagens = await buscarMensagens(paciente.id);
        
        chatMensagens.innerHTML = '';
        
        if (mensagens.length === 0) {
            chatMensagens.innerHTML = '<p class="empty-chat">Nenhuma mensagem ainda. Inicie a conversa!</p>';
            return;
        }
        
        for (const msg of mensagens) {
            renderMensagem({
                texto: msg.get('texto'),
                tipo: msg.get('tipo'),
                hora: formatarHora(msg.createdAt)
            });
        }
        
        rolarParaUltimaMensagem();
    } catch (error) {
        console.error('Erro ao carregar chat:', error);
        chatMensagens.innerHTML = '<p class="error-chat">Erro ao carregar mensagens</p>';
    }
}

async function getPacienteAtual() {
    try {
        const Paciente = Parse.Object.extend('Paciente');
        const query = new Parse.Query(Paciente);
        query.equalTo('user', Parse.User.current());
        return await query.first();
    } catch (error) {
        console.error('Erro ao buscar paciente:', error);
        return null;
    }
}

async function buscarMensagens(pacienteId) {
    try {
        const Chat = Parse.Object.extend('Chat');
        const query = new Parse.Query(Chat);
        query.equalTo('pacienteId', pacienteId);
        query.ascending('createdAt');
        query.limit(100);
        return await query.find();
    } catch (error) {
        console.error('Erro ao buscar mensagens:', error);
        return [];
    }
}

function abrirChat() {
    if (chatAberto) return;
    
    const chatModal = document.getElementById('chat-modal');
    chatModal.style.display = 'flex';
    document.getElementById('chat-input').focus();
    chatAberto = true;
    
    rolarParaUltimaMensagem();
    iniciarChatAtendente();
}

function fecharChat() {
    document.getElementById('chat-modal').style.display = 'none';
    chatAberto = false;
    
    if (chatAtivo) {
        clearInterval(chatAtivo);
        chatAtivo = null;
    }
}

function rolarParaUltimaMensagem() {
    const chatMensagens = document.getElementById('chat-mensagens');
    chatMensagens.scrollTop = chatMensagens.scrollHeight;
}

function iniciarChatAtendente() {
    if (!chatAtivo) {
        chatAtivo = setInterval(async () => {
            try {
                const paciente = await getPacienteAtual();
                if (!paciente) return;
                
                const mensagensNaoLidas = await buscarMensagensNaoLidas(paciente.id);
                
                for (const msg of mensagensNaoLidas) {
                    renderMensagem({
                        texto: msg.get('texto'),
                        tipo: 'atendente',
                        hora: formatarHora(msg.createdAt)
                    });
                    msg.set('lida', true);
                    await msg.save();
                }
                
                if (mensagensNaoLidas.length > 0) {
                    rolarParaUltimaMensagem();
                }
            } catch (error) {
                console.error('Erro ao verificar mensagens:', error);
            }
        }, 3000);
    }
}

async function buscarMensagensNaoLidas(pacienteId) {
    try {
        const Chat = Parse.Object.extend('Chat');
        const query = new Parse.Query(Chat);
        query.equalTo('pacienteId', pacienteId);
        query.equalTo('lida', false);
        query.equalTo('tipo', 'atendente');
        return await query.find();
    } catch (error) {
        console.error('Erro ao buscar mensagens não lidas:', error);
        return [];
    }
}

function formatarHora(data) {
    return new Date(data).toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
    });
}

async function enviarMensagem() {
    const input = document.getElementById('chat-input');
    const texto = input.value.trim();
    
    if (!texto) return;
    
    try {
        const paciente = await getPacienteAtual();
        if (!paciente) throw new Error('Paciente não encontrado');
        
        await salvarMensagem(paciente.id, texto);
        
        renderMensagem({
            texto: texto,
            tipo: 'usuario',
            hora: formatarHora(new Date())
        });
        
        input.value = '';
        rolarParaUltimaMensagem();
        
        // Simular resposta do atendente
        setTimeout(async () => {
            try {
                await salvarMensagem(
                    paciente.id, 
                    'Recebemos sua mensagem. Um atendente responderá em breve.', 
                    'atendente', 
                    false
                );
            } catch (error) {
                console.error('Erro ao enviar resposta automática:', error);
            }
        }, 1000);
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        showAlert('error', 'Erro ao enviar mensagem: ' + error.message);
    }
}

async function salvarMensagem(pacienteId, texto, tipo = 'usuario', lida = true) {
    try {
        const Chat = Parse.Object.extend('Chat');
        const mensagem = new Chat();
        mensagem.set('pacienteId', pacienteId);
        mensagem.set('texto', texto);
        mensagem.set('tipo', tipo);
        mensagem.set('lida', lida);
        return await mensagem.save();
    } catch (error) {
        console.error('Erro ao salvar mensagem:', error);
        throw error;
    }
}

function renderMensagem({ texto, tipo, hora }) {
    const chatMensagens = document.getElementById('chat-mensagens');
    
    // Limpa mensagens de estado se existirem
    if (chatMensagens.querySelector('.loading-chat, .empty-chat, .error-chat')) {
        chatMensagens.innerHTML = '';
    }
    
    const divMensagem = document.createElement('div');
    divMensagem.className = `mensagem ${tipo}`;
    
    divMensagem.innerHTML = `
        <div class="mensagem-conteudo">
            <p>${texto}</p>
            <span class="hora-mensagem">${hora}</span>
        </div>
    `;
    
    chatMensagens.appendChild(divMensagem);
}

function showAlert(type, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert ${type}`;
    alertDiv.textContent = message;
    document.body.prepend(alertDiv);
    
    setTimeout(() => {
        alertDiv.style.opacity = '0';
        setTimeout(() => alertDiv.remove(), 300);
    }, 5000);
}

// Event listeners
document.getElementById('chat-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        enviarMensagem();
    }
});

document.getElementById('chat-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        fecharChat();
    }
});

// Exporta funções globais
window.abrirChat = abrirChat;
window.fecharChat = fecharChat;
window.enviarMensagem = enviarMensagem;