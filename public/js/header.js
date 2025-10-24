// public/js/header.js
$(document).ready(function() {
    const hamburgerMenu = $('#hamburger-menu');
    const mobileNav = $('#mobile-nav');
    const menuOverlay = $('#nav-overlay');
    const navClose = $('#nav-close');
    const searchInput = $('#search-input');
    
    // FIX: Cache the form, not just the button
    const searchForm = $('.header-search'); 

    function openMenu() {
        mobileNav.addClass('active');
        menuOverlay.addClass('active');
        // FIX: Update ARIA state
        hamburgerMenu.addClass('active').attr('aria-expanded', 'true');
        $('body').css('overflow', 'hidden');
    }

    function closeMenu() {
        mobileNav.removeClass('active');
        menuOverlay.removeClass('active');
        // FIX: Update ARIA state
        hamburgerMenu.removeClass('active').attr('aria-expanded', 'false');
        $('body').css('overflow', 'auto');
    }

    function toggleMenu() {
        mobileNav.hasClass('active') ? closeMenu() : openMenu();
    }

    hamburgerMenu.on('click', toggleMenu);
    navClose.on('click', closeMenu);
    menuOverlay.on('click', closeMenu);
    $('.nav-menu a').on('click', closeMenu);
    
    $(document).on('keydown', function(e) {
        if (e.key === 'Escape' && mobileNav.hasClass('active')) closeMenu();
    });

    // FIX: Removed performSearch, searchBtn.on('click'), and searchInput.on('keypress')
    // Replaced with a single 'submit' handler on the form.
    searchForm.on('submit', function(e) {
        const searchTerm = searchInput.val().trim();
        
        if (searchTerm.length < 2) {
            e.preventDefault(); // Stop the form from submitting
            searchInput.addClass('error').focus();
            setTimeout(() => searchInput.removeClass('error'), 2000);
            return;
        }
        // If validation passes, the form submits normally via its
        // 'action' and 'method' attributes. No JS redirect needed.
    });

    searchInput.on('input', function() {
        const value = $(this).val();
        if (value.length > 100) $(this).val(value.substring(0, 100));
    });

    $('a[href^="#"]').on('click', function(e) {
        const href = $(this).attr('href');
        if (href === '#') return;
        e.preventDefault();
        const target = $(href);
        if (target.length) {
            $('html, body').animate({ scrollTop: target.offset().top - 100 }, 600);
        }
    });

    const currentPath = window.location.pathname;
    
    // FIX: More robust active-link logic
    $('.nav-menu a').each(function() {
        const linkHref = $(this).attr('href');
        if (!linkHref) return;

        // Special case for home page
        if (linkHref === '/' && currentPath === '/') {
            $(this).addClass('active');
            return;
        }
        
        // General case for other pages
        if (linkHref !== '/' && currentPath.startsWith(linkHref)) {
            $(this).addClass('active');
        }
    });

    // Cerrar menú al redimensionar
    $(window).on('resize', function() {
        if ($(window).width() > 768 && mobileNav.hasClass('active')) closeMenu();
    });
});