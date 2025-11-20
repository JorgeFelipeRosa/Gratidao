// js/dashboard.js

export async function carregarDashboard(supabase) {
    const container = document.getElementById('dashboard-stats');
    if (!container) return;

    // Define datas para o filtro do mês atual
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString();
    const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString();

    try {
        // 1. KPI: Vendas do Mês (Soma dos Pedidos confirmados no mês)
        const { data: vendas, error: errVendas } = await supabase
            .from('pedidos_capa')
            .select('valor_total_pedido')
            .gte('created_at', primeiroDiaMes)
            .lte('created_at', ultimoDiaMes);
            // .neq('id_status_pedido', ID_CANCELADO) -> Ideal filtrar cancelados se souber o ID

        let totalVendas = 0;
        if (vendas) {
            totalVendas = vendas.reduce((acc, pedido) => acc + pedido.valor_total_pedido, 0);
        }

        // 2. KPI: Orçamentos Pendentes (Para Follow-up)
        // Assumindo que ID 1 = Pendente (Padrão)
        const { count: countOrcamentos } = await supabase
            .from('orcamentos_capa')
            .select('*', { count: 'exact', head: true })
            .eq('id_status_orcamento', 1) 
            .eq('ativo', true);

        // 3. KPI: Pedidos em Produção
        // Vamos buscar pelo texto do status para garantir, ou IDs se soubermos (Ex: 2=Em Produção)
        // Aqui faremos uma busca genérica nos pedidos que NÃO estão entregues nem cancelados
        const { count: countProducao } = await supabase
            .from('pedidos_capa')
            .select('*', { count: 'exact', head: true })
            .eq('id_status_pedido', 2); // Ajuste este ID conforme sua tabela de status (Em Produção)

        // --- RENDERIZAR NA TELA ---
        
        // Atualiza valores
        animateValue("kpi-vendas", 0, totalVendas, 1000, true);
        document.getElementById("kpi-orcamentos").innerText = countOrcamentos || 0;
        document.getElementById("kpi-producao").innerText = countProducao || 0;

    } catch (erro) {
        console.error("Erro ao carregar dashboard:", erro);
    }
}

// Efeito visual de contagem dos números
function animateValue(id, start, end, duration, isCurrency = false) {
    const obj = document.getElementById(id);
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const value = Math.floor(progress * (end - start) + start);
        
        if (isCurrency) {
            obj.innerHTML = `R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        } else {
            obj.innerHTML = value;
        }
        
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
             // Garante o valor final exato com centavos
            if (isCurrency) obj.innerHTML = `R$ ${end.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        }
    };
    window.requestAnimationFrame(step);
}