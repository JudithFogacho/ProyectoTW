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