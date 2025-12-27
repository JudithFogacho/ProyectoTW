// --- VARIABLES Y SELECTORES ---
let cart = [];
let productCatalog = []; 

// Estado del descuento especial
let specialDiscountActive = false; 

const productsCards = document.querySelectorAll('.product-card');
const cartModal = document.getElementById('carrito-modal');
const cartBody = document.getElementById('cart-body');
const cartCountSpan = document.getElementById('cart-count');

const baseTotalElement = document.getElementById('cart-total-base');
const totalIVAElement = document.getElementById('cart-total-iva');
const totalPriceElement = document.getElementById('cart-total-price');

const btnToggleCart = document.getElementById('btn-toggle-cart');
const btnCloseCart = document.getElementById('btn-close-cart');
const btnCleanCart = document.getElementById('btn-clean-cart');

const manualQty = document.getElementById('manual-qty');
const manualProdSelect = document.getElementById('manual-product-select');
const manualSizeSelect = document.getElementById('manual-size-select');
const btnManualAdd = document.getElementById('btn-manual-add');

// Elemento del Descuento Fantasma
const ghostElement = document.getElementById('ghost-discount');


// --- 1. LÓGICA DESCUENTO ESPECIAL (REQUISITO P4) ---
function initSpecialDiscount() {
    // 1. Detección de Navegador: Solo visible en Chrome
    const userAgent = navigator.userAgent;
    const isChrome = userAgent.indexOf("Chrome") > -1 && userAgent.indexOf("Edg") === -1 && userAgent.indexOf("OPR") === -1;
    
    // Si no es Chrome o ya se aplicó, no hacemos nada
    if (!isChrome || specialDiscountActive) return;

    // 2. Mostrar capa
    if(ghostElement) ghostElement.classList.remove('ghost-hidden');

    // 3. Movimiento Aleatorio
    const moveGhost = () => {
        const maxX = window.innerWidth - 200; 
        const maxY = window.innerHeight - 100;
        
        const randomX = Math.random() * maxX;
        const randomY = Math.random() * maxY;

        ghostElement.style.left = `${randomX}px`;
        ghostElement.style.top = `${randomY}px`;
    };

    moveGhost();
    const moveInterval = setInterval(moveGhost, 800);

    // 4. Temporizador de desaparición (Aleatorio 5-10 segundos)
    const randomTime = Math.floor(Math.random() * (10000 - 5000 + 1) + 5000); 
    
    const disappearTimer = setTimeout(() => {
        clearInterval(moveInterval);
        ghostElement.classList.add('ghost-hidden');
    }, randomTime);

    // 5. Evento Click (Cazar el descuento)
    ghostElement.addEventListener('click', () => {
        specialDiscountActive = true; 
        
        clearInterval(moveInterval);
        clearTimeout(disappearTimer);
        ghostElement.classList.add('ghost-hidden');
        
        alert("¡Felicidades! Se ha aplicado un 10% de descuento extra a tu carrito.");
        updateCartUI(); 
    });
}


// --- 2. INICIALIZACIÓN CATÁLOGO ---
function initCatalog() {
    productCatalog = [];
    productsCards.forEach(card => {
        const selectElement = card.querySelector('.size-selector');
        const offerTag = card.querySelector('.oferta');
        const offerText = offerTag ? offerTag.innerText.trim() : null;
        const isMobileOnly = !!card.closest('.mobile-only-category');

        let availableSizes = [];
        if (selectElement) {
            availableSizes = Array.from(selectElement.options)
                .filter(option => !option.disabled && option.value !== "")
                .map(option => option.value);
        }

        productCatalog.push({
            id: card.dataset.id,
            nombre: card.dataset.nombre,
            precio: parseFloat(card.dataset.precio), 
            iva: parseFloat(card.dataset.iva),
            offer: offerText,
            hasSizeSelector: !!selectElement,
            availableSizes: availableSizes,
            isMobileOnly: isMobileOnly
        });
    });
    populateManualForm();
    
    // Iniciar el descuento especial tras 2 segundos
    setTimeout(initSpecialDiscount, 2000); 
}

function populateManualForm() {
    if(!manualProdSelect) return;
    
    manualProdSelect.innerHTML = '<option value="" disabled selected>-- Selecciona un producto --</option>';
    const isMobileView = window.innerWidth <= 768;

    productCatalog.forEach((prod, index) => {
        if (prod.isMobileOnly && !isMobileView) return; 

        const option = document.createElement('option');
        option.value = index;
        const offerLabel = prod.offer ? ` (${prod.offer})` : '';
        option.textContent = `${prod.nombre}${offerLabel}`;
        manualProdSelect.appendChild(option);
    });
}

window.addEventListener('resize', populateManualForm);


// --- 3. CÁLCULOS DE PRECIO ---
function calculateLinePrice(item) {
    let originalPrice = item.precio;
    let effectiveUnitPrice = originalPrice;
    let lineSubtotal = 0;
    let isDiscounted = false;

    const offer = item.offer ? item.offer.toUpperCase().replace(/\s/g, '') : '';

    if (offer === '2X1') {
        const payableUnits = Math.ceil(item.cantidad / 2);
        lineSubtotal = payableUnits * originalPrice;
        isDiscounted = true; 
    } else if (offer.includes('%')) {
        const percent = parseFloat(offer.replace('-', '').replace('%', ''));
        effectiveUnitPrice = originalPrice * (1 - (percent / 100));
        lineSubtotal = effectiveUnitPrice * item.cantidad;
        isDiscounted = true;
    } else if (offer.includes('€')) {
        const discountAmount = parseFloat(offer.replace('-', '').replace('€', ''));
        effectiveUnitPrice = Math.max(0, originalPrice - discountAmount);
        lineSubtotal = effectiveUnitPrice * item.cantidad;
        isDiscounted = true;
    } else {
        lineSubtotal = originalPrice * item.cantidad;
    }

    return {
        originalUnitPrice: originalPrice,
        effectiveUnitPrice: effectiveUnitPrice,
        lineSubtotal: lineSubtotal,
        isDiscounted: isDiscounted,
        offerType: offer
    };
}


// --- 4. GESTIÓN CARRITO ---
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
            ...productData,
            uniqueId: uniqueId,
            talla: productData.talla || 'Única',
            cantidad: parseInt(extraQty),
        });
    }
    updateCartUI();
    if (cartModal && !cartModal.classList.contains('active')) cartModal.classList.add('active');
}

function updateCartUI() {
    cartBody.innerHTML = '';
    
    let grandTotal = 0;
    let totalBase = 0;
    let totalItems = 0;

    cart.forEach((item, index) => {
        const calc = calculateLinePrice(item);
        const lineBaseAmount = calc.lineSubtotal / (1 + item.iva);
        
        grandTotal += calc.lineSubtotal;
        totalBase += lineBaseAmount;
        totalItems += item.cantidad;

        const row = document.createElement('tr');
        row.className = item.iva < 0.21 ? 'row-iva-reducido' : 'row-iva-general';

        let priceHTML = '';
        if (calc.offerType === '2X1') {
            priceHTML = `${calc.originalUnitPrice.toFixed(2)}€ <span class="offer-badge">2x1</span>`;
        } else if (calc.isDiscounted) {
            priceHTML = `
                <span class="old-price-cart">${calc.originalUnitPrice.toFixed(2)}€</span>
                <span class="new-price-cart">${calc.effectiveUnitPrice.toFixed(2)}€</span>
            `;
        } else {
            priceHTML = `${calc.originalUnitPrice.toFixed(2)}€`;
        }

        let visualBaseUnit = calc.effectiveUnitPrice / (1 + item.iva);

        let sizeCellHTML = item.talla.toUpperCase();
        if (item.hasSizeSelector && item.availableSizes.length > 0) {
            const options = item.availableSizes.map(s => 
                `<option value="${s}" ${s === item.talla ? 'selected' : ''}>${s.toUpperCase()}</option>`
            ).join('');
            sizeCellHTML = `<select class="cart-size-select" data-index="${index}">${options}</select>`;
        }

        row.innerHTML = `
            <td><button class="btn-remove-item" data-index="${index}">❌</button></td>
            <td><input type="number" class="cart-qty-input" min="1" value="${item.cantidad}" data-index="${index}"></td>
            <td>${item.nombre}</td>
            <td>${sizeCellHTML}</td>
            <td class="text-muted-small">${visualBaseUnit.toFixed(2)}€</td>
            <td class="text-muted-small">${(item.iva * 100).toFixed(0)}%</td>
            <td>${priceHTML}</td>
            <td style="font-weight:bold; color:var(--primary-color);">${calc.lineSubtotal.toFixed(2)}€</td>
        `;
        cartBody.appendChild(row);
    });

    // --- APLICACIÓN DEL DESCUENTO ESPECIAL AL TOTAL ---
    if (specialDiscountActive) {
        grandTotal = grandTotal * 0.90;
        if(totalPriceElement) totalPriceElement.classList.add('total-discount-applied');
    } else {
        if(totalPriceElement) totalPriceElement.classList.remove('total-discount-applied');
    }

    const totalIVA = grandTotal - totalBase; 

    if(cartCountSpan) cartCountSpan.textContent = totalItems;
    if (baseTotalElement) baseTotalElement.textContent = totalBase.toFixed(2) + '€';
    if(totalIVAElement) totalIVAElement.textContent = totalIVA.toFixed(2) + '€';
    if(totalPriceElement) totalPriceElement.textContent = grandTotal.toFixed(2) + '€';

    attachRowEvents();
}

function attachRowEvents() {
    document.querySelectorAll('.cart-qty-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const index = parseInt(e.target.dataset.index);
            let val = parseInt(e.target.value);
            if (val < 1) val = 1;
            cart[index].cantidad = val;
            updateCartUI();
        });
    });

    document.querySelectorAll('.cart-size-select').forEach(select => {
        select.addEventListener('change', (e) => {
            const index = parseInt(e.target.dataset.index);
            const newSize = e.target.value;
            const item = cart[index];
            if (newSize === item.talla) return;

            const potentialId = `${item.id}-${newSize}`;
            const existIdx = cart.findIndex((p, i) => p.uniqueId === potentialId && i !== index);

            if (existIdx !== -1) {
                cart[existIdx].cantidad += parseInt(item.cantidad);
                cart.splice(index, 1);
            } else {
                item.talla = newSize;
                item.uniqueId = potentialId;
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


// --- EVENTOS INTERFAZ ---
productsCards.forEach(card => {
    const btn = card.querySelector('.add-cart-btn');
    if(btn){
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const prodId = card.dataset.id;
            const catalogItem = productCatalog.find(p => p.id === prodId);
            const selectElement = card.querySelector('.size-selector');
            const dataToAdd = { ...catalogItem }; 
            dataToAdd.talla = selectElement ? selectElement.value : null;
            addToCart(dataToAdd, 1); 
        });
    }
});

if(manualProdSelect){
    manualProdSelect.addEventListener('change', (e) => {
        const idx = e.target.value;
        const product = productCatalog[idx];
        manualSizeSelect.innerHTML = '<option value="">-</option>';
        if (product.hasSizeSelector) {
            manualSizeSelect.disabled = false;
            product.availableSizes.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s;
                opt.textContent = s.toUpperCase();
                manualSizeSelect.appendChild(opt);
            });
        } else {
            manualSizeSelect.disabled = true;
        }
    });
}

if(btnManualAdd){
    btnManualAdd.addEventListener('click', () => {
        const idx = manualProdSelect.value;
        const qty = parseInt(manualQty.value);
        if (!idx || qty < 1) return alert("Datos inválidos");
        const catalogItem = productCatalog[idx];
        const size = manualSizeSelect.value;
        if (catalogItem.hasSizeSelector && !size) return alert("Falta talla");
        const dataToAdd = { ...catalogItem };
        dataToAdd.talla = catalogItem.hasSizeSelector ? size : null;
        addToCart(dataToAdd, qty);
        manualQty.value = 1;
    });
}

if(btnToggleCart) btnToggleCart.addEventListener('click', () => cartModal.classList.toggle('active'));
if(btnCloseCart) btnCloseCart.addEventListener('click', () => cartModal.classList.remove('active'));
if(btnCleanCart) {
    btnCleanCart.addEventListener('click', () => {
        if(cart.length > 0 && confirm('¿Vaciar carrito?')) {
            cart = [];
            updateCartUI();
        }
    });
}

// VALIDACIÓN DE FORMULARIO DE CONTACTO

// Función para validar el DNI español
function validarDNI(dni) {
    // Patrón: 8 números seguidos de una letra
    const dniPattern = /^[0-9]{8}[A-Za-z]$/;
    
    if (!dniPattern.test(dni)) {
        return false;
    }
    
    // Extraer número y letra
    const numero = parseInt(dni.substr(0, 8), 10);
    const letraIngresada = dni.charAt(8).toUpperCase();
    
    // Tabla de letras válidas según el módulo 23
    const letrasValidas = "TRWAGMYFPDXBNJZSQVHLCKE";
    const letraCalculada = letrasValidas.charAt(numero % 23);
    
    return letraIngresada === letraCalculada;
}

// Función para validar IBAN español
function validarIBAN(iban) {
    // Eliminar espacios en blanco
    iban = iban.replace(/\s/g, '').toUpperCase();
    
    // Patrón IBAN español: ES seguido de 2 dígitos de control y 20 caracteres alfanuméricos
    const ibanPattern = /^ES[0-9]{2}[0-9A-Z]{20}$/;
    
    if (!ibanPattern.test(iban)) {
        return false;
    }
    
    // Mover los 4 primeros caracteres al final
    const reordenado = iban.substring(4) + iban.substring(0, 4);
    
    // Convertir letras a números (A=10, B=11, ..., Z=35)
    let numeroIBAN = '';
    for (let i = 0; i < reordenado.length; i++) {
        const char = reordenado.charAt(i);
        if (char >= 'A' && char <= 'Z') {
            numeroIBAN += (char.charCodeAt(0) - 55).toString();
        } else {
            numeroIBAN += char;
        }
    }
    
    // Calcular módulo 97
    // Para números grandes, hacemos el cálculo por partes
    let resto = 0;
    for (let i = 0; i < numeroIBAN.length; i++) {
        resto = (resto * 10 + parseInt(numeroIBAN.charAt(i))) % 97;
    }
    
    return resto === 1;
}

// Función para validar email UMH
function validarEmailUMH(email) {
    // El email debe terminar en @umh.es
    const emailPattern = /^[a-zA-Z0-9._-]+@umh\.es$/;
    return emailPattern.test(email);
}

// Función para mostrar error en un campo
function mostrarError(campo, mensaje) {
    // Añadir clase de error al campo
    campo.classList.add('campo-error');
    
    // Buscar si ya existe un mensaje de error
    let errorMsg = campo.parentElement.querySelector('.mensaje-error');
    
    if (!errorMsg) {
        // Crear elemento de mensaje de error
        errorMsg = document.createElement('span');
        errorMsg.className = 'mensaje-error';
        campo.parentElement.appendChild(errorMsg);
    }
    
    errorMsg.textContent = mensaje;
    errorMsg.style.display = 'block';
}

// Función para limpiar error de un campo
function limpiarError(campo) {
    campo.classList.remove('campo-error');
    const errorMsg = campo.parentElement.querySelector('.mensaje-error');
    if (errorMsg) {
        errorMsg.style.display = 'none';
    }
}

// Función para validar coincidencia de emails
function validarCoincidenciaEmails(email1, email2) {
    return email1.value === email2.value;
}

// Función para mostrar mensaje de éxito
function mostrarMensajeExito() {
    // Crear overlay de éxito
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.zIndex = '10000';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.backgroundColor = 'white';
    modalContent.style.padding = '30px';
    modalContent.style.borderRadius = '10px';
    modalContent.style.textAlign = 'center';
    modalContent.style.maxWidth = '500px';
    modalContent.innerHTML = `
        <h3 style="color: #27ae60; margin-bottom: 15px;">✅ Formulario Válido</h3>
        <p style="margin-bottom: 10px;">Todos los datos han sido validados correctamente.</p>
        <p style="margin-bottom: 20px;">El formulario está listo para ser enviado.</p>
        <button class="modal-close-btn" style="background-color: #3498db; color: white; border: none; padding: 10px 25px; border-radius: 5px; cursor: pointer; font-size: 1rem;">Cerrar</button>
    `;
    
    overlay.appendChild(modalContent);
    document.body.appendChild(overlay);
    
    // Cerrar al hacer clic en el botón
    const btnCerrar = modalContent.querySelector('.modal-close-btn');
    btnCerrar.addEventListener('click', function() {
        overlay.remove();
    });
    
    // Cerrar al hacer clic fuera del modal
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            overlay.remove();
        }
    });
}

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    const formulario = document.querySelector('.contact-form-grid');
    
    if (!formulario) return;
    
    console.log('Formulario de contacto encontrado, iniciando validación...');
    
    // Obtener campos del formulario
    const campoEmail1 = document.getElementById('email1');
    const campoEmail2 = document.getElementById('email2');
    const campoDNI = document.getElementById('dni');
    const campoIBAN = document.getElementById('bank');
    
    
    // Validación de Email 1 (dominio UMH)
    if (campoEmail1) {
        campoEmail1.addEventListener('blur', function() {
            limpiarError(this);
            
            if (this.value.trim() === '') {
                mostrarError(this, 'El email es obligatorio');
            } else if (!validarEmailUMH(this.value)) {
                // Mostrar alerta de error
                alert(' ERROR: El email debe pertenecer al dominio de la UMH (debe finalizar en @umh.es)');
                mostrarError(this, 'El email debe pertenecer al dominio @umh.es');
                this.focus();
            }
        });
        
        // Limpiar error al escribir
        campoEmail1.addEventListener('input', function() {
            if (this.classList.contains('campo-error')) {
                limpiarError(this);
            }
        });
    }
    
    // Validación de Email 2 (confirmación)
    if (campoEmail2) {
        campoEmail2.addEventListener('blur', function() {
            limpiarError(this);
            
            if (this.value.trim() === '') {
                mostrarError(this, 'Debe confirmar el email');
            } else if (!validarEmailUMH(this.value)) {
                // Mostrar alerta de error
                alert(' ERROR: El email debe pertenecer al dominio de la UMH (debe finalizar en @umh.es)');
                mostrarError(this, 'El email debe pertenecer al dominio @umh.es');
                this.focus();
            } else if (campoEmail1 && !validarCoincidenciaEmails(campoEmail1, campoEmail2)) {
                alert(' ERROR: Los emails ingresados no coinciden. Por favor verifique.');
                mostrarError(this, 'Los emails no coinciden');
                this.focus();
            }
        });
        
        campoEmail2.addEventListener('input', function() {
            if (this.classList.contains('campo-error')) {
                limpiarError(this);
            }
        });
    }
    
    // Validación de DNI
    if (campoDNI) {
        campoDNI.addEventListener('blur', function() {
            limpiarError(this);
            
            if (this.value.trim() === '') {
                mostrarError(this, 'El DNI es obligatorio');
            } else if (!validarDNI(this.value)) {
                mostrarError(this, 'DNI inválido. Debe tener 8 números y una letra válida');
            }
        });
        
        campoDNI.addEventListener('input', function() {
            // Convertir a mayúsculas automáticamente
            this.value = this.value.toUpperCase();
            
            if (this.classList.contains('campo-error')) {
                limpiarError(this);
            }
        });
    }
    
    // Validación de IBAN
    if (campoIBAN) {
        campoIBAN.addEventListener('blur', function() {
            limpiarError(this);
            
            if (this.value.trim() === '') {
                mostrarError(this, 'El código bancario (IBAN) es obligatorio');
            } else if (!validarIBAN(this.value)) {
                mostrarError(this, 'IBAN inválido. Debe ser un código IBAN español válido');
            }
        });
        
        campoIBAN.addEventListener('input', function() {
            // Convertir a mayúsculas automáticamente
            this.value = this.value.toUpperCase();
            
            if (this.classList.contains('campo-error')) {
                limpiarError(this);
            }
        });
    }
    
    // ===========================
    // VALIDACIÓN AL ENVIAR
    // ===========================
    
    formulario.addEventListener('submit', function(e) {
        e.preventDefault(); // Prevenir envío por defecto
        
        console.log('Formulario enviado, validando...');
        
        let formularioValido = true;
        
        // Limpiar todos los errores previos
        const todosLosCampos = formulario.querySelectorAll('input, select');
        todosLosCampos.forEach(campo => limpiarError(campo));
        
        // Array para almacenar campos con error
        const camposConError = [];
        
        // Validar campos obligatorios básicos
        const camposObligatorios = formulario.querySelectorAll('[required]');
        camposObligatorios.forEach(campo => {
            if (campo.value.trim() === '' || (campo.tagName === 'SELECT' && campo.value === '')) {
                mostrarError(campo, 'Este campo es obligatorio');
                formularioValido = false;
                camposConError.push(campo);
            }
        });
        
        // Validar Email 1
        if (campoEmail1 && campoEmail1.value.trim() !== '') {
            if (!validarEmailUMH(campoEmail1.value)) {
                alert(' ERROR: El email debe pertenecer al dominio de la UMH (debe finalizar en @umh.es)');
                mostrarError(campoEmail1, 'El email debe pertenecer al dominio @umh.es');
                formularioValido = false;
                camposConError.push(campoEmail1);
            }
        }
        
        // Validar Email 2 y coincidencia
        if (campoEmail2 && campoEmail2.value.trim() !== '') {
            if (!validarEmailUMH(campoEmail2.value)) {
                alert(' ERROR: El email de confirmación debe pertenecer al dominio de la UMH (debe finalizar en @umh.es)');
                mostrarError(campoEmail2, 'El email debe pertenecer al dominio @umh.es');
                formularioValido = false;
                camposConError.push(campoEmail2);
            } else if (campoEmail1 && !validarCoincidenciaEmails(campoEmail1, campoEmail2)) {
                alert(' ERROR: Los emails ingresados no coinciden. Por favor verifique.');
                mostrarError(campoEmail2, 'Los emails no coinciden');
                formularioValido = false;
                camposConError.push(campoEmail2);
            }
        }
        
        // Validar DNI
        if (campoDNI && campoDNI.value.trim() !== '') {
            if (!validarDNI(campoDNI.value)) {
                mostrarError(campoDNI, 'DNI inválido. Debe tener 8 números y una letra válida');
                formularioValido = false;
                camposConError.push(campoDNI);
            }
        }
        
        // Validar IBAN
        if (campoIBAN && campoIBAN.value.trim() !== '') {
            if (!validarIBAN(campoIBAN.value)) {
                mostrarError(campoIBAN, 'IBAN inválido. Debe ser un código IBAN español válido');
                formularioValido = false;
                camposConError.push(campoIBAN);
            }
        }
        
        // Si hay errores, hacer scroll al primer campo con error
        if (!formularioValido) {
            console.log('Formulario con errores:', camposConError.length);
            if (camposConError.length > 0) {
                camposConError[0].focus();
                camposConError[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return false;
        }
        
        // Si todo es válido, mostrar mensaje de éxito
        console.log('¡Formulario válido!');
        
        // Mostrar alerta de éxito
        alert(' FORMULARIO ENVIADO CORRECTAMENTE\n\nTodos los datos han sido validados y el formulario ha sido enviado exitosamente.\n\n¡Gracias por contactarnos!');
        
        // Opcional: Limpiar el formulario después de enviar
        formulario.reset();
        
        // NO enviar a Gmail - El preventDefault() ya evita el envío
        // formulario.submit(); // Esta línea está comentada para NO enviar
    });
    
    // Validación del botón reset
    const btnReset = formulario.querySelector('.btn-reset');
    if (btnReset) {
        btnReset.addEventListener('click', function() {
            // Limpiar todos los errores visuales
            setTimeout(() => {
                const todosLosCampos = formulario.querySelectorAll('input, select');
                todosLosCampos.forEach(campo => limpiarError(campo));
            }, 10);
        });
    }
});