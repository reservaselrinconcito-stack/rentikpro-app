// rg-channel-manager.js

document.addEventListener('DOMContentLoaded', () => {
    console.log('Legacy Channel Manager Loaded');

    // Simple interaction: Alert on click
    const infoSection = document.querySelector('.legacy-info');
    if (infoSection) {
        infoSection.addEventListener('click', () => {
            console.log('Info section clicked');
            // Visual feedback
            infoSection.style.backgroundColor = '#eef2ff';
            setTimeout(() => {
                infoSection.style.backgroundColor = '#f8fafc';
            }, 200);
        });
    }

    // Check for hash param to warn user if they came from deep link
    if (window.location.hash === '#legacy') {
        const alertBox = document.querySelector('.legacy-alert');
        if (alertBox) {
            alertBox.style.border = '2px solid #ef4444';
            alertBox.style.animation = 'pulse 2s infinite';
        }
    }
});
