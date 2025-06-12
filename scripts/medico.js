document.addEventListener('DOMContentLoaded', async function() {
    try {
        const { user, dados: medico } = await checkAuth('medico');
        
        // Atualizar UI
        document.getElementById('medico-nome').textContent = medico.get('nome');
        document.getElementById('medico-especialidade').textContent = medico.get('especialidade');
        
        // Carregar consultas
        await carregarConsultasDoDia(new Date());
        
        // Event listeners
        document.getElementById('prev-day').addEventListener('click', async () => {
            const currentDate = new Date(document.getElementById('current-date').textContent);
            currentDate.setDate(currentDate.getDate() - 1);
            await carregarConsultasDoDia(currentDate);
        });
        
        document.getElementById('next-day').addEventListener('click', async () => {
            const currentDate = new Date(document.getElementById('current-date').textContent);
            currentDate.setDate(currentDate.getDate() + 1);
            await carregarConsultasDoDia(currentDate);
        });
        
    } catch (error) {
        console.error('Erro:', error);
        window.location.href = 'index.html';
    }
});

async function carregarConsultasDoDia(date) {
    const listaConsultas = document.getElementById('lista-consultas');
    listaConsultas.innerHTML = '<p class="loading">Carregando consultas...</p>';
    
    try {
        // Formatar data
        const options = { weekday: 'long', day: 'numeric', month: 'long' };
        document.getElementById('current-date').textContent = date.toLocaleDateString('pt-BR', options);
        
        // Buscar consultas
        const Consulta = Parse.Object.extend('Consulta');
        const query = new Parse.Query(Consulta);
        
        const medicoQuery = new Parse.Query('Medico');
        medicoQuery.equalTo('user', Parse.User.current());
        const medico = await medicoQuery.first();
        
        query.equalTo('medico', medico);
        query.greaterThanOrEqualTo('data', new Date(date.setHours(0, 0, 0)));
        query.lessThan('data', new Date(date.setHours(23, 59, 59)));
        query.include('paciente');
        query.ascending('data');
        
        const consultas = await query.find();
        
        // Renderizar consultas
        listaConsultas.innerHTML = '';
        
        if (consultas.length === 0) {
            listaConsultas.innerHTML = '<p class="empty">Nenhuma consulta agendada</p>';
            return;
        }
        
        consultas.forEach(consulta => {
            const item = document.createElement('div');
            item.className = 'consulta-item';
            
            const paciente = consulta.get('paciente');
            const data = new Date(consulta.get('data'));
            
            item.innerHTML = `
                <div class="consulta-horario">
                    ${data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div class="consulta-info">
                    <h4>${paciente.get('nome')}</h4>
                    <p>${consulta.get('tipo')}</p>
                    <span class="status ${consulta.get('status')}">${consulta.get('status')}</span>
                </div>
                <div class="consulta-actions">
                    <button class="btn-confirm" onclick="confirmarConsulta('${consulta.id}')">
                        Confirmar
                    </button>
                    <button class="btn-cancel" onclick="cancelarConsulta('${consulta.id}')">
                        Cancelar
                    </button>
                </div>
            `;
            
            listaConsultas.appendChild(item);
        });
        
    } catch (error) {
        console.error('Erro ao carregar consultas:', error);
        listaConsultas.innerHTML = '<p class="error">Erro ao carregar consultas</p>';
    }
}

async function confirmarConsulta(consultaId) {
    try {
        const Consulta = Parse.Object.extend('Consulta');
        const consulta = await new Parse.Query(Consulta).get(consultaId);
        
        consulta.set('status', 'confirmada');
        await consulta.save();
        
        showAlert('success', 'Consulta confirmada!');
        await carregarConsultasDoDia(new Date(consulta.get('data')));
        
    } catch (error) {
        console.error('Erro ao confirmar consulta:', error);
        showAlert('error', 'Falha ao confirmar consulta');
    }
}

async function cancelarConsulta(consultaId) {
    if (!confirm('Tem certeza que deseja cancelar esta consulta?')) return;
    
    try {
        const Consulta = Parse.Object.extend('Consulta');
        const consulta = await new Parse.Query(Consulta).get(consultaId);
        
        consulta.set('status', 'cancelada');
        await consulta.save();
        
        showAlert('success', 'Consulta cancelada!');
        await carregarConsultasDoDia(new Date(consulta.get('data')));
        
    } catch (error) {
        console.error('Erro ao cancelar consulta:', error);
        showAlert('error', 'Falha ao cancelar consulta');
    }
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

// Exporta funções globais
window.confirmarConsulta = confirmarConsulta;
window.cancelarConsulta = cancelarConsulta;