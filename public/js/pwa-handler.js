// =============================================
// PWA INSTALL PROMPT + ONLINE/OFFLINE INDICATOR
// =============================================

(function() {
    'use strict';

    let deferredPrompt = null;

    // =============================================
    // 10A — INSTALL PROMPT
    // =============================================

    // Capture the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        showInstallBanner();
    });

    function showInstallBanner() {
        // Don't show if already installed or dismissed recently
        if (window.matchMedia('(display-mode: standalone)').matches) return;
        if (navigator.standalone) return;
        const dismissed = localStorage.getItem('pwa_install_dismissed');
        if (dismissed) {
            const dismissedAt = parseInt(dismissed, 10);
            if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return; // 7 days
        }

        // Remove existing banner if any
        const existing = document.getElementById('pwa-install-banner');
        if (existing) existing.remove();

        const banner = document.createElement('div');
        banner.id = 'pwa-install-banner';
        banner.innerHTML = `
            <div class="pwa-banner-content">
                <div class="pwa-banner-icon">
                    <img src="/images/bunny_logo.png" alt="Nohope" width="40" height="40" style="border-radius:10px;">
                </div>
                <div class="pwa-banner-text">
                    <strong>Cài đặt Nohope Coffee</strong>
                    <span>Truy cập nhanh từ màn hình chính</span>
                </div>
                <div class="pwa-banner-actions">
                    <button class="pwa-install-btn" onclick="window.NohopesPWA.install()">
                        <i class="fa-solid fa-download"></i> Cài đặt
                    </button>
                    <button class="pwa-dismiss-btn" onclick="window.NohopesPWA.dismissBanner()">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(banner);

        // Animate in
        requestAnimationFrame(() => {
            requestAnimationFrame(() => banner.classList.add('show'));
        });
    }

    async function installPWA() {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            if (typeof showAdminToast === 'function') {
                showAdminToast('✅ Ứng dụng đã được cài đặt!', 'success');
            }
        }
        deferredPrompt = null;
        dismissBanner();
    }

    function dismissBanner() {
        localStorage.setItem('pwa_install_dismissed', Date.now().toString());
        const banner = document.getElementById('pwa-install-banner');
        if (banner) {
            banner.classList.remove('show');
            setTimeout(() => banner.remove(), 400);
        }
    }

    // Detect installed
    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        dismissBanner();
        console.log('✅ PWA installed successfully');
    });

    // =============================================
    // 10B — ONLINE/OFFLINE INDICATOR
    // =============================================

    function initConnectionMonitor() {
        updateConnectionStatus();
        window.addEventListener('online', () => {
            updateConnectionStatus();
            showConnectionToast(true);
        });
        window.addEventListener('offline', () => {
            updateConnectionStatus();
            showConnectionToast(false);
        });
    }

    function updateConnectionStatus() {
        const isOnline = navigator.onLine;
        let indicator = document.getElementById('connection-indicator');

        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'connection-indicator';
            document.body.appendChild(indicator);
        }

        if (isOnline) {
            indicator.className = 'conn-indicator online';
            indicator.innerHTML = '<i class="fa-solid fa-wifi"></i>';
            // Auto-hide after 3s when online
            setTimeout(() => indicator.classList.add('hidden'), 3000);
        } else {
            indicator.className = 'conn-indicator offline';
            indicator.innerHTML = '<i class="fa-solid fa-wifi"></i> Offline';
            indicator.classList.remove('hidden');
        }
    }

    function showConnectionToast(isOnline) {
        if (typeof showAdminToast === 'function') {
            if (isOnline) {
                showAdminToast('✅ Đã kết nối lại Internet', 'success', 3000);
            } else {
                showAdminToast('⚠️ Mất kết nối Internet! Một số tính năng sẽ bị giới hạn.', 'warning', 6000);
            }
        }
    }

    // =============================================
    // 10C — STYLES
    // =============================================

    function injectPWAStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* PWA Install Banner */
            #pwa-install-banner {
                position: fixed;
                bottom: -100px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 10001;
                width: calc(100% - 32px);
                max-width: 480px;
                opacity: 0;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            }
            #pwa-install-banner.show {
                bottom: 20px;
                opacity: 1;
            }
            .pwa-banner-content {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 14px 16px;
                background: #ffffff;
                border-radius: 16px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05);
            }
            .pwa-banner-icon img {
                display: block;
            }
            .pwa-banner-text {
                flex: 1;
                min-width: 0;
            }
            .pwa-banner-text strong {
                display: block;
                font-size: 14px;
                color: #1e293b;
                font-weight: 700;
            }
            .pwa-banner-text span {
                display: block;
                font-size: 12px;
                color: #64748b;
                margin-top: 1px;
            }
            .pwa-banner-actions {
                display: flex;
                align-items: center;
                gap: 6px;
                flex-shrink: 0;
            }
            .pwa-install-btn {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 8px 16px;
                background: linear-gradient(135deg, #d4a76a, #c0a062);
                color: #0d1117;
                font-weight: 700;
                font-size: 13px;
                border: none;
                border-radius: 10px;
                cursor: pointer;
                transition: all 0.2s;
                white-space: nowrap;
            }
            .pwa-install-btn:hover {
                transform: scale(1.05);
                box-shadow: 0 4px 12px rgba(212,167,106,0.4);
            }
            .pwa-dismiss-btn {
                width: 32px;
                height: 32px;
                border-radius: 8px;
                border: none;
                background: #f1f5f9;
                color: #94a3b8;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
                transition: all 0.15s;
            }
            .pwa-dismiss-btn:hover {
                background: #e2e8f0;
                color: #475569;
            }

            /* Connection Indicator */
            .conn-indicator {
                position: fixed;
                bottom: 16px;
                left: 16px;
                z-index: 9998;
                padding: 8px 14px;
                border-radius: 10px;
                font-size: 12px;
                font-weight: 700;
                display: flex;
                align-items: center;
                gap: 6px;
                transition: all 0.3s ease;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }
            .conn-indicator.hidden {
                opacity: 0;
                transform: translateY(20px);
                pointer-events: none;
            }
            .conn-indicator.online {
                background: #dcfce7;
                color: #15803d;
                border: 1px solid #bbf7d0;
            }
            .conn-indicator.offline {
                background: #fef2f2;
                color: #b91c1c;
                border: 1px solid #fecaca;
                animation: pulseOffline 2s infinite;
            }
            @keyframes pulseOffline {
                0%, 100% { box-shadow: 0 4px 12px rgba(185,28,28,0.2); }
                50% { box-shadow: 0 4px 20px rgba(185,28,28,0.4); }
            }

            /* Dark mode support */
            body.dark-mode .pwa-banner-content {
                background: #1e293b;
                box-shadow: 0 8px 32px rgba(0,0,0,0.4);
            }
            body.dark-mode .pwa-banner-text strong { color: #e2e8f0; }
            body.dark-mode .pwa-banner-text span { color: #94a3b8; }
            body.dark-mode .pwa-dismiss-btn { background: #334155; color: #94a3b8; }
            body.dark-mode .conn-indicator.online { background: #14532d; color: #86efac; border-color: #166534; }
            body.dark-mode .conn-indicator.offline { background: #450a0a; color: #fca5a5; border-color: #7f1d1d; }
        `;
        document.head.appendChild(style);
    }

    // =============================================
    // 10D — SERVICE WORKER REGISTRATION
    // =============================================

    function registerServiceWorker() {
        if (!('serviceWorker' in navigator)) return;

        navigator.serviceWorker.register('/sw.js', { scope: '/' })
            .then(registration => {
                console.log('✅ SW registered:', registration.scope);

                // Check for updates every 30 minutes
                setInterval(() => registration.update(), 30 * 60 * 1000);

                // Listen for SW messages
                navigator.serviceWorker.addEventListener('message', event => {
                    if (event.data?.type === 'SYNC_COMPLETE') {
                        if (typeof showAdminToast === 'function') {
                            showAdminToast('🔄 Dữ liệu offline đã được đồng bộ', 'success');
                        }
                    }
                });
            })
            .catch(err => console.warn('SW registration failed:', err));
    }

    // =============================================
    // INIT
    // =============================================

    function init() {
        injectPWAStyles();
        registerServiceWorker();
        initConnectionMonitor();
    }

    // Public API
    window.NohopesPWA = {
        install: installPWA,
        dismissBanner: dismissBanner
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
