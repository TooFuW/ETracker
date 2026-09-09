function detectEmailClient(userAgent) {
    if (!userAgent) return null;
    const ua = userAgent.toLowerCase();
    if (ua.includes('googleimageproxy')) return 'Gmail (via Google proxy)';
    if (ua.includes('yahoo')) return 'Yahoo Mail';
    if (ua.includes('outlook-ios') || ua.includes('outlookandroid')) return 'Outlook mobile';
    if (ua.includes('microsoft outlook')) return 'Outlook';
    if (ua.includes('thunderbird')) return 'Thunderbird';
    if (ua.includes('applewebkit') && ua.includes('mime')) return 'Apple Mail';
    if (ua.includes('protonmail') || ua.includes('proton')) return 'Proton Mail';
    return null;
}

document.addEventListener('DOMContentLoaded', async function () {
    const pixels = [];
    let selectedPixelId = null;

    // Get HTML elements
    const pixelsList = document.getElementById('pixelsList');
    const pixelTemplate = document.getElementById('pixelTemplate');
    const reloadPixelsButton = document.getElementById('reloadPixels');
    const createPixelButton = document.getElementById('createPixel');
    const openSettingsButton = document.getElementById('openSettings');
    const pixelCreation = document.getElementById('pixelCreation');
    const pixelCreated = document.getElementById('pixelCreated');
    const confirmCreatePixelButton = document.getElementById('confirmCreatePixel');
    const copyPixelUrlButton = document.getElementById('copyPixelUrl');

    openSettingsButton.addEventListener('click', () => chrome.runtime.openOptionsPage());

    const stored = await chrome.storage.local.get(['apiUrl', 'apiKey']);
    if (!stored.apiUrl || !stored.apiKey) {
        reloadPixelsButton.disabled = true;
        createPixelButton.disabled = true;
        const hint = document.createElement('p');
        hint.className = 'noPixelSelected';
        hint.textContent = 'Set your server URL and API key in Settings to get started.';
        document.getElementById('content').appendChild(hint);
        return;
    }
    const CONFIG = { API_URL: stored.apiUrl, API_KEY: stored.apiKey };

    function showError(message) {
        clearError();
        const error = document.createElement('p');
        error.id = 'fetchError';
        error.textContent = message;
        document.getElementById('content').appendChild(error);
    }
    function clearError() {
        document.getElementById('fetchError')?.remove();
    }

    // Parse a fetch response, surfacing the server's own error message when available
    async function parseJsonResponse(response) {
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || `Server error: ${response.status}`);
        if (data === null) throw new Error('Invalid response from server.');
        return data;
    }

    // Add a pixel to the list
    function addPixel(pixel) {
        const pixelElement = pixelTemplate.content.cloneNode(true);
        pixelElement.querySelector('.pixelRow').id = `pixel-${pixel.id}`;
        pixelElement.querySelector('.pixelLabel').textContent = pixel.label;
        pixelElement.querySelector('.pixelReadCount').textContent = pixel.readCount;
        pixelsList.appendChild(pixelElement);
    }

    // Show pixel details in the right panel
    function showDetails(pixelId) {
        const pixel = pixels.find(p => p.id === pixelId);
        selectedPixelId = pixel ? pixelId : null;

        document.querySelectorAll('.pixelRow').forEach(row => {
            row.classList.toggle('selected', row.id === `pixel-${selectedPixelId}`);
        });

        const detailsBlock = document.getElementById('detailsBlock');
        detailsBlock.innerHTML = '';

        if (!pixel) {
            const hint = document.createElement('p');
            hint.className = 'noPixelSelected';
            hint.textContent = 'Select a pixel to see its details';
            detailsBlock.appendChild(hint);
            return;
        }

        const fmt = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' };
        const creationDate = new Date(pixel.created_at).toLocaleString('en-EN', fmt);
        const lastRead = pixel.last_read_at ? new Date(pixel.last_read_at).toLocaleString('en-EN', fmt) : 'Never';

        const details = document.createElement('div');
        details.id = 'pixelDetails';

        const labelEl = document.createElement('h3');
        labelEl.id = 'detailLabel';
        labelEl.textContent = pixel.label;
        details.appendChild(labelEl);

        const copyButton = document.createElement('button');
        copyButton.id = 'copyPixelDetail';
        copyButton.dataset.pixelId = pixelId;
        copyButton.textContent = 'Copy Pixel';
        details.appendChild(copyButton);

        function makeRow(title, value) {
            const row = document.createElement('div');
            row.className = 'detailRow';
            const t = document.createElement('span');
            t.className = 'detailRowTitle';
            t.textContent = title;
            const v = document.createElement('span');
            v.className = 'detailRowValue';
            v.textContent = value;
            row.appendChild(t);
            row.appendChild(v);
            return row;
        }

        details.appendChild(makeRow('Created', creationDate));
        details.appendChild(makeRow('Last opened', lastRead));
        details.appendChild(makeRow('Opens', pixel.read_count));

        const readsSection = document.createElement('div');
        readsSection.id = 'readsSection';

        const readsSectionTitle = document.createElement('p');
        readsSectionTitle.id = 'readsSectionTitle';
        readsSectionTitle.textContent = 'Open history';
        readsSection.appendChild(readsSectionTitle);

        const readsLoading = document.createElement('p');
        readsLoading.id = 'readsLoading';
        readsLoading.textContent = 'Loading...';
        readsSection.appendChild(readsLoading);

        details.appendChild(readsSection);

        const deleteBtn = document.createElement('button');
        deleteBtn.id = 'deletePixel';
        deleteBtn.dataset.pixelId = pixelId;
        deleteBtn.textContent = 'Delete';
        details.appendChild(deleteBtn);

        detailsBlock.appendChild(details);

        fetch(`${CONFIG.API_URL}/pixels/${pixelId}/reads`, {
            headers: { 'X-API-Key': CONFIG.API_KEY }
        })
        .then(r => {
            if (!r.ok) throw new Error();
            return r.json();
        })
        .then(reads => {
            readsLoading.remove();
            if (reads.length === 0) {
                const noReads = document.createElement('p');
                noReads.id = 'noReads';
                noReads.textContent = 'No opens recorded yet';
                readsSection.appendChild(noReads);
                return;
            }
            reads.forEach(read => {
                const entry = document.createElement('div');
                entry.className = 'readEntry';

                const dateEl = document.createElement('span');
                dateEl.className = 'readEntryDate';
                dateEl.textContent = new Date(read.read_at).toLocaleString('en-EN', fmt);
                entry.appendChild(dateEl);

                const metaParts = [];
                const client = detectEmailClient(read.user_agent);
                if (client) metaParts.push(client);
                if (read.country) metaParts.push(read.country + (read.city ? ` (${read.city})` : ''));
                if (read.accept_language) metaParts.push(read.accept_language.split(',')[0]);
                if (read.ip) metaParts.push(read.ip);

                if (metaParts.length > 0) {
                    const metaEl = document.createElement('span');
                    metaEl.className = 'readEntryMeta';
                    metaEl.textContent = metaParts.join(' • ');
                    entry.appendChild(metaEl);
                }

                readsSection.appendChild(entry);
            });
        })
        .catch(() => {
            readsLoading.textContent = 'Failed to load history';
        });
    }

    // Fetch pixels from the server
    function fetchPixels() {
        reloadPixelsButton.disabled = true;
        clearError();
        fetch(`${CONFIG.API_URL}/pixels`, {
            headers: { 'X-API-Key': CONFIG.API_KEY }
        })
        .then(parseJsonResponse)
        .then(data => {
            pixels.length = 0;
            data.forEach(pixel => {
                pixels.push(pixel);
            });
            renderPixels();
        })
        .catch(err => {
            showError(err.message.includes('Failed to fetch') ? 'Cannot reach the server.' : err.message);
        })
        .finally(() => {
            setTimeout(() => {
                reloadPixelsButton.disabled = false;
                reloadPixelsButton.querySelector('svg').classList.remove('loading');
            }, 500);
        });
    }
    
    // Render pixels in the list
    function renderPixels() {
        pixelsList.innerHTML = '';
        if (pixels.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'noPixelSelected';
            empty.textContent = 'No pixels found';
            pixelsList.appendChild(empty);
        } else {
            pixels.forEach(pixel => {
                addPixel({ id: pixel.id, label: pixel.label, readCount: pixel.read_count });
            });
        }
        showDetails(selectedPixelId);
    }
    
    // Load pixels when the popup opens
    reloadPixelsButton.querySelector('svg').classList.add('loading');
    fetchPixels();
    
    function copyPixelAsRichText(pixelId, button) {
        const origin = new URL(CONFIG.API_URL).origin;
        const imgHtml = `<img width="1" height="1" src="${origin}/pixel/${pixelId}" alt="" />`;
        const htmlBlob = new Blob([imgHtml], { type: 'text/html' });
        const textBlob = new Blob([imgHtml], { type: 'text/plain' });
        navigator.clipboard.write([
            new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob })
        ]).then(() => {
            const original = button.textContent;
            button.textContent = 'Copied !';
            setTimeout(() => { button.textContent = original; }, 2000);
        }).catch(() => {
            const original = button.textContent;
            button.textContent = 'Error';
            setTimeout(() => { button.textContent = original; }, 2000);
        });
    }

    // Add event listener for delete buttons
    document.addEventListener('click', function(e) {
        const copyDetailBtn = e.target.closest('#copyPixelDetail');
        if (copyDetailBtn) {
            copyPixelAsRichText(copyDetailBtn.dataset.pixelId, copyDetailBtn);
            return;
        }

        const deleteBtn = e.target.closest('#deletePixel');
        if (deleteBtn) {
            const deleteModal = document.getElementById('deleteModal');
            deleteModal.querySelector('#confirmDelete').dataset.pixelId = deleteBtn.dataset.pixelId;
            deleteModal.style.display = 'flex';
            return;
        }

        const row = e.target.closest('.pixelRow');
        if (row) {
            showDetails(row.id.replace('pixel-', ''));
            return;
        }

        if (e.target.id === 'cancelDelete') {
            // Hide delete modal
            const deleteModal = document.getElementById('deleteModal');
            deleteModal.style.display = 'none';
        }
        
        else if (e.target.id === 'confirmDelete') {
            const pixelId = e.target.dataset.pixelId;
            
            // Fetch pixel deletion
            e.target.disabled = true;
            clearError();
            fetch(`${CONFIG.API_URL}/pixels/${pixelId}`, {
                method: 'DELETE',
                headers: { 'X-API-Key': CONFIG.API_KEY }
            })
            .then(parseJsonResponse)
            .then(() => {
                fetchPixels();
            })
            .catch(err => {
                showError(err.message.includes('Failed to fetch') ? 'Cannot reach the server.' : err.message);
            })
            .finally(() => {
                const deleteModal = document.getElementById('deleteModal');
                deleteModal.style.display = 'none';
                e.target.disabled = false;
            })
        }
    });

    // Event listener for the reload button
    reloadPixelsButton.addEventListener('click', function() {
        reloadPixelsButton.querySelector('svg').classList.add('loading');
        fetchPixels();
    });
    
    // Event listener for the create pixel button
    createPixelButton.addEventListener('click', function() {
        if (pixelCreated.classList.contains('active')) {
            pixelCreation.classList.remove('active');
            pixelCreated.classList.remove('active');
        } else {
            pixelCreation.classList.toggle('active');
        }
    });

    document.getElementById('pixelLabel').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') confirmCreatePixelButton.click();
    });

    // Creation of a new pixel
    confirmCreatePixelButton.addEventListener('click', function() {
        confirmCreatePixelButton.disabled = true;
        clearError();
        fetch(`${CONFIG.API_URL}/pixels`, {
            method: 'POST',
            headers: { 'X-API-Key': CONFIG.API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                label: document.getElementById('pixelLabel').value
            })
        })
        .then(parseJsonResponse)
        .then((data) => {
            document.getElementById('pixelLabel').value = '';
            document.getElementById('pixelUrl').value = `<img width="1" height="1" src="${data.url}" alt="" />`;
            pixelCreation.classList.remove('active');
            pixelCreated.classList.add('active');
            fetchPixels();
        })
        .catch(err => {
            showError(err.message.includes('Failed to fetch') ? 'Cannot reach the server.' : err.message);
        })
        .finally(() => {
            confirmCreatePixelButton.disabled = false;
        })
    })

    // Copy pixel as rich text so it can be pasted directly into email body
    copyPixelUrlButton.addEventListener('click', function() {
        const imgHtml = document.getElementById('pixelUrl').value;
        const htmlBlob = new Blob([imgHtml], { type: 'text/html' });
        const textBlob = new Blob([imgHtml], { type: 'text/plain' });
        navigator.clipboard.write([
            new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob })
        ]).then(() => {
            copyPixelUrlButton.textContent = 'Copied !';
            setTimeout(() => { copyPixelUrlButton.textContent = 'Copy'; }, 2000);
        }).catch(() => {
            copyPixelUrlButton.textContent = 'Error';
            setTimeout(() => { copyPixelUrlButton.textContent = 'Copy'; }, 2000);
        });
    });
});