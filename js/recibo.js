// js/recibo.js

export async function gerarRecibo(dados, supabase) {
    // 1. BUSCAR DADOS DA EMPRESA
    const { data: empresa } = await supabase.from('configuracoes').select('*').single();

    if (empresa) {
        document.getElementById('print-empresa-nome').textContent = empresa.nome_empresa;
        document.getElementById('print-empresa-doc').textContent = `CNPJ/CPF: ${empresa.cnpj}`;
        document.getElementById('print-empresa-end').textContent = empresa.endereco;
        document.getElementById('print-empresa-tel').textContent = `Tel: ${empresa.telefone}`;
        document.getElementById('print-empresa-dono').textContent = empresa.nome_proprietario;
    }

    // 2. PREENCHER DADOS DO PAGAMENTO
    const textoNome = dados.cpf ? `${dados.cliente} - CPF: ${dados.cpf}` : dados.cliente;
    document.getElementById('recibo-cliente-nome').textContent = textoNome;
    
    // Formata valor pago (entrada)
    document.getElementById('recibo-valor').textContent = parseFloat(dados.valor).toFixed(2).replace('.', ',');
    
    document.getElementById('recibo-pedido-id').textContent = dados.pedidoId;
    document.getElementById('recibo-forma').textContent = dados.formaPgto;
    
    // Formata Data
    const partesData = dados.data.split('-'); // Assume YYYY-MM-DD
    const dataObj = new Date(partesData[0], partesData[1]-1, partesData[2]);
    const opcoesData = { year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('recibo-data-extenso').textContent = dataObj.toLocaleDateString('pt-BR', opcoesData);

    // 3. BUSCAR ITENS E CALCULAR TOTAL (CORREÇÃO AQUI)
    const tbody = document.getElementById('recibo-tabela-body');
    tbody.innerHTML = '';

    const { data: itens } = await supabase
        .from('pedidos_item')
        .select(`quantidade, valor_unitario_vendido, produtos ( nome_produto )`)
        .eq('id_pedido_capa', dados.pedidoId);

    let somaTotalItens = 0; // Variável para somar na hora

    if (itens) {
        itens.forEach(item => {
            const totalItem = item.quantidade * item.valor_unitario_vendido;
            somaTotalItens += totalItem; // Soma ao total geral

            tbody.innerHTML += `
                <tr>
                    <td>${item.produtos.nome_produto}</td>
                    <td>${item.quantidade}</td>
                    <td>R$ ${item.valor_unitario_vendido.toFixed(2)}</td>
                    <td>R$ ${totalItem.toFixed(2)}</td>
                </tr>`;
        });
    }

    // Preenche o total com a soma calculada agora (Matematicamente exato)
    document.getElementById('recibo-total-pedido').textContent = `R$ ${somaTotalItens.toFixed(2)}`;

    // 4. IMPRIMIR
    document.body.classList.add('print-mode-recibo');
    
    setTimeout(() => { 
        window.print(); 
        document.body.classList.remove('print-mode-recibo');
    }, 500);
}