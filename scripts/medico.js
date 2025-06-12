let dataAtualExibida;

document.addEventListener('DOMContentLoaded', async function() {
    try {
        const { user, dados: medico } = await checkAuth('medico');
        
        // Atualizar UI
        document.getElementById('medico-nome').textContent = medico.get('nome');
        document.getElementById('medico-especialidade').textContent = medico.get('especialidade');
        
        // CORREÇÃO: Inicializa a nossa variável com a data de hoje
        dataAtualExibida = new Date();
        await carregarConsultasDoDia(dataAtualExibida);
        
        // CORREÇÃO: Os botões agora modificam a variável, em vez de ler o HTML
        document.getElementById('prev-day').addEventListener('click', async () => {
            dataAtualExibida.setDate(dataAtualExibida.getDate() - 1);
            await carregarConsultasDoDia(dataAtualExibida);
        });
        
        document.getElementById('next-day').addEventListener('click', async () => {
            dataAtualExibida.setDate(dataAtualExibida.getDate() + 1);
            await carregarConsultasDoDia(dataAtualExibida);
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
        // Formatar data para exibição
        const options = { weekday: 'long', day: 'numeric', month: 'long' };
        document.getElementById('current-date').textContent = date.toLocaleDateString('pt-BR', options);
        
        // CORREÇÃO: Criar datas de início e fim do dia sem modificar a data original
        const inicioDoDia = new Date(date);
        inicioDoDia.setHours(0, 0, 0, 0);

        const fimDoDia = new Date(date);
        fimDoDia.setHours(23, 59, 59, 999);

        // Buscar consultas
        const Consulta = Parse.Object.extend('Consulta');
        const query = new Parse.Query(Consulta);
        
        const medicoQuery = new Parse.Query('Medico');
        medicoQuery.equalTo('user', Parse.User.current());
        const medico = await medicoQuery.first();
        
        query.equalTo('medico', medico);
        query.greaterThanOrEqualTo('data', inicioDoDia);
        query.lessThanOrEqualTo('data', fimDoDia); // Usando lessThanOrEqualTo para incluir o fim do dia
        query.include('paciente'); // Assumindo que o schema aponta para a classe Paciente
        query.ascending('data');
        
        const consultas = await query.find();
        
        // Renderizar consultas
        listaConsultas.innerHTML = '';
        
        if (consultas.length === 0) {
            listaConsultas.innerHTML = '<p class="empty-message">Nenhuma consulta para este dia.</p>';
            return;
        }
        
        consultas.forEach(consulta => {
            const item = document.createElement('div');
            item.className = 'consulta-item';
            
            const paciente = consulta.get('paciente');
            const dataConsulta = new Date(consulta.get('data'));

            // Verifica se o objeto paciente e o nome existem antes de tentar acessá-los
            const nomePaciente = paciente ? paciente.get('nome') : 'Paciente não encontrado';
            
            item.innerHTML = `
                <div class="consulta-horario">
                    ${dataConsulta.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div class="consulta-info">
                    <h4>${nomePaciente}</h4>
                    <p>${consulta.get('tipo')}</p>
                    <span class="status ${consulta.get('status')}">${consulta.get('status')}</span>
                </div>
                <div class="consulta-actions">
                    <button class="btn-confirm" onclick="confirmarConsulta('${consulta.id}')" title="Confirmar">
                        ✔
                    </button>
                    <button class="btn-cancel" onclick="cancelarConsulta('${consulta.id}')" title="Cancelar">
                        ✖
                    </button>
                </div>
            `;
            
            listaConsultas.appendChild(item);
        });
        
    } catch (error) {
        console.error('Erro ao carregar consultas:', error);
        listaConsultas.innerHTML = '<p class="error-message">Erro ao carregar consultas.</p>';
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