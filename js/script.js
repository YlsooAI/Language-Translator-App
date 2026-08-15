const fromText = document.querySelector(".from-text"),
toText = document.querySelector(".to-text"),
exchageIcon = document.querySelector(".exchange-btn"),
fromSelect = document.querySelector(".from-language"),
toSelect = document.querySelector(".to-language"),
charCount = document.querySelector(".char-count");

// Debounce timeout variable
let translateTimeout;

// Populate language selectors
[fromSelect, toSelect].forEach((select, index) => {
    for (let country_code in countries) {
        let selected = index == 0 ? country_code == "en-GB" ? "selected" : "" : country_code == "hi-IN" ? "selected" : "";
        let option = `<option ${selected} value="${country_code}">${countries[country_code]}</option>`;
        select.insertAdjacentHTML("beforeend", option);
    }
});

// Swap languages and trigger translation
exchageIcon.addEventListener("click", () => {
    let tempText = fromText.value,
    tempLang = fromSelect.value;
    fromText.value = toText.value;
    toText.value = tempText;
    fromSelect.value = toSelect.value;
    toSelect.value = tempLang;
    
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
    translateFrom = fromSelect.value.split("-")[0],
    translateTo = toSelect.value.split("-")[0];

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
            
            toText.value = translatedText;
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

// Also trigger translation when language selection changes
fromSelect.addEventListener("change", () => {
    if(fromText.value) {
        clearTimeout(translateTimeout);
        translateTimeout = setTimeout(() => {
            performTranslation();
        }, 500);
    }
});

toSelect.addEventListener("change", () => {
    if(fromText.value) {
        clearTimeout(translateTimeout);
        translateTimeout = setTimeout(() => {
            performTranslation();
        }, 500);
    }
});

// Action buttons (copy and speak)
document.getElementById("from-copy").addEventListener("click", () => {
    if(!fromText.value) return;
    navigator.clipboard.writeText(fromText.value);
});

document.getElementById("to-copy").addEventListener("click", () => {
    if(!toText.value) return;
    navigator.clipboard.writeText(toText.value);
});

document.getElementById("from-speak").addEventListener("click", () => {
    if(!fromText.value) return;
    let utterance = new SpeechSynthesisUtterance(fromText.value);
    utterance.lang = fromSelect.value;
    speechSynthesis.speak(utterance);
});

document.getElementById("to-speak").addEventListener("click", () => {
    if(!toText.value) return;
    let utterance = new SpeechSynthesisUtterance(toText.value);
    utterance.lang = toSelect.value;
    speechSynthesis.speak(utterance);
});