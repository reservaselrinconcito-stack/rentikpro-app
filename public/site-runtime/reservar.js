document.addEventListener('DOMContentLoaded', async () => {
    // 1. Mock Data Loading (In real exported site, WebSpec should contain inventory or fetch it)
    // For now we just populate dummy data or use WebSpec metadata if available.

    const aptSelect = document.getElementById('apt-select');
    if (aptSelect) {
        aptSelect.innerHTML = `
            <option value="1">Apartamento Estándar</option>
            <option value="2">Suite Familiar</option>
            <option value="3">Ático Premium</option>
        `;
    }

    // 2. Simple Pricing Logic
    const cin = document.getElementById('check-in');
    const cout = document.getElementById('check-out');
    const summary = document.getElementById('price-summary');
    const totalEl = document.getElementById('total-price');
    const nightEl = document.getElementById('night-count');

    function updatePrice() {
        if (cin.value && cout.value) {
            const d1 = new Date(cin.value);
            const d2 = new Date(cout.value);
            const diffTime = Math.abs(d2 - d1);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays > 0) {
                summary.style.display = 'block';
                nightEl.innerText = diffDays;

                // Dummy price calc: 100 base
                const total = diffDays * 100;
                totalEl.innerText = total + '€';
            } else {
                summary.style.display = 'none';
            }
        }
    }

    cin.addEventListener('change', updatePrice);
    cout.addEventListener('change', updatePrice);
});
