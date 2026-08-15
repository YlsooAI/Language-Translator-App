const fromText = document.querySelector(".from-text"),
toText = document.querySelector(".to-text"),
exchageIcon = document.querySelector(".exchange-btn"),
charCount = document.querySelector(".char-count");

// Language data
const languages = {
    "auto": "Detect Language",
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "ru": "Russian",
    "ja": "Japanese",
    "zh-CN": "Chinese (Simplified)",
    "ko": "Korean",
    "hi": "Hindi",
    "ar": "Arabic"
};

// Current selected languages
let fromLang = "auto";
let toLang = "es";

// Debounce timeout variable
let translateTimeout;

// Initialize custom dropdowns
function initDropdown(dropdownId, selectedValue, onSelect) {
    const dropdown = document.getElementById(dropdownId);
    const trigger = dropdown.querySelector('.dropdown-trigger');
    const menu = dropdown.querySelector('.dropdown-menu');
    const searchInput = dropdown.querySelector('.dropdown-search');
    const optionsContainer = dropdown.querySelector('.dropdown-options');
    const selectedText = trigger.querySelector('.selected-text');
    
    // Populate options
    Object.entries(languages).forEach(([code, name]) => {
        // Skip 'auto' for target language dropdown
        if (dropdownId === 'to-language-dropdown' && code === 'auto') return;
        
        const option = document.createElement('div');
        option.className = 'dropdown-option';
        if (code === selectedValue) {
            option.classList.add('selected');
        }
        option.textContent = name;
        option.dataset.value = code;
        
        option.addEventListener('click', () => {
            onSelect(code, name);
            closeAllDropdowns();
        });
        
        optionsContainer.appendChild(option);
    });
    
    // Toggle dropdown
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isActive = trigger.classList.contains('active');
        closeAllDropdowns();
        if (!isActive) {
            trigger.classList.add('active');
            menu.classList.add('show');
            searchInput.value = '';
            filterOptions(optionsContainer, searchInput.value);
            setTimeout(() => searchInput.focus(), 100);
        }
    });
    
    // Search functionality
    searchInput.addEventListener('input', (e) => {
        filterOptions(optionsContainer, e.target.value);
    });
    
    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target)) {
            trigger.classList.remove('active');
            menu.classList.remove('show');
        }
    });
    
    // Prevent closing when clicking inside menu
    menu.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

function filterOptions(container, searchTerm) {
    const options = container.querySelectorAll('.dropdown-option');
    const term = searchTerm.toLowerCase();
    
    options.forEach(option => {
        const text = option.textContent.toLowerCase();
        if (text.includes(term)) {
            option.style.display = 'flex';
        } else {
            option.style.display = 'none';
        }
    });
}

function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-trigger').forEach(trigger => {
        trigger.classList.remove('active');
    });
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
        menu.classList.remove('show');
    });
}

function updateFromLanguage(code, name) {
    fromLang = code;
    document.querySelector('#from-language-dropdown .selected-text').textContent = name;
    document.querySelector('#from-language-dropdown .dropdown-option.selected')?.classList.remove('selected');
    const newSelected = document.querySelector(`#from-language-dropdown .dropdown-option[data-value="${code}"]`);
    if (newSelected) newSelected.classList.add('selected');
    
    if(fromText.value) {
        clearTimeout(translateTimeout);
        translateTimeout = setTimeout(() => {
            performTranslation();
        }, 500);
    }
}

function updateToLanguage(code, name) {
    toLang = code;
    document.querySelector('#to-language-dropdown .selected-text').textContent = name;
    document.querySelector('#to-language-dropdown .dropdown-option.selected')?.classList.remove('selected');
    const newSelected = document.querySelector(`#to-language-dropdown .dropdown-option[data-value="${code}"]`);
    if (newSelected) newSelected.classList.add('selected');
    
    if(fromText.value) {
        clearTimeout(translateTimeout);
        translateTimeout = setTimeout(() => {
            performTranslation();
        }, 500);
    }
}

// Initialize both dropdowns
initDropdown('from-language-dropdown', fromLang, updateFromLanguage);
initDropdown('to-language-dropdown', toLang, updateToLanguage);

// Swap languages and trigger translation
exchageIcon.addEventListener("click", () => {
    let tempText = fromText.value,
    tempLang = fromLang,
    tempLangName = document.querySelector('#from-language-dropdown .selected-text').textContent;
    
    fromText.value = toText.value;
    toText.value = tempText;
    
    // Swap language values
    const prevFromLang = fromLang;
    const prevFromName = document.querySelector('#from-language-dropdown .selected-text').textContent;
    
    updateFromLanguage(toLang, document.querySelector('#to-language-dropdown .selected-text').textContent);
    updateToLanguage(prevFromLang, prevFromName);
    
    // Trigger translation if there's text after swap
    if(fromText.value) {
        clearTimeout(translateTimeout);
        translateTimeout = setTimeout(() => {
            performTranslation();
        }, 500);
    }
});

// Update character count and trigger auto-translate
fromText.addEventListener("keyup", () => {
    const count = fromText.value.length;
    charCount.textContent = `${count} / 5000`;
    
    if(!fromText.value) {
        toText.value = "";
        hideLoading();
    } else {
        // Debounce the translation - wait 500ms after user stops typing
        clearTimeout(translateTimeout);
        translateTimeout = setTimeout(() => {
            performTranslation();
        }, 500);
    }
});

// Perform translation function
function performTranslation() {
    let text = fromText.value.trim(),
    translateFrom = fromLang.split("-")[0],
    translateTo = toLang.split("-")[0];

    if(!text) return;

    // Show loading state with Apple-like animation
    showLoading();

    // Using Google Translate via a no-key endpoint
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${translateFrom}&tl=${translateTo}&dt=t&q=${encodeURIComponent(text)}`;

    fetch(url)
        .then(res => res.json())
        .then(data => {
            // Extract translation from Google's response format
            let translatedText = data[0]
                .filter(item => item[0])
                .map(item => item[0])
                .join('');
            
            // Reset animation by removing the class first
            toText.classList.remove('fade-in');
            
            // Force reflow to restart animation
            void toText.offsetWidth;
            
            // Set the translated text
            toText.value = translatedText;
            
            // Add fade-in class for smooth Gemini-style animation
            toText.classList.add('fade-in');
            
            hideLoading();
        })
        .catch(error => {
            console.error('Translation error:', error);
            toText.value = "Error: Unable to translate. Please try again.";
            hideLoading();
        });
}

// Show loading indicator with smooth fade-in
function showLoading() {
    const statusDiv = document.querySelector('.translation-status');
    statusDiv.style.opacity = '1';
    statusDiv.style.visibility = 'visible';
}

// Hide loading indicator with smooth fade-out
function hideLoading() {
    const statusDiv = document.querySelector('.translation-status');
    statusDiv.style.opacity = '0';
    statusDiv.style.visibility = 'hidden';
}

// Action buttons (copy only - speak removed for minimal design)
document.getElementById("to-copy").addEventListener("click", () => {
    if(!toText.value) return;
    navigator.clipboard.writeText(toText.value);
});