document.addEventListener('DOMContentLoaded', function () {
    const pixels = [];

    // Get HTML elements
    const pixelsList = document.getElementById('pixelsList');
    const pixelTemplate = document.getElementById('pixelTemplate');
    const reloadPixelsButton = document.getElementById('reloadPixels');
  
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
                e.target.disabled = false;
            })
        }
    });

    // Event listener for the reload button
    reloadPixelsButton.addEventListener('click', function() {
        reloadPixelsButton.querySelector('svg').classList.add('loading');
        fetchPixels();
    });
});