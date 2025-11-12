// js/config.js

export async function carregarConfiguracoes(supabase) {
    // Pega a primeira linha da tabela
    const { data, error } = await supabase
        .from('configuracoes')
        .select('*')
        .limit(1)
        .single();

    if (data) {
        document.getElementById('config-id').value = data.id;
        document.getElementById('conf-nome').value = data.nome_empresa;
        document.getElementById('conf-cnpj').value = data.cnpj;
        document.getElementById('conf-endereco').value = data.endereco;
        document.getElementById('conf-telefone').value = data.telefone;
        document.getElementById('conf-dono').value = data.nome_proprietario;
    }
}

export function initFormularioConfig(supabase) {
    const form = document.getElementById('formConfiguracoes');
    if(!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button');
        const msg = document.getElementById('mensagemConfig');
        
        btn.disabled = true;
        btn.innerText = "Salvando...";
        msg.textContent = "";

        const formData = new FormData(form);
        const dados = Object.fromEntries(formData.entries());
        const id = dados.id; 
        delete dados.id; 

        let error = null;

        if (id) {
            const res = await supabase.from('configuracoes').update(dados).eq('id', id);
            error = res.error;
        } else {
            const res = await supabase.from('configuracoes').insert(dados);
            error = res.error;
        }

        if (error) {
            msg.style.color = 'red';
            msg.textContent = "Erro: " + error.message;
        } else {
            msg.style.color = 'green';
            msg.textContent = "Dados da empresa atualizados!";
        }
        
        btn.disabled = false;
        btn.innerText = "Salvar Configurações";
    });
}