document.addEventListener('DOMContentLoaded', function () {
    // Get HTML elements
    const pixelsList = document.getElementById('pixelsList');
    const pixelTemplate = document.getElementById('pixelTemplate');
  
    // Add a pixel to the list
    function addPixel(pixel) {
        const pixelElement = pixelTemplate.content.cloneNode(true);
        pixelElement.querySelector('.pixelRow').id = `pixel-${pixel.id}`;
        pixelElement.querySelector('.pixelLabel').textContent = pixel.label;
        pixelElement.querySelector('.pixelCreationDate').textContent = pixel.creationDate;
        pixelElement.querySelector('.pixelReadCount').textContent = pixel.readCount;
        pixelElement.querySelector('.pixelLastRead').textContent = pixel.lastRead;
        pixelElement.querySelector('.deletePixel').dataset.pixelId = pixel.id;
        pixelsList.appendChild(pixelElement);
    }

    // Fetch pixels from the server
    fetch(`${CONFIG.API_URL}/pixels`, {
        headers: { 'X-API-Key': CONFIG.API_KEY }
    })
    .then(response => {
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        return response.json();
    })
    .then(data => {
        data.forEach(pixel => {
            addPixel({
                id: pixel.id,
                label: pixel.label,
                creationDate: new Date(pixel.created_at).toLocaleString('en-EN', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }),
                readCount: pixel.read_count,
                lastRead: pixel.last_read_at ? new Date(pixel.last_read_at).toLocaleString('en-EN', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }) : '',
            });
        });
    })
    .catch(err => {
        // Display error message
        const error = document.createElement('p');
        error.id = 'fetchError';
        error.textContent = err.message.includes('Failed to fetch')
            ? 'Cannot reach the server.'
            : err.message;
        document.getElementById('content').appendChild(error);
    });
    
    // Add event listener for delete buttons
    document.addEventListener('click', function(e) {
        console.log(e.target);
        if (e.target.classList.contains('deletePixel')) {
            const pixelId = e.target.dataset.pixelId;
            console.log('Pixel ID:', pixelId);
            
            // Fetch pixel deletion
            fetch(`${CONFIG.API_URL}/pixels/${pixelId}`, {
                method: 'DELETE',
                headers: { 'X-API-Key': CONFIG.API_KEY }
            })
            .then(response => {
                if (!response.ok) throw new Error(`Server error: ${response.status}`);
                return response.json();
            })
            .then(() => {
                pixelsList.removeChild(document.getElementById(`pixel-${pixelId}`));
            })
            .catch(err => {
                // Display error message
                const error = document.createElement('p');
                error.id = 'fetchError';
                error.textContent = err.message.includes('Failed to fetch')
                    ? 'Cannot reach the server.'
                    : err.message;
                document.getElementById('content').appendChild(error);
            });
        }
    });
});
