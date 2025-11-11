// js/consumo.js

// Guarda as matérias-primas carregadas para auto-preencher o custo
let mercadoriasData = [];

// Função interna para carregar os menus de opções
async function carregarMenu(supabase, idElemento, nomeTabela, nomeColuna) {
    const selectMenu = document.getElementById(idElemento);
    if (!selectMenu) return; 
    const { data, error } = await supabase.from(nomeTabela).select(`id, ${nomeColuna}`);
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

// Exportada: Carrega os menus da tela "Registrar Consumo"
export async function carregarOpcoesConsumo(supabase) {
    const selectItemPedido = document.getElementById('consumo-select-item-pedido');
    const selectMercadoria = document.getElementById('consumo-select-mercadoria');
    
    if (!selectItemPedido || !selectMercadoria) return;

    // 1. Busca os ITENS DE PEDIDO (com join para ficar descritivo)
    const { data: itens, error: erroItens } = await supabase
        .from('pedidos_item')
        .select(`
            id,
            id_produto,
            pedidos_capa ( id ),
            produtos ( nome_produto )
        `)
        // Opcional: filtrar por status do pedido (ex: "Em Produção")
        // .eq('pedidos_capa.id_status_pedido', 2); 
        
    if (erroItens) {
        console.error('Erro ao buscar itens de pedido:', erroItens);
        selectItemPedido.innerHTML = `<option value="">Erro</option>`;
    } else {
        selectItemPedido.innerHTML = `<option value="">Selecione o item a ser produzido</option>`;
        itens.forEach(item => {
            // Usamos JSON no 'value' para guardar múltiplos dados
            const valorOption = JSON.stringify({
                id_pedido_item: item.id,
                id_produto_final: item.id_produto
            });
            selectItemPedido.innerHTML += `
                <option value='${valorOption}'>
                    [Pedido #${item.pedidos_capa.id}] - ${item.produtos.nome_produto} (Item ID: ${item.id})
                </option>
            `;
        });
    }

    // 2. Busca as MATÉRIAS-PRIMAS
    const { data: mercadorias, error: erroMerca } = await supabase
        .from('mercadorias')
        .select(`id, nome_material, valor_custo`);
        
    if (erroMerca) {
        console.error('Erro ao buscar mercadorias:', erroMerca);
        selectMercadoria.innerHTML = `<option value="">Erro</option>`;
    } else {
        mercadoriasData = mercadorias; // Salva os dados localmente
        selectMercadoria.innerHTML = `<option value="">Selecione o material gasto</option>`;
        mercadorias.forEach(item => {
            selectMercadoria.innerHTML += `<option value="${item.id}">${item.nome_material}</option>`;
        });
    }
    
    // 3. Adiciona lógica para auto-preencher o custo
    selectMercadoria.addEventListener('change', (e) => {
        const mercadoriaId = parseInt(e.target.value);
        const mercadoria = mercadoriasData.find(m => m.id === mercadoriaId);
        if (mercadoria) {
            document.getElementById('consumo-custo').value = mercadoria.valor_custo.toFixed(2);
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
            
            // Pega os dados do 'value' JSON do item de pedido
            const { id_pedido_item, id_produto_final } = JSON.parse(dadosForm.item_pedido_data);

            const dadosParaSalvar = {
                id_pedido_item: parseInt(id_pedido_item),
                id_produto_final: parseInt(id_produto_final),
                id_mercadoria_usada: parseInt(dadosForm.id_mercadoria_usada),
                quantidade_usada: parseFloat(dadosForm.quantidade_usada),
                valor_custo_momento: parseFloat(dadosForm.valor_custo_momento),
                observacoes: dadosForm.observacoes
            };

            // Validação
            if (isNaN(dadosParaSalvar.id_pedido_item) || isNaN(dadosParaSalvar.id_mercadoria_usada) || isNaN(dadosParaSalvar.quantidade_usada)) {
                throw new Error("Item do Pedido, Matéria-Prima e Quantidade são obrigatórios.");
            }

            const { error } = await supabase
                .from('registros_consumo')
                .insert(dadosParaSalvar);

            if (error) throw error;
            
            // Sucesso
            msgConsumo.style.color = 'green';
            msgConsumo.textContent = 'Consumo registrado com sucesso!';
            formConsumo.reset();
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