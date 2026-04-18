(() => {
    if (window.__emailTrackerInjected) return;
    window.__emailTrackerInjected = true;

    const observer = new MutationObserver(() => {
        const subjectInput = document.querySelector('.composer-meta:has(.composer-light-field-container)');
        if (!subjectInput || document.getElementById('emailTrackerButton')) return;

        // Injection of the tracker button
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
                            id="email-tracker-name" 
                            placeholder="Tracker Label" 
                            class="input-element w-full" 
                            value=""
                        >
                    </div>
                </div>
                <button
                    class="button button-for-icon button-small button-ghost-norm text-left text-no-decoration text-strong relative color-inherit text-sm text-ellipsis shrink-0"
                    id="emailTrackerButton"
                    tabindex="-1"
                    aria-busy="false"
                    type="button"
                    title="Create and insert pixel"
                >
                    Create and insert pixel
                </button>
            </div>`
        );
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();
