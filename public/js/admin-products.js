// public/js/admin.js
$(document).ready(function() {
    // Funciones compartidas entre todas las páginas admin
});

function showToast(message, type = 'success') {
    $('.admin-toast').remove();
    
    const toastClass = type === 'success' ? 'toast-success' : 'toast-error';
    const icon = type === 'success' ? '✅' : '❌';
    
    const $toast = $(`
        <div class="admin-toast ${toastClass}">
            <span class="toast-icon">${icon}</span>
            <span class="toast-message">${message}</span>
        </div>
    `);
    
    $('body').append($toast);
    setTimeout(() => $toast.addClass('show'), 10);
    setTimeout(() => {
        $toast.removeClass('show');
        setTimeout(() => $toast.remove(), 300);
    }, 3000);
}