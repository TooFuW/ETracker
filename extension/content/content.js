(() => {
    if (window.__emailTrackerInjected) return;
    window.__emailTrackerInjected = true;

    // PROTONMAIL
    if (location.hostname.includes('mail.proton.me')) {
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
                                spellcheck="true"
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

            pixelLabel.addEventListener('input', () => {
                button.disabled = !pixelLabel.value.trim();
            });
            pixelLabel.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') button.click();
            });
            button.disabled = true;

            button.addEventListener('click', () => {
                let mailEditor = document.getElementById('rooster-editor');
                if (!mailEditor) {
                    for (const iframe of document.querySelectorAll('iframe')) {
                        try {
                            mailEditor = iframe.contentDocument?.getElementById('rooster-editor');
                            if (mailEditor) break;
                        } catch (e) {}
                    }
                }
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
                    button.textContent = 'Pixel created';
                    setTimeout(() => {
                        button.textContent = 'Create and insert pixel';
                    }, 2000);
                })
                .catch(() => {
                    button.textContent = 'Error';
                    setTimeout(() => {
                        button.textContent = 'Create and insert pixel';
                    }, 2000);
                })
                .finally(() => {
                    button.disabled = !pixelLabel.value.trim();
                })
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    // GMAIL
    if (location.hostname.includes('mail.google.com')) {
        const observer = new MutationObserver(() => {
            const subjectInput = document.querySelector('form.bAs');
            if (!subjectInput || document.getElementById('emailPixelButton')) return;

            // Injection of the pixel button
            subjectInput.insertAdjacentHTML(
                'beforeend',
                `<div id="pixelBox" class="aoD az6" style="display: flex; align-items: center">
                    <input
                        name="pixelbox"
                        id="email-pixel-name"
                        class="aoT"
                        autocomplete="off"
                        spellcheck="true"
                        tabindex="1"
                        placeholder="Pixel Label"
                        aria-label="Pixel Label"
                    >
                    <button
                        id="emailPixelButton"
                        tabindex="-1"
                        aria-busy="false"
                        type="button"
                        title="Create and insert pixel"
                        style="white-space: nowrap; background-color: transparent; border: none;"
                        class="aB gQ pE"
                    >
                        Create and insert pixel
                    </button>
                </div>`
            );

            const button = document.getElementById('emailPixelButton');
            const pixelLabel = document.getElementById('email-pixel-name');

            pixelLabel.addEventListener('input', () => {
                button.disabled = !pixelLabel.value.trim();
            });
            pixelLabel.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') button.click();
            });
            button.disabled = true;

            button.addEventListener('click', () => {
                const mailEditor = document.querySelector('div[g_editable="true"][contenteditable="true"].editable');
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
                    const img = document.createElement('img');
                    img.width = 1;
                    img.height = 1;
                    img.src = data.url;
                    img.alt = '';
                    imgContainer.appendChild(img);
                    mailEditor.insertAdjacentElement('beforeend', imgContainer);
                    button.textContent = 'Pixel created';
                    setTimeout(() => {
                        button.textContent = 'Create and insert pixel';
                    }, 2000);
                })
                .catch(() => {
                    button.textContent = 'Error';
                    setTimeout(() => {
                        button.textContent = 'Create and insert pixel';
                    }, 2000);
                })
                .finally(() => {
                    button.disabled = !pixelLabel.value.trim();
                })
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }
})();
