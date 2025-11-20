// js/kanban.js
import { Toast } from './toast.js';

// Mapeamento dos Status (IDs baseados no seu banco)
// Ajuste se seus IDs forem diferentes: 1=Pendente, 2=Em Produção, 3=Concluído
const STATUS_PENDENTE = 1;
const STATUS_PRODUCAO = 2;
const STATUS_CONCLUIDO = 3;

export async function carregarKanban(supabase) {
    const colA_Fazer = document.getElementById('kanban-todo');
    const colProducao = document.getElementById('kanban-doing');
    const colConcluido = document.getElementById('kanban-done');
    
    if (!colA_Fazer) return;

    // Limpa as colunas
    colA_Fazer.innerHTML = '<div class="loader">Carregando...</div>';
    colProducao.innerHTML = '';
    colConcluido.innerHTML = '';

    // Busca pedidos que NÃO estão cancelados (Assumindo ID 5 = Cancelado, ajuste se precisar)
    const { data: pedidos, error } = await supabase
        .from('pedidos_capa')
        .select(`
            id, 
            id_status_pedido, 
            prazo_entrega, 
            clientes ( nome ),
            pedidos_item ( 
                quantidade, 
                medida, 
                produtos ( nome_produto ) 
            )
        `)
        .neq('id_status_pedido', 5) // Ignora cancelados
        .order('prazo_entrega', { ascending: true });

    if (error) {
        Toast.show("Erro ao carregar Kanban: " + error.message, 'error');
        colA_Fazer.innerHTML = '';
        return;
    }

    // Limpa loader
    colA_Fazer.innerHTML = '';

    // Distribui os cards nas colunas
    pedidos.forEach(pedido => {
        const card = criarCard(pedido, supabase);
        
        if (pedido.id_status_pedido === STATUS_PENDENTE) {
            colA_Fazer.appendChild(card);
        } else if (pedido.id_status_pedido === STATUS_PRODUCAO) {
            colProducao.appendChild(card);
        } else if (pedido.id_status_pedido === STATUS_CONCLUIDO) {
            colConcluido.appendChild(card);
        }
    });
}

function criarCard(pedido, supabase) {
    const card = document.createElement('div');
    card.className = 'kanban-card';
    
    // Monta resumo dos itens (Ex: "2x Lavatório, 1x Bancada")
    let resumoItens = pedido.pedidos_item.map(i => 
        `<div class="k-item">• ${i.produtos.nome_produto} <span style="opacity:0.7; font-size:0.8em">(${i.medida || ''})</span></div>`
    ).join('');

    // Data formatada
    const dataPrazo = new Date(pedido.prazo_entrega).toLocaleDateString('pt-BR');
    
    // Botões de Ação (Dependem da coluna que ele está)
    let botoesHtml = '';
    
    if (pedido.id_status_pedido === STATUS_PENDENTE) {
        botoesHtml = `<button class="btn-kanban btn-start" onclick="moverPedido(${pedido.id}, ${STATUS_PRODUCAO})">INICIAR <i class="fa-solid fa-play"></i></button>`;
    } else if (pedido.id_status_pedido === STATUS_PRODUCAO) {
        botoesHtml = `
            <button class="btn-kanban btn-back" onclick="moverPedido(${pedido.id}, ${STATUS_PENDENTE})"><i class="fa-solid fa-arrow-left"></i></button>
            <button class="btn-kanban btn-finish" onclick="moverPedido(${pedido.id}, ${STATUS_CONCLUIDO})">CONCLUIR <i class="fa-solid fa-check"></i></button>
        `;
    } else if (pedido.id_status_pedido === STATUS_CONCLUIDO) {
        botoesHtml = `<div class="k-tag-done"><i class="fa-solid fa-check-double"></i> Pronto</div>`;
    }

    card.innerHTML = `
        <div class="k-header">
            <span class="k-id">#${pedido.id}</span>
            <span class="k-date"><i class="fa-regular fa-calendar"></i> ${dataPrazo}</span>
        </div>
        <h4 class="k-client">${pedido.clientes.nome}</h4>
        <div class="k-items-list">${resumoItens}</div>
        <div class="k-actions">${botoesHtml}</div>
    `;

    return card;
}

// Função Global para ser acessada pelo onclick do HTML
window.moverPedido = async (idPedido, novoStatus) => {
    const supabase = window.supabaseClient; // Hack para acessar a instância global se necessário, ou passamos via bind
    // Na verdade, melhor usar o cliente importado no main. Vamos fazer um dispatch de evento ou usar uma função exportada.
    
    // Abordagem direta:
    const { error } = await window.supabase.from('pedidos_capa').update({ id_status_pedido: novoStatus }).eq('id', idPedido);
    
    if (error) {
        Toast.show("Erro ao mover: " + error.message, 'error');
    } else {
        Toast.show("Status atualizado!", 'success');
        // Recarrega o Kanban
        const event = new CustomEvent('reloadKanban');
        document.dispatchEvent(event);
    }
};