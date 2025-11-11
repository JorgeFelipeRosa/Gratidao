// Importa as funções dos outros arquivos
import { 
    carregarOpcoesCliente, 
    initFormularioCliente, 
    carregarClientes,
    carregarOpcoesEditarCliente,
    initFormularioEditarCliente 
} from './cliente.js';
import { 
    carregarProdutos, 
    carregarOpcoesCadastroProduto,
    carregarOpcoesEditarProduto,
    initFormularioProduto, 
    initFormularioEditarProduto 
} from './produto.js';
import {
    carregarOpcoesOrcamento,
    initFormularioOrcamento,
    carregarOrcamentos
} from './orcamento.js';
import {
    carregarOpcoesPedido,
    initFormularioPedido,
    carregarPedidos,
    initFormularioPagamento,
    initFormularioMudarStatus
} from './pedido.js';
import {
    carregarOpcoesConsumo,
    initFormularioConsumo
} from './consumo.js';
import {
    carregarOpcoesMercadoria,
    initFormularioMercadoria,
    carregarMercadorias,
    carregarOpcoesEditarMercadoria,
    initFormularioEditarMercadoria
} from './mercadoria.js';
import {
    carregarOpcoesAdmin,
    initGerenciadorListas
} from './admin.js';

// 1. CONFIGURAÇÃO DO SUPABASE
const SUPABASE_URL = 'https://czmtvshqkdxigfyrfpmj.supabase.co';
// !! SUBSTITUA PELA SUA CHAVE !!
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6bXR2c2hxa2R4aWdmeXJmcG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Mzk1MTksImV4cCI6MjA3ODQxNTUxOX0.dshOP4UhRJbG0CRt4N3mIB89Eq1ERmEyD7hMghktQb8'; 
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. ELEMENTOS GLOBAIS DA PÁGINA
const loginContainer = document.getElementById('container-login');
const appContainer = document.getElementById('container-app');
const btnLogout = document.getElementById('btn-logout');
let appIniciado = false;

// 3. O "PORTEIRO" DA APLICAÇÃO
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' || (event === 'INITIAL_SESSION' && session)) {
        loginContainer.style.display = 'none';
        appContainer.style.display = 'block';
        if (!appIniciado) {
            iniciarApp(session.user);
            appIniciado = true;
        }
    } else if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session)) {
        loginContainer.style.display = 'grid';
        appContainer.style.display = 'none';
        appIniciado = false;
    }
});

// 4. LÓGICA DE LOGIN / CADASTRO DE USUÁRIO
const formLogin = document.getElementById('formLogin');
const msgLogin = document.getElementById('auth-mensagem');
formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) msgLogin.textContent = "Erro: ".concat(error.message);
});

const formSignup = document.getElementById('formSignup');
const msgSignup = document.getElementById('auth-mensagem-signup');
formSignup.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) msgSignup.textContent = "Erro: ".concat(error.message);
    else {
        msgSignup.style.color = "green";
        msgSignup.textContent = "Sucesso! Verifique seu e-mail para confirmar a conta.";
    }
});
btnLogout.addEventListener('click', async () => { await supabase.auth.signOut(); });
document.getElementById('link-toggle-signup').addEventListener('click', (e) => {
    e.preventDefault();
    formLogin.classList.add('hidden');
    formSignup.classList.remove('hidden');
});
document.getElementById('link-toggle-login').addEventListener('click', (e) => {
    e.preventDefault();
    formLogin.classList.remove('hidden');
    formSignup.classList.add('hidden');
});


// 5. FUNÇÃO PRINCIPAL DO APP (Inicia após o login)
function iniciarApp(user) {
    console.log('App iniciado para:', user.email);
    
    const menuItens = document.querySelectorAll('.navegacao li[data-target]');
    const telas = document.querySelectorAll('.tela');
    const menuLateral = document.getElementById('menu-lateral');

    // --- FUNÇÃO mostrarTela ---
    function mostrarTela(idTela) {
        telas.forEach(tela => tela.classList.remove('ativa'));
        const telaAlvo = document.getElementById(idTela);
        
        if (telaAlvo) {
            telaAlvo.classList.add('ativa');
            
            // --- Gatilhos de Carregamento de Dados ---
            if (idTela === 'tela-cadastro-cliente') carregarOpcoesCliente(supabase);
            if (idTela === 'tela-consulta-clientes') {
                carregarClientes(supabase);
                carregarOpcoesEditarCliente(supabase);
            }
            if (idTela === 'tela-consulta-produtos') {
                carregarProdutos(supabase);
                carregarOpcoesEditarProduto(supabase); 
            }
            if (idTela === 'tela-cadastro-produto') {
                carregarOpcoesCadastroProduto(supabase);
            }
            if (idTela === 'tela-cadastro-orcamento') {
                carregarOpcoesOrcamento(supabase);
            }
            if (idTela === 'tela-consulta-orcamentos') {
                carregarOrcamentos(supabase);
            }
            if (idTela === 'tela-cadastro-pedido') {
                carregarOpcoesPedido(supabase);
            }
            if (idTela === 'tela-consulta-pedidos') {
                carregarPedidos(supabase);
            }
            if (idTela === 'tela-registro-consumo') {
                carregarOpcoesConsumo(supabase);
            }
            if (idTela === 'tela-cadastro-mercadoria') {
                carregarOpcoesMercadoria(supabase);
            }
            if (idTela === 'tela-consulta-mercadoria') {
                carregarMercadorias(supabase);
                carregarOpcoesEditarMercadoria(supabase);
            }
            if (idTela === 'tela-gerenciar-listas') {
                carregarOpcoesAdmin(supabase);
            }
        }
    }
    // --- FIM DA FUNÇÃO ---

    menuItens.forEach(item => {
        item.addEventListener('click', () => {
            const idTelaAlvo = item.getAttribute('data-target');
            mostrarTela(idTelaAlvo);
            
            // Fecha o menu no mobile ao clicar (agora o evento funciona!)
            if (window.innerWidth <= 800) {
                menuLateral.classList.remove('menu-aberto');
            }
        });
    });

    mostrarTela('tela-home');

    // "Ligar" os formulários
    initFormularioCliente(supabase);
    initFormularioProduto(supabase);
    initFormularioEditarProduto(supabase);
    initFormularioEditarCliente(supabase);
    initFormularioOrcamento(supabase);
    initFormularioPedido(supabase);
    initFormularioPagamento(supabase);
    initFormularioMudarStatus(supabase);
    initFormularioConsumo(supabase);
    initFormularioMercadoria(supabase);
    initFormularioEditarMercadoria(supabase);
    initGerenciadorListas(supabase);
    
    // NOTA: A lógica do botão hamburger foi movida para o DOMContentLoaded
}


// --- NOVO BLOCO: LÓGICA DE NAVEGAÇÃO MOBILE (Prioridade Alta) ---
// Este bloco garante que o botão "☰" funcione assim que o HTML for carregado,
// antes mesmo do login.
document.addEventListener('DOMContentLoaded', () => {
    
    const btnHamburger = document.getElementById('btn-hamburger');
    const menuLateral = document.getElementById('menu-lateral');

    if (btnHamburger && menuLateral) {
        btnHamburger.addEventListener('click', () => {
            // Adiciona ou remove a classe 'menu-aberto'
            menuLateral.classList.toggle('menu-aberto');
        });
    }
});