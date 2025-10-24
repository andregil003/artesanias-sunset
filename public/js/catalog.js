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
    const minSlider = $('#min-price-slider')[0];
    const maxSlider = $('#max-price-slider')[0];
    const minDisplay = $('#min-price-display');
    const maxDisplay = $('#max-price-display');
    const sliderRange = $('#slider-range');
    
    if (minSlider && maxSlider) {
        function updateSlider() {
            let minVal = parseInt(minSlider.value);
            let maxVal = parseInt(maxSlider.value);
            
            if (minVal > maxVal - 100) {
                minVal = maxVal - 100;
                minSlider.value = minVal;
            }
            
            if (maxVal < minVal + 100) {
                maxVal = minVal + 100;
                maxSlider.value = maxVal;
            }
            
            minDisplay.text(minVal);
            maxDisplay.text(maxVal);
            
            const minPercent = (minVal / 3000) * 100;
            const maxPercent = (maxVal / 3000) * 100;
            
            sliderRange.css({
                left: minPercent + '%',
                width: (maxPercent - minPercent) + '%'
            });
        }
        
        $(minSlider).on('input', updateSlider);
        $(maxSlider).on('input', updateSlider);
        updateSlider();
    }
});