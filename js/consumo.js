// js/consumo.js

// Guarda as matérias-primas carregadas para auto-preencher o custo e buscar o ID
let mercadoriasData = [];

// Exportada: Carrega os menus da tela "Registrar Consumo"
export async function carregarOpcoesConsumo(supabase) {
    const selectItemPedido = document.getElementById('consumo-select-item-pedido');
    // Elementos novos do Autocomplete
    const inputBusca = document.getElementById('input-busca-mercadoria-consumo');
    const dataList = document.getElementById('lista-sugestoes-mercadoria');
    const hiddenId = document.getElementById('hidden-id-mercadoria');
    const inputCusto = document.getElementById('consumo-custo');
    
    if (!selectItemPedido || !inputBusca) return;

    // IDs de Status Permitidos para Consumo: Pendente (1) e Em Produção (2)
    const STATUS_EM_PRODUCAO_OU_PENDENTE = [1, 2];
    
    // 1. Busca os ITENS DE PEDIDO
    try {
        const { data: itens, error: erroItens } = await supabase
            .from('pedidos_item')
            .select(`
                id,
                id_produto,
                pedidos_capa!inner( id, id_status_pedido ), 
                produtos ( nome_produto )
            `)
            .in('pedidos_capa.id_status_pedido', STATUS_EM_PRODUCAO_OU_PENDENTE); 

        if (erroItens) {
            console.error('Erro ao buscar itens:', erroItens);
            selectItemPedido.innerHTML = `<option value="">Erro ao carregar itens</option>`;
        } else {
            selectItemPedido.innerHTML = `<option value="">Selecione o item a ser produzido</option>`;
            
            if (itens.length === 0) {
                selectItemPedido.innerHTML = `<option value="">Nenhum pedido em produção/pendente</option>`;
            } else {
                itens.forEach(item => {
                    const valorOption = JSON.stringify({
                        id_pedido_item: item.id,
                        id_produto_final: item.id_produto
                    });
                    selectItemPedido.innerHTML += `
                        <option value='${valorOption}'>
                            [Pedido #${item.pedidos_capa.id}] - ${item.produtos.nome_produto}
                        </option>
                    `;
                });
            }
        }
    } catch (e) {
         console.error('Erro execução itens:', e);
    }

    // 2. Busca as MATÉRIAS-PRIMAS (Para o Autocomplete)
    try {
        const { data: mercadorias, error: erroMerca } = await supabase
            .from('mercadorias')
            .select(`id, nome_material, valor_custo`)
            .order('nome_material', { ascending: true });
            
        if (erroMerca) {
            console.error('Erro ao buscar mercadorias:', erroMerca);
        } else {
            mercadoriasData = mercadorias; // Salva na memória
            
            // Limpa a lista anterior
            dataList.innerHTML = '';
            
            // Preenche o <datalist>
            mercadorias.forEach(item => {
                const option = document.createElement('option');
                option.value = item.nome_material; // O que aparece escrito
                dataList.appendChild(option);
            });
        }
    } catch (e) {
         console.error('Erro execução mercadorias:', e);
    }
    
    // 3. Lógica do Autocomplete (Detectar mudança no input)
    // Quando o usuário digita ou clica numa opção
    inputBusca.addEventListener('input', (e) => {
        const textoDigitado = e.target.value;
        
        // Procura na memória se o texto digitado bate EXATAMENTE com algum material
        const materialEncontrado = mercadoriasData.find(m => m.nome_material === textoDigitado);
        
        if (materialEncontrado) {
            // Se achou, preenche o ID oculto e o Custo
            hiddenId.value = materialEncontrado.id;
            inputCusto.value = materialEncontrado.valor_custo.toFixed(2);
            inputBusca.style.borderColor = '#04D361'; // Verde (Visual feedback)
        } else {
            // Se não achou (está digitando algo novo ou inválido), limpa o ID
            hiddenId.value = "";
            inputCusto.value = "";
            inputBusca.style.borderColor = ''; // Volta ao normal
        }
    });
}

// Exportada: "Liga" o formulário de "Registrar Consumo"
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
            
            // Validação Especial para o Autocomplete
            const idMercadoria = document.getElementById('hidden-id-mercadoria').value;
            if (!idMercadoria) {
                throw new Error("Selecione uma Matéria-Prima válida da lista.");
            }

            const { id_pedido_item, id_produto_final } = JSON.parse(dadosForm.item_pedido_data);

            const dadosParaSalvar = {
                id_pedido_item: parseInt(id_pedido_item),
                id_produto_final: parseInt(id_produto_final),
                id_mercadoria_usada: parseInt(idMercadoria), // Usa o ID do campo oculto
                quantidade_usada: parseFloat(dadosForm.quantidade_usada),
                valor_custo_momento: parseFloat(dadosForm.valor_custo_momento),
                observacoes: dadosForm.observacoes
            };

            if (isNaN(dadosParaSalvar.quantidade_usada)) {
                throw new Error("A quantidade é obrigatória.");
            }

            const { error } = await supabase
                .from('registros_consumo')
                .insert(dadosParaSalvar);

            if (error) throw error;
            
            msgConsumo.style.color = 'green';
            msgConsumo.textContent = 'Consumo registrado com sucesso!';
            
            // Reset manual para limpar os campos novos
            formConsumo.reset();
            document.getElementById('hidden-id-mercadoria').value = "";
            document.getElementById('input-busca-mercadoria-consumo').style.borderColor = '';
            
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