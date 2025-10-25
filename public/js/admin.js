/* public/js/admin.js */
$(document).ready(function() {
    const $body = $('body');
    const $hamburgerBtn = $('#admin-hamburger-btn');
    const $sidebar = $('#admin-sidebar-sliding');
    const $overlay = $('#admin-sidebar-overlay');
    const $closeBtn = $('#sidebar-close-btn');

    // FIX: Store the element that opened the sidebar
    let $lastFocusedElement = null;

    // --- Sidebar Toggle Logic ---
    function openSidebar() {
        // FIX: Store the focused element
        $lastFocusedElement = $(document.activeElement);
        $body.addClass('sidebar-visible');
        // FIX: Move focus into the sidebar
        $closeBtn.trigger('focus'); 
    }

    function closeSidebar() {
        $body.removeClass('sidebar-visible');
        // FIX: Return focus to the opening element
        if ($lastFocusedElement) {
            $lastFocusedElement.trigger('focus');
            $lastFocusedElement = null;
        }
    }

    $hamburgerBtn.on('click', openSidebar);
    $closeBtn.on('click', closeSidebar);
    $overlay.on('click', closeSidebar);
    
    $(document).on('keydown', function(e) {
        if (e.key === 'Escape' && $body.hasClass('sidebar-visible')) {
            closeSidebar();
        }
    });

    $sidebar.find('.nav-item').on('click', function(e) {
        const href = $(this).attr('href');
        const currentPath = window.location.pathname;
        
        if (!href || href === '#' || href === currentPath || href.startsWith('http')) {
           return; 
        }

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
    $('.admin-toast').remove(); 
    
    const toastClass = type === 'success' ? 'toast-success' : 'toast-error';
    
    const iconHtml = type === 'success' 
        ? '<i class="toast-icon fa-solid fa-check-circle"></i>' 
        : '<i class="toast-icon fa-solid fa-times-circle"></i>';
    
    const $toast = $(`
        <div class="admin-toast ${toastClass}">
            ${iconHtml}
            <span class="toast-message">${message}</span>
        </div>
    `);
    
    $('body').append($toast);
    
    setTimeout(() => {
        $toast.addClass('show');
    }, 10); 

    setTimeout(() => {
        $toast.removeClass('show');
        setTimeout(() => {
            $toast.remove();
        }, 300); 
    }, 3000);
}