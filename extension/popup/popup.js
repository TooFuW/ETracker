document.addEventListener('DOMContentLoaded', function () {
    const pixels = [];

    // Get HTML elements
    const pixelsList = document.getElementById('pixelsList');
    const pixelTemplate = document.getElementById('pixelTemplate');
    const reloadPixelsButton = document.getElementById('reloadPixels');
    const createPixelButton = document.getElementById('createPixel');
    const pixelCreation = document.getElementById('pixelCreation');
    const pixelCreated = document.getElementById('pixelCreated');
    const confirmCreatePixelButton = document.getElementById('confirmCreatePixel');
    const copyPixelUrlButton = document.getElementById('copyPixelUrl');
  
    // Add a pixel to the list
    function addPixel(pixel) {
        const pixelElement = pixelTemplate.content.cloneNode(true);
        pixelElement.querySelector('.pixelRow').id = `pixel-${pixel.id}`;
        pixelElement.querySelector('.pixelLabel').textContent = pixel.label;
        pixelElement.querySelector('.pixelCreationDate').textContent = `Created : ${pixel.creationDate}`;
        pixelElement.querySelector('.pixelReadCount').textContent = pixel.readCount;
        pixelElement.querySelector('.pixelLastRead').textContent = pixel.lastRead ? `Last read : ${pixel.lastRead}` : 'Not read yet';
        pixelElement.querySelector('.deletePixel').dataset.pixelId = pixel.id;
        pixelsList.appendChild(pixelElement);
    }

    // Fetch pixels from the server
    function fetchPixels() {
        reloadPixelsButton.disabled = true;
        fetch(`${CONFIG.API_URL}/pixels`, {
            headers: { 'X-API-Key': CONFIG.API_KEY }
        })
        .then(response => {
            if (!response.ok) throw new Error(`Server error: ${response.status}`);
            return response.json();
        })
        .then(data => {
            pixels.length = 0;
            data.forEach(pixel => {
                pixels.push(pixel);
            });
            renderPixels();
        })
        .catch(err => {
            // Display error message
            const error = document.createElement('p');
            error.id = 'fetchError';
            error.textContent = err.message.includes('Failed to fetch')
                ? 'Cannot reach the server.'
                : err.message;
            document.getElementById('content').appendChild(error);
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
        pixels.forEach(pixel => {
            addPixel({
                id: pixel.id,
                label: pixel.label,
                creationDate: new Date(pixel.created_at).toLocaleString('en-EN', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }),
                readCount: pixel.read_count,
                lastRead: pixel.last_read_at ? new Date(pixel.last_read_at).toLocaleString('en-EN', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }) : '',
            });
        });
    }
    
    // Load pixels when the popup opens
    fetchPixels();
    
    // Add event listener for delete buttons
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('deletePixel')) {
            // Show delete modal
            const deleteModal = document.getElementById('deleteModal');
            deleteModal.querySelector('#confirmDelete').dataset.pixelId = e.target.dataset.pixelId;
            deleteModal.style.display = 'flex';
        }

        else if (e.target.id === 'cancelDelete') {
            // Hide delete modal
            const deleteModal = document.getElementById('deleteModal');
            deleteModal.style.display = 'none';
        }
        
        else if (e.target.id === 'confirmDelete') {
            const pixelId = e.target.dataset.pixelId;
            
            // Fetch pixel deletion
            e.target.disabled = true;
            fetch(`${CONFIG.API_URL}/pixels/${pixelId}`, {
                method: 'DELETE',
                headers: { 'X-API-Key': CONFIG.API_KEY }
            })
            .then(response => {
                if (!response.ok) throw new Error(`Server error: ${response.status}`);
                return response.json();
            })
            .then(() => {
                fetchPixels();
            })
            .catch(err => {
                // Display error message
                const error = document.createElement('p');
                error.id = 'fetchError';
                error.textContent = err.message.includes('Failed to fetch')
                    ? 'Cannot reach the server.'
                    : err.message;
                document.getElementById('content').appendChild(error);
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

    // Creation of a new pixel
    confirmCreatePixelButton.addEventListener('click', function() {
        confirmCreatePixelButton.disabled = true;
        fetch(`${CONFIG.API_URL}/pixels`, {
            method: 'POST',
            headers: { 'X-API-Key': CONFIG.API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                label: document.getElementById('pixelLabel').value
            })
        })
        .then(response => {
            if (!response.ok) throw new Error(`Server error: ${response.status}`);
            return response.json();
        })
        .then((data) => {
            document.getElementById('pixelLabel').value = '';
            document.getElementById('pixelUrl').value = `<img width="1" height="1" src="${data.url}" alt="" />`;
            pixelCreation.classList.remove('active');
            pixelCreated.classList.add('active');
            fetchPixels();
        })
        .catch(err => {
            // Display error message
            const error = document.createElement('p');
            error.id = 'fetchError';
            error.textContent = err.message.includes('Failed to fetch')
                ? 'Cannot reach the server.'
                : err.message;
            document.getElementById('content').appendChild(error);
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
            setTimeout(() => {
                copyPixelUrlButton.textContent = 'Copy';
            }, 2000);
        }).catch(err => {
            copyPixelUrlButton.textContent = 'Error';
            setTimeout(() => {
                copyPixelUrlButton.textContent = 'Copy';
            }, 2000);
        });
    });
});