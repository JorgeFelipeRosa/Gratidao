// js/produto.js
import { Toast } from './toast.js';

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
// (Estilo editar mantido, mas não usado via JS direto)

// Função interna unificada para carregar menus de opções
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

// Exportada: Carrega as opções do formulário de CADASTRO de produto
export async function carregarOpcoesCadastroProduto(supabase) {
    carregarMenuOpcoes(supabase, 'id_categoria_produto', 'categorias_produto', 'nome_categoria');
    carregarMenuOpcoes(supabase, 'id_linha_produto', 'linhas_produto', 'nome_linha');
    carregarMenuOpcoes(supabase, 'id_comodo', 'comodos', 'nome_comodo');
    carregarMenuOpcoes(supabase, 'id_co', 'opcoes_co', 'nome_co');
    carregarMenuOpcoes(supabase, 'id_unidade_medida', 'unidades_medida', 'sigla_medida'); 
}

export function initFormularioProduto(supabase) {
    const formProduto = document.getElementById('formProduto');
    if (!formProduto) return; 

    if (formProduto.getAttribute('data-init') === 'true') return;
    formProduto.setAttribute('data-init', 'true');

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
        dadosProduto.id_unidade_medida = parseInt(dadosProduto.id_unidade_medida); 

        const { error } = await supabase.from('produtos').insert([ dadosProduto ]); 

        if (error) {
            Toast.show("Erro ao salvar: " + error.message, 'error');
        } else {
            Toast.show("Produto cadastrado com sucesso!", 'success');
            formProduto.reset(); 
        }
        
        btnSalvarProduto.disabled = false;
        btnSalvarProduto.innerText = "Salvar Produto";
    });
}

// --- Inicializa a Busca de Produtos ---
export function initFuncionalidadeBuscaProduto(supabase) {
    const btnBuscar = document.getElementById('btn-busca-produto');
    const btnLimpar = document.getElementById('btn-limpar-busca-produto');
    const inputBusca = document.getElementById('input-busca-produto');

    if (btnBuscar) {
        btnBuscar.addEventListener('click', () => {
            carregarProdutos(supabase, inputBusca.value);
        });
    }
    if (inputBusca) {
        inputBusca.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') carregarProdutos(supabase, inputBusca.value);
        });
    }
    if (btnLimpar) {
        btnLimpar.addEventListener('click', () => {
            inputBusca.value = '';
            carregarProdutos(supabase, null);
        });
    }
}

// --- CONSULTAR PRODUTOS ---
export async function carregarProdutos(supabase, termoBusca = null) {
    const tbody = document.getElementById('corpoTabelaProdutos');
    if (!tbody) return; 

    tbody.innerHTML = '<tr><td colspan="4">Buscando...</td></tr>';

    const { data: produtos, error } = await supabase
        .from('produtos')
        .select(`
            id,
            nome_produto,
            preco_medio,
            categorias_produto ( nome_categoria )
        `)
        .eq('ativo', true) 
        .order('nome_produto', { ascending: true });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="4">Erro ao carregar: ${error.message}</td></tr>`;
        return;
    }

    let listaFiltrada = produtos || [];

    if (termoBusca && termoBusca.trim() !== '') {
        const termo = termoBusca.toLowerCase().trim();
        listaFiltrada = listaFiltrada.filter(p => {
            return p.nome_produto.toLowerCase().includes(termo);
        });
    }

    if (listaFiltrada.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">Nenhum produto encontrado.</td></tr>';
        return;
    }

    tbody.innerHTML = ''; 
    
    listaFiltrada.forEach(produto => {
        const tr = document.createElement('tr');
        const nomeCategoria = produto.categorias_produto ? produto.categorias_produto.nome_categoria : 'Sem categoria';
        
        tr.innerHTML = `
            <td>${produto.nome_produto}</td>
            <td>R$ ${produto.preco_medio.toFixed(2)}</td>
            <td>${nomeCategoria}</td>
            <td>
                <button class="btn-acao btn-warning btn-editar" data-id="${produto.id}">Editar</button>
                <button class="btn-acao btn-danger btn-excluir" data-id="${produto.id}">Excluir</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    attachProductEvents(supabase);
}

function attachProductEvents(supabase) {
    document.querySelectorAll('.btn-editar').forEach(button => {
        button.addEventListener('click', (e) => {
            abrirModalEdicao(supabase, e.target.getAttribute('data-id'));
        });
    });

    document.querySelectorAll('.btn-excluir').forEach(button => {
        button.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            if (confirm('Tem certeza que deseja INATIVAR este produto?')) {
                e.target.disabled = true;
                const { error } = await supabase.from('produtos').update({ ativo: false }).eq('id', id);
                if (error) {
                    Toast.show("Erro: " + error.message, 'error');
                    e.target.disabled = false;
                } else {
                    Toast.show("Produto inativado.", 'info');
                    e.target.closest('tr').remove();
                }
            }
        });
    });
}

// --- MODAL EDIÇÃO ---
const modalFundo = document.getElementById('modal-fundo');
const formEditarProduto = document.getElementById('formEditarProduto');

export async function carregarOpcoesEditarProduto(supabase) {
    carregarMenuOpcoes(supabase, 'edit-id_categoria_produto', 'categorias_produto', 'nome_categoria');
    carregarMenuOpcoes(supabase, 'edit-id_unidade_medida', 'unidades_medida', 'sigla_medida'); 
}

async function abrirModalEdicao(supabase, id) {
    if (!modalFundo) return;
    formEditarProduto.reset();
    
    const { data: produto, error } = await supabase.from('produtos').select('*').eq('id', id).single(); 
    if (error) return Toast.show('Erro ao carregar produto.', 'error');

    document.getElementById('edit-produto-id').value = produto.id;
    document.getElementById('edit-nome_produto').value = produto.nome_produto;
    document.getElementById('edit-preco_medio').value = produto.preco_medio;
    document.getElementById('edit-id_categoria_produto').value = produto.id_categoria_produto;
    document.getElementById('edit-id_unidade_medida').value = produto.id_unidade_medida; 
    
    modalFundo.classList.remove('hidden');
}

document.getElementById('btn-cancelar-edicao')?.addEventListener('click', () => modalFundo.classList.add('hidden'));

export function initFormularioEditarProduto(supabase) {
    if (!formEditarProduto) return;

    if (formEditarProduto.getAttribute('data-init') === 'true') return;
    formEditarProduto.setAttribute('data-init', 'true');

    formEditarProduto.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSalvarEdicao = document.getElementById('btn-salvar-edicao');
        btnSalvarEdicao.disabled = true; btnSalvarEdicao.innerText = 'Salvando...';

        const formData = new FormData(formEditarProduto);
        const dadosAtualizados = Object.fromEntries(formData.entries());
        const idProduto = parseInt(dadosAtualizados.id);
        
        dadosAtualizados.preco_medio = parseFloat(dadosAtualizados.preco_medio);
        dadosAtualizados.id_categoria_produto = parseInt(dadosAtualizados.id_categoria_produto);
        dadosAtualizados.id_unidade_medida = parseInt(dadosAtualizados.id_unidade_medida);
        delete dadosAtualizados.id; 
        
        const { error } = await supabase.from('produtos').update(dadosAtualizados).eq('id', idProduto); 

        if (error) {
            Toast.show("Erro: " + error.message, 'error');
        } else {
            Toast.show("Produto atualizado!", 'success');
            carregarProdutos(supabase);
            setTimeout(() => modalFundo.classList.add('hidden'), 1500);
        }
        btnSalvarEdicao.disabled = false; btnSalvarEdicao.innerText = 'Salvar Alterações';
    });
}