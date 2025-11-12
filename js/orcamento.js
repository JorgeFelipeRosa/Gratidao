// js/orcamento.js

let itensDoOrcamento = [];
let totalOrcamento = 0;

// Estilo do botão de excluir da tabela interna
const estiloBotaoExcluir = `
    background: rgba(226, 88, 88, 0.15); 
    color: #E25858; 
    border: 1px solid #E25858;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    margin-left: 5px;
`;

const estiloBotaoSelecionar = `
    background: #04D361;
    color: #121214;
    border: none;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
`;

// --- LÓGICA DOS MODAIS DE SELEÇÃO ---
export async function carregarOpcoesOrcamento(supabase) {
    
    // --- 1. MODAL CLIENTE ---
    const modalCliente = document.getElementById('modal-busca-cliente');
    const btnAbrirCliente = document.getElementById('btn-abrir-modal-cliente');
    const btnFecharCliente = document.getElementById('btn-fechar-modal-cliente');
    const btnBuscarCliente = document.getElementById('btn-executar-busca-cliente');
    const inputBuscaCliente = document.getElementById('input-pesquisa-modal-cliente');
    const tbodyCliente = document.getElementById('tbody-modal-cliente');
    
    // Campos do formulário principal
    const displayCliente = document.getElementById('display-cliente-orcamento');
    const hiddenIdCliente = document.getElementById('hidden-id-cliente-orcamento');

    if (btnAbrirCliente) {
        btnAbrirCliente.addEventListener('click', () => {
            modalCliente.classList.remove('hidden');
            tbodyCliente.innerHTML = ''; // Limpa busca anterior
            inputBuscaCliente.value = '';
            inputBuscaCliente.focus();
        });
    }
    if (btnFecharCliente) btnFecharCliente.addEventListener('click', () => modalCliente.classList.add('hidden'));

    // Função de Buscar Cliente no Banco
    async function buscarClientes() {
        const termo = inputBuscaCliente.value;
        tbodyCliente.innerHTML = '<tr><td colspan="3">Buscando...</td></tr>';
        
        let query = supabase.from('clientes').select('id, nome, cpf').eq('ativo', true);
        
        if (termo) {
            // Busca por nome OU cpf
            query = query.or(`nome.ilike.%${termo}%,cpf.ilike.%${termo}%`);
        }
        
        const { data, error } = await query.limit(20); // Limita a 20 resultados

        if (error) {
            tbodyCliente.innerHTML = `<tr><td colspan="3">Erro: ${error.message}</td></tr>`;
            return;
        }
        
        tbodyCliente.innerHTML = '';
        if (data.length === 0) {
            tbodyCliente.innerHTML = '<tr><td colspan="3">Nenhum cliente encontrado.</td></tr>';
            return;
        }

        data.forEach(cli => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${cli.nome}</td>
                <td>${cli.cpf}</td>
                <td><button type="button" class="btn-selecionar-cliente" data-id="${cli.id}" data-nome="${cli.nome}" style="${estiloBotaoSelecionar}">Usar</button></td>
            `;
            tbodyCliente.appendChild(tr);
        });

        // Liga os botões de selecionar
        document.querySelectorAll('.btn-selecionar-cliente').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const nome = e.target.getAttribute('data-nome');
                
                // PREENCHE O FORMULÁRIO PRINCIPAL
                displayCliente.value = nome;
                hiddenIdCliente.value = id;
                
                modalCliente.classList.add('hidden');
            });
        });
    }

    if (btnBuscarCliente) {
        btnBuscarCliente.addEventListener('click', buscarClientes);
        inputBuscaCliente.addEventListener('keyup', (e) => { if(e.key === 'Enter') buscarClientes(); });
    }


    // --- 2. MODAL PRODUTO ---
    const modalProduto = document.getElementById('modal-busca-produto');
    const btnAbrirProduto = document.getElementById('btn-abrir-modal-produto');
    const btnFecharProduto = document.getElementById('btn-fechar-modal-produto');
    const btnBuscarProduto = document.getElementById('btn-executar-busca-produto');
    const inputBuscaProduto = document.getElementById('input-pesquisa-modal-produto');
    const tbodyProduto = document.getElementById('tbody-modal-produto');

    // Campos do formulário principal
    const displayProduto = document.getElementById('display-produto-orcamento');
    const hiddenIdProduto = document.getElementById('hidden-id-produto-orcamento');
    const inputPreco = document.getElementById('preco-item-orcamento');

    if (btnAbrirProduto) {
        btnAbrirProduto.addEventListener('click', () => {
            modalProduto.classList.remove('hidden');
            tbodyProduto.innerHTML = '';
            inputBuscaProduto.value = '';
            inputBuscaProduto.focus();
        });
    }
    if (btnFecharProduto) btnFecharProduto.addEventListener('click', () => modalProduto.classList.add('hidden'));

    async function buscarProdutos() {
        const termo = inputBuscaProduto.value;
        tbodyProduto.innerHTML = '<tr><td colspan="3">Buscando...</td></tr>';
        
        let query = supabase.from('produtos').select('id, nome_produto, preco_medio').eq('ativo', true);
        if (termo) query = query.ilike('nome_produto', `%${termo}%`);
        
        const { data, error } = await query.limit(20);

        if (error) {
            tbodyProduto.innerHTML = `<tr><td colspan="3">Erro: ${error.message}</td></tr>`;
            return;
        }
        
        tbodyProduto.innerHTML = '';
        if (data.length === 0) {
            tbodyProduto.innerHTML = '<tr><td colspan="3">Nenhum produto encontrado.</td></tr>';
            return;
        }

        data.forEach(prod => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${prod.nome_produto}</td>
                <td>R$ ${prod.preco_medio.toFixed(2)}</td>
                <td><button type="button" class="btn-selecionar-produto" data-id="${prod.id}" data-nome="${prod.nome_produto}" data-preco="${prod.preco_medio}" style="${estiloBotaoSelecionar}">Usar</button></td>
            `;
            tbodyProduto.appendChild(tr);
        });

        document.querySelectorAll('.btn-selecionar-produto').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const nome = e.target.getAttribute('data-nome');
                const preco = e.target.getAttribute('data-preco');
                
                // PREENCHE O FORMULÁRIO PRINCIPAL
                displayProduto.value = nome;
                hiddenIdProduto.value = id;
                inputPreco.value = parseFloat(preco).toFixed(2);
                
                modalProduto.classList.add('hidden');
            });
        });
    }

    if (btnBuscarProduto) {
        btnBuscarProduto.addEventListener('click', buscarProdutos);
        inputBuscaProduto.addEventListener('keyup', (e) => { if(e.key === 'Enter') buscarProdutos(); });
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
                <button type="button" class="btn-excluir-item-temp" data-index="${index}" style="${estiloBotaoExcluir}">Excluir</button>
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

    if (formOrcamento.getAttribute('data-init') === 'true') return;
    formOrcamento.setAttribute('data-init', 'true');

    const btnAddItem = document.getElementById('btn-add-item-orcamento');
    const btnSalvarOrcamento = document.getElementById('btnSalvarOrcamento');
    const mensagemOrcamento = document.getElementById('mensagemOrcamento');
    
    btnAddItem.addEventListener('click', () => {
        const produtoId = document.getElementById('hidden-id-produto-orcamento').value;
        const produtoNome = document.getElementById('display-produto-orcamento').value;
        const quantidade = parseFloat(document.getElementById('qtd-item-orcamento').value);
        const preco = parseFloat(document.getElementById('preco-item-orcamento').value);
        const medida = document.getElementById('medida-item-orcamento').value;

        if (!produtoId || isNaN(quantidade) || isNaN(preco) || preco <= 0) {
            alert('Busque um produto e preencha a quantidade/preço.');
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
        
        // Limpa campos do item
        document.getElementById('display-produto-orcamento').value = "";
        document.getElementById('hidden-id-produto-orcamento').value = "";
        document.getElementById('qtd-item-orcamento').value = "1";
        document.getElementById('preco-item-orcamento').value = "";
        document.getElementById('medida-item-orcamento').value = "";
    });

    formOrcamento.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (itensDoOrcamento.length === 0) return alert('Adicione itens.');
        
        const clienteId = document.getElementById('hidden-id-cliente-orcamento').value;
        if (!clienteId) return alert('Busque e selecione um cliente.');

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
            if (erroItens) {
                await supabase.from('orcamentos_capa').delete().eq('id', capaSalva.id);
                throw new Error(erroItens.message);
            }

            mensagemOrcamento.style.color = 'green';
            mensagemOrcamento.textContent = `Orçamento #${capaSalva.id} salvo!`;
            
            formOrcamento.reset();
            document.getElementById('display-cliente-orcamento').value = "";
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

// --- CONSULTAS DE ORÇAMENTO (Igual ao anterior) ---
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
                <button class="btn-visualizar-orcamento" data-id="${orcamento.id}" style="background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Ver</button>
                ${status === 'Pendente' ? `<button class="btn-aprovar-orcamento" data-id="${orcamento.id}" style="background: #007bff; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-left: 5px;">Aprovar</button>` : ''}
                <button class="btn-excluir-orcamento" data-id="${orcamento.id}" style="${estiloBotaoExcluir}">Excluir</button>
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

// Modal Visualizar (Mantido igual)
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