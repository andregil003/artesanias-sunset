// public/js/product-detail.js
$(document).ready(function() {
    // Controles de cantidad
    const $decreaseBtn = $('#decrease-qty');
    const $increaseBtn = $('#increase-qty');
    const $quantityInput = $('#quantity');
    
    $decreaseBtn.on('click', function() {
        const currentValue = parseInt($quantityInput.val());
        if (currentValue > 1) {
            $quantityInput.val(currentValue - 1);
        }
    });
    
    $increaseBtn.on('click', function() {
        const currentValue = parseInt($quantityInput.val());
        const maxStock = parseInt($quantityInput.attr('max'));
        if (currentValue < maxStock) {
            $quantityInput.val(currentValue + 1);
        }
    });
    
    // Selección de tallas
    $('.size-btn').on('click', function() {
        $('.size-btn').removeClass('selected');
        $(this).addClass('selected');
    });
    
    // Selección de colores
    $('.color-btn').on('click', function() {
        $('.color-btn').removeClass('selected');
        $(this).addClass('selected');
    });

    // Selección de materiales
    $('.material-btn').on('click', function() {
        $('.material-btn').removeClass('selected');
        $(this).addClass('selected');
    });
});