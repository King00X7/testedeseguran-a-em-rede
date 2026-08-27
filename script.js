(function() {
    'use strict';

    const data = {
        ip: '',
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        languages: navigator.languages ? navigator.languages.join(', ') : '',
        cookiesEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack || 'unspecified',
        online: navigator.onLine,
        connectionType: '',
        downlink: '',
        rtt: '',
        screenWidth: screen.width,
        screenHeight: screen.height,
        screenDepth: screen.colorDepth,
        screenAvailWidth: screen.availWidth,
        screenAvailHeight: screen.availHeight,
        devicePixelRatio: window.devicePixelRatio,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timezoneOffset: new Date().getTimezoneOffset(),
        localTime: new Date().toLocaleString(),
        utcTime: new Date().toUTCString(),
        hardwareConcurrency: navigator.hardwareConcurrency || 'N/A',
        deviceMemory: navigator.deviceMemory || 'N/A',
        maxTouchPoints: navigator.maxTouchPoints || 0,
        localStorage: (typeof localStorage !== 'undefined'),
        sessionStorage: (typeof sessionStorage !== 'undefined'),
        referrer: document.referrer || '(direto / vazio)',
        headers: {}
    };

    if (navigator.connection) {
        data.connectionType = navigator.connection.effectiveType || '';
        data.downlink = navigator.connection.downlink + ' Mbps';
        data.rtt = navigator.connection.rtt + ' ms';
    }

    function fetchIP() {
        try {
            const RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection;
            if (RTCPeerConnection) {
                const pc = new RTCPeerConnection({ iceServers: [] });
                pc.createDataChannel('');
                pc.createOffer().then(offer => pc.setLocalDescription(offer));
                pc.onicecandidate = function(ice) {
                    if (ice && ice.candidate && ice.candidate.address) {
                        const ip = ice.candidate.address;
                        if (ip !== '127.0.0.1' && ip.includes('.') && !data.ip) {
                            data.ip = ip + ' (WebRTC)';
                            renderAll();
                        }
                    }
                };
                setTimeout(() => pc.close(), 3000);
            }
        } catch(e) { /* fallback abaixo */ }

        fetch('https://api.ipify.org?format=json')
            .then(r => r.json())
            .then(d => {
                if (d.ip) {
                    data.ip = d.ip + ' (IP público)';
                    renderAll();
                }
            })
            .catch(() => {
                if (!data.ip) {
                    data.ip = '(não foi possível detectar)';
                    renderAll();
                }
            });
    }

    function createRow(key, value) {
        const tr = document.createElement('tr');
        const tdKey = document.createElement('td');
        tdKey.className = 'key';
        tdKey.textContent = key;
        const tdVal = document.createElement('td');
        tdVal.className = 'value';

        const valSpan = document.createElement('span');
        valSpan.textContent = value;
        tdVal.appendChild(valSpan);

        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.textContent = 'Copiar';
        copyBtn.onclick = function() {
            navigator.clipboard.writeText(value).then(() => {
                copyBtn.textContent = 'Copiado!';
                setTimeout(() => { copyBtn.textContent = 'Copiar'; }, 1500);
            });
        };
        tdVal.appendChild(copyBtn);

        tr.appendChild(tdKey);
        tr.appendChild(tdVal);
        return tr;
    }

    function renderTable(id, obj, keys) {
        const tbody = document.getElementById(id);
        tbody.innerHTML = '';
        keys.forEach(k => {
            if (obj[k] !== undefined && obj[k] !== '' && obj[k] !== null) {
                tbody.appendChild(createRow(k, String(obj[k])));
            }
        });
    }

    function renderAll() {
        renderTable('tableIp', data, [
            'ip', 'online', 'connectionType', 'downlink', 'rtt'
        ]);

        renderTable('tableUa', data, [
            'userAgent', 'platform', 'language', 'languages',
            'hardwareConcurrency', 'deviceMemory', 'maxTouchPoints',
            'cookiesEnabled', 'doNotTrack'
        ]);

        const headerData = {
            'Host': window.location.host,
            'Referer': data.referrer,
            'User-Agent': data.userAgent,
            'Accept-Language': data.language,
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Dest': 'document',
            'Connection': 'keep-alive'
        };
        renderTable('tableHeaders', headerData, Object.keys(headerData));

        renderTable('tableFingerprint', data, [
            'screenWidth', 'screenHeight', 'screenDepth',
            'windowWidth', 'windowHeight',
            'devicePixelRatio',
            'timezone', 'timezoneOffset',
            'localTime',
            'localStorage', 'sessionStorage',
            'referrer'
        ]);

        const hashStr = [
            data.userAgent, data.platform,
            data.screenWidth + 'x' + data.screenHeight,
            data.screenDepth, data.timezone,
            data.language, data.hardwareConcurrency, data.deviceMemory
        ].join('|');

        let hash = 0;
        for (let i = 0; i < hashStr.length; i++) {
            const char = hashStr.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        const hashHex = 'FP-' + Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
        document.getElementById('fingerprintHash').textContent = hashHex;

        const uniqueDataPoints = [
            data.ip, data.userAgent, data.platform, data.language,
            data.screenWidth, data.screenHeight, data.screenDepth,
            data.devicePixelRatio, data.timezone, data.hardwareConcurrency,
            data.deviceMemory, data.referrer, data.connectionType, data.cookiesEnabled
        ].filter(v => v && v !== '' && v !== 'N/A' && v !== '(direto / vazio)').length;

        const riskPct = Math.min(100, Math.round((uniqueDataPoints / 14) * 100));
        const fill = document.getElementById('riskFill');
        const riskText = document.getElementById('riskValueText');

        fill.style.width = riskPct + '%';
        if (riskPct < 35) {
            fill.className = 'risk-fill risk-low';
            riskText.textContent = 'Baixo (' + uniqueDataPoints + ' pontos)';
        } else if (riskPct < 65) {
            fill.className = 'risk-fill risk-medium';
            riskText.textContent = 'Médio (' + uniqueDataPoints + ' pontos)';
        } else {
            fill.className = 'risk-fill risk-high';
            riskText.textContent = 'Alto (' + uniqueDataPoints + ' pontos)';
        }

        updateLog();

        document.getElementById('statusText').textContent =
            'Coleta concluída — ' + uniqueDataPoints + ' pontos de dados identificados';
        document.getElementById('statusDot').className = 'status-dot';
    }

    let logEntries = [];

    function updateLog() {
        const entry = {
            timestamp: new Date().toISOString(),
            ip: data.ip,
            userAgent: data.userAgent,
            platform: data.platform,
            screen: data.screenWidth + 'x' + data.screenHeight,
            timezone: data.timezone,
            language: data.language,
            cookiesEnabled: data.cookiesEnabled,
            referrer: data.referrer,
            hardwareConcurrency: data.hardwareConcurrency,
            deviceMemory: data.deviceMemory,
            fingerprintHash: document.getElementById('fingerprintHash').textContent
        };

        if (logEntries.length === 0 ||
            JSON.stringify(entry) !== JSON.stringify(logEntries[logEntries.length - 1])) {
            logEntries.push(entry);
        }

        document.getElementById('logOutput').textContent = JSON.stringify(logEntries, null, 2);
        document.getElementById('logCount').textContent = logEntries.length + ' registro(s) nesta sessão';
    }

    window.exportLog = function() {
        const blob = new Blob([JSON.stringify(logEntries, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'visitors_log_' + Date.now() + '.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    window.clearLog = function() {
        logEntries = [];
        document.getElementById('logOutput').textContent = '[]';
        document.getElementById('logCount').textContent = '0 registros';
    };

    window.copyText = function(id) {
        const el = document.getElementById(id);
        navigator.clipboard.writeText(el.textContent);
    };

    renderAll();
    fetchIP();

    setInterval(() => {
        data.localTime = new Date().toLocaleString();
        data.utcTime = new Date().toUTCString();
        renderAll();
    }, 5000);

})();