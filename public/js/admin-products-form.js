// public/js/admin-products-form.js
let cropperInstance = null;
let typingTimer = null;
const TYPING_DELAY = 500;

$(document).ready(function() {
    const $form = $('#product-form');
    const isEdit = window.location.pathname.includes('/edit');
    
    $form.on('submit', function(e) {
        e.preventDefault();
        isEdit ? updateProduct() : createProduct();
    });
    
    $('#temp_image_url').on('input', function() {
        clearTimeout(typingTimer);
        const url = $(this).val().trim();
        
        if (!url) {
            clearImagePreview();
            return;
        }
        
        typingTimer = setTimeout(() => {
            if (isValidImageUrl(url)) loadImagePreview(url);
            else clearImagePreview();
        }, TYPING_DELAY);
    });
    
    $('#btn-edit-image').on('click', function() {
        const url = $('#image_url').val();
        if (url) openEditor(url);
    });
    
    $('#btn-remove-image').on('click', function() {
        if (confirm('¿Eliminar imagen del producto?')) {
            clearImagePreview();
            $('#temp_image_url').val('');
        }
    });
    
    $('.modal-close, #btn-cancel-crop').on('click', closeEditor);
    
    $('#image-editor-modal').on('click', function(e) {
        if ($(e.target).is('#image-editor-modal')) closeEditor();
    });
    
    $('#btn-apply-crop').on('click', applyCrop);
    
    $('.btn-control').on('click', function() {
        if (!cropperInstance) return;
        executeEditorAction($(this).data('action'));
    });
    
    $('.btn-ratio').on('click', function() {
        if (!cropperInstance) return;
        
        const ratio = parseFloat($(this).data('ratio'));
        cropperInstance.setAspectRatio(ratio);
        
        $('.btn-ratio').removeClass('active');
        $(this).addClass('active');
    });
});

function isValidImageUrl(url) {
    if (!url) return false;
    
    try {
        new URL(url);
    } catch {
        return false;
    }
    
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const urlLower = url.toLowerCase();
    
    return validExtensions.some(ext => urlLower.includes(ext));
}

function loadImagePreview(url) {
    const img = new Image();
    
    img.onload = function() {
        $('#image_url').val(url);
        $('#current-image').attr('src', url);
        $('#current-preview-container').fadeIn(300);
    };
    
    img.onerror = clearImagePreview;
    img.src = url;
}

function clearImagePreview() {
    $('#image_url').val('');
    $('#current-image').attr('src', '');
    $('#current-preview-container').fadeOut(300);
}

function openEditor(url) {
    $('#image-editor-modal').addClass('active');
    
    const $img = $('#crop-image');
    $img.attr('src', url);
    
    if (cropperInstance) {
        cropperInstance.destroy();
        cropperInstance = null;
    }
    
    $img.on('load', function() {
        cropperInstance = new Cropper($img[0], {
            aspectRatio: 1,
            viewMode: 2,
            autoCropArea: 1,
            responsive: true,
            ready: updatePreviews,
            crop: updatePreviews
        });
    });
}

function closeEditor() {
    $('#image-editor-modal').removeClass('active');
    
    if (cropperInstance) {
        cropperInstance.destroy();
        cropperInstance = null;
    }
    
    $('#crop-image').attr('src', '');
}

function applyCrop() {
    if (!cropperInstance) return;
    
    const canvas = cropperInstance.getCroppedCanvas({
        width: 800,
        height: 800,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
    });
    
    if (canvas) {
        const base64 = canvas.toDataURL('image/jpeg', 0.85);
        
        $('#image_url').val(base64);
        $('#current-image').attr('src', base64);
        $('#temp_image_url').val('');
        
        closeEditor();
        showToast('Imagen editada correctamente (800x800px)', 'success');
    }
}

function updatePreviews() {
    if (!cropperInstance) return;
    
    const canvas = cropperInstance.getCroppedCanvas({
        width: 600,
        height: 600,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
    });
    
    if (canvas) {
        const url = canvas.toDataURL('image/jpeg', 0.85);
        $('#preview-mobile, #preview-desktop').attr('src', url);
    }
}

function executeEditorAction(action) {
    if (!cropperInstance) return;
    
    const actions = {
        'rotate-left': () => cropperInstance.rotate(-90),
        'rotate-right': () => cropperInstance.rotate(90),
        'flip-horizontal': () => cropperInstance.scaleX(-cropperInstance.getData().scaleX || -1),
        'flip-vertical': () => cropperInstance.scaleY(-cropperInstance.getData().scaleY || -1),
        'zoom-in': () => cropperInstance.zoom(0.1),
        'zoom-out': () => cropperInstance.zoom(-0.1),
        'reset': () => cropperInstance.reset()
    };
    
    if (actions[action]) actions[action]();
}

function createProduct() {
    const $form = $('#product-form');
    disableForm($form);
    
    $.ajax({
        url: '/admin/products',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(getFormData()),
        success: () => window.location.href = '/admin/products?success=created',
        error: function(xhr) {
            enableForm($form);
            showToast(xhr.responseJSON?.message || 'Error al crear producto', 'error');
        }
    });
}

function updateProduct() {
    const $form = $('#product-form');
    const productId = window.location.pathname.match(/\/admin\/products\/(\d+)/)[1];
    
    disableForm($form);
    
    $.ajax({
        url: `/admin/products/${productId}`,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(getFormData()),
        success: () => window.location.href = '/admin/products?success=updated',
        error: function(xhr) {
            enableForm($form);
            showToast(xhr.responseJSON?.message || 'Error al actualizar producto', 'error');
        }
    });
}

function getFormData() {
    return {
        product_name: $('#product_name').val().trim(),
        description: $('#description').val().trim(),
        price: parseFloat($('#price').val()),
        stock: parseInt($('#stock').val()) || 0,
        category_id: parseInt($('#category_id').val()),
        is_active: $('#is_active').is(':checked'),
        image_url: $('#image_url').val()
    };
}

function disableForm($form) {
    $form.addClass('loading');
    $form.find('input, select, textarea, button').prop('disabled', true);
}

function enableForm($form) {
    $form.removeClass('loading');
    $form.find('input, select, textarea, button').prop('disabled', false);
}

function showToast(message, type = 'success') {
    $('.admin-toast').remove();
    
    const icon = type === 'success' ? '✅' : '❌';
    const toastClass = type === 'success' ? 'toast-success' : 'toast-error';
    
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