// js/pedido.js

// Este objeto vai guardar os dados do orçamento selecionado
let orcamentoCarregado = null;
// Guarda os dados do pedido para o modal de pagamento
let pedidoParaPagar = {
    id: null,
    saldo_pendente: 0
};

// IDs de Status (Aprovado, Pago Parcial, Pago Total, Concluido, Cancelado)
// **ATENÇÃO:** Verifique se estes IDs estão corretos no seu banco
const STATUS_APROVADO_ORCAMENTO = 2; // ID do status 'Aprovado' em status_orcamento
const STATUS_CONCLUIDO_PEDIDO = 3; // ID do status 'Concluído' em status_pedido
const STATUS_ENTREGUE_PEDIDO = 4; // ID do status 'Entregue' em status_pedido
const STATUS_CANCELADO_PEDIDO = 5; // ID do status 'Cancelado' em status_pedido
const STATUS_PAGO_PARCIAL = 2; // ID do status 'Pago Parcial' em status_pagamento
const STATUS_PAGO_TOTAL = 3; // ID do status 'Pago Total' em status_pagamento


// Função interna para carregar os menus de opções
async function carregarMenu(supabase, idElemento, nomeTabela, nomeColuna) {
    const selectMenu = document.getElementById(idElemento);
    if (!selectMenu) return; 
    
    // Filtra por ativo=true, exceto se for tabela de opções sem a coluna 'ativo'
    let query = supabase.from(nomeTabela).select(`id, ${nomeColuna}`);
    
    // Verifica se a tabela possui a coluna 'ativo' antes de filtrar
    // (Esta é uma simplificação, assumindo que as tabelas de opções têm 'ativo' ou não)
    if (nomeTabela === 'clientes' || nomeTabela === 'produtos' || nomeTabela.includes('_mercadoria') || nomeTabela.includes('_produto') || nomeTabela.includes('_venda')) {
         query = query.eq('ativo', true);
    }
    
    const { data, error } = await query;
    
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

// Exportada: Carrega os menus da tela "Novo Pedido"
export async function carregarOpcoesPedido(supabase) {
    const selectOrcamento = document.getElementById('select-orcamento-aprovado');
    if (!selectOrcamento) return;

    // 1. FILTRO DE INTEGRIDADE: Buscar todos os ORÇAMENTOS APROVADOS
    // A query mais simples para o Supabase é: traga todos os orçamentos com status=APROVADO
    const { data: orcamentos, error: erroOrcamentos } = await supabase
        .from('orcamentos_capa')
        .select(`
            id, valor_total_orcamento,
            id_status_orcamento,
            id_cliente,
            clientes ( nome )
        `)
        .eq('id_status_orcamento', STATUS_APROVADO_ORCAMENTO)
        .eq('ativo', true)
        .order('created_at', { ascending: false });

    if (erroOrcamentos) {
        console.error('Erro ao buscar orçamentos aprovados:', erroOrcamentos);
        selectOrcamento.innerHTML = `<option value="">Erro ao carregar</option>`;
        return;
    }

    // 2. FILTRO DE ESTADO: Verificar se o ORÇAMENTO JÁ GEROU UM PEDIDO CONCLUÍDO/CANCELADO
    
    // Pegar IDs de todos os orçamentos que JÁ ESTÃO EM PEDIDOS TERMINADOS/CANCELADOS
    const { data: pedidosTerminados, error: erroPedidos } = await supabase
        .from('pedidos_capa')
        .select(`id_orcamento_origem`)
        .in('id_status_pedido', [STATUS_CONCLUIDO_PEDIDO, STATUS_ENTREGUE_PEDIDO, STATUS_CANCELADO_PEDIDO]);

    if (erroPedidos) {
        console.error('Erro ao verificar pedidos terminados:', erroPedidos);
        selectOrcamento.innerHTML = `<option value="">Erro de integridade</option>`;
        return;
    }

    const orcamentosTerminadosIds = pedidosTerminados.map(p => p.id_orcamento_origem);

    // 3. Montar a lista final filtrada
    const orcamentosDisponiveis = orcamentos.filter(orc => 
        !orcamentosTerminadosIds.includes(orc.id)
    );


    if (orcamentosDisponiveis.length === 0) {
        selectOrcamento.innerHTML = `<option value="">Nenhum orçamento aprovado disponível</option>`;
    } else {
        selectOrcamento.innerHTML = `<option value="">Selecione um orçamento</option>`;
        orcamentosDisponiveis.forEach(orcamento => {
            selectOrcamento.innerHTML += `
                <option value="${orcamento.id}">
                    ID #${orcamento.id} - ${orcamento.clientes.nome} (R$ ${orcamento.valor_total_orcamento.toFixed(2)})
                </option>
            `;
        });
    }

    // 4. Carrega os outros menus de opções
    carregarMenu(supabase, 'pedido-status-pedido', 'status_pedido', 'nome_status');
    carregarMenu(supabase, 'pedido-forma-pagamento', 'formas_pagamento', 'nome_forma');
}

// Exportada: "Liga" o formulário de "Novo Pedido"
export function initFormularioPedido(supabase) {
    const formPedido = document.getElementById('formPedido');
    if (!formPedido) return;

    const btnCarregar = document.getElementById('btn-carregar-orcamento');
    const btnSalvarPedido = document.getElementById('btnSalvarPedido');
    const msgPedido = document.getElementById('mensagemPedido');

    // --- LÓGICA DE CARREGAR DADOS DO ORÇAMENTO ---
    btnCarregar.addEventListener('click', async () => {
        const idOrcamento = document.getElementById('select-orcamento-aprovado').value;
        if (!idOrcamento) {
            alert('Selecione um orçamento para carregar.');
            return;
        }

        const { data: capa, error: erroCapa } = await supabase
            .from('orcamentos_capa')
            .select(`*, clientes ( nome )`)
            .eq('id', idOrcamento)
            .single();
        
        const { data: itens, error: erroItens } = await supabase
            .from('orcamentos_item')
            .select(`*`)
            .eq('id_orcamento_capa', idOrcamento);

        if (erroCapa || erroItens) {
            alert('Erro ao buscar dados do orçamento: ' + (erroCapa?.message || erroItens?.message));
            return;
        }

        // Preenche os campos do formulário
        document.getElementById('pedido-cliente-nome').textContent = capa.clientes.nome;
        document.getElementById('pedido-valor-total').textContent = `R$ ${capa.valor_total_orcamento.toFixed(2)}`;
        document.getElementById('pedido-observacoes').value = capa.observacoes;
        
        // Guarda os dados carregados para usar no salvamento
        orcamentoCarregado = {
            capa: capa,
            itens: itens
        };
    });

    // --- LÓGICA DE SALVAR O PEDIDO COMPLETO ---
    formPedido.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!orcamentoCarregado) {
            alert('Você precisa carregar os dados de um orçamento antes de salvar.');
            return;
        }

        btnSalvarPedido.disabled = true;
        btnSalvarPedido.innerText = 'Salvando...';
        msgPedido.textContent = '';

        try {
            // --- PASSO 1: Salvar a PEDIDOS_CAPA ---
            const dadosCapaPedido = {
                id_cliente: orcamentoCarregado.capa.id_cliente,
                id_orcamento_origem: orcamentoCarregado.capa.id,
                valor_total_pedido: orcamentoCarregado.capa.valor_total_orcamento,
                prazo_entrega: document.getElementById('pedido-prazo-entrega').value,
                data_vencimento: document.getElementById('pedido-data-vencimento').value,
                id_status_pedido: parseInt(document.getElementById('pedido-status-pedido').value),
                observacoes: document.getElementById('pedido-observacoes').value
            };
            
            // Validação
            if (!dadosCapaPedido.prazo_entrega || !dadosCapaPedido.data_vencimento || isNaN(dadosCapaPedido.id_status_pedido)) {
                throw new Error("Prazo de Entrega, Vencimento e Status do Pedido são obrigatórios.");
            }

            const { data: capaPedidoSalva, error: erroCapa } = await supabase
                .from('pedidos_capa')
                .insert(dadosCapaPedido)
                .select()
                .single();

            if (erroCapa) throw new Error("Erro ao salvar a capa do pedido: " + erroCapa.message);

            const idPedidoCapa = capaPedidoSalva.id;

            // --- PASSO 2: Salvar os PEDIDOS_ITEM ---
            const itensPedidoParaSalvar = orcamentoCarregado.itens.map(item => ({
                id_pedido_capa: idPedidoCapa,
                id_produto: item.id_produto,
                quantidade: item.quantidade,
                valor_unitario_vendido: item.preco_unitario_negociado,
                medida: item.medida,
                observacoes_item: item.observacoes_item
            }));

            const { error: erroItens } = await supabase
                .from('pedidos_item')
                .insert(itensPedidoParaSalvar);

            if (erroItens) {
                await supabase.from('pedidos_capa').delete().eq('id', idPedidoCapa);
                throw new Error("Erro ao salvar os itens do pedido (capa revertida): " + erroItens.message);
            }

            // --- PASSO 3: Salvar o PAGAMENTO INICIAL (Opcional) ---
            const valorEntrada = parseFloat(document.getElementById('pedido-valor-entrada').value);
            const formaPagamento = parseInt(document.getElementById('pedido-forma-pagamento').value);
            const dataPagamento = document.getElementById('pedido-data-pagamento').value;

            if (valorEntrada > 0 && !isNaN(formaPagamento) && dataPagamento) {
                const dadosPagamento = {
                    id_pedido_capa: idPedidoCapa,
                    data_pagamento: dataPagamento,
                    valor_pago: valorEntrada,
                    id_forma_pagamento: formaPagamento,
                    observacoes: "Pagamento de entrada."
                };
                
                const { error: erroPagamento } = await supabase
                    .from('registros_pagamento')
                    .insert(dadosPagamento);
                
                if (erroPagamento) {
                    msgPedido.textContent = `Pedido #${idPedidoCapa} salvo, MAS FALHOU AO REGISTRAR A ENTRADA: ${erroPagamento.message}`;
                }
                
                if(valorEntrada < orcamentoCarregado.capa.valor_total_orcamento) {
                     await supabase.from('pedidos_capa').update({ id_status_pagamento: STATUS_PAGO_PARCIAL }).eq('id', idPedidoCapa);
                } else {
                     await supabase.from('pedidos_capa').update({ id_status_pagamento: STATUS_PAGO_TOTAL }).eq('id', idPedidoCapa);
                }
               
            }

            // --- SUCESSO! ---
            if (!msgPedido.textContent) {
                msgPedido.style.color = 'green';
                msgPedido.textContent = `Pedido (ID: ${idPedidoCapa}) salvo com sucesso!`;
            }
            
            formPedido.reset();
            orcamentoCarregado = null; 
            document.getElementById('pedido-cliente-nome').textContent = '---';
            document.getElementById('pedido-valor-total').textContent = 'R$ 0.00';
            setTimeout(() => { msgPedido.textContent = ''; }, 5000);

        } catch (error) {
            console.error('Erro no processo de salvar pedido:', error);
            msgPedido.style.color = 'red';
            msgPedido.textContent = error.message;
        } finally {
            btnSalvarPedido.disabled = false;
            btnSalvarPedido.innerText = 'Salvar Pedido Completo';
        }
    });
}


// --- LÓGICA DE CONSULTAR PEDIDOS (MODIFICADA) ---
// (Esta função e as funções de modal/pagamento não mudam)
export async function carregarPedidos(supabase) {
    const tbody = document.getElementById('corpoTabelaPedidos');
    if (!tbody) return; 

    tbody.innerHTML = '<tr><td colspan="9">Carregando pedidos...</td></tr>';

    const { data: pedidos, error } = await supabase.rpc('get_pedidos_com_saldo');

    if (error) {
        console.error('Erro ao buscar pedidos:', error);
        tbody.innerHTML = `<tr><td colspan="9">Erro ao carregar pedidos: ${error.message}</td></tr>`;
        return;
    }
    if (pedidos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9">Nenhum pedido cadastrado ainda.</td></tr>';
        return;
    }

    tbody.innerHTML = ''; 
    
    pedidos.forEach(pedido => {
        const tr = document.createElement('tr');
        const dataCriacao = new Date(pedido.data_criacao).toLocaleDateString('pt-BR');
        
        let classeStatusPgto = '';
        if (pedido.saldo_pendente <= 0) classeStatusPgto = 'status-pago';
        else if (pedido.saldo_pendente > 0) classeStatusPgto = 'status-pendente';
        
        tr.innerHTML = `
            <td>${pedido.id}</td>
            <td>${dataCriacao}</td>
            <td>${pedido.cliente_nome}</td>
            <td>R$ ${pedido.valor_total.toFixed(2)}</td>
            <td>R$ ${pedido.total_pago.toFixed(2)}</td>
            <td class="${classeStatusPgto}"><strong>R$ ${pedido.saldo_pendente.toFixed(2)}</strong></td>
            <td>${pedido.status_pedido}</td>
            <td>${pedido.status_pagamento}</td>
            <td>
                <button class="btn-visualizar-pedido" data-id="${pedido.id}" style="background: #17a2b8; color: white; border:none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
                    Ver
                </button>
                <button class="btn-mudar-status-pedido" data-id="${pedido.id}" style="background: #ffc107; color: #333; border:none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-left: 5px;">
                    Status
                </button>
                ${pedido.saldo_pendente > 0 ? 
                    `<button class="btn-add-pagamento" 
                             data-id="${pedido.id}" 
                             data-saldo="${pedido.saldo_pendente}"
                             style="background: #28a745; color: white; border:none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-left: 5px;">
                        Pagar
                    </button>` 
                    : ''
                }
            </td>
        `;
        tbody.appendChild(tr);
    });

    // --- LIGA OS BOTÕES "PAGAR" ---
    document.querySelectorAll('.btn-add-pagamento').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            const saldo = parseFloat(e.target.getAttribute('data-saldo'));
            pedidoParaPagar.id = id;
            pedidoParaPagar.saldo_pendente = saldo;
            abrirModalPagamento(supabase, id, saldo);
        });
    });
    
    // --- LIGA OS BOTÕES "VER" ---
    document.querySelectorAll('.btn-visualizar-pedido').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            abrirModalVisualizarPedido(supabase, id);
        });
    });

    // --- LIGA OS BOTÕES "MUDAR STATUS" ---
    document.querySelectorAll('.btn-mudar-status-pedido').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            abrirModalMudarStatus(supabase, id);
        });
    });
}

// ... (Resto das funções de modal de Pedido e Pagamento que não mudam)

const modalFundoPagamento = document.getElementById('modal-fundo-pagamento');
const formAddPagamento = document.getElementById('formAddPagamento');
const mensagemAddPagamento = document.getElementById('mensagemAddPagamento');

function abrirModalPagamento(supabase, id, saldo) {
    if (!modalFundoPagamento) return;
    formAddPagamento.reset();
    mensagemAddPagamento.textContent = '';
    document.getElementById('pgto-pedido-id').textContent = id;
    document.getElementById('pgto-saldo-pendente').textContent = `R$ ${saldo.toFixed(2)}`;
    document.getElementById('pgto-hidden-pedido-id').value = id;
    document.getElementById('pgto-valor-pago').value = saldo.toFixed(2); 
    carregarMenu(supabase, 'pgto-forma-pagamento', 'formas_pagamento', 'nome_forma');
    document.getElementById('pgto-data-pagamento').valueAsDate = new Date();
    modalFundoPagamento.classList.remove('hidden');
}

function fecharModalPagamento() {
    modalFundoPagamento.classList.add('hidden');
}

document.getElementById('btn-cancelar-pagamento').addEventListener('click', fecharModalPagamento);

export function initFormularioPagamento(supabase) {
    if (!formAddPagamento) return;

    formAddPagamento.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btnSalvar = document.getElementById('btn-salvar-pagamento');
        btnSalvar.disabled = true;
        btnSalvar.innerText = 'Salvando...';
        mensagemAddPagamento.textContent = '';

        const formData = new FormData(formAddPagamento);
        const valorPago = parseFloat(formData.get('pgto-valor-pago'));
        const pedidoId = parseInt(document.getElementById('pgto-hidden-pedido-id').value);

        try {
            // --- PASSO 1: Salvar o registro do pagamento ---
            const dadosPagamento = {
                id_pedido_capa: pedidoId,
                data_pagamento: formData.get('pgto-data-pagamento'),
                valor_pago: valorPago,
                id_forma_pagamento: parseInt(formData.get('pgto-forma-pagamento')),
                observacoes: formData.get('pgto-observacoes')
            };

            if (isNaN(dadosPagamento.id_forma_pagamento) || !dadosPagamento.data_pagamento) {
                throw new Error('Data e Forma de Pagamento são obrigatórios.');
            }

            const { error: erroPagamento } = await supabase
                .from('registros_pagamento')
                .insert(dadosPagamento);
            if (erroPagamento) throw new Error(erroPagamento.message);

            // --- PASSO 2: Atualizar o Status do Pedido ---
            const novoSaldo = pedidoParaPagar.saldo_pendente - valorPago;
            let novoStatusPgtoId = STATUS_PAGO_PARCIAL; // Assume "Pago Parcial"
            if (novoSaldo <= 0.01) { 
                novoStatusPgtoId = STATUS_PAGO_TOTAL; // "Pago Total"
            }

            const { error: erroUpdate } = await supabase
                .from('pedidos_capa')
                .update({ id_status_pagamento: novoStatusPgtoId })
                .eq('id', pedidoId);
            if (erroUpdate) throw new Error("Pagamento salvo, mas falha ao atualizar status: " + erroUpdate.message);
            
            // --- SUCESSO! ---
            mensagemAddPagamento.style.color = 'green';
            mensagemAddPagamento.textContent = 'Pagamento salvo com sucesso!';
            carregarPedidos(supabase);
            setTimeout(fecharModalPagamento, 2000);

        } catch (error) {
            console.error('Erro ao salvar pagamento:', error);
            mensagemAddPagamento.style.color = 'red';
            mensagemAddPagamento.textContent = error.message;
        } finally {
            btnSalvar.disabled = false;
            btnSalvar.innerText = 'Salvar Pagamento';
        }
    });
}


// --- LÓGICA DO MODAL DE VISUALIZAR PEDIDO ---
const modalFundoVisualizarPedido = document.getElementById('modal-fundo-visualizar-pedido');

async function abrirModalVisualizarPedido(supabase, pedidoId) {
    if (!modalFundoVisualizarPedido) return;
    
    document.getElementById('detalhe-pedido-id').textContent = ` #${pedidoId}`;
    document.getElementById('detalhe-pedido-cliente').textContent = 'Carregando...';
    document.getElementById('detalhe-pedido-status').textContent = '...';
    document.getElementById('detalhe-pedido-valor').textContent = '...';
    document.getElementById('detalhe-pedido-status-pgto').textContent = '...';
    const itensTbody = document.getElementById('corpoTabelaDetalhesItensPedido');
    const pagamentosTbody = document.getElementById('corpoTabelaDetalhesPagamentos');
    itensTbody.innerHTML = '<tr><td colspan="3">Carregando...</td></tr>';
    pagamentosTbody.innerHTML = '<tr><td colspan="3">Carregando...</td></tr>';

    modalFundoVisualizarPedido.classList.remove('hidden');

    try {
        // --- PASSO 1: Buscar a CAPA ---
        const { data: capa, error: erroCapa } = await supabase
            .from('pedidos_capa')
            .select(`
                valor_total_pedido,
                clientes ( nome ),
                status_pedido ( nome_status ),
                status_pagamento ( status_pagamento )
            `)
            .eq('id', pedidoId)
            .single();
        if (erroCapa) throw new Error("Erro ao buscar capa: " + erroCapa.message);

        document.getElementById('detalhe-pedido-cliente').textContent = capa.clientes.nome;
        document.getElementById('detalhe-pedido-status').textContent = capa.status_pedido.nome_status;
        document.getElementById('detalhe-pedido-valor').textContent = `R$ ${capa.valor_total_pedido.toFixed(2)}`;
        document.getElementById('detalhe-pedido-status-pgto').textContent = capa.status_pagamento.status_pagamento;
        
        // --- PASSO 2: Buscar os ITENS ---
        const { data: itens, error: erroItens } = await supabase
            .from('pedidos_item')
            .select(`quantidade, valor_unitario_vendido, produtos ( nome_produto )`)
            .eq('id_pedido_capa', pedidoId);
        if (erroItens) throw new Error("Erro ao buscar itens: " + erroItens.message);

        itensTbody.innerHTML = '';
        itens.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.produtos.nome_produto}</td>
                <td>${item.quantidade}</td>
                <td>R$ ${item.valor_unitario_vendido.toFixed(2)}</td>
            `;
            itensTbody.appendChild(tr);
        });

        // --- PASSO 3: Buscar os PAGAMENTOS ---
        const { data: pagamentos, error: erroPagamentos } = await supabase
            .from('registros_pagamento')
            .select(`data_pagamento, valor_pago, formas_pagamento ( nome_forma )`)
            .eq('id_pedido_capa', pedidoId)
            .order('data_pagamento', { ascending: true });
        
        if (erroPagamentos) throw new Error("Ocorreu um erro ao buscar pagamentos: " + erroPagamentos.message);

        pagamentosTbody.innerHTML = '';
        if (pagamentos.length === 0) {
            pagamentosTbody.innerHTML = '<tr><td colspan="3">Nenhum pagamento registrado.</td></tr>';
        } else {
            pagamentos.forEach(pgto => {
                const tr = document.createElement('tr');
                const [ano, mes, dia] = pgto.data_pagamento.split('-');
                const dataPgto = `${dia}/${mes}/${ano}`;
                tr.innerHTML = `
                    <td>${dataPgto}</td>
                    <td>R$ ${pgto.valor_pago.toFixed(2)}</td>
                    <td>${pgto.formas_pagamento.nome_forma}</td>
                `;
                pagamentosTbody.appendChild(tr);
            });
        }

    } catch (error) {
        console.error('Erro ao buscar detalhes do pedido:', error);
        alert(error.message);
        fecharModalVisualizarPedido(); // Fecha o modal se deu erro
    }
}

document.getElementById('btn-fechar-visualizar-pedido').addEventListener('click', () => {
    modalFundoVisualizarPedido.classList.add('hidden');
});


// --- LÓGICA DO MODAL MUDAR STATUS ---
const modalFundoMudarStatus = document.getElementById('modal-fundo-mudar-status');
const formMudarStatus = document.getElementById('formMudarStatus');
const mensagemMudarStatus = document.getElementById('mensagemMudarStatus');

function abrirModalMudarStatus(supabase, id) {
    if (!modalFundoMudarStatus) return;
    formMudarStatus.reset();
    mensagemMudarStatus.textContent = '';
    document.getElementById('status-pedido-id').textContent = id;
    document.getElementById('status-hidden-pedido-id').value = id;
    carregarMenu(supabase, 'select-mudar-status-pedido', 'status_pedido', 'nome_status');
    modalFundoMudarStatus.classList.remove('hidden');
}

function fecharModalMudarStatus() {
    modalFundoMudarStatus.classList.add('hidden');
}

document.getElementById('btn-cancelar-mudar-status').addEventListener('click', fecharModalMudarStatus);

export function initFormularioMudarStatus(supabase) {
    if (!formMudarStatus) return;

    formMudarStatus.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btnSalvar = document.getElementById('btn-salvar-mudar-status');
        btnSalvar.disabled = true;
        btnSalvar.innerText = 'Salvando...';
        mensagemMudarStatus.textContent = '';

        const formData = new FormData(formMudarStatus);
        const novoStatusId = parseInt(formData.get('id_status_pedido'));
        const pedidoId = parseInt(document.getElementById('status-hidden-pedido-id').value);

        try {
            if (isNaN(novoStatusId)) {
                throw new Error('Selecione um novo status.');
            }

            const { error } = await supabase
                .from('pedidos_capa')
                .update({ id_status_pedido: novoStatusId })
                .eq('id', pedidoId);

            if (error) throw new Error(error.message);

            mensagemMudarStatus.style.color = 'green';
            mensagemMudarStatus.textContent = 'Status atualizado!';
            carregarPedidos(supabase);
            setTimeout(fecharModalMudarStatus, 2000);

        } catch (error) {
            console.error('Erro ao mudar status:', error);
            mensagemMudarStatus.style.color = 'red';
            mensagemMudarStatus.textContent = error.message;
        } finally {
            btnSalvar.disabled = false;
            btnSalvar.innerText = 'Salvar Status';
        }
    });
}

// // js/pedido.js

// // Este objeto vai guardar os dados do orçamento selecionado
// let orcamentoCarregado = null;
// // Guarda os dados do pedido para o modal de pagamento
// let pedidoParaPagar = {
//     id: null,
//     saldo_pendente: 0
// };

// // Função interna para carregar os menus de opções
// async function carregarMenu(supabase, idElemento, nomeTabela, nomeColuna) {
//     const selectMenu = document.getElementById(idElemento);
//     if (!selectMenu) return; 
//     const { data, error } = await supabase.from(nomeTabela).select(`id, ${nomeColuna}`);
//     if (error) {
//         console.error(`Erro ao buscar ${nomeTabela}:`, error);
//         selectMenu.innerHTML = `<option value="">Erro</option>`;
//     } else {
//         selectMenu.innerHTML = `<option value="">Selecione</option>`;
//         data.forEach(item => {
//             selectMenu.innerHTML += `<option value="${item.id}">${item[nomeColuna]}</option>`;
//         });
//     }
// }

// // Exportada: Carrega os menus da tela "Novo Pedido"
// export async function carregarOpcoesPedido(supabase) {
//     const selectOrcamento = document.getElementById('select-orcamento-aprovado');
//     if (!selectOrcamento) return;

//     // 1. Busca os orçamentos "Aprovados" (ID de status '2')
//     const { data, error } = await supabase
//         .from('orcamentos_capa')
//         .select(`id, valor_total_orcamento, clientes ( nome )`)
//         .eq('id_status_orcamento', 2)
//         .eq('ativo', true) // <-- Adicionado filtro de ativo
//         .order('created_at', { ascending: false });

//     if (error) {
//         console.error('Erro ao buscar orçamentos aprovados:', error);
//         selectOrcamento.innerHTML = `<option value="">Erro ao carregar</option>`;
//     } else if (data.length === 0) {
//         selectOrcamento.innerHTML = `<option value="">Nenhum orçamento aprovado</option>`;
//     } else {
//         selectOrcamento.innerHTML = `<option value="">Selecione um orçamento</option>`;
//         data.forEach(orcamento => {
//             selectOrcamento.innerHTML += `
//                 <option value="${orcamento.id}">
//                     ID #${orcamento.id} - ${orcamento.clientes.nome} (R$ ${orcamento.valor_total_orcamento.toFixed(2)})
//                 </option>
//             `;
//         });
//     }

//     // 2. Carrega os outros menus de opções
//     carregarMenu(supabase, 'pedido-status-pedido', 'status_pedido', 'nome_status');
//     carregarMenu(supabase, 'pedido-forma-pagamento', 'formas_pagamento', 'nome_forma');
// }

// // Exportada: "Liga" o formulário de "Novo Pedido"
// export function initFormularioPedido(supabase) {
//     const formPedido = document.getElementById('formPedido');
//     if (!formPedido) return;

//     const btnCarregar = document.getElementById('btn-carregar-orcamento');
//     const btnSalvarPedido = document.getElementById('btnSalvarPedido');
//     const msgPedido = document.getElementById('mensagemPedido');

//     // --- LÓGICA DE CARREGAR DADOS DO ORÇAMENTO ---
//     btnCarregar.addEventListener('click', async () => {
//         const idOrcamento = document.getElementById('select-orcamento-aprovado').value;
//         if (!idOrcamento) {
//             alert('Selecione um orçamento para carregar.');
//             return;
//         }

//         const { data: capa, error: erroCapa } = await supabase
//             .from('orcamentos_capa')
//             .select(`*, clientes ( nome )`)
//             .eq('id', idOrcamento)
//             .single();
        
//         const { data: itens, error: erroItens } = await supabase
//             .from('orcamentos_item')
//             .select(`*`)
//             .eq('id_orcamento_capa', idOrcamento);

//         if (erroCapa || erroItens) {
//             alert('Erro ao buscar dados do orçamento: ' + (erroCapa?.message || erroItens?.message));
//             return;
//         }

//         document.getElementById('pedido-cliente-nome').textContent = capa.clientes.nome;
//         document.getElementById('pedido-valor-total').textContent = `R$ ${capa.valor_total_orcamento.toFixed(2)}`;
//         document.getElementById('pedido-observacoes').value = capa.observacoes;
        
//         orcamentoCarregado = {
//             capa: capa,
//             itens: itens
//         };
//     });

//     // --- LÓGICA DE SALVAR O PEDIDO COMPLETO ---
//     formPedido.addEventListener('submit', async (e) => {
//         e.preventDefault();
        
//         if (!orcamentoCarregado) {
//             alert('Você precisa carregar os dados de um orçamento antes de salvar.');
//             return;
//         }

//         btnSalvarPedido.disabled = true;
//         btnSalvarPedido.innerText = 'Salvando...';
//         msgPedido.textContent = '';

//         try {
//             // --- PASSO 1: Salvar a PEDIDOS_CAPA ---
//             const dadosCapaPedido = {
//                 id_cliente: orcamentoCarregado.capa.id_cliente,
//                 id_orcamento_origem: orcamentoCarregado.capa.id,
//                 valor_total_pedido: orcamentoCarregado.capa.valor_total_orcamento,
//                 prazo_entrega: document.getElementById('pedido-prazo-entrega').value,
//                 data_vencimento: document.getElementById('pedido-data-vencimento').value,
//                 id_status_pedido: parseInt(document.getElementById('pedido-status-pedido').value),
//                 observacoes: document.getElementById('pedido-observacoes').value
//             };
            
//             if (!dadosCapaPedido.prazo_entrega || !dadosCapaPedido.data_vencimento || isNaN(dadosCapaPedido.id_status_pedido)) {
//                 throw new Error("Prazo de Entrega, Vencimento e Status do Pedido são obrigatórios.");
//             }

//             const { data: capaPedidoSalva, error: erroCapa } = await supabase
//                 .from('pedidos_capa')
//                 .insert(dadosCapaPedido)
//                 .select()
//                 .single();

//             if (erroCapa) throw new Error("Erro ao salvar a capa do pedido: " + erroCapa.message);

//             const idPedidoCapa = capaPedidoSalva.id;

//             // --- PASSO 2: Salvar os PEDIDOS_ITEM ---
//             const itensPedidoParaSalvar = orcamentoCarregado.itens.map(item => ({
//                 id_pedido_capa: idPedidoCapa,
//                 id_produto: item.id_produto,
//                 quantidade: item.quantidade,
//                 valor_unitario_vendido: item.preco_unitario_negociado,
//                 medida: item.medida,
//                 observacoes_item: item.observacoes_item
//             }));

//             const { error: erroItens } = await supabase
//                 .from('pedidos_item')
//                 .insert(itensPedidoParaSalvar);

//             if (erroItens) {
//                 await supabase.from('pedidos_capa').delete().eq('id', idPedidoCapa);
//                 throw new Error("Erro ao salvar os itens do pedido (capa revertida): " + erroItens.message);
//             }

//             // --- PASSO 3: Salvar o PAGAMENTO INICIAL (Opcional) ---
//             const valorEntrada = parseFloat(document.getElementById('pedido-valor-entrada').value);
//             const formaPagamento = parseInt(document.getElementById('pedido-forma-pagamento').value);
//             const dataPagamento = document.getElementById('pedido-data-pagamento').value;

//             if (valorEntrada > 0 && !isNaN(formaPagamento) && dataPagamento) {
//                 const dadosPagamento = {
//                     id_pedido_capa: idPedidoCapa,
//                     data_pagamento: dataPagamento,
//                     valor_pago: valorEntrada,
//                     id_forma_pagamento: formaPagamento,
//                     observacoes: "Pagamento de entrada."
//                 };
                
//                 const { error: erroPagamento } = await supabase
//                     .from('registros_pagamento')
//                     .insert(dadosPagamento);
                
//                 if (erroPagamento) {
//                     msgPedido.textContent = `Pedido #${idPedidoCapa} salvo, MAS FALHOU AO REGISTRAR A ENTRADA: ${erroPagamento.message}`;
//                 }
                
//                 if(valorEntrada < orcamentoCarregado.capa.valor_total_orcamento) {
//                      await supabase.from('pedidos_capa').update({ id_status_pagamento: 2 }).eq('id', idPedidoCapa);
//                 } else {
//                      await supabase.from('pedidos_capa').update({ id_status_pagamento: 3 }).eq('id', idPedidoCapa);
//                 }
               
//             }

//             // --- SUCESSO! ---
//             if (!msgPedido.textContent) {
//                 msgPedido.style.color = 'green';
//                 msgPedido.textContent = `Pedido (ID: ${idPedidoCapa}) salvo com sucesso!`;
//             }
            
//             formPedido.reset();
//             orcamentoCarregado = null; 
//             document.getElementById('pedido-cliente-nome').textContent = '---';
//             document.getElementById('pedido-valor-total').textContent = 'R$ 0.00';
//             setTimeout(() => { msgPedido.textContent = ''; }, 5000);

//         } catch (error) {
//             console.error('Erro no processo de salvar pedido:', error);
//             msgPedido.style.color = 'red';
//             msgPedido.textContent = error.message;
//         } finally {
//             btnSalvarPedido.disabled = false;
//             btnSalvarPedido.innerText = 'Salvar Pedido Completo';
//         }
//     });
// }


// // --- LÓGICA DE CONSULTAR PEDIDOS ---
// export async function carregarPedidos(supabase) {
//     const tbody = document.getElementById('corpoTabelaPedidos');
//     if (!tbody) return; 

//     tbody.innerHTML = '<tr><td colspan="9">Carregando pedidos...</td></tr>';

//     const { data: pedidos, error } = await supabase.rpc('get_pedidos_com_saldo');

//     if (error) {
//         console.error('Erro ao buscar pedidos:', error);
//         tbody.innerHTML = `<tr><td colspan="9">Erro ao carregar pedidos: ${error.message}</td></tr>`;
//         return;
//     }
//     if (pedidos.length === 0) {
//         tbody.innerHTML = '<tr><td colspan="9">Nenhum pedido cadastrado ainda.</td></tr>';
//         return;
//     }

//     tbody.innerHTML = ''; 
    
//     pedidos.forEach(pedido => {
//         const tr = document.createElement('tr');
//         const dataCriacao = new Date(pedido.data_criacao).toLocaleDateString('pt-BR');
        
//         let classeStatusPgto = '';
//         if (pedido.saldo_pendente <= 0) classeStatusPgto = 'status-pago';
//         else if (pedido.saldo_pendente > 0) classeStatusPgto = 'status-pendente';
        
//         tr.innerHTML = `
//             <td>${pedido.id}</td>
//             <td>${dataCriacao}</td>
//             <td>${pedido.cliente_nome}</td>
//             <td>R$ ${pedido.valor_total.toFixed(2)}</td>
//             <td>R$ ${pedido.total_pago.toFixed(2)}</td>
//             <td class="${classeStatusPgto}"><strong>R$ ${pedido.saldo_pendente.toFixed(2)}</strong></td>
//             <td>${pedido.status_pedido}</td>
//             <td>${pedido.status_pagamento}</td>
//             <td>
//                 <button class="btn-visualizar-pedido" data-id="${pedido.id}" style="background: #17a2b8; color: white; border:none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
//                     Ver
//                 </button>
//                 <button class="btn-mudar-status-pedido" data-id="${pedido.id}" style="background: #ffc107; color: #333; border:none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-left: 5px;">
//                     Status
//                 </button>
//                 ${pedido.saldo_pendente > 0 ? 
//                     `<button class="btn-add-pagamento" 
//                              data-id="${pedido.id}" 
//                              data-saldo="${pedido.saldo_pendente}"
//                              style="background: #28a745; color: white; border:none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-left: 5px;">
//                         Pagar
//                     </button>` 
//                     : ''
//                 }
//             </td>
//         `;
//         tbody.appendChild(tr);
//     });

//     // --- LIGA OS BOTÕES "PAGAR" ---
//     document.querySelectorAll('.btn-add-pagamento').forEach(button => {
//         button.addEventListener('click', (e) => {
//             const id = e.target.getAttribute('data-id');
//             const saldo = parseFloat(e.target.getAttribute('data-saldo'));
//             pedidoParaPagar.id = id;
//             pedidoParaPagar.saldo_pendente = saldo;
//             abrirModalPagamento(supabase, id, saldo);
//         });
//     });
    
//     // --- LIGA OS BOTÕES "VER" ---
//     document.querySelectorAll('.btn-visualizar-pedido').forEach(button => {
//         button.addEventListener('click', (e) => {
//             const id = e.target.getAttribute('data-id');
//             abrirModalVisualizarPedido(supabase, id);
//         });
//     });

//     // --- LIGA OS BOTÕES "MUDAR STATUS" ---
//     document.querySelectorAll('.btn-mudar-status-pedido').forEach(button => {
//         button.addEventListener('click', (e) => {
//             const id = e.target.getAttribute('data-id');
//             abrirModalMudarStatus(supabase, id);
//         });
//     });
// }

// // --- LÓGICA DO MODAL DE PAGAMENTO ---
// const modalFundoPagamento = document.getElementById('modal-fundo-pagamento');
// const formAddPagamento = document.getElementById('formAddPagamento');
// const mensagemAddPagamento = document.getElementById('mensagemAddPagamento');

// function abrirModalPagamento(supabase, id, saldo) {
//     if (!modalFundoPagamento) return;
//     formAddPagamento.reset();
//     mensagemAddPagamento.textContent = '';
//     document.getElementById('pgto-pedido-id').textContent = id;
//     document.getElementById('pgto-saldo-pendente').textContent = `R$ ${saldo.toFixed(2)}`;
//     document.getElementById('pgto-hidden-pedido-id').value = id;
//     document.getElementById('pgto-valor-pago').value = saldo.toFixed(2); 
//     carregarMenu(supabase, 'pgto-forma-pagamento', 'formas_pagamento', 'nome_forma');
//     document.getElementById('pgto-data-pagamento').valueAsDate = new Date();
//     modalFundoPagamento.classList.remove('hidden');
// }

// function fecharModalPagamento() {
//     modalFundoPagamento.classList.add('hidden');
// }

// document.getElementById('btn-cancelar-pagamento').addEventListener('click', fecharModalPagamento);

// export function initFormularioPagamento(supabase) {
//     if (!formAddPagamento) return;

//     formAddPagamento.addEventListener('submit', async (e) => {
//         e.preventDefault();
        
//         const btnSalvar = document.getElementById('btn-salvar-pagamento');
//         btnSalvar.disabled = true;
//         btnSalvar.innerText = 'Salvando...';
//         mensagemAddPagamento.textContent = '';

//         const formData = new FormData(formAddPagamento);
//         const valorPago = parseFloat(formData.get('pgto-valor-pago'));
//         const pedidoId = parseInt(document.getElementById('pgto-hidden-pedido-id').value);

//         try {
//             // --- PASSO 1: Salvar o registro do pagamento ---
//             const dadosPagamento = {
//                 id_pedido_capa: pedidoId,
//                 data_pagamento: formData.get('pgto-data-pagamento'),
//                 valor_pago: valorPago,
//                 id_forma_pagamento: parseInt(formData.get('pgto-forma-pagamento')),
//                 observacoes: formData.get('pgto-observacoes')
//             };

//             if (isNaN(dadosPagamento.id_forma_pagamento) || !dadosPagamento.data_pagamento) {
//                 throw new Error('Data e Forma de Pagamento são obrigatórios.');
//             }

//             const { error: erroPagamento } = await supabase
//                 .from('registros_pagamento')
//                 .insert(dadosPagamento);
//             if (erroPagamento) throw new Error(erroPagamento.message);

//             // --- PASSO 2: Atualizar o Status do Pedido ---
//             const novoSaldo = pedidoParaPagar.saldo_pendente - valorPago;
//             let novoStatusPgtoId = 2; // Assume "Pago Parcial"
//             if (novoSaldo <= 0.01) { 
//                 novoStatusPgtoId = 3; // "Pago Total"
//             }

//             const { error: erroUpdate } = await supabase
//                 .from('pedidos_capa')
//                 .update({ id_status_pagamento: novoStatusPgtoId })
//                 .eq('id', pedidoId);
//             if (erroUpdate) throw new Error("Pagamento salvo, mas falha ao atualizar status: " + erroUpdate.message);
            
//             // --- SUCESSO! ---
//             mensagemAddPagamento.style.color = 'green';
//             mensagemAddPagamento.textContent = 'Pagamento salvo com sucesso!';
//             carregarPedidos(supabase);
//             setTimeout(fecharModalPagamento, 2000);

//         } catch (error) {
//             console.error('Erro ao salvar pagamento:', error);
//             mensagemAddPagamento.style.color = 'red';
//             mensagemAddPagamento.textContent = error.message;
//         } finally {
//             btnSalvar.disabled = false;
//             btnSalvar.innerText = 'Salvar Pagamento';
//         }
//     });
// }


// // --- LÓGICA DO MODAL DE VISUALIZAR PEDIDO ---
// const modalFundoVisualizarPedido = document.getElementById('modal-fundo-visualizar-pedido');

// async function abrirModalVisualizarPedido(supabase, pedidoId) {
//     if (!modalFundoVisualizarPedido) return;
    
//     document.getElementById('detalhe-pedido-id').textContent = ` #${pedidoId}`;
//     document.getElementById('detalhe-pedido-cliente').textContent = 'Carregando...';
//     document.getElementById('detalhe-pedido-status').textContent = '...';
//     document.getElementById('detalhe-pedido-valor').textContent = '...';
//     document.getElementById('detalhe-pedido-status-pgto').textContent = '...';
//     const itensTbody = document.getElementById('corpoTabelaDetalhesItensPedido');
//     const pagamentosTbody = document.getElementById('corpoTabelaDetalhesPagamentos');
//     itensTbody.innerHTML = '<tr><td colspan="3">Carregando...</td></tr>';
//     pagamentosTbody.innerHTML = '<tr><td colspan="3">Carregando...</td></tr>';

//     modalFundoVisualizarPedido.classList.remove('hidden');

//     try {
//         // --- PASSO 1: Buscar a CAPA ---
//         const { data: capa, error: erroCapa } = await supabase
//             .from('pedidos_capa')
//             .select(`
//                 valor_total_pedido,
//                 clientes ( nome ),
//                 status_pedido ( nome_status ),
//                 status_pagamento ( status_pagamento )
//             `)
//             .eq('id', pedidoId)
//             .single();
//         if (erroCapa) throw new Error("Erro ao buscar capa: " + erroCapa.message);

//         document.getElementById('detalhe-pedido-cliente').textContent = capa.clientes.nome;
//         document.getElementById('detalhe-pedido-status').textContent = capa.status_pedido.nome_status;
//         document.getElementById('detalhe-pedido-valor').textContent = `R$ ${capa.valor_total_pedido.toFixed(2)}`;
//         document.getElementById('detalhe-pedido-status-pgto').textContent = capa.status_pagamento.status_pagamento;
        
//         // --- PASSO 2: Buscar os ITENS ---
//         const { data: itens, error: erroItens } = await supabase
//             .from('pedidos_item')
//             .select(`quantidade, valor_unitario_vendido, produtos ( nome_produto )`)
//             .eq('id_pedido_capa', pedidoId);
//         if (erroItens) throw new Error("Erro ao buscar itens: " + erroItens.message);

//         itensTbody.innerHTML = '';
//         itens.forEach(item => {
//             const tr = document.createElement('tr');
//             tr.innerHTML = `
//                 <td>${item.produtos.nome_produto}</td>
//                 <td>${item.quantidade}</td>
//                 <td>R$ ${item.valor_unitario_vendido.toFixed(2)}</td>
//             `;
//             itensTbody.appendChild(tr);
//         });

//         // --- PASSO 3: Buscar os PAGAMENTOS ---
//         const { data: pagamentos, error: erroPagamentos } = await supabase
//             .from('registros_pagamento')
//             .select(`data_pagamento, valor_pago, formas_pagamento ( nome_forma )`)
//             .eq('id_pedido_capa', pedidoId)
//             .order('data_pagamento', { ascending: true });
        
//         // --- LINHA CORRIGIDA ---
//         if (erroPagamentos) throw new Error("Ocorreu um erro ao buscar pagamentos: " + erroPagamentos.message);
//         // --- FIM DA CORREÇÃO ---

//         pagamentosTbody.innerHTML = '';
//         if (pagamentos.length === 0) {
//             pagamentosTbody.innerHTML = '<tr><td colspan="3">Nenhum pagamento registrado.</td></tr>';
//         } else {
//             pagamentos.forEach(pgto => {
//                 const tr = document.createElement('tr');
//                 const [ano, mes, dia] = pgto.data_pagamento.split('-');
//                 const dataPgto = `${dia}/${mes}/${ano}`;
//                 tr.innerHTML = `
//                     <td>${dataPgto}</td>
//                     <td>R$ ${pgto.valor_pago.toFixed(2)}</td>
//                     <td>${pgto.formas_pagamento.nome_forma}</td>
//                 `;
//                 pagamentosTbody.appendChild(tr);
//             });
//         }

//     } catch (error) {
//         console.error('Erro ao buscar detalhes do pedido:', error);
//         alert(error.message);
//         fecharModalVisualizarPedido();
//     }
// }

// document.getElementById('btn-fechar-visualizar-pedido').addEventListener('click', () => {
//     modalFundoVisualizarPedido.classList.add('hidden');
// });


// // --- LÓGICA DO MODAL MUDAR STATUS ---
// const modalFundoMudarStatus = document.getElementById('modal-fundo-mudar-status');
// const formMudarStatus = document.getElementById('formMudarStatus');
// const mensagemMudarStatus = document.getElementById('mensagemMudarStatus');

// function abrirModalMudarStatus(supabase, id) {
//     if (!modalFundoMudarStatus) return;
//     formMudarStatus.reset();
//     mensagemMudarStatus.textContent = '';
//     document.getElementById('status-pedido-id').textContent = id;
//     document.getElementById('status-hidden-pedido-id').value = id;
//     carregarMenu(supabase, 'select-mudar-status-pedido', 'status_pedido', 'nome_status');
//     modalFundoMudarStatus.classList.remove('hidden');
// }

// function fecharModalMudarStatus() {
//     modalFundoMudarStatus.classList.add('hidden');
// }

// document.getElementById('btn-cancelar-mudar-status').addEventListener('click', fecharModalMudarStatus);

// export function initFormularioMudarStatus(supabase) {
//     if (!formMudarStatus) return;

//     formMudarStatus.addEventListener('submit', async (e) => {
//         e.preventDefault();
        
//         const btnSalvar = document.getElementById('btn-salvar-mudar-status');
//         btnSalvar.disabled = true;
//         btnSalvar.innerText = 'Salvando...';
//         mensagemMudarStatus.textContent = '';

//         const formData = new FormData(formMudarStatus);
//         const novoStatusId = parseInt(formData.get('id_status_pedido'));
//         const pedidoId = parseInt(document.getElementById('status-hidden-pedido-id').value);

//         try {
//             if (isNaN(novoStatusId)) {
//                 throw new Error('Selecione um novo status.');
//             }

//             const { error } = await supabase
//                 .from('pedidos_capa')
//                 .update({ id_status_pedido: novoStatusId })
//                 .eq('id', pedidoId);

//             if (error) throw new Error(error.message);

//             mensagemMudarStatus.style.color = 'green';
//             mensagemMudarStatus.textContent = 'Status atualizado!';
//             carregarPedidos(supabase);
//             setTimeout(fecharModalMudarStatus, 2000);

//         } catch (error) {
//             console.error('Erro ao mudar status:', error);
//             mensagemMudarStatus.style.color = 'red';
//             mensagemMudarStatus.textContent = error.message;
//         } finally {
//             btnSalvar.disabled = false;
//             btnSalvar.innerText = 'Salvar Status';
//         }
//     });
// }