// js/orcamento.js
import { Toast } from './toast.js';

let itensDoOrcamento = [];
let totalOrcamento = 0;
let eventosOrcamentoLigados = false;

// =============================================================================
// 1. FUNÇÃO DE IMPRESSÃO (GERAR PDF DA PROPOSTA)
// =============================================================================
export async function gerarPDFOrcamento(idOrcamento, supabase) {
    // 1. Busca dados da empresa (Cabeçalho)
    const { data: empresa } = await supabase.from('configuracoes').select('*').single();
    
    // 2. Busca dados do orçamento
    const { data: capa } = await supabase
        .from('orcamentos_capa')
        .select(`*, clientes ( nome, telefone )`)
        .eq('id', idOrcamento)
        .single();
    
    // 3. Busca itens
    const { data: itens } = await supabase
        .from('orcamentos_item')
        .select(`*, produtos ( nome_produto )`)
        .eq('id_orcamento_capa', idOrcamento);

    if (!capa) return Toast.show("Erro: Orçamento não encontrado.", 'error');

    // --- PREENCHIMENTO DO HTML DE IMPRESSÃO ---

    // Dados da Empresa
    if (empresa) {
        document.getElementById('orc-empresa-nome').textContent = empresa.nome_empresa;
        document.getElementById('orc-empresa-doc').textContent = `CNPJ: ${empresa.cnpj}`;
        document.getElementById('orc-empresa-end').textContent = empresa.endereco;
        document.getElementById('orc-empresa-tel').textContent = `Contato: ${empresa.telefone}`;
        document.getElementById('orc-empresa-responsavel').textContent = empresa.nome_proprietario;
    }

    // Dados do Orçamento
    const dataEmissao = new Date(capa.created_at).toLocaleDateString('pt-BR');
    let dataValidade = '---';
    if (capa.data_validade_orcamento) {
        // Corrige data se vier YYYY-MM-DD
        const parts = capa.data_validade_orcamento.split('-');
        dataValidade = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    document.getElementById('orc-numero').textContent = capa.id;
    document.getElementById('orc-data-emissao').textContent = dataEmissao;
    document.getElementById('orc-data-validade').textContent = dataValidade;
    
    // Dados do Cliente
    document.getElementById('orc-cliente-nome').textContent = capa.clientes?.nome || '---';
    document.getElementById('orc-cliente-tel').textContent = capa.clientes?.telefone || '---';
    
    // Observações
    document.getElementById('orc-observacoes').textContent = capa.observacoes || 'Sem observações adicionais.';

    // Tabela de Itens
    const tbody = document.getElementById('orc-tabela-itens');
    tbody.innerHTML = '';
    
    itens.forEach(item => {
        const totalItem = item.quantidade * item.preco_unitario_negociado;
        
        tbody.innerHTML += `
            <tr>
                <td>${item.produtos.nome_produto}</td>
                <td style="text-align:center">${item.medida || '-'}</td>
                <td style="text-align:center">${item.quantidade}</td>
                <td style="text-align:right">R$ ${item.preco_unitario_negociado.toFixed(2)}</td>
                <td style="text-align:right">R$ ${totalItem.toFixed(2)}</td>
            </tr>
        `;
    });

    document.getElementById('orc-total-geral').textContent = `R$ ${capa.valor_total_orcamento.toFixed(2)}`;

    // --- COMANDO DE IMPRESSÃO ---
    // Adiciona a classe específica para o CSS saber que é PROPOSTA
    document.body.classList.add('print-mode-orcamento');
    
    setTimeout(() => { 
        window.print(); 
        // Remove a classe depois para não travar o layout
        document.body.classList.remove('print-mode-orcamento');
    }, 500);
}

// =============================================================================
// 2. EVENTOS GLOBAIS (MODAIS DE BUSCA)
// =============================================================================
export async function carregarOpcoesOrcamento(supabase) {
    // Trava para não duplicar listeners se navegar pelo menu
    if (eventosOrcamentoLigados) return;
    eventosOrcamentoLigados = true;

    document.addEventListener('click', async (e) => {
        const target = e.target;
        const parentBtn = target.closest('button'); // Pega o botão se clicar no ícone

        // A. ABRIR MODAL CLIENTE
        if (target.id === 'btn-abrir-modal-cliente' || (parentBtn && parentBtn.id === 'btn-abrir-modal-cliente')) {
            e.preventDefault();
            document.getElementById('modal-busca-cliente').classList.remove('hidden');
            document.getElementById('tbody-modal-cliente').innerHTML = '';
            document.getElementById('input-pesquisa-modal-cliente').value = '';
            document.getElementById('input-pesquisa-modal-cliente').focus();
        }

        // B. ABRIR MODAL PRODUTO
        if (target.id === 'btn-abrir-modal-produto' || (parentBtn && parentBtn.id === 'btn-abrir-modal-produto')) {
            e.preventDefault();
            document.getElementById('modal-busca-produto').classList.remove('hidden');
            document.getElementById('tbody-modal-produto').innerHTML = '';
            document.getElementById('input-pesquisa-modal-produto').value = '';
            document.getElementById('input-pesquisa-modal-produto').focus();
        }

        // C. FECHAR MODAIS
        if (target.id === 'btn-fechar-modal-cliente') document.getElementById('modal-busca-cliente').classList.add('hidden');
        if (target.id === 'btn-fechar-modal-produto') document.getElementById('modal-busca-produto').classList.add('hidden');
        if (target.id === 'btn-fechar-visualizar') document.getElementById('modal-fundo-visualizar').classList.add('hidden');

        // D. BUSCAR CLIENTE (Botão dentro do modal)
        if (target.id === 'btn-executar-busca-cliente') {
            e.preventDefault();
            const termo = document.getElementById('input-pesquisa-modal-cliente').value;
            const tbody = document.getElementById('tbody-modal-cliente');
            tbody.innerHTML = '<tr><td colspan="3">Buscando...</td></tr>';

            let query = supabase.from('clientes').select('id, nome, cpf').eq('ativo', true);
            if (termo) query = query.or(`nome.ilike.%${termo}%,cpf.ilike.%${termo}%`);
            
            const { data } = await query.limit(20);
            
            tbody.innerHTML = '';
            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3">Nada encontrado.</td></tr>';
            } else {
                data.forEach(cli => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `<td>${cli.nome}</td><td>${cli.cpf||'-'}</td><td><button type="button" class="btn-usar-cliente" data-id="${cli.id}" data-nome="${cli.nome}" style="background:#04D361;color:#121214;border:none;padding:5px;border-radius:4px;cursor:pointer;font-weight:bold;">Usar</button></td>`;
                    tbody.appendChild(tr);
                });
            }
        }

        // E. BUSCAR PRODUTO (Botão dentro do modal)
        if (target.id === 'btn-executar-busca-produto') {
            e.preventDefault();
            const termo = document.getElementById('input-pesquisa-modal-produto').value;
            const tbody = document.getElementById('tbody-modal-produto');
            tbody.innerHTML = '<tr><td colspan="3">Buscando...</td></tr>';

            let query = supabase.from('produtos').select('id, nome_produto, preco_medio').eq('ativo', true);
            if (termo) query = query.ilike('nome_produto', `%${termo}%`);
            
            const { data } = await query.limit(20);
            
            tbody.innerHTML = '';
            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3">Nada encontrado.</td></tr>';
            } else {
                data.forEach(prod => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `<td>${prod.nome_produto}</td><td>R$ ${prod.preco_medio.toFixed(2)}</td><td><button type="button" class="btn-usar-produto" data-id="${prod.id}" data-nome="${prod.nome_produto}" data-preco="${prod.preco_medio}" style="background:#04D361;color:#121214;border:none;padding:5px;border-radius:4px;cursor:pointer;font-weight:bold;">Usar</button></td>`;
                    tbody.appendChild(tr);
                });
            }
        }

        // F. USAR CLIENTE (Selecionar)
        if (target.classList.contains('btn-usar-cliente')) {
            e.preventDefault();
            document.getElementById('display-cliente-orcamento').value = target.getAttribute('data-nome');
            document.getElementById('hidden-id-cliente-orcamento').value = target.getAttribute('data-id');
            document.getElementById('modal-busca-cliente').classList.add('hidden');
        }

        // G. USAR PRODUTO (Selecionar)
        if (target.classList.contains('btn-usar-produto')) {
            e.preventDefault();
            document.getElementById('display-produto-orcamento').value = target.getAttribute('data-nome');
            document.getElementById('hidden-id-produto-orcamento').value = target.getAttribute('data-id');
            
            // Preenche o campo de preço
            const elPreco = document.getElementById('preco-item-orcamento');
            if(elPreco) elPreco.value = parseFloat(target.getAttribute('data-preco')).toFixed(2);
            
            document.getElementById('modal-busca-produto').classList.add('hidden');
            // Foca na quantidade
            document.getElementById('qtd-item-orcamento').focus();
        }
    });
}

// =============================================================================
// 3. FORMULÁRIO DE NOVO ORÇAMENTO (CRUD)
// =============================================================================

function renderizarTabelaItens() {
    const tbody = document.getElementById('corpoTabelaItensOrcamento');
    const elTotal = document.getElementById('total-orcamento');
    
    if(!tbody) return;

    tbody.innerHTML = '';
    totalOrcamento = 0;

    itensDoOrcamento.forEach((item, index) => {
        const totalItem = item.quantidade * item.preco_unitario_negociado;
        totalOrcamento += totalItem;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.nomeProduto}</td>
            <td>${item.quantidade}</td>
            <td>R$ ${item.preco_unitario_negociado.toFixed(2)}</td>
            <td>${item.medida || '-'}</td>
           <td>
                <button type="button" class="btn-acao btn-danger btn-excluir-item-temp" data-index="${index}">
                    Excluir
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    if(elTotal) elTotal.textContent = `Total: R$ ${totalOrcamento.toFixed(2)}`;

    // Listener para remover item da lista temporária
    document.querySelectorAll('.btn-excluir-item-temp').forEach(btn => {
        btn.onclick = (e) => {
            itensDoOrcamento.splice(parseInt(e.target.getAttribute('data-index')), 1);
            renderizarTabelaItens();
        };
    });
}

export function initFormularioOrcamento(supabase) {
    const formOrcamento = document.getElementById('formOrcamento');
    if (!formOrcamento) return;

    // Trava de segurança para não duplicar listeners
    if (formOrcamento.getAttribute('data-init') === 'true') return;
    formOrcamento.setAttribute('data-init', 'true');

    const btnAddItem = document.getElementById('btn-add-item-orcamento');
    const btnSalvarOrcamento = document.getElementById('btnSalvarOrcamento');
    
    // --- ADICIONAR ITEM À LISTA ---
    btnAddItem.addEventListener('click', () => {
        const produtoId = document.getElementById('hidden-id-produto-orcamento').value;
        const produtoNome = document.getElementById('display-produto-orcamento').value;
        const quantidade = parseFloat(document.getElementById('qtd-item-orcamento').value);
        const preco = parseFloat(document.getElementById('preco-item-orcamento').value);
        const medida = document.getElementById('medida-item-orcamento').value;

        if (!produtoId || isNaN(quantidade) || isNaN(preco)) {
            return Toast.show('Selecione um produto e preencha quantidade/preço.', 'warning');
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

    // --- SALVAR NO BANCO ---
    formOrcamento.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (itensDoOrcamento.length === 0) return Toast.show('Adicione pelo menos um item.', 'warning');
        const clienteId = document.getElementById('hidden-id-cliente-orcamento').value;
        if (!clienteId) return Toast.show('Selecione um cliente.', 'warning');

        btnSalvarOrcamento.disabled = true; btnSalvarOrcamento.innerText = 'Salvando...';

        try {
            // 1. Salva Capa
            const dadosCapa = {
                id_cliente: parseInt(clienteId),
                data_validade_orcamento: document.getElementById('data-validade-orcamento').value,
                observacoes: document.getElementById('obs-orcamento').value,
                valor_total_orcamento: totalOrcamento,
                id_status_orcamento: 1, // 1 = Pendente
                ativo: true 
            };
            const { data: capa, error: errCapa } = await supabase.from('orcamentos_capa').insert(dadosCapa).select().single();
            if (errCapa) throw errCapa;

            // 2. Salva Itens
            const itensParaSalvar = itensDoOrcamento.map(i => ({
                id_orcamento_capa: capa.id,
                id_produto: i.id_produto,
                quantidade: i.quantidade,
                preco_unitario_negociado: i.preco_unitario_negociado,
                medida: i.medida,
                observacoes_item: ''
            }));
            
            const { error: errItens } = await supabase.from('orcamentos_item').insert(itensParaSalvar);
            if (errItens) throw errItens;

            Toast.show(`Orçamento #${capa.id} salvo com sucesso!`, 'success');
            
            if(confirm("Orçamento salvo! Deseja IMPRIMIR agora?")) {
                gerarPDFOrcamento(capa.id, supabase);
            }

            // Reset total
            formOrcamento.reset();
            itensDoOrcamento = [];
            document.getElementById('display-cliente-orcamento').value = "";
            document.getElementById('hidden-id-cliente-orcamento').value = "";
            renderizarTabelaItens();

        } catch (error) {
            Toast.show("Erro ao salvar: " + error.message, 'error');
        } finally {
            btnSalvarOrcamento.disabled = false;
            btnSalvarOrcamento.innerText = 'Salvar Orçamento';
        }
    });
}

// =============================================================================
// 4. CONSULTA DE ORÇAMENTOS
// =============================================================================
export function initFuncionalidadeBuscaOrcamento(supabase) {
    const btnBuscar = document.getElementById('btn-busca-orcamento');
    const btnLimpar = document.getElementById('btn-limpar-busca-orcamento');
    const inputBusca = document.getElementById('input-busca-orcamento');

    if(btnBuscar) btnBuscar.onclick = () => carregarOrcamentos(supabase, inputBusca.value);
    if(inputBusca) inputBusca.onkeyup = (e) => { if (e.key === 'Enter') carregarOrcamentos(supabase, inputBusca.value); };
    if(btnLimpar) btnLimpar.onclick = () => { inputBusca.value = ''; carregarOrcamentos(supabase, null); };
}

export async function carregarOrcamentos(supabase, termoBusca = null) {
    const tbody = document.getElementById('corpoTabelaOrcamentos');
    if (!tbody) return; 
    tbody.innerHTML = '<tr><td colspan="7">Buscando...</td></tr>';

    const { data: orcamentos, error } = await supabase
        .from('orcamentos_capa')
        .select(`id, created_at, data_validade_orcamento, valor_total_orcamento, id_status_orcamento, clientes(nome), status_orcamento(nome_status)`)
        .eq('ativo', true)
        .order('created_at', { ascending: false });

    if (error) { tbody.innerHTML = `<tr><td colspan="7">Erro: ${error.message}</td></tr>`; return; }

    let lista = orcamentos || [];
    if (termoBusca) {
        const t = termoBusca.toLowerCase();
        lista = lista.filter(o => o.id.toString() === t || (o.clientes && o.clientes.nome.toLowerCase().includes(t)));
    }

    if (lista.length === 0) { tbody.innerHTML = '<tr><td colspan="7">Nada encontrado.</td></tr>'; return; }

    tbody.innerHTML = ''; 
    lista.forEach(o => {
        const tr = document.createElement('tr');
        const dataCriacao = new Date(o.created_at).toLocaleDateString('pt-BR');
        let validade = o.data_validade_orcamento ? o.data_validade_orcamento.split('-').reverse().join('/') : '-';
        const status = o.status_orcamento?.nome_status || '-';

        // Botões com IDs corretos e Cores
        tr.innerHTML = `
            <td>${o.id}</td><td>${dataCriacao}</td><td>${o.clientes?.nome}</td><td>${validade}</td>
            <td>R$ ${o.valor_total_orcamento.toFixed(2)}</td><td>${status}</td>
            <td>
                <button class="btn-acao btn-info btn-visualizar-orcamento" data-id="${o.id}" title="Ver Detalhes"><i class="fa-regular fa-eye"></i></button>
                
                <button class="btn-acao btn-imprimir-orcamento" data-id="${o.id}" style="background: rgba(155, 89, 182, 0.2); color: #9b59b6; border: 1px solid #9b59b6;" title="Imprimir Proposta">
                    <i class="fa-solid fa-print"></i>
                </button>

                ${status === 'Pendente' ? 
                    `<button class="btn-acao btn-success btn-aprovar-orcamento" data-id="${o.id}" title="Aprovar"><i class="fa-solid fa-check"></i></button>` 
                    : ''
                }
                
                <button class="btn-acao btn-danger btn-excluir-orcamento" data-id="${o.id}" title="Excluir"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Ligar os eventos dos botões da tabela
    document.querySelectorAll('.btn-visualizar-orcamento').forEach(btn => btn.onclick = (e) => abrirModalVisualizar(supabase, e.currentTarget.dataset.id));
    
    document.querySelectorAll('.btn-imprimir-orcamento').forEach(btn => btn.onclick = (e) => {
        gerarPDFOrcamento(e.currentTarget.dataset.id, supabase);
    });
    
    document.querySelectorAll('.btn-excluir-orcamento').forEach(btn => btn.onclick = async (e) => {
        if(confirm("Deseja excluir este orçamento?")) {
            await supabase.from('orcamentos_capa').update({ ativo: false }).eq('id', e.currentTarget.dataset.id);
            Toast.show("Orçamento excluído.", 'info');
            carregarOrcamentos(supabase);
        }
    });
    
    document.querySelectorAll('.btn-aprovar-orcamento').forEach(btn => btn.onclick = async (e) => {
        if(confirm("Aprovar este orçamento e liberar para Pedido?")) {
            await supabase.from('orcamentos_capa').update({ id_status_orcamento: 2 }).eq('id', e.currentTarget.dataset.id);
            Toast.show("Orçamento aprovado!", 'success');
            carregarOrcamentos(supabase);
        }
    });
}

// =============================================================================
// 5. MODAL DE VISUALIZAÇÃO
// =============================================================================
const modalFundoVisualizar = document.getElementById('modal-fundo-visualizar');

async function abrirModalVisualizar(supabase, orcamentoId) {
    if (!modalFundoVisualizar) return;
    
    // Recria os botões do modal para garantir que o "Imprimir" funcione para o ID atual
    const containerBotoes = modalFundoVisualizar.querySelector('.modal-botoes');
    containerBotoes.innerHTML = `
        <button type="button" class="btn-imprimir-modal" style="background: var(--gold-primary); color: #121214; margin-right: auto; font-weight: bold;">
            <i class="fa-solid fa-print"></i> Imprimir Proposta
        </button>
        <button type="button" id="btn-fechar-visualizar-interno" class="btn-cancelar">Fechar</button>
    `;

    // Liga o evento fechar
    containerBotoes.querySelector('#btn-fechar-visualizar-interno').onclick = () => modalFundoVisualizar.classList.add('hidden');
    
    // Liga o evento Imprimir
    containerBotoes.querySelector('.btn-imprimir-modal').onclick = () => gerarPDFOrcamento(orcamentoId, supabase);

    modalFundoVisualizar.classList.remove('hidden');
    
    const { data: capa } = await supabase.from('orcamentos_capa').select(`*, clientes ( nome )`).eq('id', orcamentoId).single();
    if(capa) {
        document.getElementById('detalhe-orcamento-id').textContent = `#${capa.id}`;
        document.getElementById('detalhe-cliente-nome').textContent = capa.clientes.nome;
        document.getElementById('detalhe-data-criacao').textContent = new Date(capa.created_at).toLocaleDateString('pt-BR');
        
        let validade = '-';
        if (capa.data_validade_orcamento) {
             const p = capa.data_validade_orcamento.split('-');
             validade = `${p[2]}/${p[1]}/${p[0]}`;
        }
        document.getElementById('detalhe-data-validade').textContent = validade;
        document.getElementById('detalhe-valor-total').textContent = `Total: R$ ${capa.valor_total_orcamento.toFixed(2)}`;

        const tbody = document.getElementById('corpoTabelaDetalhesItens');
        tbody.innerHTML = '';
        const { data: itens } = await supabase.from('orcamentos_item').select(`*, produtos ( nome_produto )`).eq('id_orcamento_capa', orcamentoId);
        itens.forEach(item => {
             const sub = item.quantidade * item.preco_unitario_negociado;
             tbody.innerHTML += `
                <tr>
                    <td>${item.produtos.nome_produto}</td>
                    <td>${item.quantidade}</td>
                    <td>R$ ${item.preco_unitario_negociado.toFixed(2)}</td>
                    <td>R$ ${sub.toFixed(2)}</td>
                </tr>`;
        });
    }
}