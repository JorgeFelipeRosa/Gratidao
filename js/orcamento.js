// js/orcamento.js

// Este array vai guardar os itens na tela (nossa "lista de compras" temporária)
let itensDoOrcamento = [];
let totalOrcamento = 0;

// --- Estilos dos botões da tabela ---
const estiloBotaoExcluir = `
    background: #e74c3c; /* Vermelho */
    color: white;
    border: none;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    margin-left: 5px;
`;

// --- NOVO: Função para carregar menus de opções ATIVAS ---
// (clientes, produtos, etc.)
async function carregarMenuAtivo(supabase, idElemento, nomeTabela, nomeColuna) {
    const selectMenu = document.getElementById(idElemento);
    if (!selectMenu) return; 
    
    const { data, error } = await supabase
        .from(nomeTabela)
        .select(`id, ${nomeColuna}`)
        .eq('ativo', true); // <-- FILTRO IMPORTANTE

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

// Exportada para o main.js: Carrega os menus da tela
export async function carregarOpcoesOrcamento(supabase) {
    // --- MUDANÇA: Chama a nova função filtrada ---
    carregarMenuAtivo(supabase, 'select-cliente-orcamento', 'clientes', 'nome');
    carregarMenuAtivo(supabase, 'select-produto-orcamento', 'produtos', 'nome_produto');
}

// Função interna para atualizar a tabela HTML e o total
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
                <button type="button" class="btn-excluir-item-temp" data-index="${index}">
                    Excluir
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Atualiza o total na tela
    elTotal.textContent = `Total: R$ ${totalOrcamento.toFixed(2)}`;

    // Adiciona "ouvintes" aos novos botões de excluir
    document.querySelectorAll('.btn-excluir-item-temp').forEach(button => {
        button.addEventListener('click', (e) => {
            const indexParaExcluir = parseInt(e.target.getAttribute('data-index'));
            itensDoOrcamento.splice(indexParaExcluir, 1);
            renderizarTabelaItens();
        });
    });
}

// Exportada para o main.js: "Liga" o formulário de SALVAR
export function initFormularioOrcamento(supabase) {
    const formOrcamento = document.getElementById('formOrcamento');
    if (!formOrcamento) return;

    const btnAddItem = document.getElementById('btn-add-item-orcamento');
    const btnSalvarOrcamento = document.getElementById('btnSalvarOrcamento');
    const mensagemOrcamento = document.getElementById('mensagemOrcamento');
    
    // --- LÓGICA DE ADICIONAR ITEM ---
    btnAddItem.addEventListener('click', () => {
        const selectProduto = document.getElementById('select-produto-orcamento');
        const produtoId = parseInt(selectProduto.value);
        const produtoNome = selectProduto.options[selectProduto.selectedIndex].text;
        
        const quantidade = parseFloat(document.getElementById('qtd-item-orcamento').value);
        const preco = parseFloat(document.getElementById('preco-item-orcamento').value);
        const medida = document.getElementById('medida-item-orcamento').value;

        if (!produtoId || isNaN(quantidade) || isNaN(preco) || preco <= 0) {
            alert('Por favor, preencha o Produto, Quantidade e um Preço válido.');
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

    // --- LÓGICA DE SALVAR O ORÇAMENTO COMPLETO ---
    formOrcamento.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (itensDoOrcamento.length === 0) {
            alert('Você precisa adicionar pelo menos um item ao orçamento.');
            return;
        }

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
                ativo: true // Salva como ativo
            };

            if (isNaN(dadosCapa.id_cliente) || !dadosCapa.data_validade_orcamento) {
                throw new Error("Cliente e Data de Validade são obrigatórios.");
            }

            const { data: capaSalva, error: erroCapa } = await supabase
                .from('orcamentos_capa')
                .insert(dadosCapa)
                .select()
                .single();

            if (erroCapa) {
                throw new Error("Erro ao salvar a capa: " + erroCapa.message);
            }

            const idOrcamentoCapa = capaSalva.id;

            const itensParaSalvar = itensDoOrcamento.map(item => ({
                id_orcamento_capa: idOrcamentoCapa,
                id_produto: item.id_produto,
                quantidade: item.quantidade,
                preco_unitario_negociado: item.preco_unitario_negociado,
                medida: item.medida,
                observacoes_item: item.observacoes_item
            }));

            const { error: erroItens } = await supabase
                .from('orcamentos_item')
                .insert(itensParaSalvar);

            if (erroItens) {
                await supabase.from('orcamentos_capa').delete().eq('id', idOrcamentoCapa);
                throw new Error("Erro ao salvar os itens (capa revertida): " + erroItens.message);
            }

            mensagemOrcamento.style.color = 'green';
            mensagemOrcamento.textContent = `Orçamento (ID: ${idOrcamentoCapa}) salvo com sucesso!`;
            
            formOrcamento.reset();
            itensDoOrcamento = [];
            renderizarTabelaItens();
            setTimeout(() => { mensagemOrcamento.textContent = ''; }, 5000);

        } catch (error) {
            console.error('Erro no processo de salvar orçamento:', error);
            mensagemOrcamento.style.color = 'red';
            mensagemOrcamento.textContent = error.message;
        } finally {
            btnSalvarOrcamento.disabled = false;
            btnSalvarOrcamento.innerText = 'Salvar Orçamento Completo';
        }
    });
}


// --- LÓGICA DE CONSULTAR ORÇAMENTOS ---
export async function carregarOrcamentos(supabase) {
    const tbody = document.getElementById('corpoTabelaOrcamentos');
    if (!tbody) return; 

    tbody.innerHTML = '<tr><td colspan="7">Carregando orçamentos...</td></tr>';

    const { data: orcamentos, error } = await supabase
        .from('orcamentos_capa')
        .select(`
            id, created_at, data_validade_orcamento, valor_total_orcamento,
            id_status_orcamento,
            clientes ( nome ),
            status_orcamento ( nome_status )
        `)
        .eq('ativo', true) // SÓ MOSTRA ORÇAMENTOS ATIVOS
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erro ao buscar orçamentos:', error);
        tbody.innerHTML = `<tr><td colspan="7">Erro ao carregar orçamentos: ${error.message}</td></tr>`;
        return;
    }
    if (orcamentos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">Nenhum orçamento ativo cadastrado.</td></tr>';
        return;
    }

    tbody.innerHTML = ''; 
    
    orcamentos.forEach(orcamento => {
        const tr = document.createElement('tr');
        
        const dataCriacao = new Date(orcamento.created_at).toLocaleDateString('pt-BR');
        const [ano, mes, dia] = orcamento.data_validade_orcamento.split('-');
        const dataValidade = `${dia}/${mes}/${ano}`;
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
                    Visualizar
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

    // LIGA OS BOTÕES "VISUALIZAR"
    document.querySelectorAll('.btn-visualizar-orcamento').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            abrirModalVisualizar(supabase, id);
        });
    });

    // LIGA OS BOTÕES "APROVAR"
    document.querySelectorAll('.btn-aprovar-orcamento').forEach(button => {
        button.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            const idStatusAprovado = 2; 

            if (!confirm(`Tem certeza que deseja APROVAR o orçamento #${id}?`)) {
                return;
            }

            e.target.disabled = true;
            e.target.innerText = "Aprovando...";

            const { error } = await supabase
                .from('orcamentos_capa')
                .update({ id_status_orcamento: idStatusAprovado })
                .eq('id', id);

            if (error) {
                alert('Erro ao aprovar: ' + error.message);
                e.target.disabled = false;
                e.target.innerText = "Aprovar";
            } else {
                carregarOrcamentos(supabase);
            }
        });
    });

    // LIGA OS BOTÕES "EXCLUIR" (INATIVAR)
    document.querySelectorAll('.btn-excluir-orcamento').forEach(button => {
        button.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            
            if (confirm('Tem certeza que deseja OCULTAR este orçamento? Ele não poderá ser usado em novos pedidos.')) {
                e.target.disabled = true;
                e.target.innerText = "Ocultando...";
                
                const { error } = await supabase
                    .from('orcamentos_capa')
                    .update({ ativo: false }) // <-- SETA 'ativo' PARA FALSO
                    .eq('id', id);

                if (error) {
                    alert('Erro ao ocultar: ' + error.message);
                    e.target.disabled = false;
                    e.target.innerText = "Excluir";
                } else {
                    e.target.closest('tr').remove();
                }
            }
        });
    });
}


// --- LÓGICA DO MODAL DE VISUALIZAÇÃO ---
const modalFundoVisualizar = document.getElementById('modal-fundo-visualizar');

async function abrirModalVisualizar(supabase, orcamentoId) {
    if (!modalFundoVisualizar) return;
    
    document.getElementById('detalhe-orcamento-id').textContent = ` #${orcamentoId}`;
    document.getElementById('detalhe-cliente-nome').textContent = 'Carregando...';
    document.getElementById('detalhe-data-criacao').textContent = '...';
    document.getElementById('detalhe-data-validade').textContent = '...';
    document.getElementById('detalhe-valor-total').textContent = 'Total: R$ ...';
    const itensTbody = document.getElementById('corpoTabelaDetalhesItens');
    itensTbody.innerHTML = '<tr><td colspan="4">Carregando itens...</td></tr>';

    modalFundoVisualizar.classList.remove('hidden');

    try {
        // PASSO 1: Buscar a Capa
        const { data: capa, error: erroCapa } = await supabase
            .from('orcamentos_capa')
            .select(`
                created_at, data_validade_orcamento, valor_total_orcamento,
                clientes ( nome )
            `)
            .eq('id', orcamentoId)
            .single();
        if (erroCapa) throw erroCapa;

        // PASSO 2: Buscar os Itens
        const { data: itens, error: erroItens } = await supabase
            .from('orcamentos_item')
            .select(`
                quantidade, preco_unitario_negociado,
                produtos ( nome_produto )
            `)
            .eq('id_orcamento_capa', orcamentoId);
        if (erroItens) throw erroItens;

        // PASSO 3: Preencher o modal
        const dataCriacao = new Date(capa.created_at).toLocaleDateString('pt-BR');
        const [ano, mes, dia] = capa.data_validade_orcamento.split('-');
        const dataValidade = `${dia}/${mes}/${ano}`;
        document.getElementById('detalhe-cliente-nome').textContent = capa.clientes.nome;
        document.getElementById('detalhe-data-criacao').textContent = dataCriacao;
        document.getElementById('detalhe-data-validade').textContent = dataValidade;
        document.getElementById('detalhe-valor-total').textContent = `Total: R$ ${capa.valor_total_orcamento.toFixed(2)}`;

        itensTbody.innerHTML = '';
        itens.forEach(item => {
            const tr = document.createElement('tr');
            const subtotal = item.quantidade * item.preco_unitario_negociado;
            tr.innerHTML = `
                <td>${item.produtos.nome_produto}</td>
                <td>${item.quantidade}</td>
                <td>R$ ${item.preco_unitario_negociado.toFixed(2)}</td>
                <td>R$ ${subtotal.toFixed(2)}</td>
            `;
            itensTbody.appendChild(tr);
        });

    } catch (error) {
        console.error('Erro ao buscar detalhes do orçamento:', error);
        alert(error.message);
        fecharModalVisualizar();
    }
}

document.getElementById('btn-fechar-visualizar').addEventListener('click', () => {
    modalFundoVisualizar.classList.add('hidden');
});