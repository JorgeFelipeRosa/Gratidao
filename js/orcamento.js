// js/orcamento.js

// Array para itens temporários na criação
let itensDoOrcamento = [];
let totalOrcamento = 0;

// --- Estilos dos botões ---
const estiloBotaoExcluir = `
    background: rgba(226, 88, 88, 0.15); 
    color: #E25858; 
    border: 1px solid #E25858;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    margin-left: 5px;
`;

// --- Função Auxiliar: Carregar Menus ---
async function carregarMenuAtivo(supabase, idElemento, nomeTabela, nomeColuna) {
    const selectMenu = document.getElementById(idElemento);
    if (!selectMenu) return; 
    
    const { data, error } = await supabase
        .from(nomeTabela)
        .select(`id, ${nomeColuna}`)
        .eq('ativo', true); 

    if (error) {
        console.error(`Erro ao buscar ${nomeTabela}:`, error);
        selectMenu.innerHTML = `<option value="">Erro</option>`;
    } else {
        selectMenu.innerHTML = `<option value="">Selecione</option>`;
        data.forEach(item => {
            selectMenu.innerHTML += `<option value="${item.id}">${item[nomeColuna]}</option>`;
        });
    }
}

// Exportada: Carrega os menus da tela
export async function carregarOpcoesOrcamento(supabase) {
    carregarMenuAtivo(supabase, 'select-cliente-orcamento', 'clientes', 'nome');
    carregarMenuAtivo(supabase, 'select-produto-orcamento', 'produtos', 'nome_produto');
}

// Função interna para atualizar a tabela de ITENS (na criação)
function renderizarTabelaItens() {
    const tbody = document.getElementById('corpoTabelaItensOrcamento');
    const elTotal = document.getElementById('total-orcamento');
    tbody.innerHTML = '';
    totalOrcamento = 0;

    itensDoOrcamento.forEach((item, index) => {
        const tr = document.createElement('tr');
        const subtotalItem = item.quantidade * item.preco_unitario_negociado;
        totalOrcamento += subtotalItem;

        tr.innerHTML = `
            <td>${item.nomeProduto}</td>
            <td>${item.quantidade}</td>
            <td>R$ ${item.preco_unitario_negociado.toFixed(2)}</td>
            <td>${item.medida}</td>
            <td>
                <button type="button" class="btn-excluir-item-temp" data-index="${index}" style="${estiloBotaoExcluir}">
                    Excluir
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    elTotal.textContent = `Total: R$ ${totalOrcamento.toFixed(2)}`;

    document.querySelectorAll('.btn-excluir-item-temp').forEach(button => {
        button.addEventListener('click', (e) => {
            const indexParaExcluir = parseInt(e.target.getAttribute('data-index'));
            itensDoOrcamento.splice(indexParaExcluir, 1);
            renderizarTabelaItens();
        });
    });
}

// Exportada: Inicializa o formulário de Criação
export function initFormularioOrcamento(supabase) {
    const formOrcamento = document.getElementById('formOrcamento');
    if (!formOrcamento) return;

    const btnAddItem = document.getElementById('btn-add-item-orcamento');
    const btnSalvarOrcamento = document.getElementById('btnSalvarOrcamento');
    const mensagemOrcamento = document.getElementById('mensagemOrcamento');
    
    // Adicionar Item
    btnAddItem.addEventListener('click', () => {
        const selectProduto = document.getElementById('select-produto-orcamento');
        const produtoId = parseInt(selectProduto.value);
        const produtoNome = selectProduto.options[selectProduto.selectedIndex].text;
        
        const quantidade = parseFloat(document.getElementById('qtd-item-orcamento').value);
        const preco = parseFloat(document.getElementById('preco-item-orcamento').value);
        const medida = document.getElementById('medida-item-orcamento').value;

        if (!produtoId || isNaN(quantidade) || isNaN(preco) || preco <= 0) {
            alert('Preencha Produto, Quantidade e Preço.');
            return;
        }

        itensDoOrcamento.push({
            id_produto: produtoId,
            nomeProduto: produtoNome,
            quantidade: quantidade,
            preco_unitario_negociado: preco,
            medida: medida,
            observacoes_item: ''
        });

        renderizarTabelaItens();

        selectProduto.value = "";
        document.getElementById('qtd-item-orcamento').value = "1";
        document.getElementById('preco-item-orcamento').value = "";
        document.getElementById('medida-item-orcamento').value = "";
    });

    // Salvar Orçamento
    formOrcamento.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (itensDoOrcamento.length === 0) return alert('Adicione itens ao orçamento.');

        btnSalvarOrcamento.disabled = true;
        btnSalvarOrcamento.innerText = 'Salvando...';
        mensagemOrcamento.textContent = '';

        try {
            const idStatusPendentePadrao = 1; 

            const dadosCapa = {
                id_cliente: parseInt(document.getElementById('select-cliente-orcamento').value),
                data_validade_orcamento: document.getElementById('data-validade-orcamento').value,
                observacoes: document.getElementById('obs-orcamento').value,
                valor_total_orcamento: totalOrcamento,
                id_status_orcamento: idStatusPendentePadrao,
                ativo: true 
            };

            if (isNaN(dadosCapa.id_cliente) || !dadosCapa.data_validade_orcamento) {
                throw new Error("Cliente e Data são obrigatórios.");
            }

            const { data: capaSalva, error: erroCapa } = await supabase.from('orcamentos_capa').insert(dadosCapa).select().single();
            if (erroCapa) throw new Error("Erro na capa: " + erroCapa.message);

            const itensParaSalvar = itensDoOrcamento.map(item => ({
                id_orcamento_capa: capaSalva.id,
                id_produto: item.id_produto,
                quantidade: item.quantidade,
                preco_unitario_negociado: item.preco_unitario_negociado,
                medida: item.medida,
                observacoes_item: item.observacoes_item
            }));

            const { error: erroItens } = await supabase.from('orcamentos_item').insert(itensParaSalvar);

            if (erroItens) {
                await supabase.from('orcamentos_capa').delete().eq('id', capaSalva.id);
                throw new Error("Erro nos itens: " + erroItens.message);
            }

            mensagemOrcamento.style.color = 'green';
            mensagemOrcamento.textContent = `Orçamento #${capaSalva.id} salvo!`;
            
            formOrcamento.reset();
            itensDoOrcamento = [];
            renderizarTabelaItens();
            setTimeout(() => { mensagemOrcamento.textContent = ''; }, 5000);

        } catch (error) {
            console.error(error);
            mensagemOrcamento.style.color = 'red';
            mensagemOrcamento.textContent = error.message;
        } finally {
            btnSalvarOrcamento.disabled = false;
            btnSalvarOrcamento.innerText = 'Salvar Orçamento Completo';
        }
    });
}

// --- NOVO: Inicializa a Busca de Orçamentos ---
export function initFuncionalidadeBuscaOrcamento(supabase) {
    const btnBuscar = document.getElementById('btn-busca-orcamento');
    const btnLimpar = document.getElementById('btn-limpar-busca-orcamento');
    const inputBusca = document.getElementById('input-busca-orcamento');

    if (btnBuscar) {
        btnBuscar.addEventListener('click', () => {
            carregarOrcamentos(supabase, inputBusca.value);
        });
    }
    if (inputBusca) {
        inputBusca.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') carregarOrcamentos(supabase, inputBusca.value);
        });
    }
    if (btnLimpar) {
        btnLimpar.addEventListener('click', () => {
            inputBusca.value = '';
            carregarOrcamentos(supabase, null);
        });
    }
}

// --- CONSULTAR ORÇAMENTOS (COM BUSCA) ---
export async function carregarOrcamentos(supabase, termoBusca = null) {
    const tbody = document.getElementById('corpoTabelaOrcamentos');
    if (!tbody) return; 

    tbody.innerHTML = '<tr><td colspan="7">Buscando...</td></tr>';

    // 1. Busca TODOS os orçamentos ativos
    const { data: orcamentos, error } = await supabase
        .from('orcamentos_capa')
        .select(`
            id, created_at, data_validade_orcamento, valor_total_orcamento,
            id_status_orcamento,
            clientes ( nome ),
            status_orcamento ( nome_status )
        `)
        .eq('ativo', true) 
        .order('created_at', { ascending: false });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="7">Erro: ${error.message}</td></tr>`;
        return;
    }

    // 2. Filtra no Javascript
    let listaFiltrada = orcamentos || [];

    if (termoBusca && termoBusca.trim() !== '') {
        const termo = termoBusca.toLowerCase().trim();
        listaFiltrada = listaFiltrada.filter(orc => {
            // Busca por ID
            const matchId = orc.id.toString() === termo;
            // Busca por Nome do Cliente
            const matchNome = orc.clientes && orc.clientes.nome.toLowerCase().includes(termo);
            
            return matchId || matchNome;
        });
    }

    if (listaFiltrada.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">Nenhum orçamento encontrado.</td></tr>';
        return;
    }

    tbody.innerHTML = ''; 
    
    listaFiltrada.forEach(orcamento => {
        const tr = document.createElement('tr');
        
        const dataCriacao = new Date(orcamento.created_at).toLocaleDateString('pt-BR');
        // Formata data de validade que vem como YYYY-MM-DD
        let dataValidade = 'N/A';
        if(orcamento.data_validade_orcamento) {
            const [ano, mes, dia] = orcamento.data_validade_orcamento.split('-');
            dataValidade = `${dia}/${mes}/${ano}`;
        }

        const nomeCliente = orcamento.clientes ? orcamento.clientes.nome : 'N/A';
        const valorTotal = orcamento.valor_total_orcamento.toFixed(2);
        const status = orcamento.status_orcamento ? orcamento.status_orcamento.nome_status : 'Sem status';
        
        tr.innerHTML = `
            <td>${orcamento.id}</td>
            <td>${dataCriacao}</td>
            <td>${nomeCliente}</td>
            <td>${dataValidade}</td>
            <td>R$ ${valorTotal}</td>
            <td>${status}</td>
            <td>
                <button class="btn-visualizar-orcamento" data-id="${orcamento.id}" style="background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
                    Ver
                </button>
                ${status === 'Pendente' ? 
                    `<button class="btn-aprovar-orcamento" data-id="${orcamento.id}" style="background: #007bff; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-left: 5px;">
                        Aprovar
                    </button>` 
                    : ''
                }
                <button class="btn-excluir-orcamento" data-id="${orcamento.id}" style="${estiloBotaoExcluir}">
                    Excluir
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // RE-LIGAR OS EVENTOS DOS BOTÕES
    attachOrcamentoEvents(supabase);
}

// Função auxiliar para ligar eventos da tabela
function attachOrcamentoEvents(supabase) {
    document.querySelectorAll('.btn-visualizar-orcamento').forEach(button => {
        button.addEventListener('click', (e) => abrirModalVisualizar(supabase, e.target.getAttribute('data-id')));
    });

    document.querySelectorAll('.btn-aprovar-orcamento').forEach(button => {
        button.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            if (!confirm(`Aprovar orçamento #${id}?`)) return;

            e.target.disabled = true; e.target.innerText = "...";
            const { error } = await supabase.from('orcamentos_capa').update({ id_status_orcamento: 2 }).eq('id', id); // 2 = Aprovado

            if (error) { alert('Erro: ' + error.message); e.target.disabled = false; } 
            else { carregarOrcamentos(supabase); }
        });
    });

    document.querySelectorAll('.btn-excluir-orcamento').forEach(button => {
        button.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            if (confirm('Ocultar este orçamento?')) {
                e.target.disabled = true;
                const { error } = await supabase.from('orcamentos_capa').update({ ativo: false }).eq('id', id);
                if (error) { alert('Erro: ' + error.message); e.target.disabled = false; }
                else { e.target.closest('tr').remove(); }
            }
        });
    });
}


// --- MODAL VISUALIZAR ---
const modalFundoVisualizar = document.getElementById('modal-fundo-visualizar');

async function abrirModalVisualizar(supabase, orcamentoId) {
    if (!modalFundoVisualizar) return;
    
    document.getElementById('detalhe-orcamento-id').textContent = ` #${orcamentoId}`;
    const itensTbody = document.getElementById('corpoTabelaDetalhesItens');
    itensTbody.innerHTML = '<tr><td colspan="4">Carregando...</td></tr>';
    modalFundoVisualizar.classList.remove('hidden');

    try {
        const { data: capa } = await supabase.from('orcamentos_capa').select(`*, clientes ( nome )`).eq('id', orcamentoId).single();
        const { data: itens } = await supabase.from('orcamentos_item').select(`*, produtos ( nome_produto )`).eq('id_orcamento_capa', orcamentoId);

        const dataCriacao = new Date(capa.created_at).toLocaleDateString('pt-BR');
        const [ano, mes, dia] = capa.data_validade_orcamento.split('-');
        
        document.getElementById('detalhe-cliente-nome').textContent = capa.clientes.nome;
        document.getElementById('detalhe-data-criacao').textContent = dataCriacao;
        document.getElementById('detalhe-data-validade').textContent = `${dia}/${mes}/${ano}`;
        document.getElementById('detalhe-valor-total').textContent = `Total: R$ ${capa.valor_total_orcamento.toFixed(2)}`;

        itensTbody.innerHTML = '';
        itens.forEach(item => {
            const subtotal = item.quantidade * item.preco_unitario_negociado;
            itensTbody.innerHTML += `
                <tr>
                    <td>${item.produtos.nome_produto}</td>
                    <td>${item.quantidade}</td>
                    <td>R$ ${item.preco_unitario_negociado.toFixed(2)}</td>
                    <td>R$ ${subtotal.toFixed(2)}</td>
                </tr>
            `;
        });

    } catch (error) {
        console.error(error);
        alert("Erro ao abrir detalhes.");
        modalFundoVisualizar.classList.add('hidden');
    }
}

document.getElementById('btn-fechar-visualizar')?.addEventListener('click', () => {
    modalFundoVisualizar.classList.add('hidden');
});