// js/main.js

import { 
    carregarOpcoesCliente, 
    initFormularioCliente, 
    carregarClientes,
    carregarOpcoesEditarCliente,
    initFormularioEditarCliente,
    initFuncionalidadeBuscaCliente 
} from './cliente.js';
import { 
    carregarProdutos, 
    carregarOpcoesCadastroProduto,
    carregarOpcoesEditarProduto,
    initFormularioProduto, 
    initFormularioEditarProduto,
    initFuncionalidadeBuscaProduto 
} from './produto.js';
import {
    carregarOpcoesOrcamento,
    initFormularioOrcamento,
    carregarOrcamentos,
    initFuncionalidadeBuscaOrcamento
} from './orcamento.js';
import {
    carregarOpcoesPedido,
    initFormularioPedido,
    carregarPedidos,
    initFormularioPagamento,
    initFormularioMudarStatus,
    initFuncionalidadeBusca
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
    initFormularioEditarMercadoria,
    initFuncionalidadeBuscaMercadoria
} from './mercadoria.js';
import {
    carregarOpcoesAdmin,
    initGerenciadorListas
} from './admin.js';
import { 
    carregarConfiguracoes, 
    initFormularioConfig 
} from './config.js';
import { carregarDashboard } from './dashboard.js'; // Import do Dashboard
import { carregarKanban } from './kanban.js';       // Import do Kanban


// 1. CONFIGURAÇÃO
const SUPABASE_URL = 'https://czmtvshqkdxigfyrfpmj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6bXR2c2hxa2R4aWdmeXJmcG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Mzk1MTksImV4cCI6MjA3ODQxNTUxOX0.dshOP4UhRJbG0CRt4N3mIB89Eq1ERmEyD7hMghktQb8'; 
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- IMPORTANTE: Torna o supabase acessível globalmente para o Kanban (window.moverPedido) ---
window.supabase = supabase; 
// -------------------------------------------------------------------------------------------

// 2. GLOBAIS
const loginContainer = document.getElementById('container-login');
const appContainer = document.getElementById('container-app');
const btnLogout = document.getElementById('btn-logout');
let appIniciado = false;

// 3. AUTH
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

// 4. LOGIN
const formLogin = document.getElementById('formLogin');
const msgLogin = document.getElementById('auth-mensagem');
if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) msgLogin.textContent = "Erro: ".concat(error.message);
    });
}

const formSignup = document.getElementById('formSignup');
const msgSignup = document.getElementById('auth-mensagem-signup');
if (formSignup) {
    formSignup.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) msgSignup.textContent = "Erro: ".concat(error.message);
        else {
            msgSignup.style.color = "green";
            msgSignup.textContent = "Sucesso! Verifique seu e-mail.";
        }
    });
}

if (btnLogout) {
    btnLogout.addEventListener('click', async () => { await supabase.auth.signOut(); });
}

document.getElementById('link-toggle-signup')?.addEventListener('click', (e) => {
    e.preventDefault();
    formLogin.classList.add('hidden');
    formSignup.classList.remove('hidden');
});

document.getElementById('link-toggle-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    formLogin.classList.remove('hidden');
    formSignup.classList.add('hidden');
});


// 5. INICIAR APP
function iniciarApp(user) {
    console.log('App iniciado para:', user.email);
    
    const menuItens = document.querySelectorAll('.navegacao li[data-target]');
    const telas = document.querySelectorAll('.tela');
    const menuLateral = document.getElementById('menu-lateral');

    function mostrarTela(idTela) {
        telas.forEach(tela => tela.classList.remove('ativa'));
        const telaAlvo = document.getElementById(idTela);
        
        if (telaAlvo) {
            telaAlvo.classList.add('ativa');
            
            // --- CARREGAMENTOS DE CADA TELA ---

            if (idTela === 'tela-home') carregarDashboard(supabase);
            if (idTela === 'tela-kanban') carregarKanban(supabase); // <--- KANBAN AQUI

            if (idTela === 'tela-cadastro-cliente') carregarOpcoesCliente(supabase);
            
            if (idTela === 'tela-consulta-clientes') {
                document.getElementById('corpoTabelaClientes').innerHTML = '<tr><td colspan="10">Carregando...</td></tr>';
                carregarClientes(supabase);
                carregarOpcoesEditarCliente(supabase);
            }
            
            if (idTela === 'tela-consulta-produtos') {
                document.getElementById('corpoTabelaProdutos').innerHTML = '<tr><td colspan="4">Carregando...</td></tr>';
                carregarProdutos(supabase);
                carregarOpcoesEditarProduto(supabase); 
            }
            
            if (idTela === 'tela-cadastro-produto') carregarOpcoesCadastroProduto(supabase);
            if (idTela === 'tela-cadastro-orcamento') carregarOpcoesOrcamento(supabase);
            
            if (idTela === 'tela-consulta-orcamentos') {
                document.getElementById('corpoTabelaOrcamentos').innerHTML = '<tr><td colspan="7">Carregando...</td></tr>';
                carregarOrcamentos(supabase);
            }
            
            if (idTela === 'tela-cadastro-pedido') carregarOpcoesPedido(supabase);
            
            if (idTela === 'tela-consulta-pedidos') {
                document.getElementById('corpoTabelaPedidos').innerHTML = '<tr><td colspan="9">Carregando...</td></tr>';
                carregarPedidos(supabase);
            }
            
            if (idTela === 'tela-registro-consumo') carregarOpcoesConsumo(supabase);
            if (idTela === 'tela-cadastro-mercadoria') carregarOpcoesMercadoria(supabase);
            
            if (idTela === 'tela-consulta-mercadoria') {
                document.getElementById('corpoTabelaMercadorias').innerHTML = '<tr><td colspan="6">Carregando...</td></tr>';
                carregarMercadorias(supabase);
                carregarOpcoesEditarMercadoria(supabase);
            }
            
            if (idTela === 'tela-gerenciar-listas') carregarOpcoesAdmin(supabase);
            if (idTela === 'tela-configuracoes') carregarConfiguracoes(supabase);
        }
    }

    menuItens.forEach(item => {
        item.addEventListener('click', () => {
            const idTelaAlvo = item.getAttribute('data-target');
            menuItens.forEach(li => li.classList.remove('item-ativo'));
            item.classList.add('item-ativo');
            mostrarTela(idTelaAlvo);
            if (window.innerWidth <= 800 && menuLateral) {
                menuLateral.classList.remove('menu-aberto');
            }
        });
    });
    
    if(menuItens.length > 0) menuItens[0].classList.add('item-ativo');
    mostrarTela('tela-home'); // Inicia no Dashboard

    // Ligar formulários
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
    initFormularioConfig(supabase);
    
    // --- Ligar Buscas ---
    initFuncionalidadeBusca(supabase);        
    initFuncionalidadeBuscaCliente(supabase); 
    initFuncionalidadeBuscaOrcamento(supabase); 
    initFuncionalidadeBuscaMercadoria(supabase); 
    initFuncionalidadeBuscaProduto(supabase);

    // --- Evento Especial do Kanban (Recarregar ao Mover) ---
    document.addEventListener('reloadKanban', () => {
        if(document.getElementById('tela-kanban').classList.contains('ativa')){
            carregarKanban(supabase);
        }
    });
// --- LÓGICA DO TEMA (DARK / LIGHT) ---
    const btnTema = document.getElementById('btn-tema-toggle');
    const body = document.body;
    const iconTema = btnTema.querySelector('i');
    const textTema = btnTema.querySelector('span');

    // 1. Verifica se já tem preferência salva
    const temaSalvo = localStorage.getItem('temaPreferido');
    if (temaSalvo === 'light') {
        body.classList.add('light-mode');
        iconTema.className = 'fa-solid fa-moon'; // Muda ícone para Lua
        textTema.textContent = 'Modo Escuro';
    }

    // 2. Evento de Clique
    if (btnTema) {
        btnTema.addEventListener('click', () => {
            body.classList.toggle('light-mode');
            
            if (body.classList.contains('light-mode')) {
                // Ativou Light
                localStorage.setItem('temaPreferido', 'light');
                iconTema.className = 'fa-solid fa-moon';
                textTema.textContent = 'Modo Escuro';
            } else {
                // Voltou pro Dark
                localStorage.setItem('temaPreferido', 'dark');
                iconTema.className = 'fa-solid fa-sun';
                textTema.textContent = 'Modo Claro';
            }
        });
    }

}

document.addEventListener('DOMContentLoaded', () => {
    const btnHamburger = document.getElementById('btn-hamburger');
    const menuLateral = document.getElementById('menu-lateral');
    if (btnHamburger && menuLateral) {
        btnHamburger.addEventListener('click', () => {
            menuLateral.classList.toggle('menu-aberto');
        });
    }
});