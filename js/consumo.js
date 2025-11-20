// js/consumo.js
import { Toast } from './toast.js';

const estiloBotaoSelecionar = `
    background: #04D361;
    color: #121214;
    border: none;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
`;

// Exportada: Carrega os menus e configura o Modal
export async function carregarOpcoesConsumo(supabase) {
    const selectItemPedido = document.getElementById('consumo-select-item-pedido');
    
    // Elementos do Modal de Busca
    const modalMercadoria = document.getElementById('modal-busca-mercadoria');
    const btnAbrir = document.getElementById('btn-abrir-modal-mercadoria');
    const btnFechar = document.getElementById('btn-fechar-modal-mercadoria');
    const btnBuscar = document.getElementById('btn-executar-busca-mercadoria');
    const inputBuscaModal = document.getElementById('input-pesquisa-modal-mercadoria');
    const tbodyModal = document.getElementById('tbody-modal-mercadoria');

    // Campos do Formulário Principal
    const displayMercadoria = document.getElementById('display-mercadoria-consumo');
    const hiddenId = document.getElementById('hidden-id-mercadoria');
    const inputCusto = document.getElementById('consumo-custo');
    
    // 1. Carregar Itens de Pedido (Produção)
    if (selectItemPedido) {
        // Status: Em Produção (2) e Pendente (1) - Ajuste conforme seus IDs
        const STATUS_PRODUCAO = [1, 2, 7];
        try {
            const { data: itens, error: erroItens } = await supabase
                .from('pedidos_item')
                .select(`id, id_produto, pedidos_capa!inner(id, id_status_pedido), produtos(nome_produto)`)
                .in('pedidos_capa.id_status_pedido', STATUS_PRODUCAO);

            if (erroItens) {
                selectItemPedido.innerHTML = `<option>Erro ao carregar</option>`;
            } else {
                selectItemPedido.innerHTML = `<option value="">Selecione o item a ser produzido</option>`;
                if (!itens || itens.length === 0) {
                    selectItemPedido.innerHTML = `<option value="">Nenhum pedido em produção</option>`;
                } else {
                    itens.forEach(item => {
                        const valor = JSON.stringify({ id_pedido_item: item.id, id_produto_final: item.id_produto });
                        selectItemPedido.innerHTML += `<option value='${valor}'>[Pedido #${item.pedidos_capa.id}] - ${item.produtos.nome_produto}</option>`;
                    });
                }
            }
        } catch (e) { console.error(e); }
    }

    // 2. LÓGICA DO MODAL (Abrir/Fechar)
    if (btnAbrir) {
        btnAbrir.onclick = () => {
            modalMercadoria.classList.remove('hidden');
            tbodyModal.innerHTML = ''; 
            inputBuscaModal.value = '';
            inputBuscaModal.focus();
        };
    }
    if (btnFechar) btnFechar.onclick = () => modalMercadoria.classList.add('hidden');

    // 3. LÓGICA DE BUSCA NO BANCO
    async function buscarMateriais() {
        const termo = inputBuscaModal.value;
        tbodyModal.innerHTML = '<tr><td colspan="3">Buscando...</td></tr>';
        
        let query = supabase.from('mercadorias').select('id, nome_material, valor_custo').order('nome_material');
        
        if (termo) {
            query = query.ilike('nome_material', `%${termo}%`);
        }
        
        const { data, error } = await query.limit(20);

        if (error) {
            tbodyModal.innerHTML = `<tr><td colspan="3">Erro: ${error.message}</td></tr>`;
            return;
        }
        
        tbodyModal.innerHTML = '';
        if (!data || data.length === 0) {
            tbodyModal.innerHTML = '<tr><td colspan="3">Nenhum material encontrado.</td></tr>';
            return;
        }

        data.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.nome_material}</td>
                <td>R$ ${item.valor_custo.toFixed(2)}</td>
                <td>
                    <button type="button" class="btn-selecionar-material" 
                            data-id="${item.id}" 
                            data-nome="${item.nome_material}" 
                            data-custo="${item.valor_custo}" 
                            style="${estiloBotaoSelecionar}">
                        Usar
                    </button>
                </td>
            `;
            tbodyModal.appendChild(tr);
        });

        // Liga os botões "Usar"
        document.querySelectorAll('.btn-selecionar-material').forEach(btn => {
            btn.onclick = (e) => {
                const id = e.target.getAttribute('data-id');
                const nome = e.target.getAttribute('data-nome');
                const custo = parseFloat(e.target.getAttribute('data-custo'));
                
                // PREENCHE O FORMULÁRIO PRINCIPAL
                displayMercadoria.value = nome;
                hiddenId.value = id;
                inputCusto.value = custo.toFixed(2); 
                
                modalMercadoria.classList.add('hidden'); 
            };
        });
    }

    if (btnBuscar) {
        btnBuscar.onclick = buscarMateriais;
        inputBuscaModal.onkeyup = (e) => { if(e.key === 'Enter') buscarMateriais(); };
    }
}

// Função de Salvar
export function initFormularioConsumo(supabase) {
    const formConsumo = document.getElementById('formConsumo');
    if (!formConsumo) return;

    if (formConsumo.getAttribute('data-init') === 'true') return;
    formConsumo.setAttribute('data-init', 'true');

    const btnSalvar = document.getElementById('btnSalvarConsumo');
    // REMOVIDO: const msgConsumo = ... (Causava o erro)

    formConsumo.addEventListener('submit', async (e) => {
        e.preventDefault();
        btnSalvar.disabled = true;
        btnSalvar.innerText = "Salvando...";
        
        try {
            const formData = new FormData(formConsumo);
            const dadosForm = Object.fromEntries(formData.entries());
            
            const idMercadoria = document.getElementById('hidden-id-mercadoria').value;
            if (!idMercadoria) {
                throw new Error("Selecione uma Matéria-Prima usando a busca (lupa).");
            }

            const { id_pedido_item, id_produto_final } = JSON.parse(dadosForm.item_pedido_data);

            const dadosParaSalvar = {
                id_pedido_item: parseInt(id_pedido_item),
                id_produto_final: parseInt(id_produto_final),
                id_mercadoria_usada: parseInt(idMercadoria),
                quantidade_usada: parseFloat(dadosForm.quantidade_usada),
                valor_custo_momento: parseFloat(dadosForm.valor_custo_momento),
                observacoes: dadosForm.observacoes
            };

            if (isNaN(dadosParaSalvar.quantidade_usada)) throw new Error("Quantidade é obrigatória.");

            const { error } = await supabase.from('registros_consumo').insert(dadosParaSalvar);

            if (error) throw error;
            
            // SUCESSO
            Toast.show('Consumo registrado com sucesso!', 'success');
            
            // Reset
            formConsumo.reset();
            document.getElementById('display-mercadoria-consumo').value = "";
            document.getElementById('hidden-id-mercadoria').value = "";

        } catch (error) {
            console.error('Erro ao salvar consumo:', error);
            Toast.show(error.message, 'error');
        } finally {
            btnSalvar.disabled = false;
            btnSalvar.innerText = "Salvar Consumo";
        }
    });
}