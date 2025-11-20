// js/xml_import.js
import { Toast } from './toast.js';

export function initImportacaoXML(supabase) {
    const btnImportar = document.getElementById('btn-importar-xml');
    const fileInput = document.getElementById('input-file-xml');
    
    if (!btnImportar || !fileInput) return;

    // Clique no botão aciona o input de arquivo escondido
    btnImportar.addEventListener('click', () => fileInput.click());

    // Quando seleciona o arquivo
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const xmlText = e.target.result;
            await processarXML(xmlText, supabase);
            fileInput.value = ''; // Limpa para poder selecionar o mesmo arquivo de novo se errar
        };
        reader.readAsText(file);
    });
}

async function processarXML(xmlText, supabase) {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");

        // 1. Dados do Fornecedor (Emitente)
        const emit = xmlDoc.getElementsByTagName('emit')[0];
        if (!emit) throw new Error("XML inválido: Emitente não encontrado.");
        
        const cnpjFornecedor = emit.getElementsByTagName('CNPJ')[0]?.textContent;
        const nomeFornecedor = emit.getElementsByTagName('xNome')[0]?.textContent;

        // Verifica/Cadastra Fornecedor
        let idFornecedor = await garantirFornecedor(supabase, cnpjFornecedor, nomeFornecedor);

        // 2. Itens da Nota (Det)
        const dets = xmlDoc.getElementsByTagName('det');
        const listaItens = [];

        for (let i = 0; i < dets.length; i++) {
            const prod = dets[i].getElementsByTagName('prod')[0];
            listaItens.push({
                nome: prod.getElementsByTagName('xProd')[0]?.textContent,
                codigo: prod.getElementsByTagName('cProd')[0]?.textContent,
                qtd: parseFloat(prod.getElementsByTagName('qCom')[0]?.textContent),
                valorUnit: parseFloat(prod.getElementsByTagName('vUnCom')[0]?.textContent),
                unidade: prod.getElementsByTagName('uCom')[0]?.textContent
            });
        }

        // 3. Abre Modal de Conferência
        abrirModalConferencia(listaItens, idFornecedor, supabase);

    } catch (error) {
        console.error(error);
        Toast.show("Erro ao ler XML: " + error.message, 'error');
    }
}

async function garantirFornecedor(supabase, cnpj, nome) {
    // Busca se já existe (pelo CNPJ no campo extra ou nome)
    // Simplificação: Vamos buscar pelo nome ou criar novo
    // Idealmente teríamos um campo CNPJ na tabela fornecedores. Vamos usar o campo extra se tiver, ou criar.
    
    // Verifica na lista 'fornecedores' do admin
    const { data: existente } = await supabase
        .from('fornecedores')
        .select('id')
        .ilike('nome_fornecedor', nome) // Busca aproximada por nome
        .maybeSingle();

    if (existente) return existente.id;

    // Se não existe, cria
    const { data: novo, error } = await supabase
        .from('fornecedores')
        .insert({ 
            nome_fornecedor: nome, 
            cnpj_cpf: cnpj, // Aproveitando o campo extra que criamos no admin
            ativo: true 
        })
        .select()
        .single();
    
    if (error) throw new Error("Erro ao cadastrar fornecedor: " + error.message);
    
    Toast.show(`Fornecedor ${nome} cadastrado automaticamente!`, 'success');
    return novo.id;
}

// --- MODAL DE CONFERÊNCIA ---
const modalImport = document.getElementById('modal-import-xml');
const tbodyImport = document.getElementById('tbody-import-itens');

function abrirModalConferencia(itens, idFornecedor, supabase) {
    if(!modalImport) return;
    
    modalImport.classList.remove('hidden');
    tbodyImport.innerHTML = '';

    itens.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.nome}</td>
            <td>${item.qtd} ${item.unidade}</td>
            <td>R$ ${item.valorUnit.toFixed(2)}</td>
            <td>
                <select class="select-acao-import" data-index="${index}">
                    <option value="novo">Cadastrar Novo</option>
                    <option value="ignorar">Ignorar</option>
                </select>
            </td>
            <td>
                <button type="button" class="btn-acao btn-success btn-processar-item" 
                        data-index="${index}" 
                        data-fornecedor="${idFornecedor}">
                    <i class="fa-solid fa-check"></i> Salvar
                </button>
            </td>
        `;
        // Armazena dados no elemento para recuperar depois
        tr.dataset.item = JSON.stringify(item);
        tbodyImport.appendChild(tr);
    });

    // Ligar botões de salvar individual
    document.querySelectorAll('.btn-processar-item').forEach(btn => {
        btn.addEventListener('click', (e) => salvarItemImportado(e, supabase));
    });
}

async function salvarItemImportado(e, supabase) {
    const btn = e.target.closest('button');
    const tr = btn.closest('tr');
    const itemData = JSON.parse(tr.dataset.item);
    const idFornecedor = btn.dataset.fornecedor;
    const acao = tr.querySelector('.select-acao-import').value;

    if (acao === 'ignorar') {
        tr.remove();
        return;
    }

    // Se for cadastrar novo, precisamos de Categoria, Cor e Unidade (que não vêm no XML ou vêm errado)
    // Para simplificar, vamos preencher o FORMULÁRIO DE CADASTRO DE MERCADORIA com esses dados
    // e deixar o usuário completar lá.
    
    document.getElementById('modal-import-xml').classList.add('hidden'); // Fecha modal import
    
    // Preenche o formulário principal
    document.getElementById('mercadoria-nome').value = itemData.nome;
    document.getElementById('mercadoria-custo').value = itemData.valorUnit;
    
    // Seleciona o fornecedor no dropdown (se já tiver carregado)
    const selectForn = document.getElementById('mercadoria-fornecedor');
    if(selectForn) {
        // Tenta selecionar pelo ID, se o options já estiverem lá. 
        // Se não, seta valor e torce, ou recarrega opções. 
        // Vamos assumir que o usuário vai conferir.
        selectForn.value = idFornecedor; 
    }

    Toast.show("Dados carregados! Selecione Categoria e Cor para salvar.", 'info');
    document.getElementById('mercadoria-categoria').focus();
}

document.getElementById('btn-fechar-import-xml')?.addEventListener('click', () => modalImport.classList.add('hidden'));