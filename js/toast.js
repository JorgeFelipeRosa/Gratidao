// js/toast.js

// Cria o container na tela se não existir
function criarContainer() {
    if (!document.getElementById('toast-container')) {
        const container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
}

export const Toast = {
    // Tipos: 'success' (verde), 'error' (vermelho), 'info' (azul), 'warning' (amarelo)
    show: (mensagem, tipo = 'success') => {
        criarContainer();
        const container = document.getElementById('toast-container');

        // Ícones baseados no tipo
        let iconClass = 'fa-check-circle';
        if (tipo === 'error') iconClass = 'fa-circle-xmark';
        if (tipo === 'warning') iconClass = 'fa-triangle-exclamation';
        if (tipo === 'info') iconClass = 'fa-circle-info';

        // Cria o elemento do Toast
        const toast = document.createElement('div');
        toast.className = `toast toast-${tipo}`;
        toast.innerHTML = `
            <div class="toast-icon"><i class="fa-solid ${iconClass}"></i></div>
            <div class="toast-message">${mensagem}</div>
            <div class="toast-close"><i class="fa-solid fa-xmark"></i></div>
        `;

        // Adiciona ao container
        container.appendChild(toast);

        // Lógica de remover ao clicar no X
        toast.querySelector('.toast-close').onclick = () => {
            toast.style.animation = 'slideOut 0.3s forwards';
            setTimeout(() => toast.remove(), 300);
        };

        // Remove automaticamente após 4 segundos
        setTimeout(() => {
            if (document.body.contains(toast)) {
                toast.style.animation = 'slideOut 0.3s forwards';
                setTimeout(() => toast.remove(), 300);
            }
        }, 4000);
    }
};