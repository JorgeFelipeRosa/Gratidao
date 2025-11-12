// js/cliente.js

// --- Estilos dos botões da tabela ---
const estiloBotaoExcluir = `
    background: rgba(226, 88, 88, 0.15); 
    color: #E25858; 
    border: 1px solid #E25858;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    margin-left: 5px;
`;
const estiloBotaoEditar = `
    background: rgba(245, 197, 24, 0.15); 
    color: #F5C518; 
    border: 1px solid #F5C518;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
`;

// Função interna para carregar os menus de opções
async function carregarMenu(supabase, idElemento, nomeTabela, nomeColuna) {
    const selectMenu = document.getElementById(idElemento);
    if (!selectMenu) return; 
    
    let query = supabase.from(nomeTabela).select(`id, ${nomeColuna}`).eq('ativo', true);
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
        mensagemCliente.textContent = '';
        
        const formData = new FormData(formCliente);
        const dadosCliente = Object.fromEntries(formData.entries());
        const cpfParaValidar = dadosCliente.cpf;
        
        // Validação CPF
        const { count, error: erroContagem } = await supabase
            .from('clientes')
            .select('cpf', { count: 'exact', head: true })
            .eq('cpf', cpfParaValidar);

        if (erroContagem || count > 0) {
            mensagemCliente.style.color = "red";
            mensagemCliente.innerText = erroContagem ? "Erro na validação." : "ERRO: Este CPF já está cadastrado.";
            btnSalvarCliente.disabled = false;
            btnSalvarCliente.innerText = "Salvar Cliente";
            return;
        }
        
        dadosCliente.ativo = true; 
        const { error: erroSalvamento } = await supabase.from('clientes').insert([ dadosCliente ]); 

        if (erroSalvamento) {
            mensagemCliente.style.color = "red";
            mensagemCliente.innerText = "Erro ao salvar: " + erroSalvamento.message;
        } else {
            mensagemCliente.style.color = "green";
            mensagemCliente.innerText = "Cliente salvo com sucesso!";
            formCliente.reset(); 
            setTimeout(() => { mensagemCliente.innerText = ""; }, 3000);
        }
        
        btnSalvarCliente.disabled = false;
        btnSalvarCliente.innerText = "Salvar Cliente";
    });
}

// --- NOVO: Inicializa a Busca de Clientes ---
export function initFuncionalidadeBuscaCliente(supabase) {
    const btnBuscar = document.getElementById('btn-busca-cliente');
    const btnLimpar = document.getElementById('btn-limpar-busca-cliente');
    const inputBusca = document.getElementById('input-busca-cliente');

    if (btnBuscar) {
        btnBuscar.addEventListener('click', () => {
            carregarClientes(supabase, inputBusca.value);
        });
    }
    if (inputBusca) {
        inputBusca.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') carregarClientes(supabase, inputBusca.value);
        });
    }
    if (btnLimpar) {
        btnLimpar.addEventListener('click', () => {
            inputBusca.value = '';
            carregarClientes(supabase, null);
        });
    }
}

// --- LÓGICA DE CONSULTAR CLIENTES (COM BUSCA) ---
export async function carregarClientes(supabase, termoBusca = null) {
    const tbody = document.getElementById('corpoTabelaClientes');
    if (!tbody) return; 

    tbody.innerHTML = '<tr><td colspan="10">Buscando...</td></tr>';

    // 1. Busca TODOS os clientes ativos
    const { data: clientes, error } = await supabase
        .from('clientes')
        .select(`
            id, nome, cpf, telefone,
            cep, rua, bairro, cidade,
            tipos_cliente ( nome_tipo ),
            canais_venda ( nome_canal )
        `)
        .eq('ativo', true) 
        .order('nome', { ascending: true });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="10">Erro ao carregar: ${error.message}</td></tr>`;
        return;
    }

    // 2. Filtra no Javascript (Nome, CPF ou Telefone)
    let listaFiltrada = clientes || [];

    if (termoBusca && termoBusca.trim() !== '') {
        const termo = termoBusca.toLowerCase().trim();
        listaFiltrada = listaFiltrada.filter(c => {
            const matchNome = c.nome && c.nome.toLowerCase().includes(termo);
            const matchCpf = c.cpf && c.cpf.includes(termo);
            const matchTel = c.telefone && c.telefone.includes(termo);
            return matchNome || matchCpf || matchTel;
        });
    }

    if (listaFiltrada.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10">Nenhum cliente encontrado.</td></tr>';
        return;
    }

    tbody.innerHTML = ''; 
    
    listaFiltrada.forEach(cliente => {
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
                <button class="btn-acao btn-warning btn-editar-cliente" data-id="${cliente.id}">Editar</button>
                <button class="btn-acao btn-danger btn-excluir-cliente" data-id="${cliente.id}">Excluir</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Ligar botões
    document.querySelectorAll('.btn-editar-cliente').forEach(button => {
        button.addEventListener('click', (e) => abrirModalEdicaoCliente(supabase, e.target.getAttribute('data-id')));
    });

    document.querySelectorAll('.btn-excluir-cliente').forEach(button => {
        button.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            if (confirm('Tem certeza que deseja INATIVAR este cliente?')) {
                e.target.disabled = true;
                e.target.innerText = "...";
                const { error } = await supabase.from('clientes').update({ ativo: false }).eq('id', id);
                if (error) {
                    alert('Erro: ' + error.message);
                    e.target.disabled = false;
                } else {
                    e.target.closest('tr').remove();
                }
            }
        });
    });
}

// --- MODAL EDIÇÃO ---
const modalFundoCliente = document.getElementById('modal-fundo-cliente');
const formEditarCliente = document.getElementById('formEditarCliente');
const mensagemEditarCliente = document.getElementById('mensagemEditarCliente');

async function abrirModalEdicaoCliente(supabase, id) {
    if(!formEditarCliente) return;
    formEditarCliente.reset();
    mensagemEditarCliente.textContent = '';
    
    const { data: cliente, error } = await supabase.from('clientes').select('*').eq('id', id).single(); 
    if (error) return alert('Erro ao carregar cliente.');

    document.getElementById('edit-cliente-id').value = cliente.id;
    document.getElementById('edit-nome').value = cliente.nome;
    document.getElementById('edit-cpf').value = cliente.cpf;
    document.getElementById('edit-telefone').value = cliente.telefone;
    document.getElementById('edit-cep').value = cliente.cep || '';
    document.getElementById('edit-rua').value = cliente.rua || '';
    document.getElementById('edit-bairro').value = cliente.bairro || '';
    document.getElementById('edit-cidade').value = cliente.cidade || '';
    document.getElementById('edit-id_tipo_cliente').value = cliente.id_tipo_cliente;
    document.getElementById('edit-id_canal_venda').value = cliente.id_canal_venda;
    
    modalFundoCliente.classList.remove('hidden');
}

document.getElementById('btn-cancelar-edicao-cliente')?.addEventListener('click', () => modalFundoCliente.classList.add('hidden'));

export function initFormularioEditarCliente(supabase) {
    if (!formEditarCliente) return; 
    
    formEditarCliente.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSalvar = document.getElementById('btn-salvar-edicao-cliente');
        btnSalvar.disabled = true; btnSalvar.innerText = 'Salvando...';

        const formData = new FormData(formEditarCliente);
        const dados = Object.fromEntries(formData.entries());
        const id = parseInt(dados.id);
        delete dados.id; 
        
        dados.id_tipo_cliente = parseInt(dados.id_tipo_cliente);
        dados.id_canal_venda = parseInt(dados.id_canal_venda);

        const { error } = await supabase.from('clientes').update(dados).eq('id', id); 

        if (error) {
            mensagemEditarCliente.style.color = "red";
            mensagemEditarCliente.innerText = "Erro: " + error.message;
        } else {
            mensagemEditarCliente.style.color = "green";
            mensagemEditarCliente.innerText = "Cliente atualizado!";
            carregarClientes(supabase);
            setTimeout(() => modalFundoCliente.classList.add('hidden'), 2000);
        }
        btnSalvar.disabled = false; btnSalvar.innerText = 'Salvar Alterações';
    });
}