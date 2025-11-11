// js/cliente.js

// --- Estilos dos botões da tabela ---
const estiloBotaoExcluir = `
    background: #e74c3c; /* Vermelho */
    color: white;
    border: none;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    margin-left: 5px;
`;
const estiloBotaoEditar = `
    background: #ffc107; /* Amarelo */
    color: #333;
    border: none;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
`;

// Função interna para carregar os menus de opções
async function carregarMenu(supabase, idElemento, nomeTabela, nomeColuna) {
    const selectMenu = document.getElementById(idElemento);
    if (!selectMenu) return; 
    
    // Filtra por 'ativo = true' (para tabelas de opções)
    let query = supabase.from(nomeTabela).select(`id, ${nomeColuna}`);
    query = query.eq('ativo', true);

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

// Exportada: Carrega as opções do formulário de CADASTRO de cliente
export async function carregarOpcoesCliente(supabase) {
    carregarMenu(supabase, 'tipoCliente', 'tipos_cliente', 'nome_tipo');
    carregarMenu(supabase, 'canalVenda', 'canais_venda', 'nome_canal');
}

// Exportada: Carrega opções do modal de EDIÇÃO de cliente
export async function carregarOpcoesEditarCliente(supabase) {
    carregarMenu(supabase, 'edit-id_tipo_cliente', 'tipos_cliente', 'nome_tipo');
    carregarMenu(supabase, 'edit-id_canal_venda', 'canais_venda', 'nome_canal');
}

// Exportada: "Liga" o formulário de SALVAR (CADASTRO)
export function initFormularioCliente(supabase) {
    const formCliente = document.getElementById('formCliente');
    if (!formCliente) return; 

    const mensagemCliente = document.getElementById('mensagem');
    const btnSalvarCliente = document.getElementById('btnSalvarCliente');

    formCliente.addEventListener('submit', async function(e) {
        e.preventDefault(); 
        btnSalvarCliente.disabled = true;
        btnSalvarCliente.innerText = "Salvando...";
        
        const formData = new FormData(formCliente);
        const dadosCliente = Object.fromEntries(formData.entries());
        
        const cpfParaValidar = dadosCliente.cpf;
        
        // --- PASSO 1: VERIFICAÇÃO DE UNICIDADE DO CPF ---
        const { count, error: erroContagem } = await supabase
            .from('clientes')
            .select('cpf', { count: 'exact', head: true })
            .eq('cpf', cpfParaValidar);

        if (erroContagem) {
            console.error('Erro de validação:', erroContagem);
            mensagemCliente.style.color = "red";
            mensagemCliente.innerText = "Erro na validação do CPF.";
            btnSalvarCliente.disabled = false;
            btnSalvarCliente.innerText = "Salvar Cliente";
            return;
        }

        if (count > 0) {
            mensagemCliente.style.color = "red";
            mensagemCliente.innerText = "ERRO: Este CPF já está cadastrado.";
            btnSalvarCliente.disabled = false;
            btnSalvarCliente.innerText = "Salvar Cliente";
            return;
        }
        
        // --- PASSO 2: SALVAR ---
        dadosCliente.ativo = true; // Salva como ativo
        
        const { error: erroSalvamento } = await supabase.from('clientes').insert([ dadosCliente ]); 

        if (erroSalvamento) {
            console.error('Erro ao salvar cliente:', erroSalvamento);
            mensagemCliente.style.color = "red";
            mensagemCliente.innerText = "Erro ao salvar: " + erroSalvamento.message;
        } else {
            mensagemCliente.style.color = "green";
            mensagemCliente.innerText = "Cliente salvo com sucesso!";
            formCliente.reset(); 
            setTimeout(() => {
                mensagemCliente.innerText = "";
            }, 3000);
        }
        
        btnSalvarCliente.disabled = false;
        btnSalvarCliente.innerText = "Salvar Cliente";
    });
}

// Exportada: Carrega a TABELA de clientes (MODIFICADA)
export async function carregarClientes(supabase) {
    const tbody = document.getElementById('corpoTabelaClientes');
    if (!tbody) return; 

    tbody.innerHTML = '<tr><td colspan="10">Carregando clientes...</td></tr>'; // Colspan 10

    // --- MUDANÇA: ADICIONADO CAMPOS DE ENDEREÇO NA CONSULTA ---
    const { data: clientes, error } = await supabase
        .from('clientes')
        .select(`
            id,
            nome,
            cpf,
            telefone,
            cep, rua, bairro, cidade,
            tipos_cliente ( nome_tipo ),
            canais_venda ( nome_canal )
        `)
        .eq('ativo', true) 
        .order('nome', { ascending: true });

    if (error) {
        console.error('Erro ao buscar clientes:', error);
        tbody.innerHTML = `<tr><td colspan="10">Erro ao carregar clientes: ${error.message}</td></tr>`;
        return;
    }
    if (clientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10">Nenhum cliente ativo cadastrado.</td></tr>';
        return;
    }

    tbody.innerHTML = ''; 
    
    clientes.forEach(cliente => {
        const tr = document.createElement('tr');
        const nomeTipo = cliente.tipos_cliente ? cliente.tipos_cliente.nome_tipo : 'N/A';
        const nomeCanal = cliente.canais_venda ? cliente.canais_venda.nome_canal : 'N/A';
        
        tr.innerHTML = `
            <td>${cliente.nome}</td>
            <td>${cliente.cpf}</td>
            <td>${cliente.telefone}</td>
            <td>${nomeTipo}</td>
            <td>${nomeCanal}</td>
            <td>${cliente.cep || ''}</td>
            <td>${cliente.rua || ''}</td>
            <td>${cliente.bairro || ''}</td>
            <td>${cliente.cidade || ''}</td>
            <td>
                <button class="btn-editar-cliente" data-id="${cliente.id}" style="${estiloBotaoEditar}">Editar</button>
                <button class="btn-excluir-cliente" data-id="${cliente.id}" style="${estiloBotaoExcluir}">Excluir</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Ligar botões de Editar
    document.querySelectorAll('.btn-editar-cliente').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            abrirModalEdicaoCliente(supabase, id);
        });
    });

    // Lógica de "EXCLUIR" (Inativar)
    document.querySelectorAll('.btn-excluir-cliente').forEach(button => {
        button.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            if (confirm('Tem certeza que deseja INATIVAR este cliente? Ele não poderá ser usado em novos orçamentos, mas ficará no histórico.')) {
                e.target.disabled = true;
                e.target.innerText = "Inativando...";
                
                const { error } = await supabase
                    .from('clientes')
                    .update({ ativo: false }) 
                    .eq('id', id);
                    
                if (error) {
                    alert('Erro ao inativar: ' + error.message);
                    e.target.disabled = false;
                    e.target.innerText = "Excluir";
                } else {
                    e.target.closest('tr').remove();
                }
            }
        });
    });
}

// --- LÓGICA DO MODAL DE EDIÇÃO DE CLIENTE (MODIFICADA) ---

const modalFundoCliente = document.getElementById('modal-fundo-cliente');
const formEditarCliente = document.getElementById('formEditarCliente');
const mensagemEditarCliente = document.getElementById('mensagemEditarCliente');

// Função para ABRIR o modal de cliente (MODIFICADA)
async function abrirModalEdicaoCliente(supabase, id) {
    if(!formEditarCliente) return;
    formEditarCliente.reset();
    mensagemEditarCliente.textContent = '';
    
    // --- MUDANÇA: Adicionamos os campos de endereço no SELECT ---
    const { data: cliente, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', id)
        .single(); 

    if (error) {
        alert('Não foi possível carregar o cliente.');
        return;
    }

    // Preenche o formulário do modal
    document.getElementById('edit-cliente-id').value = cliente.id;
    document.getElementById('edit-nome').value = cliente.nome;
    document.getElementById('edit-cpf').value = cliente.cpf;
    document.getElementById('edit-telefone').value = cliente.telefone;
    
    // --- MUDANÇA: Preenche os campos de endereço ---
    document.getElementById('edit-cep').value = cliente.cep || '';
    document.getElementById('edit-rua').value = cliente.rua || '';
    document.getElementById('edit-bairro').value = cliente.bairro || '';
    document.getElementById('edit-cidade').value = cliente.cidade || '';
    
    // Preenche os selects
    document.getElementById('edit-id_tipo_cliente').value = cliente.id_tipo_cliente;
    document.getElementById('edit-id_canal_venda').value = cliente.id_canal_venda;
    
    // Mostra o modal
    modalFundoCliente.classList.remove('hidden');
}

// Função para FECHAR o modal de cliente
function fecharModalEdicaoCliente() {
    modalFundoCliente.classList.add('hidden');
}

// "Liga" o formulário de SALVAR EDIÇÃO de cliente (MODIFICADA)
export function initFormularioEditarCliente(supabase) {
    if (!formEditarCliente) return; 
    
    // Ligar botão de cancelar
    document.getElementById('btn-cancelar-edicao-cliente').addEventListener('click', fecharModalEdicaoCliente);
    
    formEditarCliente.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSalvar = document.getElementById('btn-salvar-edicao-cliente');
        btnSalvar.disabled = true;
        btnSalvar.innerText = 'Salvando...';

        const formData = new FormData(formEditarCliente);
        const dadosAtualizados = Object.fromEntries(formData.entries());
        const idCliente = parseInt(dadosAtualizados.id);

        delete dadosAtualizados.id; 
        
        // Conversão de tipos
        dadosAtualizados.id_tipo_cliente = parseInt(dadosAtualizados.id_tipo_cliente);
        dadosAtualizados.id_canal_venda = parseInt(dadosAtualizados.id_canal_venda);

        const { error } = await supabase
            .from('clientes')
            .update(dadosAtualizados)
            .eq('id', idCliente); 

        if (error) {
            mensagemEditarCliente.style.color = "red";
            mensagemEditarCliente.innerText = "Erro: " + error.message;
        } else {
            mensagemEditarCliente.style.color = "green";
            mensagemEditarCliente.innerText = "Cliente atualizado com sucesso!";
            carregarClientes(supabase); // Recarrega a tabela
            setTimeout(fecharModalEdicaoCliente, 2000);
        }

        btnSalvar.disabled = false;
        btnSalvar.innerText = 'Salvar Alterações';
    });
}