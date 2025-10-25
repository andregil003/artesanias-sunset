// public/js/cart.js
$(document).ready(function() {
    console.log('🛒 Carrito al cargar:', getLocalCart());
    console.log('🔐 Usuario logueado:', isUserLoggedIn());
    console.log('📍 Ruta actual:', window.location.pathname);
    
    loadLocalCartToPage();
    syncCartOnLoad();
    updateCartCount();
    
    // Agregar al carrito
    $(document).on('click', '.add-to-cart, .btn-add-to-cart', function(e) {
        e.preventDefault();
        const $btn = $(this);
        const productId = $btn.data('id') || $btn.data('product-id');
        const quantity = $('#quantity').length ? parseInt($('#quantity').val()) : 1;
        const selectedSize = $('.size-btn.selected').data('size') || '';
        const selectedColor = $('.color-btn.selected').data('color') || '';
        addToCart(productId, quantity, selectedSize, selectedColor, $btn);
    });
    
    $(document).on('click', '.size-btn', function() {
        $('.size-btn').removeClass('selected');
        $(this).addClass('selected');
    });
    
    $(document).on('click', '.color-btn', function() {
        $('.color-btn').removeClass('selected');
        $(this).addClass('selected');
    });
    
    // FIX: Pass $(this) to the update function instead of just the ID
    $(document).on('click', '.qty-btn', function() {
        const action = $(this).data('action');
        const input = $(this).siblings('.qty-input');
        let currentValue = parseInt(input.val());
        
        if (action === 'increase' && currentValue < 15) {
            input.val(currentValue + 1);
            updateCartItemQuantity($(this), currentValue + 1);
        } else if (action === 'decrease' && currentValue > 1) {
            input.val(currentValue - 1);
            updateCartItemQuantity($(this), currentValue - 1);
        }
    });
    
    // FIX: Pass $(this) to the update function
    $(document).on('change', '.qty-input', function() {
        let newQuantity = parseInt($(this).val());
        
        if (isNaN(newQuantity) || newQuantity < 1) newQuantity = 1;
        else if (newQuantity > 15) newQuantity = 15;
        
        $(this).val(newQuantity);
        updateCartItemQuantity($(this), newQuantity);
    });
    
    // FIX: Pass $(this) to the remove function
    $(document).on('click', '.remove-item', function() {
        if (confirm('¿Eliminar este producto?')) {
            removeFromCart($(this));
        }
    });
    
    $(document).on('click', '#checkout-btn', function() {
        const items = [];
        let subtotal = 0;
        
        $('.cart-item').each(function() {
            const $item = $(this);
            const name = $item.find('.item-name').text().trim();
            const size = $item.find('.item-options').text().match(/Talla: ([^,]+)/)?.[1] || '';
            const color = $item.find('.item-options').text().match(/Color: (.+)/)?.[1] || '';
            const quantity = parseInt($item.find('.qty-input').val());
            const price = parseFloat($item.find('.item-price').text().replace('Q', '').trim());
            
            items.push({ name, size, color, quantity, price });
            subtotal += price * quantity;
        });
        
        // FIX: Use global variable
        const shipping = window.SHIPPING_COST;
        const total = subtotal + shipping;
        
        let orderDetails = '';
        items.forEach(item => {
            orderDetails += '• ' + item.name;
            if (item.size || item.color) {
                orderDetails += ' (';
                if (item.size) orderDetails += 'Talla: ' + item.size;
                if (item.size && item.color) orderDetails += ', ';
                if (item.color) orderDetails += 'Color: ' + item.color;
                orderDetails += ')';
            }
            orderDetails += ' - Cantidad: ' + item.quantity;
            orderDetails += ' - Q' + (item.price * item.quantity).toFixed(2);
            orderDetails += '%0A';
        });
        
        const message = 
            'Hola, quiero hacer este pedido:%0A%0A' + 
            orderDetails + '%0A' +
            'Subtotal: Q' + subtotal.toFixed(2) + '%0A' +
            'Envío: Q' + shipping.toFixed(2) + '%0A' +
            'Total: Q' + total.toFixed(2) + '%0A%0A' +
            '¡Gracias!';
        
        // FIX: Use global variable
        window.open('https://wa.me/' + window.WHATSAPP_NUMBER + '?text=' + message, '_blank');
    });
});

// ========================================
// LOCALSTORAGE
// ========================================
function getLocalCart() {
    try {
        const cart = localStorage.getItem('guest_cart');
        return cart ? JSON.parse(cart) : [];
    } catch (e) {
        console.error('Error leyendo localStorage:', e);
        return [];
    }
}

function saveLocalCart(cart) {
    try {
        localStorage.setItem('guest_cart', JSON.stringify(cart));
    } catch (e) {
        console.error('Error guardando localStorage:', e);
    }
}

function clearLocalCart() {
    try {
        localStorage.removeItem('guest_cart');
    } catch (e) {
        console.error('Error limpiando localStorage:', e);
    }
}

// FIX: Replaced broken DOM-check with reliable global variable
function isUserLoggedIn() {
    return window.IS_USER_LOGGED_IN === true;
}

// ========================================
// SINCRONIZACIÓN
// ========================================
function syncCartOnLoad() {
    if (!isUserLoggedIn()) return;
    
    const localCart = getLocalCart();
    if (localCart.length === 0) return;
    
    console.log('🔄 Migrando', localCart.length, 'items a BD...');
    
    $.ajax({
        url: '/cart/sync-from-local',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ items: localCart }),
        success: function(response) {
            if (response.success) {
                console.log('✅', response.message);
                clearLocalCart();
                updateCartCount();
                // Reload to show the server-rendered cart
                if (window.location.pathname.includes('/cart')) {
                    window.location.reload();
                }
            }
        },
        error: function(xhr) {
            console.error('Error migrando carrito:', xhr.responseJSON?.message);
        }
    });
}

// ========================================
// AGREGAR
// ========================================
function addToCart(productId, quantity = 1, size = '', color = '', $btn) {
    if (isUserLoggedIn()) {
        $.ajax({
            url: '/cart/add',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ product_id: productId, quantity, size, color }),
            success: function(response) {
                if (response.success) {
                    updateCartCount();
                    animateCartIcon();
                } else {
                    showMessage(response.message || 'Error al agregar producto', 'error');
                    if ($btn) $btn.prop('disabled', false).text('Agregar al Carrito');
                }
            },
            error: function(xhr) {
                showMessage(xhr.responseJSON?.message || 'Error al agregar producto', 'error');
                if ($btn) $btn.prop('disabled', false).text('Agregar al Carrito');
            }
        });
    } else {
        const cart = getLocalCart();
        const existingIndex = cart.findIndex(item => 
            item.product_id === productId && item.size === size && item.color === color
        );
        
        if (existingIndex !== -1) {
            cart[existingIndex].quantity = Math.min(cart[existingIndex].quantity + quantity, 15);
        } else {
            if (cart.length >= 50) {
                showMessage('Límite de 50 productos alcanzado', 'error');
                return;
            }
            cart.push({
                product_id: productId,
                quantity: quantity,
                size: size,
                color: color,
                added_at: new Date().toISOString()
            });
        }
        
        saveLocalCart(cart);
        updateCartCount();
        animateCartIcon();
    }
}

// ========================================
// ACTUALIZAR
// ========================================
// FIX: Refactored function to accept the element, not just an ID
function updateCartItemQuantity($element, quantity) {
    const $cartItem = $element.closest('.cart-item');

    if (isUserLoggedIn()) {
        const itemId = $cartItem.data('item-id'); // This is the DB ID
        $.ajax({
            url: `/cart/update/${itemId}`,
            method: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify({ quantity }),
            success: function(response) {
                if (response.success) {
                    const price = parseFloat($cartItem.find('.item-price').text().replace('Q', '').trim());
                    const totalPrice = (price * quantity).toFixed(2);
                    // FIX: Use global variable
                    const totalUSD = (totalPrice * window.USD_CONVERSION_RATE).toFixed(2);
                    
                    $cartItem.find('.total-price').html(`
                        Q${totalPrice}
                        <small class="usd-conversion">≈ $${totalUSD} USD</small>
                    `);
                    
                    updateOrderSummary();
                    updateCartCount();
                }
            },
            error: function(xhr) {
                showMessage(xhr.responseJSON?.message || 'Error al actualizar cantidad', 'error');
            }
        });
    } else {
        // FIX: Use full key (product_id, size, color) for local cart
        const productId = $cartItem.data('item-id'); // This is product_id
        const size = $cartItem.data('size');
        const color = $cartItem.data('color');
        const cart = getLocalCart();
        
        const index = cart.findIndex(item => 
            item.product_id == productId && 
            item.size == size && 
            item.color == color
        );
        
        if (index !== -1) {
            cart[index].quantity = quantity;
            saveLocalCart(cart);
            
            const price = parseFloat($cartItem.find('.item-price').text().replace('Q', '').trim());
            const totalPrice = (price * quantity).toFixed(2);
            // FIX: Use global variable
            const totalUSD = (totalPrice * window.USD_CONVERSION_RATE).toFixed(2);
            
            $cartItem.find('.total-price').html(`
                Q${totalPrice}
                <small class="usd-conversion">≈ $${totalUSD} USD</small>
            `);
            
            updateOrderSummary();
            updateCartCount();
        }
    }
}

// ========================================
// ELIMINAR
// ========================================
// FIX: Refactored function to accept the element
function removeFromCart($element) {
    const $cartItem = $element.closest('.cart-item');

    if (isUserLoggedIn()) {
        const itemId = $cartItem.data('item-id'); // This is the DB ID
        $.ajax({
            url: `/cart/remove/${itemId}`,
            method: 'DELETE',
            success: function(response) {
                if (response.success) {
                    $cartItem.fadeOut(400, function() {
                        $(this).remove();
                        if ($('.cart-item').length === 0) {
                            showEmptyCart();
                        } else {
                            updateOrderSummary();
                        }
                        updateCartCount(); // Update count *after* summary
                    });
                }
            },
            error: function(xhr) {
                showMessage(xhr.responseJSON?.message || 'Error al eliminar', 'error');
            }
        });
    } else {
        // FIX: Use full key (product_id, size, color) for local cart
        const productId = $cartItem.data('item-id'); // This is product_id
        const size = $cartItem.data('size');
        const color = $cartItem.data('color');
        const cart = getLocalCart();
        
        const newCart = cart.filter(item => 
            !(item.product_id == productId && item.size == size && item.color == color)
        );
        saveLocalCart(newCart);
        
        $cartItem.fadeOut(400, function() {
            $(this).remove();
            if ($('.cart-item').length === 0) {
                showEmptyCart();
            } else {
                updateOrderSummary();
            }
            updateCartCount(); // Update count *after* summary
        });
    }
}

// ========================================
// CONTADOR
// ========================================
function updateCartCount() {
    if (isUserLoggedIn()) {
        $.ajax({
            url: '/cart/count',
            method: 'GET',
            success: function(response) {
                if (response.success) {
                    const count = response.count;
                    const $counter = $('.cart-count, #cart-count');
                    $counter.text(count);
                    $counter.css('opacity', count > 0 ? '1' : '0').css('transform', count > 0 ? 'scale(1)' : 'scale(0.8)');
                }
            }
        });
    } else {
        const cart = getLocalCart();
        const count = cart.reduce((sum, item) => sum + item.quantity, 0);
        const $counter = $('.cart-count, #cart-count');
        
        console.log('📊 Contador:', count);
        $counter.text(count);
        $counter.css('opacity', count > 0 ? '1' : '0').css('transform', count > 0 ? 'scale(1)' : 'scale(0.8)');
    }
}

// ========================================
// HELPERS VISUALES
// ========================================
function showEmptyCart() {
    $('#cart-with-items').fadeOut(300, function() {
        $('#empty-cart').fadeIn(400);
    });
    $('.cart-count, #cart-count').text('0').css('opacity', '0');
}

function updateOrderSummary() {
    let subtotal = 0;
    
    $('.cart-item').each(function() {
        const totalText = $(this).find('.total-price').text().split('≈')[0].trim();
        const totalPrice = parseFloat(totalText.replace('Q', '').trim());
        if (!isNaN(totalPrice)) subtotal += totalPrice;
    });
    
    // FIX: Use global variables
    const shipping = subtotal > 0 ? window.SHIPPING_COST : 0;
    const total = subtotal + shipping;
    const subtotalUSD = (subtotal * window.USD_CONVERSION_RATE).toFixed(2);
    const shippingUSD = (shipping * window.USD_CONVERSION_RATE).toFixed(2);
    const totalUSD = (total * window.USD_CONVERSION_RATE).toFixed(2);
    
    $('#subtotal').html(`Q${subtotal.toFixed(2)} <small class="usd-conversion">≈ $${subtotalUSD} USD</small>`);
    $('#shipping').html(shipping > 0 ? `Q${shipping.toFixed(2)} <small class="usd-conversion">≈ $${shippingUSD} USD</small>` : 'Gratis');
    $('#total').html(`Q${total.toFixed(2)} <small class="usd-conversion">≈ $${totalUSD} USD</small>`);
}

function animateCartIcon() {
    const $cartIcon = $('.cart-icon, #cart-icon');
    $cartIcon.addClass('cart-bounce');
    setTimeout(() => $cartIcon.removeClass('cart-bounce'), 600);
}

function showMessage(message, type = 'error') {
    $('.cart-message').remove();
    
    const $message = $(`
        <div class="cart-message ${type}">
            <i class="fa-solid fa-circle-exclamation message-icon"></i>
            <span class="message-text">${message}</span>
        </div>
    `);
    
    $('body').append($message);
    setTimeout(() => $message.addClass('show'), 10);
    setTimeout(() => {
        $message.removeClass('show');
        setTimeout(() => $message.remove(), 300);
    }, 4000);
}

// ========================================
// CARGAR CARRITO LOCAL (INVITADOS)
// ========================================
function loadLocalCartToPage() {
    if (isUserLoggedIn()) return;
    if (!window.location.pathname.includes('/cart')) return;
    
    const cart = getLocalCart();
    console.log('📦 Carrito a cargar:', cart);
    
    if (cart.length === 0) {
        $('#cart-with-items').hide();
        $('#empty-cart').show();
        return;
    }
    
    const productIds = cart.map(item => item.product_id);
    console.log('🔎 Consultando productos:', productIds);
    
    $.ajax({
        url: '/product/batch',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ ids: productIds }),
        success: function(products) {
            console.log('✅ Productos recibidos:', products);
            
            if (!Array.isArray(products) || products.length === 0) {
                console.error('⚠️ No se recibieron productos');
                $('#cart-with-items').hide();
                $('#empty-cart').show();
                return;
            }
            
            let html = '';
            
            cart.forEach(item => {
                const product = products.find(p => p.product_id === item.product_id);
                if (!product) {
                    console.warn('⚠️ Producto no encontrado:', item.product_id);
                    return;
                }
                
                const price = parseFloat(product.price);
                const totalPrice = (price * item.quantity).toFixed(2);
                // FIX: Use global variable
                const totalUSD = (totalPrice * window.USD_CONVERSION_RATE).toFixed(2);
                
                // FIX: Added data-size and data-color for guest cart logic
                html += `
                    <div class="cart-item" 
                         data-item-id="${item.product_id}" 
                         data-size="${item.size || ''}" 
                         data-color="${item.color || ''}">
                        <div class="item-image">
                            ${product.image_url 
                                ? `<img src="${product.image_url}" alt="${product.product_name}">`
                                : `<div class="image-placeholder"><i class="fa-solid fa-image"></i></div>`
                            }
                        </div>
                        <div class="item-details">
                            <h3 class="item-name">${product.product_name}</h3>
                            ${product.category_name ? `<p class="item-category">${product.category_name}</p>` : ''}
                            ${item.size || item.color ? `<p class="item-options">${item.size ? 'Talla: ' + item.size : ''}${item.size && item.color ? ', ' : ''}${item.color ? 'Color: ' + item.color : ''}</p>` : ''}
                            <p class="item-price">Q${price.toFixed(2)}</p>
                        </div>
                        <div class="item-quantity">
                            <button class="qty-btn" data-action="decrease">−</button>
                            <input type="number" class="qty-input" value="${item.quantity}" min="1" max="15">
                            <button class="qty-btn" data-action="increase">+</button>
                        </div>
                        <div class="item-total">
                            <span class="total-price">
                                Q${totalPrice}
                                <small class="usd-conversion">≈ $${totalUSD} USD</small>
                            </span>
                            <button class="remove-item" title="Eliminar">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
            
            $('.cart-items').html(html);
            $('#cart-with-items').show();
            $('#empty-cart').hide();
            updateOrderSummary();
        },
        error: function(xhr, status, error) {
            console.error('❌ Error cargando productos:', error);
            console.error('Response:', xhr.responseText);
            $('#cart-with-items').hide();
            $('#empty-cart').show();
        }
    });
}