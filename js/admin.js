// js/admin.js

// --- Estilos dos botões da tabela ---
const estiloBotaoExcluirAdmin = `
    background: #e74c3c; /* Vermelho */
    color: white;
    border: none;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    margin-left: 5px;
`;

// --- CONFIGURAÇÃO (ADICIONADO FORNECEDORES) ---
const configListas = {
    tipos_cliente: {
        tabela: 'tipos_cliente',
        colunaNome: 'nome_tipo'
    },
    canais_venda: {
        tabela: 'canais_venda',
        colunaNome: 'nome_canal'
    },
    categorias_produto: {
        tabela: 'categorias_produto',
        colunaNome: 'nome_categoria'
    },
    linhas_produto: {
        tabela: 'linhas_produto',
        colunaNome: 'nome_linha'
    },
    comodos: {
        tabela: 'comodos',
        colunaNome: 'nome_comodo'
    },
    opcoes_co: {
        tabela: 'opcoes_co',
        colunaNome: 'nome_co'
    },
    categorias_mercadoria: {
        tabela: 'categorias_mercadoria',
        colunaNome: 'nome_categoria'
    },
    cores_mercadoria: {
        tabela: 'cores_mercadoria',
        colunaNome: 'nome_cor'
    },
    status_orcamento: {
        tabela: 'status_orcamento',
        colunaNome: 'nome_status'
    },
    status_pedido: {
        tabela: 'status_pedido',
        colunaNome: 'nome_status'
    },
    status_pagamento: {
        tabela: 'status_pagamento',
        colunaNome: 'status_pagamento'
    },
    formas_pagamento: {
        tabela: 'formas_pagamento',
        colunaNome: 'nome_forma'
    },
    unidades_medida: {
        tabela: 'unidades_medida',
        colunaNome: 'sigla_medida',
        colunaExtraNome: 'descricao_medida',
        labelExtra: 'Descrição'
    },
    fornecedores: { // <-- NOVO: Fornecedor (Usando o CNPJ/CPF como coluna extra)
        tabela: 'fornecedores',
        colunaNome: 'nome_fornecedor',
        colunaExtraNome: 'cnpj_cpf',
        labelExtra: 'CNPJ/CPF/Telefone' 
    }
};
// Guarda a configuração da lista atualmente selecionada
let configAtual = null;

// Exportada: Carrega o menu <select> principal
export function carregarOpcoesAdmin(supabase) {
    const select = document.getElementById('select-lista-gerenciar');
    if (!select) return;

    select.innerHTML = '<option value="">Selecione uma lista...</option>';
    for (const key in configListas) {
        // Transforma 'tipos_cliente' em 'Tipos Cliente'
        const nomeAmigavel = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        select.innerHTML += `<option value="${key}">${nomeAmigavel}</option>`;
    }
}

// Função interna para carregar a tabela de itens
async function carregarItensDaLista(supabase, config) {
    const tbody = document.getElementById('corpo-tabela-itens-lista');
    const thExtra = document.getElementById('th-extra');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4">Carregando...</td></tr>';
    
    // Define as colunas a buscar
    let colunas = `id, ${config.colunaNome}`;
    if (config.colunaExtraNome) {
        colunas += `, ${config.colunaExtraNome}`;
        thExtra.textContent = config.labelExtra;
        thExtra.style.display = 'table-cell'; // Mostra a coluna extra
    } else {
        thExtra.style.display = 'none'; // Esconde a coluna extra
    }

    const { data, error } = await supabase
        .from(config.tabela)
        .select(colunas)
        .eq('ativo', true) // Filtro: Só mostra itens ativos
        .order(config.colunaNome, { ascending: true });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="4">Erro ao carregar: ${error.message}</td></tr>`;
        return;
    }
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">Nenhum item ativo cadastrado.</td></tr>';
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

    // Ligar botões de inativar
    document.querySelectorAll('.btn-inativar-lista-item').forEach(button => {
        button.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            if (confirm(`Tem certeza que deseja INATIVAR o item ID #${id}? Ele sumirá dos menus de cadastro.`)) {
                e.target.disabled = true;
                
                // MUDANÇA DE .delete() PARA .update()
                const { error } = await supabase
                    .from(config.tabela)
                    .update({ ativo: false })
                    .eq('id', id);
                
                if (error) {
                    alert('Erro ao inativar: ' + error.message);
                    e.target.disabled = false;
                } else {
                    e.target.closest('tr').remove();
                }
            }
        });
    });
}

// Exportada: "Liga" a tela inteira
export function initGerenciadorListas(supabase) {
    const select = document.getElementById('select-lista-gerenciar');
    const container = document.getElementById('gerenciador-container');
    const form = document.getElementById('form-add-lista-item');
    const msg = document.getElementById('mensagemGerenciarListas');
    const extraWrapper = document.getElementById('add-item-extra-wrapper');
    const inputExtra = document.getElementById('add-item-extra');
    const extraLabel = document.querySelector('label[for="add-item-extra"]');

    if (!select) return;

    // 1. Lógica de mudar o menu <select> principal
    select.addEventListener('change', (e) => {
        const key = e.target.value;
        if (!key) {
            container.classList.add('hidden');
            return;
        }

        configAtual = configListas[key]; // Salva a config da lista selecionada
        
        // Mostra ou esconde o campo "Extra"
        if (configAtual.colunaExtraNome) {
            extraLabel.textContent = configAtual.labelExtra + ':';
            extraWrapper.classList.remove('hidden');
        } else {
            extraWrapper.classList.add('hidden');
        }
        
        container.classList.remove('hidden');
        carregarItensDaLista(supabase, configAtual);
    });

    // 2. Lógica do formulário de Adicionar Item
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!configAtual) return;

        const btn = form.querySelector('button');
        btn.disabled = true;
        msg.textContent = '';

        try {
            const novoNome = document.getElementById('add-item-nome').value;
            
            let itemParaSalvar = {};
            itemParaSalvar[configAtual.colunaNome] = novoNome;
            itemParaSalvar['ativo'] = true; // Salva como ativo

            // Adiciona o campo extra se ele existir
            if (configAtual.colunaExtraNome) {
                const valorExtra = inputExtra.value;
                itemParaSalvar[configAtual.colunaExtraNome] = valorExtra;
            }

            const { error } = await supabase
                .from(configAtual.tabela)
                .insert(itemParaSalvar);
            
            if (error) throw error;

            // Sucesso
            msg.style.color = 'green';
            msg.textContent = 'Item salvo com sucesso!';
            form.reset();
            carregarItensDaLista(supabase, configAtual); // Recarrega a tabela

        } catch (error) {
            console.error('Erro ao salvar item:', error);
            msg.style.color = 'red';
            msg.textContent = error.message;
        } finally {
            btn.disabled = false;
        }
    });
}

// // js/admin.js

// // --- Estilos dos botões da tabela ---
// const estiloBotaoExcluirAdmin = `
//     background: #e74c3c; /* Vermelho */
//     color: white;
//     border: none;
//     padding: 5px 10px;
//     border-radius: 4px;
//     cursor: pointer;
//     margin-left: 5px;
// `;

// // --- CONFIGURAÇÃO ---
// // Mapeia o nome amigável para os detalhes técnicos da tabela
// const configListas = {
//     tipos_cliente: {
//         tabela: 'tipos_cliente',
//         colunaNome: 'nome_tipo'
//     },
//     canais_venda: {
//         tabela: 'canais_venda',
//         colunaNome: 'nome_canal'
//     },
//     categorias_produto: {
//         tabela: 'categorias_produto',
//         colunaNome: 'nome_categoria'
//     },
//     linhas_produto: {
//         tabela: 'linhas_produto',
//         colunaNome: 'nome_linha'
//     },
//     comodos: {
//         tabela: 'comodos',
//         colunaNome: 'nome_comodo'
//     },
//     opcoes_co: {
//         tabela: 'opcoes_co',
//         colunaNome: 'nome_co'
//     },
//     categorias_mercadoria: {
//         tabela: 'categorias_mercadoria',
//         colunaNome: 'nome_categoria'
//     },
//     cores_mercadoria: {
//         tabela: 'cores_mercadoria',
//         colunaNome: 'nome_cor'
//     },
//     status_orcamento: {
//         tabela: 'status_orcamento',
//         colunaNome: 'nome_status'
//     },
//     status_pedido: {
//         tabela: 'status_pedido',
//         colunaNome: 'nome_status'
//     },
//     status_pagamento: {
//         tabela: 'status_pagamento',
//         colunaNome: 'status_pagamento' // Você nomeou esta coluna de forma diferente
//     },
//     formas_pagamento: {
//         tabela: 'formas_pagamento',
//         colunaNome: 'nome_forma'
//     },
//     unidades_medida: {
//         tabela: 'unidades_medida',
//         colunaNome: 'sigla_medida', // Coluna principal
//         colunaExtraNome: 'descricao_medida', // Coluna secundária
//         labelExtra: 'Descrição' // Rótulo para o campo extra
//     }
//     // (Não adicionamos 'fornecedores' aqui porque é uma tabela complexa, não uma lista simples)
// };
// // Guarda a configuração da lista atualmente selecionada
// let configAtual = null;

// // Exportada: Carrega o menu <select> principal
// export function carregarOpcoesAdmin(supabase) {
//     const select = document.getElementById('select-lista-gerenciar');
//     if (!select) return;

//     select.innerHTML = '<option value="">Selecione uma lista...</option>';
//     // Preenche o menu com as chaves do nosso objeto de configuração
//     for (const key in configListas) {
//         // Transforma 'tipos_cliente' em 'Tipos Cliente'
//         const nomeAmigavel = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
//         select.innerHTML += `<option value="${key}">${nomeAmigavel}</option>`;
//     }
// }

// // Função interna para carregar a tabela de itens
// async function carregarItensDaLista(supabase, config) {
//     const tbody = document.getElementById('corpo-tabela-itens-lista');
//     const thExtra = document.getElementById('th-extra');
//     if (!tbody) return;

//     tbody.innerHTML = '<tr><td colspan="4">Carregando...</td></tr>';
    
//     // Define as colunas a buscar
//     let colunas = `id, ${config.colunaNome}`;
//     if (config.colunaExtraNome) {
//         colunas += `, ${config.colunaExtraNome}`;
//         thExtra.textContent = config.labelExtra;
//         thExtra.style.display = 'table-cell'; // Mostra a coluna extra
//     } else {
//         thExtra.style.display = 'none'; // Esconde a coluna extra
//     }

//     const { data, error } = await supabase
//         .from(config.tabela)
//         .select(colunas)
//         .order(config.colunaNome, { ascending: true });

//     if (error) {
//         tbody.innerHTML = `<tr><td colspan="4">Erro ao carregar: ${error.message}</td></tr>`;
//         return;
//     }
//     if (data.length === 0) {
//         tbody.innerHTML = '<tr><td colspan="4">Nenhum item cadastrado.</td></tr>';
//         return;
//     }

//     tbody.innerHTML = '';
//     data.forEach(item => {
//         const tr = document.createElement('tr');
//         tr.innerHTML = `
//             <td>${item.id}</td>
//             <td>${item[config.colunaNome]}</td>
//             ${config.colunaExtraNome ? `<td>${item[config.colunaExtraNome]}</td>` : ''}
//             <td>
//                 <button class="btn-excluir-lista-item" data-id="${item.id}" style="${estiloBotaoExcluirAdmin}">
//                     Excluir
//                 </button>
//             </td>
//         `;
//         tbody.appendChild(tr);
//     });

//     // Ligar botões de excluir
//     document.querySelectorAll('.btn-excluir-lista-item').forEach(button => {
//         button.addEventListener('click', async (e) => {
//             const id = e.target.getAttribute('data-id');
//             if (confirm(`Tem certeza que deseja excluir o item ID #${id}? Esta ação não pode ser desfeita.`)) {
//                 e.target.disabled = true;
//                 const { error } = await supabase
//                     .from(config.tabela)
//                     .delete()
//                     .eq('id', id);
                
//                 if (error) {
//                     alert('Erro ao excluir: ' + error.message);
//                     e.target.disabled = false;
//                 } else {
//                     e.target.closest('tr').remove();
//                 }
//             }
//         });
//     });
// }

// // Exportada: "Liga" a tela inteira
// export function initGerenciadorListas(supabase) {
//     const select = document.getElementById('select-lista-gerenciar');
//     const container = document.getElementById('gerenciador-container');
//     const form = document.getElementById('form-add-lista-item');
//     const msg = document.getElementById('mensagemGerenciarListas');
//     const extraWrapper = document.getElementById('add-item-extra-wrapper');
//     const extraLabel = document.querySelector('label[for="add-item-extra"]');

//     if (!select) return;

//     // 1. Lógica de mudar o menu <select> principal
//     select.addEventListener('change', (e) => {
//         const key = e.target.value;
//         if (!key) {
//             container.classList.add('hidden');
//             return;
//         }

//         configAtual = configListas[key]; // Salva a config da lista selecionada
        
//         // Mostra ou esconde o campo "Extra"
//         if (configAtual.colunaExtraNome) {
//             extraLabel.textContent = configAtual.labelExtra + ':';
//             extraWrapper.classList.remove('hidden');
//         } else {
//             extraWrapper.classList.add('hidden');
//         }
        
//         container.classList.remove('hidden');
//         carregarItensDaLista(supabase, configAtual);
//     });

//     // 2. Lógica do formulário de Adicionar Item
//     form.addEventListener('submit', async (e) => {
//         e.preventDefault();
//         if (!configAtual) return; // Não faz nada se nenhuma lista foi selecionada

//         const btn = form.querySelector('button');
//         btn.disabled = true;
//         msg.textContent = '';

//         try {
//             const novoNome = document.getElementById('add-item-nome').value;
            
//             let itemParaSalvar = {};
//             itemParaSalvar[configAtual.colunaNome] = novoNome; // Ex: { nome_tipo: "Novo Tipo" }

//             // Adiciona o campo extra se ele existir
//             if (configAtual.colunaExtraNome) {
//                 const valorExtra = document.getElementById('add-item-extra').value;
//                 itemParaSalvar[configAtual.colunaExtraNome] = valorExtra;
//             }

//             const { error } = await supabase
//                 .from(configAtual.tabela)
//                 .insert(itemParaSalvar);
            
//             if (error) throw error;

//             // Sucesso
//             msg.style.color = 'green';
//             msg.textContent = 'Item salvo com sucesso!';
//             form.reset();
//             carregarItensDaLista(supabase, configAtual); // Recarrega a tabela

//         } catch (error) {
//             console.error('Erro ao salvar item:', error);
//             msg.style.color = 'red';
//             msg.textContent = error.message;
//         } finally {
//             btn.disabled = false;
//         }
//     });
// }