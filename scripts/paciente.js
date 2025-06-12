document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Verifica autenticação e obtém dados do paciente
        const { user, dados: paciente } = await checkAuth('paciente');
        if (!user || !paciente) throw new Error('Acesso negado');
        
        // Atualiza UI
        document.getElementById('username').textContent = paciente.get('nome') || 'Paciente';
        
        // Configura menu mobile
        setupMenuMobile();
        
        // Carrega dados iniciais
        await carregarMedicosDisponiveis();
        await carregarAgendamentos();

        // Configura listeners
        setupEventListeners();

    } catch (error) {
        console.error('Erro na inicialização:', error);
        window.location.href = 'index.html';
    }
});

// Configura menu mobile
function setupMenuMobile() {
    const menuToggle = document.createElement('div');
    menuToggle.className = 'menu-toggle';
    menuToggle.innerHTML = '☰';
    document.body.appendChild(menuToggle);
    
    menuToggle.addEventListener('click', () => {
        document.querySelector('.sidebar').classList.toggle('active');
    });
    
    window.addEventListener('resize', () => {
        menuToggle.style.display = window.innerWidth <= 992 ? 'flex' : 'none';
        if (window.innerWidth > 992) {
            document.querySelector('.sidebar').classList.remove('active');
        }
    });
}

// Configura event listeners
function setupEventListeners() {
    document.getElementById('form-agendamento').addEventListener('submit', async (e) => {
        e.preventDefault();
        await agendarConsulta();
    });
}

// Carrega médicos disponíveis
async function carregarMedicosDisponiveis() {
    const selectMedico = document.getElementById('medico');
    selectMedico.innerHTML = '<option value="">Carregando médicos...</option>';
    
    try {
        const Medico = Parse.Object.extend('Medico');
        const query = new Parse.Query(Medico);
        
        query.equalTo('ativo', true);
        query.include(['user', 'especialidade']);
        query.ascending('nome');
        
        const medicos = await query.find();
        
        selectMedico.innerHTML = medicos.length > 0 
            ? '<option value="">Selecione um médico</option>'
            : '<option value="">Nenhum médico disponível</option>';
        
        medicos.forEach(medico => {
            const option = document.createElement('option');
            option.value = medico.id;
            option.textContent = `Dr. ${medico.get('nome')} - ${medico.get('especialidade')}`;
            selectMedico.appendChild(option);
        });

    } catch (error) {
        console.error('Erro ao carregar médicos:', error);
        selectMedico.innerHTML = '<option value="">Erro ao carregar</option>';
        showAlert('error', 'Falha ao carregar lista de médicos');
    }
}

// Agenda nova consulta (CORRIGIDO o schema mismatch)
async function agendarConsulta() {
    const form = document.getElementById('form-agendamento');
    const tipoConsulta = document.getElementById('tipo-consulta').value;
    const dataHora = document.getElementById('data-consulta').value;
    const medicoId = document.getElementById('medico').value;

    // Validação
    if (!tipoConsulta || !dataHora || !medicoId) {
        showAlert('error', 'Preencha todos os campos corretamente!');
        return;
    }

    try {
        // 1. Busca o médico e seu usuário associado
        const Medico = Parse.Object.extend('Medico');
        const medicoQuery = new Parse.Query(Medico);
        medicoQuery.include('user');
        const medico = await medicoQuery.get(medicoId);
        
        if (!medico || !medico.get('user')) {
            throw new Error('Médico não encontrado');
        }

        // 2. Busca o paciente e seu usuário associado
        const Paciente = Parse.Object.extend('Paciente');
        const paciente = await new Parse.Query(Paciente)
            .equalTo('user', Parse.User.current())
            .first();

        if (!paciente || !paciente.get('user')) {
            throw new Error('Paciente não encontrado');
        }

        // 3. Cria e salva a consulta
        const Consulta = Parse.Object.extend('Consulta');
        const novaConsulta = new Consulta();
        
        const dataConsulta = new Date(dataHora);
        if (isNaN(dataConsulta.getTime())) {
            throw new Error('Data inválida');
        }

        // CORREÇÃO: Usa os objetos User associados
        novaConsulta.set('medico', medico.get('user'));
        novaConsulta.set('paciente', paciente.get('user'));
        novaConsulta.set('tipo', tipoConsulta);
        novaConsulta.set('data', dataConsulta);
        novaConsulta.set('status', 'pendente');

        await novaConsulta.save();
        
        // Feedback
        showAlert('success', 'Consulta agendada com sucesso!');
        form.reset();
        await carregarAgendamentos();

    } catch (error) {
        console.error('Erro ao agendar:', error);
        showAlert('error', `Falha no agendamento: ${error.message}`);
    }
}

// Carrega agendamentos do paciente
async function carregarAgendamentos() {
    const listaAgendamentos = document.getElementById('lista-agendamentos');
    listaAgendamentos.innerHTML = '<p class="loading">Carregando agendamentos...</p>';
    
    try {
        // Busca o paciente e suas consultas
        const Paciente = Parse.Object.extend('Paciente');
        const paciente = await new Parse.Query(Paciente)
            .equalTo('user', Parse.User.current())
            .first();

        if (!paciente) throw new Error('Paciente não encontrado');

        const Consulta = Parse.Object.extend('Consulta');
        const query = new Parse.Query(Consulta);
        
        query.equalTo('paciente', paciente.get('user'));
        query.greaterThanOrEqualTo('data', new Date());
        query.ascending('data');
        query.include(['medico', 'paciente']);
        
        const consultas = await query.find();
        
        // Renderiza
        listaAgendamentos.innerHTML = consultas.length > 0 
            ? '' 
            : '<p class="empty">Nenhuma consulta agendada</p>';
        
        consultas.forEach(consulta => {
            const medico = consulta.get('medico');
            const data = new Date(consulta.get('data'));
            
            const item = document.createElement('div');
            item.className = 'agendamento-item';
            item.innerHTML = `
                <div class="agendamento-data">
                    ${data.toLocaleDateString('pt-BR')} às ${data.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                </div>
                <div class="agendamento-info">
                    <h4>${consulta.get('tipo')}</h4>
                    <p>Com Dr. ${medico.get('nome')}</p>
                    <span class="status ${consulta.get('status')}">${consulta.get('status')}</span>
                </div>
                <button class="btn-cancel" onclick="cancelarAgendamento('${consulta.id}')">Cancelar</button>
            `;
            listaAgendamentos.appendChild(item);
        });

    } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
        listaAgendamentos.innerHTML = '<p class="error">Erro ao carregar consultas</p>';
    }
}

// Cancela um agendamento
async function cancelarAgendamento(consultaId) {
    if (!confirm('Deseja realmente cancelar esta consulta?')) return;
    
    try {
        const Consulta = Parse.Object.extend('Consulta');
        const consulta = await new Parse.Query(Consulta).get(consultaId);
        await consulta.destroy();
        
        showAlert('success', 'Consulta cancelada com sucesso!');
        await carregarAgendamentos();
        
    } catch (error) {
        console.error('Erro ao cancelar:', error);
        showAlert('error', 'Falha ao cancelar consulta');
    }
}

// Mostra alertas
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
window.cancelarAgendamento = cancelarAgendamento;