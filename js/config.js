// js/config.js
import { Toast } from './toast.js';

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
    
    // Trava de segurança
    if (form.getAttribute('data-init') === 'true') return;
    form.setAttribute('data-init', 'true');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button');
        
        btn.disabled = true;
        btn.innerText = "Salvando...";

        const formData = new FormData(form);
        const dados = Object.fromEntries(formData.entries());
        const id = dados.id; 
        delete dados.id; 

        let error = null;

        // Upsert logic (Update se tiver ID, Insert se não)
        if (id) {
            const res = await supabase.from('configuracoes').update(dados).eq('id', id);
            error = res.error;
        } else {
            const res = await supabase.from('configuracoes').insert(dados);
            error = res.error;
        }

        if (error) {
            Toast.show("Erro ao salvar: " + error.message, 'error');
        } else {
            Toast.show("Dados da empresa atualizados com sucesso!", 'success');
        }
        
        btn.disabled = false;
        btn.innerText = "Salvar Configurações";
    });
}