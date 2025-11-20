// js/admin.js
import { Toast } from './toast.js';

// --- Estilos dos botões da tabela ---
const estiloBotaoExcluirAdmin = `
    background: #e74c3c;
    color: white;
    border: none;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    margin-left: 5px;
`;

// --- CONFIGURAÇÃO ---
const configListas = {
    tipos_cliente: { tabela: 'tipos_cliente', colunaNome: 'nome_tipo' },
    canais_venda: { tabela: 'canais_venda', colunaNome: 'nome_canal' },
    categorias_produto: { tabela: 'categorias_produto', colunaNome: 'nome_categoria' },
    linhas_produto: { tabela: 'linhas_produto', colunaNome: 'nome_linha' },
    comodos: { tabela: 'comodos', colunaNome: 'nome_comodo' },
    opcoes_co: { tabela: 'opcoes_co', colunaNome: 'nome_co' },
    categorias_mercadoria: { tabela: 'categorias_mercadoria', colunaNome: 'nome_categoria' },
    cores_mercadoria: { tabela: 'cores_mercadoria', colunaNome: 'nome_cor' },
    status_orcamento: { tabela: 'status_orcamento', colunaNome: 'nome_status' },
    status_pedido: { tabela: 'status_pedido', colunaNome: 'nome_status' },
    status_pagamento: { tabela: 'status_pagamento', colunaNome: 'status_pagamento' },
    formas_pagamento: { tabela: 'formas_pagamento', colunaNome: 'nome_forma' },
    unidades_medida: { tabela: 'unidades_medida', colunaNome: 'sigla_medida', colunaExtraNome: 'descricao_medida', labelExtra: 'Descrição' },
    fornecedores: { tabela: 'fornecedores', colunaNome: 'nome_fornecedor', colunaExtraNome: 'cnpj_cpf', labelExtra: 'CNPJ/CPF' }
};

let configAtual = null;

export function carregarOpcoesAdmin(supabase) {
    const select = document.getElementById('select-lista-gerenciar');
    if (!select) return;

    select.innerHTML = '<option value="">Selecione uma lista...</option>';
    for (const key in configListas) {
        const nomeAmigavel = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        select.innerHTML += `<option value="${key}">${nomeAmigavel}</option>`;
    }
}

async function carregarItensDaLista(supabase, config) {
    const tbody = document.getElementById('corpo-tabela-itens-lista');
    const thExtra = document.getElementById('th-extra');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4">Carregando...</td></tr>';
    
    let colunas = `id, ${config.colunaNome}`;
    if (config.colunaExtraNome) {
        colunas += `, ${config.colunaExtraNome}`;
        thExtra.textContent = config.labelExtra;
        thExtra.style.display = 'table-cell';
    } else {
        thExtra.style.display = 'none';
    }

    const { data, error } = await supabase
        .from(config.tabela)
        .select(colunas)
        .eq('ativo', true)
        .order(config.colunaNome, { ascending: true });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="4">Erro: ${error.message}</td></tr>`;
        return;
    }
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">Nenhum item ativo.</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    data.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.id}</td>
            <td>${item[config.colunaNome]}</td>
            ${config.colunaExtraNome ? `<td>${item[config.colunaExtraNome]}</td>` : ''}
            <td>
                <button class="btn-inativar-lista-item" data-id="${item.id}" style="${estiloBotaoExcluirAdmin}">
                    Inativar
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.querySelectorAll('.btn-inativar-lista-item').forEach(button => {
        button.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            if (confirm(`Deseja inativar o item ID #${id}?`)) {
                e.target.disabled = true;
                const { error } = await supabase.from(config.tabela).update({ ativo: false }).eq('id', id);
                
                if (error) {
                    Toast.show('Erro ao inativar: ' + error.message, 'error');
                    e.target.disabled = false;
                } else {
                    Toast.show('Item inativado com sucesso.', 'info');
                    e.target.closest('tr').remove();
                }
            }
        });
    });
}

export function initGerenciadorListas(supabase) {
    const select = document.getElementById('select-lista-gerenciar');
    const container = document.getElementById('gerenciador-container');
    const form = document.getElementById('form-add-lista-item');
    const extraWrapper = document.getElementById('add-item-extra-wrapper');
    const inputExtra = document.getElementById('add-item-extra');
    const extraLabel = document.querySelector('label[for="add-item-extra"]');

    if (!select) return;

    // Trava para não duplicar listener no Select se a função for chamada várias vezes
    // (Embora select change geralmente não duplique problema de submit, é bom prevenir)
    // Vamos usar a estratégia de remover antes de adicionar ou flag, mas aqui no select é mais tranquilo.

    select.onchange = (e) => {
        const key = e.target.value;
        if (!key) {
            container.classList.add('hidden');
            return;
        }
        configAtual = configListas[key];
        
        if (configAtual.colunaExtraNome) {
            extraLabel.textContent = configAtual.labelExtra + ':';
            extraWrapper.classList.remove('hidden');
        } else {
            extraWrapper.classList.add('hidden');
        }
        
        container.classList.remove('hidden');
        carregarItensDaLista(supabase, configAtual);
    };

    // Trava no formulário
    if (form.getAttribute('data-init') === 'true') return;
    form.setAttribute('data-init', 'true');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!configAtual) return;

        const btn = form.querySelector('button');
        btn.disabled = true;

        try {
            const novoNome = document.getElementById('add-item-nome').value;
            let itemParaSalvar = {};
            itemParaSalvar[configAtual.colunaNome] = novoNome;
            itemParaSalvar['ativo'] = true;

            if (configAtual.colunaExtraNome) {
                itemParaSalvar[configAtual.colunaExtraNome] = inputExtra.value;
            }

            const { error } = await supabase.from(configAtual.tabela).insert(itemParaSalvar);
            if (error) throw error;

            Toast.show('Item adicionado à lista!', 'success');
            form.reset();
            carregarItensDaLista(supabase, configAtual);

        } catch (error) {
            Toast.show(error.message, 'error');
        } finally {
            btn.disabled = false;
        }
    });
}