document.addEventListener('DOMContentLoaded', () => {
    
    // --- VARIABLES Y SELECTORES ---
    let cart = [];
    let productCatalog = []; 

    const productsCards = document.querySelectorAll('.product-card');
    const cartModal = document.getElementById('carrito-modal');
    const cartBody = document.getElementById('cart-body');
    const cartCountSpan = document.getElementById('cart-count');
    
    // Elementos del resumen
    const baseTotalElement = document.getElementById('cart-total-base');
    const totalIVAElement = document.getElementById('cart-total-iva');
    const totalPriceElement = document.getElementById('cart-total-price');

    // Botones
    const btnToggleCart = document.getElementById('btn-toggle-cart');
    const btnCloseCart = document.getElementById('btn-close-cart');
    const btnCleanCart = document.getElementById('btn-clean-cart');

    // Formulario Manual
    const manualQty = document.getElementById('manual-qty');
    const manualProdSelect = document.getElementById('manual-product-select');
    const manualSizeSelect = document.getElementById('manual-size-select');
    const btnManualAdd = document.getElementById('btn-manual-add');

    // --- 1. INICIALIZACIÓN: ESCANEAR PRODUCTOS Y OFERTAS ---
    function initCatalog() {
        productsCards.forEach(card => {
            const selectElement = card.querySelector('.size-selector');
            
            // BUSCAR OFERTA: Leemos el texto de la etiqueta .oferta (ej: "-20%", "2x1", "-20€")
            const offerTag = card.querySelector('.oferta');
            const offerText = offerTag ? offerTag.innerText.trim() : null;

            let availableSizes = [];
            if (selectElement) {
                availableSizes = Array.from(selectElement.options)
                    .filter(option => !option.disabled && option.value !== "")
                    .map(option => option.value);
            }

            productCatalog.push({
                id: card.dataset.id,
                nombre: card.dataset.nombre,
                precio: parseFloat(card.dataset.precio), // Este es el PVP Original
                iva: parseFloat(card.dataset.iva),
                offer: offerText, // Guardamos la oferta
                hasSizeSelector: !!selectElement,
                availableSizes: availableSizes
            });
        });

        populateManualForm();
    }

    function populateManualForm() {
        productCatalog.forEach((prod, index) => {
            const option = document.createElement('option');
            option.value = index;
            // Mostramos si tiene oferta en el selector también
            const offerLabel = prod.offer ? ` (${prod.offer})` : '';
            option.textContent = `${prod.nombre}${offerLabel}`;
            manualProdSelect.appendChild(option);
        });
    }

    // --- 2. LÓGICA DE CÁLCULO DE PRECIOS CON OFERTAS ---

    /**
     * Calcula el precio unitario efectivo y el subtotal de la línea
     * basándose en las reglas de descuento (2x1, %, -€).
     */
    function calculateLinePrice(item) {
        let originalPrice = item.precio;
        let effectiveUnitPrice = originalPrice;
        let lineSubtotal = 0;
        let isDiscounted = false;

        // Limpiar texto de oferta para análisis (quitar espacios)
        const offer = item.offer ? item.offer.toUpperCase().replace(/\s/g, '') : '';

        if (offer === '2X1') {
            // Lógica 2x1: Se pagan la mitad de items (redondeando hacia arriba)
            // Ej: 2 items -> Paga 1. | 3 items -> Paga 2.
            const payableUnits = Math.ceil(item.cantidad / 2);
            lineSubtotal = payableUnits * originalPrice;
            
            // El precio unitario "real" varía según cuantos compres, 
            // pero para la tabla mantenemos el original y marcamos la oferta en el subtotal.
            isDiscounted = true; 
            
        } else if (offer.includes('%')) {
            // Descuento Porcentual (ej: -50%)
            const percent = parseFloat(offer.replace('-', '').replace('%', ''));
            effectiveUnitPrice = originalPrice * (1 - (percent / 100));
            lineSubtotal = effectiveUnitPrice * item.cantidad;
            isDiscounted = true;

        } else if (offer.includes('€')) {
            // Descuento Fijo (ej: -20€)
            const discountAmount = parseFloat(offer.replace('-', '').replace('€', ''));
            effectiveUnitPrice = Math.max(0, originalPrice - discountAmount);
            lineSubtotal = effectiveUnitPrice * item.cantidad;
            isDiscounted = true;

        } else {
            // Sin oferta
            lineSubtotal = originalPrice * item.cantidad;
        }

        return {
            originalUnitPrice: originalPrice,
            effectiveUnitPrice: effectiveUnitPrice,
            lineSubtotal: lineSubtotal,
            isDiscounted: isDiscounted,
            offerType: offer // Devolvemos tipo para saber si es 2x1
        };
    }

    // --- 3. GESTIÓN DEL CARRITO ---

    function addToCart(productData, extraQty = 1) {
        if (productData.hasSizeSelector && !productData.talla) {
            alert("Por favor, selecciona una talla válida.");
            return;
        }

        const uniqueId = productData.talla ? `${productData.id}-${productData.talla}` : productData.id;
        const existingItem = cart.find(item => item.uniqueId === uniqueId);

        if (existingItem) {
            existingItem.cantidad += parseInt(extraQty);
        } else {
            cart.push({
                ...productData, // Copiamos todos los datos (incluyendo .offer)
                uniqueId: uniqueId,
                talla: productData.talla || 'Única',
                cantidad: parseInt(extraQty),
            });
        }

        updateCartUI();
        if (!cartModal.classList.contains('active')) {
            cartModal.classList.add('active');
        }
    }

    function updateCartUI() {
        cartBody.innerHTML = '';
        
        let grandTotal = 0;
        let totalBase = 0;
        let totalItems = 0;

        cart.forEach((item, index) => {
            // 1. OBTENER DATOS CALCULADOS DE LA OFERTA
            const calc = calculateLinePrice(item);
            
            // 2. DESGLOSAR BASE E IVA DESDE EL SUBTOTAL REAL (LO QUE PAGA EL USUARIO)
            // Subtotal Pagado = Base + IVA
            // Base = Subtotal / (1 + TasaIVA)
            const lineBaseAmount = calc.lineSubtotal / (1 + item.iva);
            
            // Acumuladores
            grandTotal += calc.lineSubtotal;
            totalBase += lineBaseAmount;
            totalItems += item.cantidad;

            // 3. GENERAR CELDAS HTML
            const row = document.createElement('tr');
            if (item.iva < 0.21) row.classList.add('row-iva-reducido');
            else row.classList.add('row-iva-general');

            // --- Generación Columna PRECIO (Unitario) ---
            let priceHTML = '';
            if (calc.isDiscounted && calc.offerType !== '2X1') {
                // Caso: Descuento de precio (-€ o -%)
                priceHTML = `
                    <span class="old-price-cart">${calc.originalUnitPrice.toFixed(2)}€</span>
                    <span class="new-price-cart">${calc.effectiveUnitPrice.toFixed(2)}€</span>
                `;
            } else if (calc.offerType === '2X1') {
                // Caso: 2x1 (El precio unitario es el mismo, pero indicamos la oferta)
                priceHTML = `
                    ${calc.originalUnitPrice.toFixed(2)}€ 
                    <span class="offer-badge">2x1</span>
                `;
            } else {
                // Caso: Normal
                priceHTML = `${calc.originalUnitPrice.toFixed(2)}€`;
            }

            // --- Generación Columna BASE (Derivada del precio efectivo unitario) ---
            // Para mostrar la base unitaria correcta en la tabla:
            let displayBaseUnit = 0;
            if (calc.offerType === '2X1') {
                // En 2x1 la base unitaria "visual" es la normal, el descuento es en cantidad
                displayBaseUnit = calc.originalUnitPrice / (1 + item.iva);
            } else {
                displayBaseUnit = calc.effectiveUnitPrice / (1 + item.iva);
            }

            // Select Talla
            let sizeCellHTML = '';
            if (item.hasSizeSelector && item.availableSizes.length > 0) {
                const options = item.availableSizes.map(size => 
                    `<option value="${size}" ${size === item.talla ? 'selected' : ''}>${size.toUpperCase()}</option>`
                ).join('');
                sizeCellHTML = `<select class="cart-size-select" data-index="${index}">${options}</select>`;
            } else {
                sizeCellHTML = item.talla.toUpperCase();
            }

            row.innerHTML = `
                <td><button class="btn-remove-item" data-index="${index}">❌</button></td>
                <td><input type="number" class="cart-qty-input" min="1" value="${item.cantidad}" data-index="${index}"></td>
                <td>${item.nombre}</td>
                <td>${sizeCellHTML}</td>
                
                <td class="text-muted-small">${displayBaseUnit.toFixed(2)}€</td>
                
                <td class="text-muted-small">${(item.iva * 100).toFixed(0)}%</td>
                
                <td>${priceHTML}</td>
                
                <td style="font-weight:bold; color:var(--primary-color);">${calc.lineSubtotal.toFixed(2)}€</td>
            `;
            cartBody.appendChild(row);
        });

        // Totales Finales
        const totalIVA = grandTotal - totalBase;

        cartCountSpan.textContent = totalItems;
        if (baseTotalElement) baseTotalElement.textContent = totalBase.toFixed(2) + '€';
        totalIVAElement.textContent = totalIVA.toFixed(2) + '€';
        totalPriceElement.textContent = grandTotal.toFixed(2) + '€';

        attachRowEvents();
    }

    function attachRowEvents() {
        document.querySelectorAll('.cart-qty-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                let newQty = parseInt(e.target.value);
                if (newQty < 1) newQty = 1;
                cart[index].cantidad = newQty;
                updateCartUI();
            });
        });

        document.querySelectorAll('.cart-size-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                const newSize = e.target.value;
                const item = cart[index];

                if (newSize === item.talla) return;

                const potentialNewId = `${item.id}-${newSize}`;
                const existingIndex = cart.findIndex((p, i) => p.uniqueId === potentialNewId && i !== index);

                if (existingIndex !== -1) {
                    cart[existingIndex].cantidad += parseInt(item.cantidad);
                    cart.splice(index, 1);
                } else {
                    item.talla = newSize;
                    item.uniqueId = potentialNewId;
                }
                updateCartUI();
            });
        });

        document.querySelectorAll('.btn-remove-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                cart.splice(parseInt(e.target.dataset.index), 1);
                updateCartUI();
            });
        });
    }

    // --- EVENTOS ---
    
    // 1. Botones de las Tarjetas
    productsCards.forEach(card => {
        const btn = card.querySelector('.add-cart-btn');
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const prodId = card.dataset.id;
            // IMPORTANTE: Buscamos en el catálogo generado para tener los datos de la oferta
            const catalogItem = productCatalog.find(p => p.id === prodId);
            const selectElement = card.querySelector('.size-selector');
            
            const dataToAdd = { ...catalogItem }; 
            dataToAdd.talla = selectElement ? selectElement.value : null;

            addToCart(dataToAdd, 1); 
        });
    });

    // 2. Formulario Manual
    manualProdSelect.addEventListener('change', (e) => {
        const index = e.target.value;
        const product = productCatalog[index];
        manualSizeSelect.innerHTML = '<option value="">-</option>';
        
        if (product.hasSizeSelector) {
            manualSizeSelect.disabled = false;
            product.availableSizes.forEach(size => {
                const opt = document.createElement('option');
                opt.value = size;
                opt.textContent = size.toUpperCase();
                manualSizeSelect.appendChild(opt);
            });
        } else {
            manualSizeSelect.disabled = true;
        }
    });

    btnManualAdd.addEventListener('click', () => {
        const prodIndex = manualProdSelect.value;
        const qty = parseInt(manualQty.value);

        if (!prodIndex || qty < 1) return alert("Datos inválidos");
        
        const productCatalogItem = productCatalog[prodIndex];
        const selectedSize = manualSizeSelect.value;

        if (productCatalogItem.hasSizeSelector && !selectedSize) return alert("Selecciona talla");

        const dataToAdd = { ...productCatalogItem };
        dataToAdd.talla = productCatalogItem.hasSizeSelector ? selectedSize : null;

        addToCart(dataToAdd, qty);
        manualQty.value = 1;
    });

    btnToggleCart.addEventListener('click', () => cartModal.classList.toggle('active'));
    btnCloseCart.addEventListener('click', () => cartModal.classList.remove('active'));
    btnCleanCart.addEventListener('click', () => {
        if(cart.length > 0 && confirm('¿Vaciar carrito?')) {
            cart = [];
            updateCartUI();
        }
    });

    initCatalog();
});