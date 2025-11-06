// public/js/admin-products-form.js
let cropperInstance = null;
let typingTimer = null;
const TYPING_DELAY = 500;

$(document).ready(function() {
    const $form = $('#product-form');
    const isEdit = window.location.pathname.includes('/edit');
    
    // Envío del formulario
    $form.on('submit', function(e) {
        e.preventDefault();
        isEdit ? updateProduct() : createProduct();
    });
    
    // Detección de URL de imagen
    $('#temp_image_url').on('input', function() {
        clearTimeout(typingTimer);
        const url = $(this).val().trim();
        
        if (!url) {
            clearImagePreview();
            return;
        }
        
        typingTimer = setTimeout(() => {
            loadImagePreview(url);
        }, TYPING_DELAY);
    });
    
    // Botón editar imagen
    $('#btn-edit-image').on('click', function() {
        const url = $('#image_url').val();
        if (url) openEditor(url);
    });
    
    // Botón eliminar imagen
    $('#btn-remove-image').on('click', function() {
        if (confirm('¿Eliminar imagen del producto?')) {
            clearImagePreview();
            $('#temp_image_url').val('');
        }
    });
    
    // Cerrar modal
    $('.modal-close, #btn-cancel-crop').on('click', closeEditor);
    
    // Cerrar modal al hacer clic fuera
    $('#image-editor-modal').on('click', function(e) {
        if ($(e.target).is('#image-editor-modal')) {
            closeEditor();
        }
    });
    
    // Aplicar recorte
    $('#btn-apply-crop').on('click', applyCrop);
    
    // Controles del editor
    $('.btn-control').on('click', function() {
        if (!cropperInstance) return;
        executeEditorAction($(this).data('action'));
    });
    
    // Cambiar proporción de aspecto
    $('.btn-ratio').on('click', function() {
        if (!cropperInstance) return;
        
        const $btn = $(this);
        const ratio = parseFloat($btn.data('ratio'));
        
        try {
            cropperInstance.setAspectRatio(ratio || NaN);
            $('.btn-ratio').removeClass('active');
            $btn.addClass('active');
        } catch (e) {
            console.error('Error al cambiar ratio:', e);
        }
    });
});

// Cargar preview de imagen
function loadImagePreview(url) {
    if (!url) return;
    
    // Mostrar loading
    showToast('Cargando imagen...', 'info');
    
    // Intentar cargar directamente
    const img = new Image();
    
    img.onload = function() {
        $('.admin-toast').remove();
        
        // Convertir a base64 si es necesario
        if (url.startsWith('http://') || url.startsWith('https://')) {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            try {
                const base64 = canvas.toDataURL('image/jpeg', 0.9);
                $('#image_url').val(base64);
                $('#current-image').attr('src', base64);
            } catch (e) {
                // Si falla CORS, usar URL directa
                $('#image_url').val(url);
                $('#current-image').attr('src', url);
            }
        } else {
            $('#image_url').val(url);
            $('#current-image').attr('src', url);
        }
        
        $('#current-preview-container').fadeIn(300);
    };
    
    img.onerror = function() {
        $('.admin-toast').remove();
        showToast('No se pudo cargar la imagen. Verifica la URL.', 'error');
        clearImagePreview();
    };
    
    img.crossOrigin = 'anonymous';
    img.src = url;
}

// Limpiar preview
function clearImagePreview() {
    $('#image_url').val('');
    $('#current-image').attr('src', '');
    $('#current-preview-container').fadeOut(300);
}

// Abrir editor de imágenes
function openEditor(url) {
    const $modal = $('#image-editor-modal');
    const $img = $('#crop-image');
    
    // Destruir instancia previa
    destroyCropper();
    
    // Limpiar estado
    $img.off('load error').attr('src', '');
    
    // Mostrar modal
    $modal.addClass('active');
    $('body').css('overflow', 'hidden');
    
    // Configurar carga de imagen
    const loadHandler = function() {
        $img.off('load error');
        
        setTimeout(() => {
            try {
                // Verificar que no exista instancia
                if (cropperInstance) {
                    destroyCropper();
                }
                
                // Crear cropper
                cropperInstance = new Cropper($img[0], {
                    aspectRatio: 1,
                    viewMode: 2,
                    autoCropArea: 1,
                    responsive: true,
                    restore: false,
                    guides: true,
                    center: true,
                    highlight: true,
                    cropBoxMovable: true,
                    cropBoxResizable: true,
                    toggleDragModeOnDblclick: false,
                    minContainerWidth: 200,
                    minContainerHeight: 200,
                    checkCrossOrigin: false,
                    ready: function() {
                        updatePreviews();
                    },
                    crop: function() {
                        updatePreviews();
                    }
                });
            } catch (error) {
                console.error('Error al inicializar Cropper:', error);
                showToast('Error al cargar el editor de imágenes', 'error');
                closeEditor();
            }
        }, 100);
    };
    
    const errorHandler = function() {
        $img.off('load error');
        showToast('No se pudo cargar la imagen en el editor', 'error');
        closeEditor();
    };
    
    // Cargar imagen
    $img.one('load', loadHandler);
    $img.one('error', errorHandler);
    $img.attr('src', url);
}

// Destruir cropper completamente
function destroyCropper() {
    if (cropperInstance) {
        try {
            cropperInstance.destroy();
        } catch (e) {
            console.error('Error al destruir cropper:', e);
        }
        cropperInstance = null;
    }
}

// Cerrar editor
function closeEditor() {
    const $modal = $('#image-editor-modal');
    
    $modal.removeClass('active');
    $('body').css('overflow', '');
    
    setTimeout(() => {
        destroyCropper();
        
        const $img = $('#crop-image');
        $img.off('load error').attr('src', '');
        
        $('.btn-ratio').removeClass('active');
        $('.btn-ratio[data-ratio="1"]').addClass('active');
    }, 350);
}

// Aplicar recorte
function applyCrop() {
    if (!cropperInstance) {
        showToast('Error: Editor no inicializado', 'error');
        return;
    }
    
    try {
        const canvas = cropperInstance.getCroppedCanvas({
            width: 800,
            height: 800,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high'
        });
        
        if (!canvas) {
            showToast('Error al procesar la imagen', 'error');
            return;
        }
        
        const base64 = canvas.toDataURL('image/jpeg', 0.85);
        
        $('#image_url').val(base64);
        $('#current-image').attr('src', base64);
        $('#temp_image_url').val('');
        
        closeEditor();
        showToast('Imagen editada correctamente', 'success');
    } catch (error) {
        console.error('Error al aplicar recorte:', error);
        showToast('Error al procesar la imagen', 'error');
    }
}

// Actualizar previews
function updatePreviews() {
    if (!cropperInstance) return;
    
    try {
        const canvas = cropperInstance.getCroppedCanvas({
            width: 400,
            height: 400,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high'
        });
        
        if (canvas) {
            const url = canvas.toDataURL('image/jpeg', 0.85);
            $('#preview-mobile, #preview-desktop').attr('src', url);
        }
    } catch (error) {
        console.error('Error al actualizar previews:', error);
    }
}

// Ejecutar acciones del editor
function executeEditorAction(action) {
    if (!cropperInstance) return;
    
    try {
        const actions = {
            'rotate-left': () => cropperInstance.rotate(-90),
            'rotate-right': () => cropperInstance.rotate(90),
            'flip-horizontal': () => {
                const scaleX = cropperInstance.getData().scaleX || 1;
                cropperInstance.scaleX(-scaleX);
            },
            'flip-vertical': () => {
                const scaleY = cropperInstance.getData().scaleY || 1;
                cropperInstance.scaleY(-scaleY);
            },
            'zoom-in': () => cropperInstance.zoom(0.1),
            'zoom-out': () => cropperInstance.zoom(-0.1),
            'reset': () => cropperInstance.reset()
        };
        
        if (actions[action]) {
            actions[action]();
        }
    } catch (error) {
        console.error('Error al ejecutar acción:', error);
    }
}

// Crear producto
function createProduct() {
    const $form = $('#product-form');
    disableForm($form);
    
    $.ajax({
        url: '/admin/products',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(getFormData()),
        success: function() {
            window.location.href = '/admin/products?success=created';
        },
        error: function(xhr) {
            enableForm($form);
            showToast(xhr.responseJSON?.message || 'Error al crear producto', 'error');
        }
    });
}

// Actualizar producto
function updateProduct() {
    const $form = $('#product-form');
    const productId = window.location.pathname.match(/\/admin\/products\/(\d+)/)[1];
    
    disableForm($form);
    
    $.ajax({
        url: `/admin/products/${productId}`,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(getFormData()),
        success: function() {
            window.location.href = '/admin/products?success=updated';
        },
        error: function(xhr) {
            enableForm($form);
            showToast(xhr.responseJSON?.message || 'Error al actualizar producto', 'error');
        }
    });
}

// Obtener datos del formulario
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

// Deshabilitar formulario
function disableForm($form) {
    $form.addClass('loading');
    $form.find('input, select, textarea, button').prop('disabled', true);
}

// Habilitar formulario
function enableForm($form) {
    $form.removeClass('loading');
    $form.find('input, select, textarea, button').prop('disabled', false);
}

// Mostrar notificación
function showToast(message, type = 'success') {
    $('.admin-toast').remove();
    
    let icon = '✅';
    let toastClass = 'toast-success';
    
    if (type === 'error') {
        icon = '❌';
        toastClass = 'toast-error';
    } else if (type === 'info') {
        icon = 'ℹ️';
        toastClass = 'toast-info';
    }
    
    const $toast = $(`
        <div class="admin-toast ${toastClass}">
            <span class="toast-icon">${icon}</span>
            <span class="toast-message">${message}</span>
        </div>
    `);
    
    $('body').append($toast);
    setTimeout(() => $toast.addClass('show'), 10);
    
    if (type !== 'info') {
        setTimeout(() => {
            $toast.removeClass('show');
            setTimeout(() => $toast.remove(), 300);
        }, 3000);
    }
}

// Redimensionar cropper en cambios de orientación
$(window).on('resize orientationchange', function() {
    if (cropperInstance) {
        try {
            cropperInstance.resize();
        } catch (e) {
            console.error('Error al redimensionar cropper:', e);
        }
    }
});