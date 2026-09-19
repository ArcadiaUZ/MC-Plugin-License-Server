// EpicServer License Manager - Animation Utilities

const Animator = {
    // Animate counting up a number
    countUp(element, target, duration = 1000, prefix = '', suffix = '') {
        if (!element) return;
        const start = 0;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            const current = Math.floor(start + (target - start) * eased);
            element.textContent = prefix + current.toLocaleString() + suffix;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.textContent = prefix + target.toLocaleString() + suffix;
            }
        };
        
        requestAnimationFrame(animate);
    },

    // Fade in elements with stagger
    fadeInStagger(container, selector = '.stat-card', delay = 80) {
        const items = container.querySelectorAll(selector);
        items.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateY(20px)';
            item.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
            setTimeout(() => {
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            }, index * delay);
        });
    },

    // Animate stat cards data
    async animateStats(container, stats) {
        const cards = container.querySelectorAll('.stat-card');
        if (!cards.length) return;
        
        const values = [
            stats.total, stats.active, stats.revoked, stats.expired,
            stats.onlineServers || 0, stats.todayVerifications || 0,
            stats.totalVerifications, stats.totalRevenue || 0,
            stats.successfulVerifications, stats.failedVerifications || 0
        ];
        
        cards.forEach((card, index) => {
            const valueEl = card.querySelector('.stat-value');
            if (valueEl && values[index] !== undefined) {
                setTimeout(() => {
                    this.countUp(valueEl, values[index], 1200);
                }, index * 100);
            }
        });
    },

    // Page transition
    pageTransition() {
        const content = document.querySelector('.page-content');
        if (content) {
            content.style.animation = 'none';
            content.offsetHeight; // trigger reflow
            content.style.animation = 'fadeIn 0.4s ease-out';
        }
    }
};