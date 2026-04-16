document.addEventListener('DOMContentLoaded', function () {
  const pixelsList = document.getElementById('pixelsList');
  const pixelTemplate = document.getElementById('pixelTemplate');
  
  function addPixel(pixel) {
    const pixelElement = pixelTemplate.content.cloneNode(true);
    pixelElement.querySelector('.pixelId').textContent = pixel.id;
    pixelElement.querySelector('.pixelLabel').textContent = pixel.label;
    pixelElement.querySelector('.pixelCreationDate').textContent = pixel.creationDate;
    pixelElement.querySelector('.pixelReadCount').textContent = pixel.readCount;
    pixelElement.querySelector('.pixelLastRead').textContent = pixel.lastRead;
    pixelsList.appendChild(pixelElement);
  }

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
          creationDate: pixel.created_at,
          readCount: pixel.read_count,
          lastRead: pixel.last_read_at
        });
      });
    })
    .catch(err => {
      const error = document.createElement('p');
      error.id = 'fetchError';
      error.textContent = err.message.includes('Failed to fetch')
        ? 'Cannot reach the server.'
        : err.message;
      document.getElementById('content').appendChild(error);
    });
});
