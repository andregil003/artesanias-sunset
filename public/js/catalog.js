// public/js/catalog.js
$(document).ready(function() {
    // Modal de filtros
    $('#filter-trigger').on('click', function() {
        $('#filter-modal-overlay').addClass('active');
        $('body').addClass('modal-open');
    });
    
    function closeFilterModal() {
        $('#filter-modal-overlay').removeClass('active');
        $('body').removeClass('modal-open');
    }
    
    $('#filter-close, #filter-modal-overlay').on('click', function(e) {
        if (e.target === this) closeFilterModal();
    });
    
    $('#filter-modal').on('click', function(e) {
        e.stopPropagation();
    });
    
    $(document).on('keydown', function(e) {
        if (e.key === 'Escape' && $('#filter-modal-overlay').hasClass('active')) {
            closeFilterModal();
        }
    });
    
    // Slider de precio
    const minSlider = document.getElementById('min-price-slider');
    const maxSlider = document.getElementById('max-price-slider');
    const minDisplay = document.getElementById('min-price-display');
    const maxDisplay = document.getElementById('max-price-display');
    const sliderRange = document.getElementById('slider-range');
    
    if (minSlider && maxSlider) {
        function updateSlider() {
            let minVal = parseInt(minSlider.value);
            let maxVal = parseInt(maxSlider.value);
            
            // Evitar cruce
            if (minVal > maxVal - 100) {
                minVal = maxVal - 100;
                minSlider.value = minVal;
            }
            
            if (maxVal < minVal + 100) {
                maxVal = minVal + 100;
                maxSlider.value = maxVal;
            }
            
            // Actualizar displays
            minDisplay.textContent = minVal;
            maxDisplay.textContent = maxVal;
            
            // Barra visual
            const minPercent = (minVal / 3000) * 100;
            const maxPercent = (maxVal / 3000) * 100;
            
            sliderRange.style.left = minPercent + '%';
            sliderRange.style.width = (maxPercent - minPercent) + '%';
        }
        
        minSlider.addEventListener('input', updateSlider);
        maxSlider.addEventListener('input', updateSlider);
        updateSlider();
    }
});