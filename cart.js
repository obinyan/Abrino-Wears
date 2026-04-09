// Shared cart utility - used across all pages
const CartUtils = {
    getCart() {
        try {
            return JSON.parse(localStorage.getItem('abrino_cart') || '[]');
        } catch { return []; }
    },
    saveCart(cart) {
        localStorage.setItem('abrino_cart', JSON.stringify(cart));
    },
    addItem(name, price, size, qty) {
        const cart = this.getCart();
        cart.push({ name, price, size: size || '', qty: parseInt(qty), id: Date.now() });
        this.saveCart(cart);
        this.updateBadge();
    },
    removeItem(id) {
        const cart = this.getCart().filter(i => i.id !== id);
        this.saveCart(cart);
        this.updateBadge();
    },
    updateQty(id, qty) {
        const cart = this.getCart().map(i => i.id === id ? { ...i, qty: parseInt(qty) } : i);
        this.saveCart(cart);
        this.updateBadge();
    },
    getTotal() {
        return this.getCart().reduce((sum, i) => sum + i.price * i.qty, 0);
    },
    getCount() {
        return this.getCart().reduce((sum, i) => sum + i.qty, 0);
    },
    updateBadge() {
        const badge = document.getElementById('cartCount');
        if (badge) {
            const count = this.getCount();
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline-block' : 'none';
        }
    },
    clear() {
        localStorage.removeItem('abrino_cart');
        this.updateBadge();
    }
};