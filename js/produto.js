// js/produto.js

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
    
    // --- MUDANÇA: Adicionado filtro .eq('ativo', true) ---
    // (Garante que itens inativos não apareçam em menus futuros)
    const { data, error } = await supabase
        .from(nomeTabela)
        .select(`id, ${nomeColuna}`)
        .eq('ativo', true); // <-- NOVO FILTRO AQUI

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

// Exportada: Carrega a tabela de consulta de produtos
export async function carregarProdutos(supabase) {
    const tbody = document.getElementById('corpoTabelaProdutos');
    if (!tbody) return; 

    tbody.innerHTML = '<tr><td colspan="4">Carregando produtos...</td></tr>';

    // --- MUDANÇA: Adicionado filtro .eq('ativo', true) ---
    const { data: produtos, error } = await supabase
        .from('produtos')
        .select(`
            id,
            nome_produto,
            preco_medio,
            categorias_produto ( nome_categoria )
        `)
        .eq('ativo', true) // <-- SÓ MOSTRA PRODUTOS ATIVOS
        .order('nome_produto', { ascending: true });

    if (error) {
        console.error('Erro ao buscar produtos:', error);
        tbody.innerHTML = `<tr><td colspan="4">Erro ao carregar produtos: ${error.message}</td></tr>`;
        return;
    }
    if (produtos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">Nenhum produto ativo cadastrado.</td></tr>';
        return;
    }

    tbody.innerHTML = ''; 
    
    produtos.forEach(produto => {
        const tr = document.createElement('tr');
        const nomeCategoria = produto.categorias_produto ? produto.categorias_produto.nome_categoria : 'Sem categoria';
        
        tr.innerHTML = `
            <td>${produto.nome_produto}</td>
            <td>R$ ${produto.preco_medio}</td>
            <td>${nomeCategoria}</td>
            <td>
                <button class="btn-editar" data-id="${produto.id}" style="${estiloBotaoEditar}">Editar</button>
                <button class="btn-excluir" data-id="${produto.id}" style="${estiloBotaoExcluir}">Excluir</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Lógica de clique para EDITAR
    document.querySelectorAll('.btn-editar').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            abrirModalEdicao(supabase, id);
        });
    });

    // --- MUDANÇA: LÓGICA DE "EXCLUIR" AGORA FAZ "INATIVAR" ---
    document.querySelectorAll('.btn-excluir').forEach(button => {
        button.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            
            if (confirm('Tem certeza que deseja INATIVAR este produto? Ele não poderá ser usado em novos orçamentos, mas ficará no histórico.')) {
                e.target.disabled = true;
                e.target.innerText = "Inativando...";

                // O comando mudou de .delete() para .update()
                const { error } = await supabase
                    .from('produtos')
                    .update({ ativo: false }) // <-- SETA 'ativo' PARA FALSO
                    .eq('id', id);

                if (error) {
                    // O erro de "foreign key" (chave estrangeira) NÃO vai mais acontecer
                    console.error('Erro ao inativar produto:', error);
                    alert('Erro ao inativar: ' + error.message);
                    e.target.disabled = false;
                    e.target.innerText = "Excluir";
                } else {
                    // Sucesso! Remove a linha da tabela na tela
                    e.target.closest('tr').remove();
                }
            }
        });
    });
}

// Exportada: Carrega as opções do formulário de CADASTRO de produto
export async function carregarOpcoesCadastroProduto(supabase) {
    // (Esta função é interna, então usamos a 'carregarMenu' genérica)
    // A função 'carregarMenu' genérica agora filtra por 'ativo = true'
    // Mas as tabelas de opções (categoria, linha, etc.) não têm 'ativo'.
    
    // --- CORREÇÃO: Vamos criar uma carregarMenu específica ---
    async function carregarMenuOpcoes(supabase, idElemento, nomeTabela, nomeColuna) {
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
    
    carregarMenuOpcoes(supabase, 'id_categoria_produto', 'categorias_produto', 'nome_categoria');
    carregarMenuOpcoes(supabase, 'id_linha_produto', 'linhas_produto', 'nome_linha');
    carregarMenuOpcoes(supabase, 'id_comodo', 'comodos', 'nome_comodo');
    carregarMenuOpcoes(supabase, 'id_co', 'opcoes_co', 'nome_co');
}

// Exportada: "Liga" o formulário de salvar produto (CADASTRO)
export function initFormularioProduto(supabase) {
    const formProduto = document.getElementById('formProduto');
    if (!formProduto) return; 

    const mensagemProduto = document.getElementById('mensagemProduto');
    const btnSalvarProduto = document.getElementById('btnSalvarProduto');

    formProduto.addEventListener('submit', async function(e) {
        e.preventDefault(); 
        btnSalvarProduto.disabled = true;
        btnSalvarProduto.innerText = "Salvando...";
        
        const formData = new FormData(formProduto);
        const dadosProduto = Object.fromEntries(formData.entries());

        dadosProduto.preco_medio = parseFloat(dadosProduto.preco_medio);
        dadosProduto.id_categoria_produto = parseInt(dadosProduto.id_categoria_produto);
        dadosProduto.id_linha_produto = parseInt(dadosProduto.id_linha_produto);
        dadosProduto.id_comodo = parseInt(dadosProduto.id_comodo);
        dadosProduto.id_co = parseInt(dadosProduto.id_co);
        // O produto já nasce como 'ativo = true' por causa do DEFAULT do BD

        const { error } = await supabase.from('produtos').insert([ dadosProduto ]); 

        if (error) {
            console.error('Erro ao salvar produto:', error);
            mensagemProduto.style.color = "red";
            mensagemProduto.innerText = "Erro: ".concat(error.message);
        } else {
            mensagemProduto.style.color = "green";
            mensagemProduto.innerText = "Produto salvo com sucesso!";
            formProduto.reset(); 
            setTimeout(() => {
                mensagemProduto.innerText = "";
            }, 3000);
        }
        
        btnSalvarProduto.disabled = false;
        btnSalvarProduto.innerText = "Salvar Produto";
    });
}


// --- LÓGICA DO MODAL DE EDIÇÃO DE PRODUTO ---

const modalFundo = document.getElementById('modal-fundo');
const formEditarProduto = document.getElementById('formEditarProduto');
const mensagemEditarProduto = document.getElementById('mensagemEditarProduto');

// Exportada: Carrega os menus do modal de EDIÇÃO
export async function carregarOpcoesEditarProduto(supabase) {
    // (Esta função auxiliar também não deve filtrar por 'ativo')
    async function carregarMenuOpcoes(supabase, idElemento, nomeTabela, nomeColuna) {
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
    carregarMenuOpcoes(supabase, 'edit-id_categoria_produto', 'categorias_produto', 'nome_categoria');
}

// Função para ABRIR o modal de edição de produto
async function abrirModalEdicao(supabase, id) {
    if (!modalFundo) return;
    
    formEditarProduto.reset();
    mensagemEditarProduto.textContent = '';
    
    const { data: produto, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('id', id)
        .single(); 

    if (error) {
        console.error('Erro ao buscar produto para edição:', error);
        alert('Não foi possível carregar o produto.');
        return;
    }

    document.getElementById('edit-produto-id').value = produto.id;
    document.getElementById('edit-nome_produto').value = produto.nome_produto;
    document.getElementById('edit-preco_medio').value = produto.preco_medio;
    document.getElementById('edit-id_categoria_produto').value = produto.id_categoria_produto;
    
    modalFundo.classList.remove('hidden');
}

// Função para FECHAR o modal
function fecharModalEdicao() {
    modalFundo.classList.add('hidden');
}

// "Liga" o botão de Cancelar
document.getElementById('btn-cancelar-edicao').addEventListener('click', fecharModalEdicao);

// "Liga" o formulário de SALVAR EDIÇÃO de produto
export function initFormularioEditarProduto(supabase) {
    if (!formEditarProduto) return;

    formEditarProduto.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSalvarEdicao = document.getElementById('btn-salvar-edicao');
        btnSalvarEdicao.disabled = true;
        btnSalvarEdicao.innerText = 'Salvando...';

        const formData = new FormData(formEditarProduto);
        const dadosAtualizados = Object.fromEntries(formData.entries());

        const idProduto = parseInt(dadosAtualizados.id);
        dadosAtualizados.preco_medio = parseFloat(dadosAtualizados.preco_medio);
        dadosAtualizados.id_categoria_produto = parseInt(dadosAtualizados.id_categoria_produto);

        delete dadosAtualizados.id; 
        
        const { error } = await supabase
            .from('produtos')
            .update(dadosAtualizados)
            .eq('id', idProduto); 

        if (error) {
            console.error('Erro ao atualizar produto:', error);
            mensagemEditarProduto.style.color = "red";
            mensagemEditarProduto.innerText = "Erro: " + error.message;
        } else {
            mensagemEditarProduto.style.color = "green";
            mensagemEditarProduto.innerText = "Produto atualizado com sucesso!";
            carregarProdutos(supabase);
            setTimeout(() => {
                fecharModalEdicao();
            }, 2000);
        }

        btnSalvarEdicao.disabled = false;
        btnSalvarEdicao.innerText = 'Salvar Alterações';
    });
}