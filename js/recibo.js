// js/recibo.js

export async function gerarRecibo(dados, supabase) {
    // dados = { cliente, cpf, valor, pedidoId, formaPgto, data }

    // 1. BUSCAR DADOS DA EMPRESA
    const { data: empresa } = await supabase
        .from('configuracoes')
        .select('*')
        .limit(1)
        .single();

    if (empresa) {
        document.getElementById('print-empresa-nome').textContent = empresa.nome_empresa;
        document.getElementById('print-empresa-doc').textContent = `CNPJ/CPF: ${empresa.cnpj}`;
        document.getElementById('print-empresa-end').textContent = empresa.endereco;
        document.getElementById('print-empresa-tel').textContent = `Tel: ${empresa.telefone}`;
        document.getElementById('print-empresa-dono').textContent = empresa.nome_proprietario;
    }

    // 2. PREENCHER DADOS BÁSICOS
    // --- MUDANÇA AQUI: Adiciona o CPF ao lado do nome se existir ---
    const textoNome = dados.cpf ? `${dados.cliente} - CPF: ${dados.cpf}` : dados.cliente;
    document.getElementById('recibo-cliente-nome').textContent = textoNome;
    
    document.getElementById('recibo-valor').textContent = parseFloat(dados.valor).toFixed(2).replace('.', ',');
    document.getElementById('recibo-pedido-id').textContent = dados.pedidoId;
    document.getElementById('recibo-forma').textContent = dados.formaPgto;
    
    const dataObj = new Date(dados.data + 'T00:00:00');
    const opcoesData = { year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('recibo-data-extenso').textContent = dataObj.toLocaleDateString('pt-BR', opcoesData);

    // 3. BUSCAR ITENS DO PEDIDO
    const tbody = document.getElementById('recibo-tabela-body');
    tbody.innerHTML = '<tr><td colspan="4">Carregando itens...</td></tr>';

    const { data: itens } = await supabase
        .from('pedidos_item')
        .select(`quantidade, valor_unitario_vendido, produtos ( nome_produto )`)
        .eq('id_pedido_capa', dados.pedidoId);

    const { data: capa } = await supabase
        .from('pedidos_capa')
        .select('valor_total_pedido')
        .eq('id', dados.pedidoId)
        .single();

    tbody.innerHTML = '';

    if (itens && itens.length > 0) {
        itens.forEach(item => {
            const totalItem = item.quantidade * item.valor_unitario_vendido;
            tbody.innerHTML += `
                <tr>
                    <td>${item.produtos.nome_produto}</td>
                    <td>${item.quantidade}</td>
                    <td>R$ ${item.valor_unitario_vendido.toFixed(2)}</td>
                    <td>R$ ${totalItem.toFixed(2)}</td>
                </tr>
            `;
        });
    }

    if (capa) {
        document.getElementById('recibo-total-pedido').textContent = `R$ ${capa.valor_total_pedido.toFixed(2)}`;
    }

    // 4. IMPRIMIR
    setTimeout(() => { window.print(); }, 500);
}