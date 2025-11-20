// js/pedido.js
import { gerarRecibo } from './recibo.js';
import { Toast } from './toast.js';

let orcamentoCarregado = null;
let pedidoParaPagar = { id: null, saldo_pendente: 0, cliente_nome: '' };
const STATUS_APROVADO_ORCAMENTO = 2; 

async function carregarMenu(supabase, idElemento, nomeTabela, nomeColuna, filtrarAtivo = false) { 
    const selectMenu = document.getElementById(idElemento);
    if (!selectMenu) return; 
    let query = supabase.from(nomeTabela).select(`id, ${nomeColuna}`);
    if (filtrarAtivo) query = query.eq('ativo', true);
    const { data, error } = await query;
    if (error) {
        selectMenu.innerHTML = `<option value="">Erro</option>`;
    } else {
        selectMenu.innerHTML = `<option value="">Selecione</option>`;
        data.forEach(item => {
            selectMenu.innerHTML += `<option value="${item.id}">${item[nomeColuna]}</option>`;
        });
    }
}

export async function carregarOpcoesPedido(supabase) {
    const selectOrcamento = document.getElementById('select-orcamento-aprovado');
    if (!selectOrcamento) return;

    const { data: orcamentos } = await supabase
        .from('orcamentos_capa')
        .select(`id, valor_total_orcamento, clientes ( nome )`)
        .eq('id_status_orcamento', STATUS_APROVADO_ORCAMENTO)
        .eq('ativo', true)
        .order('created_at', { ascending: false });

    const { data: pedidosExistentes } = await supabase.from('pedidos_capa').select(`id_orcamento_origem`);
    const orcamentosUsadosIds = pedidosExistentes ? pedidosExistentes.map(p => p.id_orcamento_origem) : [];
    const orcamentosDisponiveis = orcamentos ? orcamentos.filter(orc => !orcamentosUsadosIds.includes(orc.id)) : [];

    selectOrcamento.innerHTML = `<option value="">Selecione um orçamento</option>`;
    if (orcamentosDisponiveis.length === 0) {
        selectOrcamento.innerHTML = `<option value="">Nenhum orçamento aprovado disponível</option>`;
    } else {
        orcamentosDisponiveis.forEach(orcamento => {
            selectOrcamento.innerHTML += `<option value="${orcamento.id}">ID #${orcamento.id} - ${orcamento.clientes.nome} (R$ ${orcamento.valor_total_orcamento.toFixed(2)})</option>`;
        });
    }

    carregarMenu(supabase, 'pedido-status-pedido', 'status_pedido', 'nome_status');
    carregarMenu(supabase, 'pedido-forma-pagamento', 'formas_pagamento', 'nome_forma');
}

export function initFormularioPedido(supabase) {
    const formPedido = document.getElementById('formPedido');
    if (!formPedido) return;
    if (formPedido.getAttribute('data-init') === 'true') return;
    formPedido.setAttribute('data-init', 'true');

    // Mostra nome do arquivo selecionado
    const fileInput = document.getElementById('pedido-anexo');
    const labelArquivo = document.getElementById('nome-arquivo-selecionado');
    if(fileInput) {
        fileInput.addEventListener('change', (e) => {
            if(e.target.files.length > 0) {
                labelArquivo.textContent = "Arquivo selecionado: " + e.target.files[0].name;
            } else {
                labelArquivo.textContent = "";
            }
        });
    }

    const btnCarregar = document.getElementById('btn-carregar-orcamento');
    
    btnCarregar.addEventListener('click', async () => {
        const idOrcamento = document.getElementById('select-orcamento-aprovado').value;
        if (!idOrcamento) return Toast.show('Selecione um orçamento para carregar.', 'warning');

        const { data: capa } = await supabase.from('orcamentos_capa').select(`*, clientes ( nome, cpf )`).eq('id', idOrcamento).single();
        const { data: itens } = await supabase.from('orcamentos_item').select(`*`).eq('id_orcamento_capa', idOrcamento);

        if (capa && itens) {
            document.getElementById('pedido-cliente-nome').textContent = capa.clientes.nome;
            document.getElementById('pedido-valor-total').textContent = `R$ ${capa.valor_total_orcamento.toFixed(2)}`;
            document.getElementById('pedido-observacoes').value = capa.observacoes;
            orcamentoCarregado = { capa, itens };
            Toast.show('Dados do orçamento carregados.', 'info');
        }
    });

    formPedido.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!orcamentoCarregado) return Toast.show('Carregue um orçamento primeiro.', 'warning');

        const btnSalvar = document.getElementById('btnSalvarPedido');
        btnSalvar.disabled = true; btnSalvar.innerText = 'Processando...';

        try {
            // 1. UPLOAD DA IMAGEM (SE HOUVER)
            let urlImagem = null;
            if (fileInput && fileInput.files.length > 0) {
                const arquivo = fileInput.files[0];
                const nomeArquivo = `pedido_${Date.now()}_${arquivo.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                
                Toast.show('Enviando imagem...', 'info');
                
                const { data, error: uploadError } = await supabase.storage
                    .from('anexos')
                    .upload(nomeArquivo, arquivo);

                if (uploadError) throw new Error("Erro no upload: " + uploadError.message);

                // Pega a URL pública
                const { data: publicUrlData } = supabase.storage.from('anexos').getPublicUrl(nomeArquivo);
                urlImagem = publicUrlData.publicUrl;
            }

            // 2. SALVA CAPA DO PEDIDO
            const dadosCapa = {
                id_cliente: orcamentoCarregado.capa.id_cliente,
                id_orcamento_origem: orcamentoCarregado.capa.id,
                valor_total_pedido: orcamentoCarregado.capa.valor_total_orcamento,
                prazo_entrega: document.getElementById('pedido-prazo-entrega').value,
                data_vencimento: document.getElementById('pedido-data-vencimento').value,
                id_status_pedido: parseInt(document.getElementById('pedido-status-pedido').value),
                observacoes: document.getElementById('pedido-observacoes').value,
                url_anexo: urlImagem // Salva o link da imagem
            };
            
            const { data: capaSalva, error: erroCapa } = await supabase.from('pedidos_capa').insert(dadosCapa).select().single();
            if (erroCapa) throw erroCapa;

            // 3. SALVA ITENS
            const itensParaSalvar = orcamentoCarregado.itens.map(item => ({
                id_pedido_capa: capaSalva.id,
                id_produto: item.id_produto,
                quantidade: item.quantidade,
                valor_unitario_vendido: item.preco_unitario_negociado,
                medida: item.medida,
                observacoes_item: item.observacoes_item
            }));
            const { error: erroItens } = await supabase.from('pedidos_item').insert(itensParaSalvar);
            if (erroItens) throw erroItens;

            // 4. PAGAMENTO INICIAL
            const valorEntrada = parseFloat(document.getElementById('pedido-valor-entrada').value);
            const formaPgto = parseInt(document.getElementById('pedido-forma-pagamento').value);
            const dataPgto = document.getElementById('pedido-data-pagamento').value;

            if (valorEntrada > 0) {
                await supabase.from('registros_pagamento').insert({
                    id_pedido_capa: capaSalva.id,
                    data_pagamento: dataPgto,
                    valor_pago: valorEntrada,
                    id_forma_pagamento: formaPgto,
                    observacoes: "Pagamento de entrada."
                });
                await supabase.rpc('atualizar_status_pagamento', { id_do_pedido: capaSalva.id, valor_do_pagamento: valorEntrada });
            }
            
            Toast.show(`Pedido #${capaSalva.id} gerado com sucesso!`, 'success');
            
            // 1. Recibo da Entrada (Se houver)
            if (valorEntrada > 0 && confirm("Pagamento de entrada registrado! Imprimir RECIBO?")) {
                const selectForma = document.getElementById('pedido-forma-pagamento');
                await gerarRecibo({
                    cliente: orcamentoCarregado.capa.clientes.nome,
                    cpf: orcamentoCarregado.capa.clientes.cpf,
                    valor: valorEntrada,
                    pedidoId: capaSalva.id,
                    formaPgto: selectForma.options[selectForma.selectedIndex].text,
                    data: dataPgto
                }, supabase);
            }

            // 2. Documento do Pedido (NOVO)
            // Reutiliza o layout do orçamento, mas mudamos o título no HTML temporariamente
            if (confirm("Deseja imprimir o DOCUMENTO DO PEDIDO?")) {
                // Truque: Muda o título do HTML de "Orçamento" para "Pedido" antes de imprimir
                const tituloOriginal = document.querySelector('.hero-title h1').innerHTML;
                document.querySelector('.hero-title h1').innerHTML = "PEDIDO DE VENDA";
                
                // Chama a função de gerar PDF (usando o ID do PEDIDO, mas a função busca na tabela de orçamentos... Ops!)
                // ATENÇÃO: A função gerarPDFOrcamento busca na tabela 'orcamentos_capa'.
                // Como acabamos de criar um PEDIDO, precisamos de uma função que busque na tabela 'pedidos_capa'.
                
                // SOLUÇÃO RÁPIDA: Criar uma função gerarPDFPedido em breve.
                // Por enquanto, vou deixar comentado para não dar erro de "Orçamento não encontrado".
                alert("Funcionalidade de Imprimir Pedido será implementada no próximo passo.");
            }

            formPedido.reset();
            document.getElementById('nome-arquivo-selecionado').textContent = ""; // Limpa label
            orcamentoCarregado = null;
            carregarPedidos(supabase);

        } catch (err) {
            console.error(err);
            Toast.show(err.message, 'error');
        } finally {
            btnSalvar.disabled = false; btnSalvar.innerText = 'Salvar Pedido';
        }
    });
}

// ... (Busca e Tabela Mantidas Iguais) ...
export function initFuncionalidadeBusca(supabase) {
    const btnBuscar = document.getElementById('btn-busca-pedido');
    const btnLimpar = document.getElementById('btn-limpar-busca');
    const inputBusca = document.getElementById('input-busca-pedido');

    if (btnBuscar) btnBuscar.onclick = () => carregarPedidos(supabase, inputBusca.value);
    if (inputBusca) inputBusca.onkeyup = (e) => { if (e.key === 'Enter') carregarPedidos(supabase, inputBusca.value); };
    if (btnLimpar) btnLimpar.onclick = () => { inputBusca.value = ''; carregarPedidos(supabase, null); };
}

export async function carregarPedidos(supabase, termoBusca = null) {
    // ... (Lógica igual, só muda a query no banco se precisar)
    const tbody = document.getElementById('corpoTabelaPedidos');
    if (!tbody) return; 
    tbody.innerHTML = '<tr><td colspan="9">Buscando...</td></tr>';
    
    // Adicionei url_anexo no select se precisar futuramente na tabela, mas não é obrigatório aqui
    const { data: todosPedidos, error } = await supabase.rpc('get_pedidos_com_saldo');

    if (error) {
        tbody.innerHTML = `<tr><td colspan="9">Erro: ${error.message}</td></tr>`;
        return;
    }
    
    let pedidosFiltrados = todosPedidos || [];
    if (termoBusca && termoBusca.trim() !== '') {
        const termo = termoBusca.toLowerCase().trim();
        pedidosFiltrados = pedidosFiltrados.filter(pedido => {
            const nomeMatch = pedido.cliente_nome && pedido.cliente_nome.toLowerCase().includes(termo);
            const idMatch = pedido.id.toString() === termo;
            return nomeMatch || idMatch;
        });
    }

    if (pedidosFiltrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9">Nenhum pedido encontrado.</td></tr>';
        return;
    }

    tbody.innerHTML = ''; 
    pedidosFiltrados.forEach(pedido => {
        const tr = document.createElement('tr');
        const dataCriacao = new Date(pedido.data_criacao).toLocaleDateString('pt-BR');
        let classeStatus = pedido.saldo_pendente <= 0 ? 'status-pago' : 'status-pendente';
        
        tr.innerHTML = `
            <td>${pedido.id}</td>
            <td>${dataCriacao}</td>
            <td>${pedido.cliente_nome}</td>
            <td>R$ ${pedido.valor_total.toFixed(2)}</td>
            <td>R$ ${pedido.total_pago.toFixed(2)}</td>
            <td class="${classeStatus}"><strong>R$ ${pedido.saldo_pendente.toFixed(2)}</strong></td>
            <td>${pedido.status_pedido}</td>
            <td>${pedido.status_pagamento}</td>
            <td>
                <button class="btn-acao btn-info btn-visualizar-pedido" data-id="${pedido.id}">Ver</button>
                <button class="btn-acao btn-warning btn-mudar-status-pedido" data-id="${pedido.id}">Status</button>
                ${pedido.saldo_pendente > 0 ? `<button class="btn-acao btn-success btn-add-pagamento" data-id="${pedido.id}" data-saldo="${pedido.saldo_pendente}" data-cliente="${pedido.cliente_nome}">Pagar</button>` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
    attachTableEvents(supabase);
}

function attachTableEvents(supabase) {
    document.querySelectorAll('.btn-add-pagamento').forEach(btn => {
        btn.addEventListener('click', e => {
            abrirModalPagamento(supabase, e.target.dataset.id, parseFloat(e.target.dataset.saldo), e.target.dataset.cliente);
        });
    });
    document.querySelectorAll('.btn-visualizar-pedido').forEach(btn => {
        btn.addEventListener('click', e => abrirModalVisualizarPedido(supabase, e.target.dataset.id));
    });
    document.querySelectorAll('.btn-mudar-status-pedido').forEach(btn => {
        btn.addEventListener('click', e => abrirModalMudarStatus(supabase, e.target.dataset.id));
    });
}

// ... (Pagamento e Mudar Status mantidos iguais) ...
const modalPgto = document.getElementById('modal-fundo-pagamento');
const formPgto = document.getElementById('formAddPagamento');
function abrirModalPagamento(supabase, id, saldo, nome) {
    if (!modalPgto) return;
    pedidoParaPagar = { id, saldo_pendente: saldo, cliente_nome: nome };
    formPgto.reset();
    document.getElementById('pgto-pedido-id').textContent = id;
    document.getElementById('pgto-saldo-pendente').textContent = `R$ ${saldo.toFixed(2)}`;
    document.getElementById('pgto-hidden-pedido-id').value = id;
    document.getElementById('pgto-valor-pago').value = saldo.toFixed(2);
    carregarMenu(supabase, 'pgto-forma-pagamento', 'formas_pagamento', 'nome_forma');
    document.getElementById('pgto-data-pagamento').valueAsDate = new Date();
    modalPgto.classList.remove('hidden');
}
document.getElementById('btn-cancelar-pagamento')?.addEventListener('click', () => modalPgto.classList.add('hidden'));

export function initFormularioPagamento(supabase) {
    const formAddPagamento = document.getElementById('formAddPagamento');
    if (!formAddPagamento) return;
    if (formAddPagamento.getAttribute('data-init') === 'true') return;
    formAddPagamento.setAttribute('data-init', 'true');

    formAddPagamento.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-salvar-pagamento');
        btn.disabled = true; btn.innerText = 'Salvando...';
        try {
            const formData = new FormData(formPgto);
            const valor = parseFloat(formData.get('pgto-valor-pago'));
            const idPedido = parseInt(document.getElementById('pgto-hidden-pedido-id').value);

            await supabase.from('registros_pagamento').insert({
                id_pedido_capa: idPedido,
                data_pagamento: formData.get('pgto-data-pagamento'),
                valor_pago: valor,
                id_forma_pagamento: parseInt(formData.get('pgto-forma-pagamento')),
                observacoes: formData.get('pgto-observacoes')
            });
            await supabase.rpc('atualizar_status_pagamento', { id_do_pedido: idPedido, valor_do_pagamento: valor });
            Toast.show('Pagamento registrado!', 'success');
            if(confirm("Pagamento registrado! Imprimir recibo?")) {
                const { data: pedido } = await supabase.from('pedidos_capa').select('clientes(cpf)').eq('id', idPedido).single();
                const cpf = pedido?.clientes?.cpf || '';
                const selectForma = document.getElementById('pgto-forma-pagamento');
                gerarRecibo({
                    cliente: pedidoParaPagar.cliente_nome,
                    cpf: cpf,
                    valor: valor,
                    pedidoId: idPedido,
                    formaPgto: selectForma.options[selectForma.selectedIndex].text,
                    data: formData.get('pgto-data-pagamento')
                }, supabase);
            }
            carregarPedidos(supabase);
            setTimeout(() => modalPgto.classList.add('hidden'), 1500);
        } catch (err) {
            Toast.show(err.message, 'error');
        } finally {
            btn.disabled = false; btn.innerText = 'Salvar Pagamento';
        }
    });
}

// --- VISUALIZAR PEDIDO (ATUALIZADO PARA MOSTRAR FOTO) ---
const modalVisu = document.getElementById('modal-fundo-visualizar-pedido');
async function abrirModalVisualizarPedido(supabase, id) {
    if (!modalVisu) return;
    modalVisu.classList.remove('hidden');
    
    // Busca dados incluindo a URL do anexo
    const { data: capa } = await supabase
        .from('pedidos_capa')
        .select('*, clientes(nome), status_pedido(nome_status), status_pagamento(status_pagamento)')
        .eq('id', id)
        .single();

    document.getElementById('detalhe-pedido-id').textContent = `#${id}`;
    document.getElementById('detalhe-pedido-cliente').textContent = capa.clientes.nome;
    document.getElementById('detalhe-pedido-status').textContent = capa.status_pedido.nome_status;
    document.getElementById('detalhe-pedido-valor').textContent = `R$ ${capa.valor_total_pedido.toFixed(2)}`;
    document.getElementById('detalhe-pedido-status-pgto').textContent = capa.status_pagamento.status_pagamento;

    // --- LÓGICA DE EXIBIÇÃO DA FOTO ---
    const areaAnexo = document.getElementById('area-anexo-visualizar');
    const imgAnexo = document.getElementById('img-anexo-pedido');
    const linkAnexo = document.getElementById('link-baixar-anexo');

    if (capa.url_anexo) {
        areaAnexo.style.display = 'block';
        imgAnexo.src = capa.url_anexo;
        linkAnexo.href = capa.url_anexo;
    } else {
        areaAnexo.style.display = 'none';
    }
    // -----------------------------------

    const tbodyItens = document.getElementById('corpoTabelaDetalhesItensPedido');
    tbodyItens.innerHTML = '';
    const { data: itens } = await supabase.from('pedidos_item').select('*, produtos(nome_produto)').eq('id_pedido_capa', id);
    itens.forEach(i => tbodyItens.innerHTML += `<tr><td>${i.produtos.nome_produto}</td><td>${i.quantidade}</td><td>R$ ${i.valor_unitario_vendido}</td></tr>`);

    const tbodyPgto = document.getElementById('corpoTabelaDetalhesPagamentos');
    tbodyPgto.innerHTML = '';
    const { data: pgtos } = await supabase.from('registros_pagamento').select('*, formas_pagamento(nome_forma)').eq('id_pedido_capa', id);
    pgtos.forEach(p => tbodyPgto.innerHTML += `<tr><td>${p.data_pagamento}</td><td>R$ ${p.valor_pago}</td><td>${p.formas_pagamento.nome_forma}</td></tr>`);
}
document.getElementById('btn-fechar-visualizar-pedido')?.addEventListener('click', () => modalVisu.classList.add('hidden'));

// ... (Mudar status mantido igual) ...
const modalStatus = document.getElementById('modal-fundo-mudar-status');
const formStatus = document.getElementById('formMudarStatus');
function abrirModalMudarStatus(supabase, id) {
    if (!modalStatus) return;
    document.getElementById('status-pedido-id').textContent = id;
    document.getElementById('status-hidden-pedido-id').value = id;
    carregarMenu(supabase, 'select-mudar-status-pedido', 'status_pedido', 'nome_status');
    modalStatus.classList.remove('hidden');
}
document.getElementById('btn-cancelar-mudar-status')?.addEventListener('click', () => modalStatus.classList.add('hidden'));

export function initFormularioMudarStatus(supabase) {
    const formMudarStatus = document.getElementById('formMudarStatus');
    if (!formMudarStatus) return;
    if (formMudarStatus.getAttribute('data-init') === 'true') return;
    formMudarStatus.setAttribute('data-init', 'true');

    formMudarStatus.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('status-hidden-pedido-id').value;
        const status = new FormData(formStatus).get('id_status_pedido');
        await supabase.from('pedidos_capa').update({ id_status_pedido: status }).eq('id', id);
        carregarPedidos(supabase);
        modalStatus.classList.add('hidden');
        Toast.show('Status atualizado.', 'success');
    });
}