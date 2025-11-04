// public/js/admin-products.js
$(document).ready(function() {
    $('.btn-action.delete').on('click', handleDelete);
    $('.filter-select').on('change', function() {
        $(this).closest('form').submit();
    });
    showUrlMessages();
});

function handleDelete(e) {
    const $btn = $(this);
    const productId = $btn.data('id');
    const $row = $btn.closest('tr');
    const productName = $row.find('.product-name').text().trim();
    
    if (!confirm(`¿Desactivar "${productName}"?\n\nSe marcará como inactivo.`)) return;
    
    $btn.prop('disabled', true).css('opacity', '0.5');
    
    $.ajax({
        url: `/admin/products/${productId}`,
        method: 'DELETE',
        success: function(response) {
            if (response.success) {
                $row.fadeOut(400, function() {
                    $(this).remove();
                    if ($('.products-table tbody tr:visible').length === 0) {
                        setTimeout(() => window.location.reload(), 1000);
                    }
                });
                showToast('Producto desactivado correctamente', 'success');
            } else {
                showToast(response.message || 'Error al desactivar', 'error');
                $btn.prop('disabled', false).css('opacity', '1');
            }
        },
        error: function(xhr) {
            showToast(xhr.responseJSON?.message || 'Error al desactivar producto', 'error');
            $btn.prop('disabled', false).css('opacity', '1');
        }
    });
}

function showUrlMessages() {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    
    const messages = {
        'created': '✅ Producto creado exitosamente',
        'updated': '✅ Producto actualizado exitosamente',
        'deleted': '✅ Producto desactivado'
    };
    
    if (messages[success]) {
        showToast(messages[success], 'success');
        window.history.replaceState({}, '', '/admin/products');
    }
}