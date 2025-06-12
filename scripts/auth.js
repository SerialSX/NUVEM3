async function checkAuth(requiredType) {
    try {
        const currentUser = Parse.User.current();
        if (!currentUser) throw new Error('Nenhum usuário logado');
        
        // Verificar sessão
        await currentUser.fetch();
        
        // Buscar dados específicos
        if (requiredType === 'medico') {
            const Medico = Parse.Object.extend('Medico');
            const query = new Parse.Query(Medico);
            query.equalTo('user', currentUser);
            const medico = await query.first();
            
            if (!medico) throw new Error('Acesso restrito a médicos');
            
            return {
                user: currentUser,
                tipo: 'medico',
                dados: medico
            };
        } else if (requiredType === 'paciente') {
            const Paciente = Parse.Object.extend('Paciente');
            const query = new Parse.Query(Paciente);
            query.equalTo('user', currentUser);
            const paciente = await query.first();
            
            if (!paciente) throw new Error('Acesso restrito a pacientes');
            
            return {
                user: currentUser,
                tipo: 'paciente',
                dados: paciente
            };
        }
        
        throw new Error('Tipo de usuário não especificado');
    } catch (error) {
        console.error('Erro na autenticação:', error);
        await logout();
        throw error;
    }
}

async function logout() {
    try {
        await Parse.User.logOut();
        sessionStorage.removeItem('usuarioLogado');
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
    }
}

// Verificação periódica da sessão
setInterval(async () => {
    const user = Parse.User.current();
    if (user) {
        try {
            await user.fetch();
        } catch (e) {
            await logout();
        }
    }
}, 5 * 60 * 1000); // 5 minutos

// Exporta para módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { checkAuth, logout };
}