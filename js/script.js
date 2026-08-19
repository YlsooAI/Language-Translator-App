const fromText = document.querySelector(".from-text"),
toText = document.querySelector(".to-text"),
exchageIcon = document.querySelector(".exchange-btn"),
charCount = document.querySelector(".char-count");

// Comprehensive language list with 100+ languages
const languages = {
    "auto": "Detect Language",
    "af": "Afrikaans",
    "sq": "Albanian",
    "am": "Amharic",
    "ar": "Arabic",
    "hy": "Armenian",
    "az": "Azerbaijani",
    "eu": "Basque",
    "be": "Belarusian",
    "bn": "Bengali",
    "bs": "Bosnian",
    "bg": "Bulgarian",
    "ca": "Catalan",
    "ceb": "Cebuano",
    "zh-CN": "Chinese (Simplified)",
    "zh-TW": "Chinese (Traditional)",
    "co": "Corsican",
    "hr": "Croatian",
    "cs": "Czech",
    "da": "Danish",
    "nl": "Dutch",
    "en": "English",
    "eo": "Esperanto",
    "et": "Estonian",
    "fi": "Finnish",
    "fr": "French",
    "fy": "Frisian",
    "gl": "Galician",
    "ka": "Georgian",
    "de": "German",
    "el": "Greek",
    "gu": "Gujarati",
    "ht": "Haitian Creole",
    "ha": "Hausa",
    "haw": "Hawaiian",
    "he": "Hebrew",
    "hi": "Hindi",
    "hmn": "Hmong",
    "hu": "Hungarian",
    "is": "Icelandic",
    "ig": "Igbo",
    "id": "Indonesian",
    "ga": "Irish",
    "it": "Italian",
    "ja": "Japanese",
    "jv": "Javanese",
    "kn": "Kannada",
    "kk": "Kazakh",
    "km": "Khmer",
    "rw": "Kinyarwanda",
    "ko": "Korean",
    "ku": "Kurdish",
    "ky": "Kyrgyz",
    "lo": "Lao",
    "la": "Latin",
    "lv": "Latvian",
    "lt": "Lithuanian",
    "lb": "Luxembourgish",
    "mk": "Macedonian",
    "mg": "Malagasy",
    "ms": "Malay",
    "ml": "Malayalam",
    "mt": "Maltese",
    "mi": "Maori",
    "mr": "Marathi",
    "mn": "Mongolian",
    "my": "Myanmar (Burmese)",
    "ne": "Nepali",
    "no": "Norwegian",
    "ny": "Nyanja (Chichewa)",
    "or": "Odia (Oriya)",
    "ps": "Pashto",
    "fa": "Persian",
    "pl": "Polish",
    "pt": "Portuguese",
    "pa": "Punjabi",
    "ro": "Romanian",
    "ru": "Russian",
    "sm": "Samoan",
    "gd": "Scots Gaelic",
    "sr": "Serbian",
    "st": "Sesotho",
    "sn": "Shona",
    "sd": "Sindhi",
    "si": "Sinhala",
    "sk": "Slovak",
    "sl": "Slovenian",
    "so": "Somali",
    "es": "Spanish",
    "su": "Sundanese",
    "sw": "Swahili",
    "sv": "Swedish",
    "tl": "Tagalog (Filipino)",
    "tg": "Tajik",
    "ta": "Tamil",
    "tt": "Tatar",
    "te": "Telugu",
    "th": "Thai",
    "tr": "Turkish",
    "tk": "Turkmen",
    "uk": "Ukrainian",
    "ur": "Urdu",
    "ug": "Uyghur",
    "uz": "Uzbek",
    "vi": "Vietnamese",
    "cy": "Welsh",
    "xh": "Xhosa",
    "yi": "Yiddish",
    "yo": "Yoruba",
    "zu": "Zulu"
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

// Camera Translation Feature
const cameraBtn = document.getElementById('camera-btn');
const closeCameraBtn = document.getElementById('close-camera-btn');
const cameraOverlay = document.getElementById('camera-overlay');
const cameraFeed = document.getElementById('camera-feed');
const translationBubble = document.getElementById('translation-bubble');
const bubbleText = document.getElementById('bubble-text');

let isCameraActive = false;
let scanInterval = null;
let lastDetectedText = '';

// Open camera
cameraBtn.addEventListener('click', async () => {
    try {
        // Request camera access
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' } // Use back camera on mobile
        });
        
        cameraFeed.srcObject = stream;
        cameraOverlay.classList.add('active');
        isCameraActive = true;
        
        // Start scanning every 2 seconds
        startScanning();
    } catch (error) {
        console.error('Camera access denied:', error);
        alert('Camera access is required for this feature. Please allow camera permissions and try again.');
    }
});

// Close camera
closeCameraBtn.addEventListener('click', () => {
    stopCamera();
});

function stopCamera() {
    if (cameraFeed.srcObject) {
        const tracks = cameraFeed.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        cameraFeed.srcObject = null;
    }
    
    cameraOverlay.classList.remove('active');
    isCameraActive = false;
    
    if (scanInterval) {
        clearInterval(scanInterval);
        scanInterval = null;
    }
    
    translationBubble.classList.remove('visible');
    lastDetectedText = '';
}

function startScanning() {
    // Scan every 2 seconds
    scanInterval = setInterval(async () => {
        if (!isCameraActive) return;
        
        try {
            // Capture current frame from video
            const canvas = document.createElement('canvas');
            canvas.width = cameraFeed.videoWidth;
            canvas.height = cameraFeed.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(cameraFeed, 0, 0, canvas.width, canvas.height);
            
            // Get image data for OCR
            const imageData = canvas.toDataURL('image/jpeg', 0.8);
            
            // Show scanning status
            const scanStatus = document.querySelector('.scan-status');
            scanStatus.style.opacity = '0.7';
            
            // Use Tesseract.js for OCR
            const worker = Tesseract.createWorker({
                logger: m => {
                    if (m.status === 'recognizing text') {
                        scanStatus.style.opacity = '1';
                    }
                }
            });
            
            await worker.load();
            await worker.loadLanguage('eng');
            await worker.initialize('eng');
            
            const { data: { text } } = await worker.recognize(imageData);
            await worker.terminate();
            
            // If text detected and different from last, translate it
            const trimmedText = text.trim().replace(/\s+/g, ' ');
            
            if (trimmedText && trimmedText !== lastDetectedText && trimmedText.length > 2) {
                lastDetectedText = trimmedText;
                
                // Show bubble with loading state
                bubbleText.textContent = 'Translating...';
                translationBubble.classList.add('visible');
                
                // Translate the detected text
                const translateFrom = fromLang.split("-")[0];
                const translateTo = toLang.split("-")[0];
                
                const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${translateFrom}&tl=${translateTo}&dt=t&q=${encodeURIComponent(trimmedText)}`;
                
                try {
                    const response = await fetch(url);
                    const data = await response.json();
                    
                    let translatedText = data[0]
                        .filter(item => item[0])
                        .map(item => item[0])
                        .join('');
                    
                    // Update bubble with translated text
                    bubbleText.textContent = translatedText;
                    
                    // Auto-hide bubble after 4 seconds of no new text
                    clearTimeout(window.bubbleHideTimeout);
                    window.bubbleHideTimeout = setTimeout(() => {
                        if (isCameraActive) {
                            translationBubble.classList.remove('visible');
                        }
                    }, 4000);
                    
                } catch (error) {
                    console.error('Translation error:', error);
                    bubbleText.textContent = 'Translation failed';
                }
            } else if (!trimmedText) {
                // No text detected, hide bubble
                translationBubble.classList.remove('visible');
            }
            
            scanStatus.style.opacity = '1';
            
        } catch (error) {
            console.error('OCR error:', error);
        }
    }, 2000);
}