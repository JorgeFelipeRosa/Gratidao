// js/orcamento.js

let itensDoOrcamento = [];
let totalOrcamento = 0;
let clientesCache = [];
let produtosCache = [];

const estiloBotaoExcluir = `
    background: rgba(226, 88, 88, 0.15); 
    color: #E25858; 
    border: 1px solid #E25858;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    margin-left: 5px;
`;

// Carrega as listas nativas
export async function carregarOpcoesOrcamento(supabase) {
    // CLIENTES
    const inputCliente = document.getElementById('input-busca-cliente-orcamento');
    const datalistCliente = document.getElementById('datalist-clientes-orcamento');
    const hiddenIdCliente = document.getElementById('hidden-id-cliente-orcamento');

    if (inputCliente && datalistCliente) {
        const { data: clientes } = await supabase.from('clientes').select('id, nome').eq('ativo', true).order('nome');
        if (clientes) {
            clientesCache = clientes;
            datalistCliente.innerHTML = '';
            clientes.forEach(cli => {
                const option = document.createElement('option');
                option.value = cli.nome; 
                datalistCliente.appendChild(option);
            });
        }
        inputCliente.addEventListener('input', () => {
            const val = inputCliente.value;
            const found = clientesCache.find(c => c.nome === val);
            if (found) {
                hiddenIdCliente.value = found.id;
                inputCliente.style.borderColor = '#04D361';
            } else {
                hiddenIdCliente.value = '';
                inputCliente.style.borderColor = '';
            }
        });
    }

    // PRODUTOS
    const inputProduto = document.getElementById('input-busca-produto-orcamento');
    const datalistProduto = document.getElementById('datalist-produtos-orcamento');
    const hiddenIdProduto = document.getElementById('hidden-id-produto-orcamento');
    const inputPreco = document.getElementById('preco-item-orcamento');

    if (inputProduto && datalistProduto) {
        const { data: produtos } = await supabase.from('produtos').select('id, nome_produto, preco_medio').eq('ativo', true).order('nome_produto');
        if (produtos) {
            produtosCache = produtos;
            datalistProduto.innerHTML = '';
            produtos.forEach(prod => {
                const option = document.createElement('option');
                option.value = prod.nome_produto;
                datalistProduto.appendChild(option);
            });
        }
        inputProduto.addEventListener('input', () => {
            const val = inputProduto.value;
            const found = produtosCache.find(p => p.nome_produto === val);
            if (found) {
                hiddenIdProduto.value = found.id;
                if(inputPreco) inputPreco.value = found.preco_medio.toFixed(2);
                inputProduto.style.borderColor = '#04D361';
            } else {
                hiddenIdProduto.value = '';
                inputPreco.value = '';
                inputProduto.style.borderColor = '';
            }
        });
    }
}

// Renderiza Tabela
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
                <button type="button" class="btn-acao btn-danger btn-excluir-item-temp" data-index="${index}">
                    Excluir
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    elTotal.textContent = `Total: R$ ${totalOrcamento.toFixed(2)}`;

    document.querySelectorAll('.btn-excluir-item-temp').forEach(button => {
        button.addEventListener('click', (e) => {
            itensDoOrcamento.splice(parseInt(e.target.getAttribute('data-index')), 1);
            renderizarTabelaItens();
        });
    });
}

// Inicializa Formulário
export function initFormularioOrcamento(supabase) {
    const formOrcamento = document.getElementById('formOrcamento');
    if (!formOrcamento) return;

    const btnAddItem = document.getElementById('btn-add-item-orcamento');
    const btnSalvarOrcamento = document.getElementById('btnSalvarOrcamento');
    const mensagemOrcamento = document.getElementById('mensagemOrcamento');
    
    btnAddItem.addEventListener('click', () => {
        const produtoId = document.getElementById('hidden-id-produto-orcamento').value;
        const produtoNome = document.getElementById('input-busca-produto-orcamento').value;
        const quantidade = parseFloat(document.getElementById('qtd-item-orcamento').value);
        const preco = parseFloat(document.getElementById('preco-item-orcamento').value);
        const medida = document.getElementById('medida-item-orcamento').value;

        if (!produtoId || isNaN(quantidade) || isNaN(preco) || preco <= 0) {
            alert('Selecione um produto da lista.');
            return;
        }

        itensDoOrcamento.push({
            id_produto: parseInt(produtoId),
            nomeProduto: produtoNome,
            quantidade: quantidade,
            preco_unitario_negociado: preco,
            medida: medida,
            observacoes_item: ''
        });

        renderizarTabelaItens();
        
        // Limpa campos
        document.getElementById('input-busca-produto-orcamento').value = "";
        document.getElementById('hidden-id-produto-orcamento').value = "";
        document.getElementById('qtd-item-orcamento').value = "1";
        document.getElementById('preco-item-orcamento').value = "";
        document.getElementById('medida-item-orcamento').value = "";
    });

    formOrcamento.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (itensDoOrcamento.length === 0) return alert('Adicione itens.');
        
        const clienteId = document.getElementById('hidden-id-cliente-orcamento').value;
        if (!clienteId) return alert('Selecione um cliente.');

        btnSalvarOrcamento.disabled = true; btnSalvarOrcamento.innerText = 'Salvando...';
        mensagemOrcamento.textContent = '';

        try {
            const dadosCapa = {
                id_cliente: parseInt(clienteId),
                data_validade_orcamento: document.getElementById('data-validade-orcamento').value,
                observacoes: document.getElementById('obs-orcamento').value,
                valor_total_orcamento: totalOrcamento,
                id_status_orcamento: 1,
                ativo: true 
            };

            const { data: capaSalva, error: erroCapa } = await supabase.from('orcamentos_capa').insert(dadosCapa).select().single();
            if (erroCapa) throw new Error(erroCapa.message);

            const itensParaSalvar = itensDoOrcamento.map(item => ({
                id_orcamento_capa: capaSalva.id,
                id_produto: item.id_produto,
                quantidade: item.quantidade,
                preco_unitario_negociado: item.preco_unitario_negociado,
                medida: item.medida,
                observacoes_item: item.observacoes_item
            }));

            const { error: erroItens } = await supabase.from('orcamentos_item').insert(itensParaSalvar);
            if (erroItens) throw new Error(erroItens.message);

            mensagemOrcamento.style.color = 'green';
            mensagemOrcamento.textContent = `Orçamento #${capaSalva.id} salvo!`;
            
            formOrcamento.reset();
            document.getElementById('hidden-id-cliente-orcamento').value = "";
            itensDoOrcamento = [];
            renderizarTabelaItens();
            setTimeout(() => { mensagemOrcamento.textContent = ''; }, 5000);

        } catch (error) {
            mensagemOrcamento.style.color = 'red';
            mensagemOrcamento.textContent = error.message;
        } finally {
            btnSalvarOrcamento.disabled = false;
            btnSalvarOrcamento.innerText = 'Salvar Orçamento';
        }
    });
}

// --- CONSULTAS (MANTÉM IGUAL AO ANTERIOR) ---
export function initFuncionalidadeBuscaOrcamento(supabase) {
    const btnBuscar = document.getElementById('btn-busca-orcamento');
    const btnLimpar = document.getElementById('btn-limpar-busca-orcamento');
    const inputBusca = document.getElementById('input-busca-orcamento');

    if (btnBuscar) btnBuscar.addEventListener('click', () => carregarOrcamentos(supabase, inputBusca.value));
    if (inputBusca) inputBusca.addEventListener('keyup', (e) => { if (e.key === 'Enter') carregarOrcamentos(supabase, inputBusca.value); });
    if (btnLimpar) btnLimpar.addEventListener('click', () => { inputBusca.value = ''; carregarOrcamentos(supabase, null); });
}

export async function carregarOrcamentos(supabase, termoBusca = null) {
    const tbody = document.getElementById('corpoTabelaOrcamentos');
    if (!tbody) return; 
    tbody.innerHTML = '<tr><td colspan="7">Buscando...</td></tr>';

    const { data: orcamentos, error } = await supabase.from('orcamentos_capa').select(`id, created_at, data_validade_orcamento, valor_total_orcamento, id_status_orcamento, clientes(nome), status_orcamento(nome_status)`).eq('ativo', true).order('created_at', { ascending: false });

    if (error) { tbody.innerHTML = `<tr><td colspan="7">Erro: ${error.message}</td></tr>`; return; }

    let listaFiltrada = orcamentos || [];
    if (termoBusca && termoBusca.trim() !== '') {
        const termo = termoBusca.toLowerCase().trim();
        listaFiltrada = listaFiltrada.filter(orc => orc.id.toString() === termo || (orc.clientes && orc.clientes.nome.toLowerCase().includes(termo)));
    }

    if (listaFiltrada.length === 0) { tbody.innerHTML = '<tr><td colspan="7">Nenhum orçamento encontrado.</td></tr>'; return; }

    tbody.innerHTML = ''; 
    listaFiltrada.forEach(orcamento => {
        const tr = document.createElement('tr');
        const dataCriacao = new Date(orcamento.created_at).toLocaleDateString('pt-BR');
        let dataValidade = 'N/A';
        if(orcamento.data_validade_orcamento) {
            const [ano, mes, dia] = orcamento.data_validade_orcamento.split('-');
            dataValidade = `${dia}/${mes}/${ano}`;
        }
        const status = orcamento.status_orcamento ? orcamento.status_orcamento.nome_status : 'Sem status';
        
        tr.innerHTML = `
            <td>${orcamento.id}</td>
            <td>${dataCriacao}</td>
            <td>${orcamento.clientes?.nome || 'N/A'}</td>
            <td>${dataValidade}</td>
            <td>R$ ${orcamento.valor_total_orcamento.toFixed(2)}</td>
            <td>${status}</td>
            <td>
                <button class="btn-acao btn-info btn-visualizar-orcamento" data-id="${orcamento.id}">Ver</button>
                
                ${status === 'Pendente' ? 
                    `<button class="btn-acao btn-success btn-aprovar-orcamento" data-id="${orcamento.id}">Aprovar</button>` 
                    : ''
                }
                
                <button class="btn-acao btn-danger btn-excluir-orcamento" data-id="${orcamento.id}">Excluir</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    attachOrcamentoEvents(supabase);
}

function attachOrcamentoEvents(supabase) {
    document.querySelectorAll('.btn-visualizar-orcamento').forEach(btn => btn.addEventListener('click', (e) => abrirModalVisualizar(supabase, e.target.getAttribute('data-id'))));
    document.querySelectorAll('.btn-aprovar-orcamento').forEach(btn => btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        if (!confirm(`Aprovar orçamento #${id}?`)) return;
        const { error } = await supabase.from('orcamentos_capa').update({ id_status_orcamento: 2 }).eq('id', id);
        if (!error) carregarOrcamentos(supabase);
    }));
    document.querySelectorAll('.btn-excluir-orcamento').forEach(btn => btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        if (confirm('Ocultar orçamento?')) {
            await supabase.from('orcamentos_capa').update({ ativo: false }).eq('id', id);
            e.target.closest('tr').remove();
        }
    }));
}

const modalFundoVisualizar = document.getElementById('modal-fundo-visualizar');
async function abrirModalVisualizar(supabase, orcamentoId) {
    if (!modalFundoVisualizar) return;
    document.getElementById('detalhe-orcamento-id').textContent = ` #${orcamentoId}`;
    const itensTbody = document.getElementById('corpoTabelaDetalhesItens');
    itensTbody.innerHTML = '<tr><td colspan="4">Carregando...</td></tr>';
    modalFundoVisualizar.classList.remove('hidden');
    const { data: capa } = await supabase.from('orcamentos_capa').select(`*, clientes ( nome )`).eq('id', orcamentoId).single();
    const { data: itens } = await supabase.from('orcamentos_item').select(`*, produtos ( nome_produto )`).eq('id_orcamento_capa', orcamentoId);
    const [ano, mes, dia] = capa.data_validade_orcamento.split('-');
    document.getElementById('detalhe-cliente-nome').textContent = capa.clientes.nome;
    document.getElementById('detalhe-data-criacao').textContent = new Date(capa.created_at).toLocaleDateString('pt-BR');
    document.getElementById('detalhe-data-validade').textContent = `${dia}/${mes}/${ano}`;
    document.getElementById('detalhe-valor-total').textContent = `Total: R$ ${capa.valor_total_orcamento.toFixed(2)}`;
    itensTbody.innerHTML = '';
    itens.forEach(item => {
        const subtotal = item.quantidade * item.preco_unitario_negociado;
        itensTbody.innerHTML += `<tr><td>${item.produtos.nome_produto}</td><td>${item.quantidade}</td><td>R$ ${item.preco_unitario_negociado.toFixed(2)}</td><td>R$ ${subtotal.toFixed(2)}</td></tr>`;
    });
}
document.getElementById('btn-fechar-visualizar')?.addEventListener('click', () => modalFundoVisualizar.classList.add('hidden'));