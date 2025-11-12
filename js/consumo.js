// js/consumo.js

let mercadoriasCache = [];

// Exportada: Carrega os menus da tela "Registrar Consumo"
export async function carregarOpcoesConsumo(supabase) {
    const selectItemPedido = document.getElementById('consumo-select-item-pedido');
    
    // Elementos da Busca Nativa
    const inputBusca = document.getElementById('input-busca-mercadoria-consumo');
    const dataList = document.getElementById('datalist-mercadoria-consumo'); // <--- O JS PROCURA ESTE ID
    const hiddenId = document.getElementById('hidden-id-mercadoria');
    const inputCusto = document.getElementById('consumo-custo');
    
    // Se não achar os elementos, para a execução para não dar erro no console
    if (!selectItemPedido || !inputBusca || !dataList) return;

    // 1. Carregar Itens de Pedido (Pendente/Em Produção)
    const STATUS_PRODUCAO = [1, 2];
    try {
        const { data: itens, error: erroItens } = await supabase
            .from('pedidos_item')
            .select(`
                id,
                id_produto,
                pedidos_capa!inner( id, id_status_pedido ), 
                produtos ( nome_produto )
            `)
            .in('pedidos_capa.id_status_pedido', STATUS_PRODUCAO);

        if (erroItens) {
            console.error('Erro itens:', erroItens);
            selectItemPedido.innerHTML = `<option>Erro ao carregar</option>`;
        } else {
            selectItemPedido.innerHTML = `<option value="">Selecione o item a ser produzido</option>`;
            if (itens.length === 0) {
                selectItemPedido.innerHTML = `<option value="">Nenhum pedido em produção</option>`;
            } else {
                itens.forEach(item => {
                    const valor = JSON.stringify({ id_pedido_item: item.id, id_produto_final: item.id_produto });
                    selectItemPedido.innerHTML += `<option value='${valor}'>[Pedido #${item.pedidos_capa.id}] - ${item.produtos.nome_produto}</option>`;
                });
            }
        }
    } catch (e) { console.error(e); }

    // 2. Carregar Matérias-Primas para o Datalist
    try {
        const { data: mercadorias } = await supabase
            .from('mercadorias')
            .select(`id, nome_material, valor_custo`)
            .order('nome_material', { ascending: true });
            
        if (mercadorias) {
            mercadoriasCache = mercadorias; // Salva na memória
            dataList.innerHTML = ''; // Limpa a lista antes de encher
            
            mercadorias.forEach(item => {
                const option = document.createElement('option');
                option.value = item.nome_material; 
                dataList.appendChild(option);
            });
        }
    } catch (e) { console.error(e); }
    
    // 3. Detectar seleção na lista (Auto-preencher preço e ID)
    inputBusca.addEventListener('input', () => {
        const valorDigitado = inputBusca.value;
        
        // Procura o item exato na memória
        const materialEncontrado = mercadoriasCache.find(m => m.nome_material === valorDigitado);
        
        if (materialEncontrado) {
            hiddenId.value = materialEncontrado.id;
            inputCusto.value = materialEncontrado.valor_custo.toFixed(2); // Auto-preenche custo
            inputBusca.style.borderColor = '#04D361'; // Borda Verde
        } else {
            hiddenId.value = "";
            inputCusto.value = "";
            inputBusca.style.borderColor = ''; 
        }
    });
}

// Função de Salvar
export function initFormularioConsumo(supabase) {
    const formConsumo = document.getElementById('formConsumo');
    if (!formConsumo) return;

    const btnSalvar = document.getElementById('btnSalvarConsumo');
    const msgConsumo = document.getElementById('mensagemConsumo');

    formConsumo.addEventListener('submit', async (e) => {
        e.preventDefault();
        btnSalvar.disabled = true;
        btnSalvar.innerText = "Salvando...";
        msgConsumo.textContent = '';
        
        try {
            const formData = new FormData(formConsumo);
            const dadosForm = Object.fromEntries(formData.entries());
            
            // Validação: O campo oculto TEM que ter o ID
            const idMercadoria = document.getElementById('hidden-id-mercadoria').value;
            if (!idMercadoria) {
                throw new Error("Selecione uma Matéria-Prima válida da lista sugerida.");
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
            
            msgConsumo.style.color = 'green';
            msgConsumo.textContent = 'Consumo registrado com sucesso!';
            
            // Reset
            formConsumo.reset();
            document.getElementById('hidden-id-mercadoria').value = "";
            document.getElementById('input-busca-mercadoria-consumo').style.borderColor = "";
            
            setTimeout(() => { msgConsumo.textContent = ''; }, 3000);

        } catch (error) {
            console.error('Erro ao salvar consumo:', error);
            msgConsumo.style.color = 'red';
            msgConsumo.textContent = error.message;
        } finally {
            btnSalvar.disabled = false;
            btnSalvar.innerText = "Salvar Consumo";
        }
    });
}