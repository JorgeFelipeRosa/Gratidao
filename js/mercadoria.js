// js/mercadoria.js

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

// Exportada: Carrega os menus da tela "Cadastrar Matéria-Prima"
export async function carregarOpcoesMercadoria(supabase) {
    carregarMenu(supabase, 'mercadoria-categoria', 'categorias_mercadoria', 'nome_categoria');
    carregarMenu(supabase, 'mercadoria-unidade', 'unidades_medida', 'sigla_medida'); 
    carregarMenu(supabase, 'mercadoria-cor', 'cores_mercadoria', 'nome_cor');
    carregarMenu(supabase, 'mercadoria-fornecedor', 'fornecedores', 'nome_fornecedor');
}

// Exportada: "Liga" o formulário de "Cadastrar Matéria-Prima"
export function initFormularioMercadoria(supabase) {
    const formMercadoria = document.getElementById('formMercadoria');
    if (!formMercadoria) return;

    const btnSalvar = document.getElementById('btnSalvarMercadoria');
    const msgMercadoria = document.getElementById('mensagemMercadoria');

    formMercadoria.addEventListener('submit', async (e) => {
        e.preventDefault();
        btnSalvar.disabled = true;
        btnSalvar.innerText = "Salvando...";
        msgMercadoria.textContent = '';
        
        try {
            const formData = new FormData(formMercadoria);
            const dadosForm = Object.fromEntries(formData.entries());

            const dadosParaSalvar = {
                nome_material: dadosForm.nome_material,
                valor_custo: parseFloat(dadosForm.valor_custo),
                id_categoria_mercadoria: parseInt(dadosForm.id_categoria_mercadoria),
                id_unidade_medida: parseInt(dadosForm.id_unidade_medida),
                id_cor_mercadoria: parseInt(dadosForm.id_cor_mercadoria),
                id_fornecedor: parseInt(dadosForm.id_fornecedor)
            };

            if (!dadosParaSalvar.nome_material || isNaN(dadosParaSalvar.valor_custo) || isNaN(dadosParaSalvar.id_categoria_mercadoria)) {
                throw new Error("Nome, Custo e Categoria são obrigatórios.");
            }

            const { error } = await supabase
                .from('mercadorias')
                .insert(dadosParaSalvar);

            if (error) throw error;
            
            msgMercadoria.style.color = 'green';
            msgMercadoria.textContent = 'Matéria-prima salva com sucesso!';
            formMercadoria.reset();
            setTimeout(() => { msgMercadoria.textContent = ''; }, 3000);

        } catch (error) {
            console.error('Erro ao salvar matéria-prima:', error);
            msgMercadoria.style.color = 'red';
            msgMercadoria.textContent = error.message;
        } finally {
            btnSalvar.disabled = false;
            btnSalvar.innerText = "Salvar Matéria-Prima";
        }
    });
}

// --- NOVO: Inicializa a Busca de Mercadorias ---
export function initFuncionalidadeBuscaMercadoria(supabase) {
    const btnBuscar = document.getElementById('btn-busca-mercadoria');
    const btnLimpar = document.getElementById('btn-limpar-busca-mercadoria');
    const inputBusca = document.getElementById('input-busca-mercadoria');

    if (btnBuscar) {
        btnBuscar.addEventListener('click', () => {
            carregarMercadorias(supabase, inputBusca.value);
        });
    }
    if (inputBusca) {
        inputBusca.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') carregarMercadorias(supabase, inputBusca.value);
        });
    }
    if (btnLimpar) {
        btnLimpar.addEventListener('click', () => {
            inputBusca.value = '';
            carregarMercadorias(supabase, null);
        });
    }
}

// --- CONSULTAR MERCADORIAS (COM BUSCA) ---
export async function carregarMercadorias(supabase, termoBusca = null) {
    const tbody = document.getElementById('corpoTabelaMercadorias');
    if (!tbody) return; 

    tbody.innerHTML = '<tr><td colspan="6">Buscando...</td></tr>';

    // 1. Busca TODAS as mercadorias
    const { data: mercadorias, error } = await supabase
        .from('mercadorias')
        .select(`
            id,
            nome_material,
            valor_custo,
            unidades_medida ( sigla_medida ),
            fornecedores ( nome_fornecedor )
        `)
        .order('nome_material', { ascending: true });

    if (error) {
        console.error('Erro ao buscar mercadorias:', error);
        tbody.innerHTML = `<tr><td colspan="6">Erro ao carregar: ${error.message}</td></tr>`;
        return;
    }

    // 2. Filtra no Javascript
    let listaFiltrada = mercadorias || [];

    if (termoBusca && termoBusca.trim() !== '') {
        const termo = termoBusca.toLowerCase().trim();
        listaFiltrada = listaFiltrada.filter(m => {
            return m.nome_material.toLowerCase().includes(termo);
        });
    }

    if (listaFiltrada.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">Nenhuma matéria-prima encontrada.</td></tr>';
        return;
    }

    tbody.innerHTML = ''; 
    
    listaFiltrada.forEach(item => {
        const tr = document.createElement('tr');
        const unidade = item.unidades_medida ? item.unidades_medida.sigla_medida : 'N/A';
        const fornecedor = item.fornecedores ? item.fornecedores.nome_fornecedor : 'N/A';
        
        tr.innerHTML = `
            <td>${item.id}</td>
            <td>${item.nome_material}</td>
            <td>R$ ${item.valor_custo.toFixed(2)}</td>
            <td>${unidade}</td>
            <td>${fornecedor}</td>
            <td>
                <button class="btn-acao btn-warning btn-editar-mercadoria" data-id="${item.id}">Editar</button>
                <button class="btn-acao btn-danger btn-excluir-mercadoria" data-id="${item.id}">Excluir</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Re-ligar eventos
    attachMercadoriaEvents(supabase);
}

// Função auxiliar para ligar eventos
function attachMercadoriaEvents(supabase) {
    document.querySelectorAll('.btn-editar-mercadoria').forEach(button => {
        button.addEventListener('click', (e) => {
            abrirModalEditarMercadoria(supabase, e.target.getAttribute('data-id'));
        });
    });

    document.querySelectorAll('.btn-excluir-mercadoria').forEach(button => {
        button.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            if (confirm('Tem certeza que deseja excluir esta matéria-prima?')) {
                e.target.disabled = true;
                const { error } = await supabase.from('mercadorias').delete().eq('id', id);
                if (error) {
                    alert('Erro ao excluir: ' + error.message);
                    e.target.disabled = false;
                } else {
                    e.target.closest('tr').remove();
                }
            }
        });
    });
}

// --- MODAL EDIÇÃO ---
const modalFundoEditarMercadoria = document.getElementById('modal-fundo-editar-mercadoria');
const formEditarMercadoria = document.getElementById('formEditarMercadoria');
const mensagemEditarMercadoria = document.getElementById('mensagemEditarMercadoria');

export async function carregarOpcoesEditarMercadoria(supabase) {
    carregarMenu(supabase, 'edit-mercadoria-categoria', 'categorias_mercadoria', 'nome_categoria');
    carregarMenu(supabase, 'edit-mercadoria-unidade', 'unidades_medida', 'sigla_medida');
    carregarMenu(supabase, 'edit-mercadoria-fornecedor', 'fornecedores', 'nome_fornecedor');
}

async function abrirModalEditarMercadoria(supabase, id) {
    if (!modalFundoEditarMercadoria) return;
    formEditarMercadoria.reset();
    mensagemEditarMercadoria.textContent = '';
    
    const { data: mercadoria, error } = await supabase.from('mercadorias').select('*').eq('id', id).single(); 
    if (error) return alert('Não foi possível carregar a matéria-prima.');

    document.getElementById('edit-mercadoria-id').value = mercadoria.id;
    document.getElementById('edit-mercadoria-nome').value = mercadoria.nome_material;
    document.getElementById('edit-mercadoria-custo').value = mercadoria.valor_custo;
    document.getElementById('edit-mercadoria-categoria').value = mercadoria.id_categoria_mercadoria;
    document.getElementById('edit-mercadoria-unidade').value = mercadoria.id_unidade_medida;
    document.getElementById('edit-mercadoria-fornecedor').value = mercadoria.id_fornecedor;
    
    modalFundoEditarMercadoria.classList.remove('hidden');
}

document.getElementById('btn-cancelar-edicao-mercadoria')?.addEventListener('click', () => modalFundoEditarMercadoria.classList.add('hidden'));

export function initFormularioEditarMercadoria(supabase) {
    if (!formEditarMercadoria) return; 
    
    formEditarMercadoria.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSalvar = document.getElementById('btn-salvar-edicao-mercadoria');
        btnSalvar.disabled = true; btnSalvar.innerText = 'Salvando...';

        const formData = new FormData(formEditarMercadoria);
        const dados = Object.fromEntries(formData.entries());
        const id = parseInt(dados.id);
        delete dados.id; 
        
        dados.valor_custo = parseFloat(dados.valor_custo);
        dados.id_categoria_mercadoria = parseInt(dados.id_categoria_mercadoria);
        dados.id_unidade_medida = parseInt(dados.id_unidade_medida);
        dados.id_fornecedor = parseInt(dados.id_fornecedor);

        const { error } = await supabase.from('mercadorias').update(dados).eq('id', id); 

        if (error) {
            mensagemEditarMercadoria.style.color = "red";
            mensagemEditarMercadoria.innerText = "Erro: " + error.message;
        } else {
            mensagemEditarMercadoria.style.color = "green";
            mensagemEditarMercadoria.innerText = "Matéria-prima atualizada!";
            carregarMercadorias(supabase);
            setTimeout(() => modalFundoEditarMercadoria.classList.add('hidden'), 2000);
        }
        btnSalvar.disabled = false; btnSalvar.innerText = 'Salvar Alterações';
    });
}