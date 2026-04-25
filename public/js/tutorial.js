// =============================================
// NOHOPE TUTORIAL ENGINE - Interactive Onboarding
// =============================================

class NohopeTutorial {
    constructor(options = {}) {
        this.steps = options.steps || [];
        this.storageKey = options.storageKey || 'nohope_tutorial_done';
        this.theme = options.theme || 'default'; // 'default' | 'admin'
        this.welcomeTitle = options.welcomeTitle || 'Chào mừng bạn! 👋';
        this.welcomeDesc = options.welcomeDesc || 'Hãy để chúng tôi hướng dẫn bạn qua các tính năng chính.';
        this.welcomeEmoji = options.welcomeEmoji || '☕';
        this.completeTitle = options.completeTitle || 'Tuyệt vời!';
        this.completeDesc = options.completeDesc || 'Bạn đã sẵn sàng sử dụng hệ thống.';
        this.onComplete = options.onComplete || null;
        this.currentStep = 0;
        this.isRunning = false;
        this.elements = {};
    }

    // --- Public API ---
    autoStart(delay = 1500) {
        if (localStorage.getItem(this.storageKey)) return;
        setTimeout(() => this.showWelcome(), delay);
    }

    start() {
        if (this.steps.length === 0 || this.isRunning) return;
        this.isRunning = true;
        this.currentStep = 0;
        this._createOverlay();
        this._showStep(0);
    }

    restart() {
        localStorage.removeItem(this.storageKey);
        this.start();
    }

    // --- Welcome Screen ---
    showWelcome() {
        const themeClass = this.theme === 'admin' ? 'nht-admin' : '';
        const el = document.createElement('div');
        el.className = `nht-welcome ${themeClass}`;
        el.innerHTML = `
            <div class="nht-welcome-bg"></div>
            <div class="nht-welcome-card">
                <span class="nht-welcome-emoji">${this.welcomeEmoji}</span>
                <h2 class="nht-welcome-title">${this.welcomeTitle}</h2>
                <p class="nht-welcome-desc">${this.welcomeDesc}</p>
                <div class="nht-welcome-actions">
                    <button class="nht-welcome-start" id="nht-start-btn">
                        <i class="fa-solid fa-play" style="margin-right:6px"></i> Bắt đầu hướng dẫn
                    </button>
                    <button class="nht-welcome-dismiss" id="nht-dismiss-btn">
                        Bỏ qua, tôi đã biết cách dùng
                    </button>
                </div>
            </div>`;
        document.body.appendChild(el);
        requestAnimationFrame(() => el.classList.add('visible'));

        el.querySelector('#nht-start-btn').onclick = () => {
            el.classList.remove('visible');
            setTimeout(() => { el.remove(); this.start(); }, 400);
        };
        el.querySelector('#nht-dismiss-btn').onclick = () => {
            localStorage.setItem(this.storageKey, '1');
            el.classList.remove('visible');
            setTimeout(() => el.remove(), 400);
        };
        el.querySelector('.nht-welcome-bg').onclick = () => {
            localStorage.setItem(this.storageKey, '1');
            el.classList.remove('visible');
            setTimeout(() => el.remove(), 400);
        };
    }

    // --- Overlay ---
    _createOverlay() {
        if (this.elements.ring) return;
        const themeClass = this.theme === 'admin' ? 'nht-admin' : '';
        const ring = document.createElement('div');
        ring.className = `nht-highlight-ring ${themeClass}`;
        ring.style.cssText = 'opacity:0; pointer-events:none;';
        document.body.appendChild(ring);

        const tooltip = document.createElement('div');
        tooltip.className = `nht-tooltip ${themeClass}`;
        document.body.appendChild(tooltip);

        this.elements = { ring, tooltip };
    }

    _cleanup() {
        Object.values(this.elements).forEach(el => el?.remove());
        this.elements = {};
        this.isRunning = false;
    }

    // --- Step Rendering ---
    _showStep(idx) {
        const step = this.steps[idx];
        if (!step) return this._finish();

        const target = document.querySelector(step.element);
        if (!target) {
            // Skip missing elements
            if (idx < this.steps.length - 1) return this._showStep(idx + 1);
            return this._finish();
        }

        // Pre-action (e.g., switch tabs)
        if (step.beforeShow) step.beforeShow();

        // Wait for DOM to settle after actions
        setTimeout(() => {
            this._scrollTo(target);
            setTimeout(() => {
                this._positionHighlight(target, step);
                this._renderTooltip(step, idx, target);
            }, 350);
        }, step.delay || 100);
    }

    _scrollTo(el) {
        const rect = el.getBoundingClientRect();
        const inView = rect.top >= 0 && rect.bottom <= window.innerHeight;
        if (!inView) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    _positionHighlight(el, step) {
        const rect = el.getBoundingClientRect();
        const pad = step.padding || 8;
        const ring = this.elements.ring;
        ring.style.top = (rect.top - pad) + 'px';
        ring.style.left = (rect.left - pad) + 'px';
        ring.style.width = (rect.width + pad * 2) + 'px';
        ring.style.height = (rect.height + pad * 2) + 'px';
        ring.style.borderRadius = step.borderRadius || '12px';
        ring.style.opacity = '1';
    }

    _renderTooltip(step, idx, target) {
        const tooltip = this.elements.tooltip;
        const total = this.steps.length;
        const isFirst = idx === 0;
        const isLast = idx === total - 1;

        // Dots
        let dots = '';
        for (let i = 0; i < total; i++) {
            const cls = i === idx ? 'active' : (i < idx ? 'done' : '');
            dots += `<div class="nht-dot ${cls}"></div>`;
        }

        tooltip.innerHTML = `
            <div class="nht-arrow"></div>
            <div class="nht-tooltip-header">
                <div class="nht-tooltip-icon"><i class="${step.icon || 'fa-solid fa-lightbulb'}"></i></div>
                <div>
                    <div class="nht-tooltip-step-label">Bước ${idx + 1}/${total}</div>
                    <h3 class="nht-tooltip-title">${step.title}</h3>
                </div>
            </div>
            <div class="nht-tooltip-body">${step.description}</div>
            <div class="nht-tooltip-footer">
                <div class="nht-progress">${dots}</div>
                <div class="nht-actions">
                    ${isFirst ? `<button class="nht-btn nht-btn-skip" data-action="skip">Bỏ qua</button>` : `<button class="nht-btn nht-btn-prev" data-action="prev"><i class="fa-solid fa-arrow-left"></i></button>`}
                    <button class="nht-btn nht-btn-next" data-action="next">${isLast ? 'Hoàn tất' : 'Tiếp'} <i class="fa-solid fa-arrow-right"></i></button>
                </div>
            </div>`;

        // Position tooltip
        this._positionTooltip(target, step);

        // Show
        tooltip.classList.remove('visible');
        requestAnimationFrame(() => tooltip.classList.add('visible'));

        // Button handlers
        tooltip.querySelector('[data-action="next"]').onclick = () => {
            if (isLast) return this._finish();
            this.currentStep = idx + 1;
            tooltip.classList.remove('visible');
            setTimeout(() => this._showStep(this.currentStep), 300);
        };
        const prevBtn = tooltip.querySelector('[data-action="prev"]');
        if (prevBtn) {
            prevBtn.onclick = () => {
                this.currentStep = idx - 1;
                tooltip.classList.remove('visible');
                setTimeout(() => this._showStep(this.currentStep), 300);
            };
        }
        const skipBtn = tooltip.querySelector('[data-action="skip"]');
        if (skipBtn) {
            skipBtn.onclick = () => this._finish();
        }
    }

    _positionTooltip(target, step) {
        const tooltip = this.elements.tooltip;
        const rect = target.getBoundingClientRect();
        const pad = step.padding || 8;
        const gap = 16;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // Temporarily show to measure
        tooltip.style.visibility = 'hidden';
        tooltip.style.display = 'block';
        const tw = tooltip.offsetWidth;
        const th = tooltip.offsetHeight;

        // Determine best position with auto-fallback
        const preferred = step.position || 'bottom';
        const positions = [preferred, 'bottom', 'top', 'right', 'left'];
        let finalPos = preferred;
        let top, left;

        for (const pos of positions) {
            if (pos === 'bottom') {
                top = rect.bottom + pad + gap;
                left = rect.left + rect.width / 2 - tw / 2;
            } else if (pos === 'top') {
                top = rect.top - pad - gap - th;
                left = rect.left + rect.width / 2 - tw / 2;
            } else if (pos === 'left') {
                top = rect.top + rect.height / 2 - th / 2;
                left = rect.left - pad - gap - tw;
            } else { // right
                top = rect.top + rect.height / 2 - th / 2;
                left = rect.right + pad + gap;
            }

            // Check if tooltip fits without overlapping
            const clampedLeft = Math.max(12, Math.min(left, vw - tw - 12));
            const clampedTop = Math.max(12, Math.min(top, vh - th - 12));

            // Check overlap with target element
            const tooltipRect = {
                top: clampedTop, left: clampedLeft,
                right: clampedLeft + tw, bottom: clampedTop + th
            };
            const highlightRect = {
                top: rect.top - pad, left: rect.left - pad,
                right: rect.right + pad, bottom: rect.bottom + pad
            };

            const overlaps = !(
                tooltipRect.right < highlightRect.left ||
                tooltipRect.left > highlightRect.right ||
                tooltipRect.bottom < highlightRect.top ||
                tooltipRect.top > highlightRect.bottom
            );

            if (!overlaps) {
                finalPos = pos;
                top = clampedTop;
                left = clampedLeft;
                break;
            }
            // If preferred overlaps, try next
            if (pos === preferred) continue;
            // Last resort: use clamped position anyway
            finalPos = pos;
            top = clampedTop;
            left = clampedLeft;
        }

        // Apply position class
        tooltip.className = tooltip.className.replace(/pos-\w+/g, '').trim();
        tooltip.classList.add(`pos-${finalPos}`);

        tooltip.style.top = top + 'px';
        tooltip.style.left = left + 'px';
        tooltip.style.visibility = 'visible';

        // Arrow position
        const arrow = tooltip.querySelector('.nht-arrow');
        if (arrow) {
            // Reset arrow styles
            arrow.style.cssText = '';
            if (finalPos === 'bottom') {
                const arrowLeft = Math.max(20, Math.min(rect.left + rect.width / 2 - left - 7, tw - 28));
                arrow.style.left = arrowLeft + 'px';
                arrow.style.top = '-6px';
            } else if (finalPos === 'top') {
                const arrowLeft = Math.max(20, Math.min(rect.left + rect.width / 2 - left - 7, tw - 28));
                arrow.style.left = arrowLeft + 'px';
                arrow.style.bottom = '-6px';
            } else if (finalPos === 'right') {
                arrow.style.left = '-6px';
                const arrowTop = Math.max(16, Math.min(rect.top + rect.height / 2 - top - 7, th - 28));
                arrow.style.top = arrowTop + 'px';
            } else if (finalPos === 'left') {
                arrow.style.right = '-6px';
                const arrowTop = Math.max(16, Math.min(rect.top + rect.height / 2 - top - 7, th - 28));
                arrow.style.top = arrowTop + 'px';
            }
        }
    }

    // --- Finish ---
    _finish() {
        localStorage.setItem(this.storageKey, '1');
        this._cleanup();
        this._showComplete();
        if (this.onComplete) this.onComplete();
    }

    _showComplete() {
        const themeClass = this.theme === 'admin' ? 'nht-admin' : '';
        const el = document.createElement('div');
        el.className = `nht-complete ${themeClass}`;
        el.innerHTML = `
            <div class="nht-welcome-bg"></div>
            <div class="nht-complete-card">
                <span class="nht-complete-emoji">🎉</span>
                <h2 class="nht-complete-title">${this.completeTitle}</h2>
                <p class="nht-complete-desc">${this.completeDesc}</p>
                <button class="nht-complete-btn" id="nht-complete-ok">Bắt đầu sử dụng</button>
            </div>`;
        document.body.appendChild(el);
        requestAnimationFrame(() => el.classList.add('visible'));
        el.querySelector('#nht-complete-ok').onclick = () => {
            el.classList.remove('visible');
            setTimeout(() => el.remove(), 400);
        };
        el.querySelector('.nht-welcome-bg').onclick = () => {
            el.classList.remove('visible');
            setTimeout(() => el.remove(), 400);
        };
    }
}

// Make globally available
window.NohopeTutorial = NohopeTutorial;
