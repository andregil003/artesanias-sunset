/* public/js/admin.js */
$(document).ready(function() {
    const $body = $('body');
    const $hamburgerBtn = $('#admin-hamburger-btn');
    const $sidebar = $('#admin-sidebar-sliding');
    const $overlay = $('#admin-sidebar-overlay');
    const $closeBtn = $('#sidebar-close-btn');

    // --- Sidebar Toggle Logic ---
    function openSidebar() {
        $body.addClass('sidebar-visible');
        // Opcional: enfocar el botón de cerrar para accesibilidad
        // $closeBtn.trigger('focus'); 
    }

    function closeSidebar() {
        $body.removeClass('sidebar-visible');
    }

    $hamburgerBtn.on('click', openSidebar);
    $closeBtn.on('click', closeSidebar);
    $overlay.on('click', closeSidebar);
    
    $(document).on('keydown', function(e) {
        if (e.key === 'Escape' && $body.hasClass('sidebar-visible')) {
            closeSidebar();
        }
    });

    // Opcional: Cerrar sidebar al hacer clic en un enlace de navegación
    $sidebar.find('.nav-item').on('click', function(e) {
        // No cerrar si es un enlace externo, ancla, o ya estamos en esa página
        const href = $(this).attr('href');
        const currentPath = window.location.pathname;
        
        // Evita cerrar si el link es la página actual o un #
        if (!href || href === '#' || href === currentPath || href.startsWith('http')) {
           return; 
        }

        // Si es una navegación normal dentro del admin, cierra el menú
        // Agregamos un pequeño delay para que se vea el click
        setTimeout(closeSidebar, 150); 
    });

    // --- Fin Sidebar Toggle Logic ---

});

/**
 * Muestra una notificación toast en la esquina.
 * @param {string} message - El mensaje a mostrar.
 * @param {string} [type='success'] - 'success' o 'error'.
 */
function showToast(message, type = 'success') {
    $('.admin-toast').remove(); // Elimina toasts anteriores
    
    const toastClass = type === 'success' ? 'toast-success' : 'toast-error';
    // Usar iconos FontAwesome en lugar de Emojis
    const iconHtml = type === 'success' 
        ? '<i class="toast-icon fa-solid fa-check-circle" style="color: #27ae60;"></i>' 
        : '<i class="toast-icon fa-solid fa-times-circle" style="color: #e74c3c;"></i>';
    
    const $toast = $(`
        <div class="admin-toast ${toastClass}">
            ${iconHtml}
            <span class="toast-message">${message}</span>
        </div>
    `);
    
    $('body').append($toast);
    
    // Forzar reflow para asegurar que la animación se aplique
    $toast.width(); 

    // Añadir clase 'show' para animar la entrada
    setTimeout(() => {
        $toast.addClass('show');
    }, 10); // Un pequeño delay puede ayudar

    // Ocultar y eliminar el toast después de 3 segundos
    setTimeout(() => {
        $toast.removeClass('show');
        // Esperar que termine la animación de salida antes de remover
        setTimeout(() => {
            $toast.remove();
        }, 300); // Duración de la transición de salida
    }, 3000);
}