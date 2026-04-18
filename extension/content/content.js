(() => {
    if (window.__emailTrackerInjected) return;
    window.__emailTrackerInjected = true;

    const observer = new MutationObserver(() => {
        const subjectInput = document.querySelector('.composer-meta:has(.composer-light-field-container)');
        if (!subjectInput || document.getElementById('emailPixelButton')) return;

        // Injection of the pixel button
        subjectInput.insertAdjacentHTML(
            'beforeend', 
            `<div
                class="flex flex-row flex-nowrap flex-column md:flex-row items-stretch md:items-center mt-0 composer-light-field-container"
            >
                <div
                    class="input flex flex-nowrap items-stretch flex-1 relative composer-light-field composer-meta-input-subject"
                >
                    <div
                        class="flex flex-1"
                    >
                        <input 
                            autocomplete="off" 
                            autocapitalize="off" 
                            autocorrect="off" 
                            spellcheck="false" 
                            aria-invalid="false"
                            id="email-pixel-name" 
                            placeholder="Pixel Label" 
                            class="input-element w-full" 
                            value=""
                        >
                    </div>
                </div>
                <button
                    class="button button-for-icon button-small button-ghost-norm text-left text-no-decoration text-strong relative color-inherit text-sm text-ellipsis shrink-0"
                    id="emailPixelButton"
                    tabindex="-1"
                    aria-busy="false"
                    type="button"
                    title="Create and insert pixel"
                >
                    Create and insert pixel
                </button>
            </div>`
        );

        const button = document.getElementById('emailPixelButton');
        const pixelLabel = document.getElementById('email-pixel-name');
        button.addEventListener('click', () => {
            const mailEditor = document.getElementById('rooster-editor');
            if (!mailEditor) return;
            button.disabled = true;
            fetch(`${CONFIG.API_URL}/pixels`, {
                method: 'POST',
                headers: { 'X-API-Key': CONFIG.API_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    label: pixelLabel.value
                })
            })
            .then(response => {
                if (!response.ok) throw new Error(`Server error: ${response.status}`);
                return response.json();
            })
            .then((data) => {
                pixelLabel.value = '';
                const imgContainer = document.createElement('div');
                imgContainer.style.fontFamily = 'Arial, sans-serif';
                imgContainer.style.fontSize = '14px';
                imgContainer.style.color = 'rgb(0, 0, 0)';
                const img = document.createElement('img');
                img.width = 1;
                img.height = 1;
                img.src = data.url;
                img.alt = '';
                imgContainer.appendChild(img);
                mailEditor.insertAdjacentElement('beforeend', imgContainer);
            })
            .catch(() => {
                // Display error message
                button.textContent = 'Error';
                setTimeout(() => {
                    button.textContent = 'Create and insert pixel';
                }, 2000);
            })
            .finally(() => {
                button.disabled = false;
            })
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();