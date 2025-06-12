// Funções de UI
function openTab(tabName, event) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    event.currentTarget.classList.add('active');
}

function mostrarCadastro(tipo) {
    document.getElementById(`form-${tipo}`).classList.toggle('hidden');
    document.getElementById(`cadastro-${tipo}`).classList.toggle('hidden');
}

// Cadastro de Paciente
document.getElementById('cadastro-paciente').addEventListener('submit', async function(e) {
    e.preventDefault();
    const form = e.target;
    
    try {
        // Criar usuário
        const user = new Parse.User();
        user.set('username', form[0].value); // CPF
        user.set('password', form[4].value);
        user.set('email', `${form[0].value}@paciente.com`);
        
        // Criar paciente
        const Paciente = Parse.Object.extend('Paciente');
        const paciente = new Paciente();
        paciente.set('cpf', form[0].value);
        paciente.set('nome', form[1].value);
        paciente.set('telefone', form[2].value);
        paciente.set('plano', form[3].value === 'sim');
        
        await user.signUp();
        paciente.set('user', user);
        await paciente.save();
        
        alert('Cadastro realizado com sucesso!');
        form.reset();
        mostrarCadastro('paciente');
    } catch (error) {
        console.error('Erro no cadastro:', error);
        alert(`Erro: ${error.message}`);
    }
});

// Cadastro de Médico
document.getElementById('cadastro-medico').addEventListener('submit', async function(e) {
    e.preventDefault();
    const form = e.target;
    
    try {
        // Criar usuário
        const user = new Parse.User();
        user.set('username', form[0].value); // CRM
        user.set('password', form[3].value);
        user.set('email', `${form[0].value}@medico.com`);
        
        // Criar médico
        const Medico = Parse.Object.extend('Medico');
        const medico = new Medico();
        medico.set('crm', form[0].value);
        medico.set('nome', form[1].value);
        medico.set('especialidade', form[2].value);
        medico.set('ativo', true);
        
        await user.signUp();
        medico.set('user', user);
        await medico.save();
        
        alert('Cadastro médico realizado!');
        form.reset();
        mostrarCadastro('medico');
    } catch (error) {
        console.error('Erro no cadastro médico:', error);
        alert(`Erro: ${error.message}`);
    }
});

// Login
async function fazerLogin(username, password) {
    const user = await Parse.User.logIn(username, password);
    
    // Verificar se é médico
    const Medico = Parse.Object.extend('Medico');
    const query = new Parse.Query(Medico);
    query.equalTo('user', user);
    const medico = await query.first();
    
    if (medico) {
        return { tipo: 'medico', user, dados: medico };
    } else {
        // Verificar se é paciente
        const Paciente = Parse.Object.extend('Paciente');
        const pacienteQuery = new Parse.Query(Paciente);
        pacienteQuery.equalTo('cpf', username);
        const paciente = await pacienteQuery.first();
        
        if (paciente) {
            return { tipo: 'paciente', user, dados: paciente };
        }
    }
    
    throw new Error('Tipo de usuário não identificado');
}

// Login Paciente
document.getElementById('form-paciente').addEventListener('submit', async function(e) {
    e.preventDefault();
    try {
        const { tipo, user, dados } = await fazerLogin(e.target[0].value, e.target[1].value);
        if (tipo !== 'paciente') throw new Error('Acesso permitido apenas para pacientes');
        
        sessionStorage.setItem('usuarioLogado', JSON.stringify({
            id: user.id,
            tipo: 'paciente',
            nome: dados.get('nome'),
            cpf: dados.get('cpf')
        }));
        
        window.location.href = 'paciente.html';
    } catch (error) {
        alert(error.message);
    }
});

// Login Médico
document.getElementById('form-medico').addEventListener('submit', async function(e) {
    e.preventDefault();
    try {
        const { tipo, user, dados } = await fazerLogin(e.target[0].value, e.target[1].value);
        if (tipo !== 'medico') throw new Error('Acesso permitido apenas para médicos');
        
        sessionStorage.setItem('usuarioLogado', JSON.stringify({
            id: user.id,
            tipo: 'medico',
            nome: dados.get('nome'),
            crm: dados.get('crm'),
            especialidade: dados.get('especialidade')
        }));
        
        window.location.href = 'medico.html';
    } catch (error) {
        alert(error.message);
    }
});

// Exporta funções globais
window.openTab = openTab;
window.mostrarCadastro = mostrarCadastro;