const GEN_RANGES = {
    "1": { min: 1, max: 151 },
    "2": { min: 152, max: 251 },
    "3": { min: 252, max: 386 },
    "4": { min: 387, max: 493 },
    "5": { min: 494, max: 649 },
    "all": { min: 1, max: 649 }
};

const optionsContainer = document.getElementById('options-container');
const playBtn = document.getElementById('play-btn');
const feedback = document.getElementById('feedback');
const message = document.getElementById('message');
const nextBtn = document.getElementById('next-btn');
const genSelect = document.getElementById('gen-select');
const statusLight = document.getElementById('status-light');
const sndSuccess = document.getElementById('snd-success');
const sndError = document.getElementById('snd-error');

let currentTarget = null;
let hasGuessed = false;
let cryAudio = null;

// Función para capitalizar y limpiar nombres
const formatName = (str) => str.replace(/-/g, ' ').toUpperCase();

async function startNewRound() {
    hasGuessed = false;
    feedback.classList.add('hidden');
    statusLight.classList.add('loading-light');
    optionsContainer.innerHTML = '<p style="font-size:10px">BUSCANDO DATOS...</p>';
    
    const { min, max } = GEN_RANGES[genSelect.value];
    const ids = [];
    while(ids.length < 5) {
        const id = Math.floor(Math.random() * (max - min + 1)) + min;
        if(!ids.includes(id)) ids.push(id);
    }

    try {
        // Obtenemos datos básicos de los 5 (petición paralela)
        const pokemons = await Promise.all(ids.map(async (id) => {
            const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
            const data = await res.json();
            return {
                id: data.id,
                name: formatName(data.name), // Nombre en inglés por defecto para rapidez
                cry: data.cries.latest || data.cries.legacy,
                sprite: data.sprites.front_default
            };
        }));

        currentTarget = pokemons[Math.floor(Math.random() * 5)];
        
        // Ahora sí, buscamos el nombre en ESPAÑOL solo del target para el mensaje final
        const speciesRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${currentTarget.id}`);
        const speciesData = await speciesRes.json();
        const spanishEntry = speciesData.names.find(n => n.language.name === "es");
        if(spanishEntry) currentTarget.spanishName = spanishEntry.name.toUpperCase();

        cryAudio = new Audio(currentTarget.cry);
        renderOptions(pokemons);
        statusLight.classList.remove('loading-light');
        
    } catch (error) {
        console.error(error);
        optionsContainer.innerHTML = 'ERROR DE CARGA. REINTENTA.';
        statusLight.classList.remove('loading-light');
    }
}

function renderOptions(pokemons) {
    optionsContainer.innerHTML = '';
    pokemons.forEach(pkmn => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.dataset.id = pkmn.id; // Guardamos el ID en el HTML
        
        btn.innerHTML = `
            <img src="${pkmn.sprite}" class="pkmn-icon" alt="?">
            <span>${pkmn.name}</span>
        `;
        
        btn.onclick = () => handleGuess(pkmn.id, btn);
        optionsContainer.appendChild(btn);
    });
}

function handleGuess(selectedId, btnElement) {
    if (hasGuessed || !currentTarget) return;
    hasGuessed = true;

    const allButtons = document.querySelectorAll('.option-btn');
    allButtons.forEach(btn => btn.disabled = true);

    if (selectedId === currentTarget.id) {
        btnElement.classList.add('correct');
        message.innerText = `¡ACIERTO! ES ${currentTarget.spanishName || currentTarget.name}`;
        sndSuccess.play().catch(()=>{}); 
    } else {
        btnElement.classList.add('incorrect');
        message.innerText = `ERA ${currentTarget.spanishName || currentTarget.name}`;
        sndError.play().catch(()=>{});
        
        // Resaltar el correcto buscando por ID
        allButtons.forEach(btn => {
            if(parseInt(btn.dataset.id) === currentTarget.id) {
                btn.classList.add('correct');
            }
        });
    }
    feedback.classList.remove('hidden');
}

playBtn.onclick = () => {
    if(cryAudio) {
        cryAudio.play().catch(e => console.log("Error de audio:", e));
    }
};

nextBtn.onclick = startNewRound;
genSelect.onchange = startNewRound;

// Iniciar primer round
startNewRound();
