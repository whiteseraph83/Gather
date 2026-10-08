// ── Hex Domain · Tutorial ─────────────────────────────────────────────────────

import { t, getLang } from './i18n.js';

const TUTORIAL_KEY = 'hexdomain_tutorial_done';

const STEPS_EN = [
  {
    icon: '🗺',
    title: 'Welcome to Hex Domain',
    text: 'Rule your realm, one hex at a time. Gather resources, build structures, conduct research, and pay your daily tribute to keep your settlement alive.',
  },
  {
    icon: '🏗',
    title: 'Build on the Map',
    text: 'Tap a glowing <strong>?</strong> tile adjacent to your village to build a new hex. Fields, Quarries, Forests and more each produce a different resource.',
  },
  {
    icon: '👷',
    title: 'Send Settlers',
    text: 'Tap an owned hex to dispatch a settler. They will travel there, gather resources, and return home. Open the <strong>Village</strong> hex to manage and recall them.',
  },
  {
    icon: '⚙',
    title: 'Management Mode',
    text: 'Press the <strong>⚙</strong> button (bottom-left) to enter Management Mode. In this mode, tapping any hex opens its panel without dispatching a settler.',
  },
  {
    icon: '🔬',
    title: 'Arcane Arts',
    text: 'Build an <strong>Arcane Tower</strong> and send a settler there to start generating <strong>Lore</strong>. Spend Lore to unlock new buildings and upgrades.',
  },
  {
    icon: '🌅',
    title: 'Daily Tribute',
    text: 'Each day a tribute is collected. Pay it in full to earn a <strong>boon</strong> — a bonus reward of your choice. Tribute grows each day, so keep your resources flowing.',
  },
];

const STEPS_IT = [
  {
    icon: '🗺',
    title: 'Benvenuto in Hex Domain',
    text: 'Governa il tuo regno, un hex alla volta. Raccogli risorse, costruisci strutture, conduci ricerche e paga le tasse giornaliere per mantenere vivo il tuo insediamento.',
  },
  {
    icon: '🏗',
    title: 'Costruisci sulla mappa',
    text: 'Tocca una casella <strong>?</strong> adiacente al villaggio per costruire un nuovo hex. Campi, Cave, Boschi e molto altro producono risorse diverse.',
  },
  {
    icon: '👷',
    title: 'Invia lavoratori',
    text: 'Tocca un hex di tua proprietà per inviare un lavoratore. Raggiungerà la destinazione, raccoglierà risorse e tornerà al villaggio. Apri il <strong>Villaggio</strong> per gestirli.',
  },
  {
    icon: '⚙',
    title: 'Modalità gestione',
    text: 'Premi il pulsante <strong>⚙</strong> (in basso a sinistra) per entrare in modalità gestione. In questa modalità, toccare un hex ne apre il pannello senza inviare lavoratori.',
  },
  {
    icon: '🔬',
    title: 'Ricerca',
    text: 'Costruisci un <strong>Hex Ricerca</strong> e invia un lavoratore per generare <strong>Ricerca</strong>. Spendila per sbloccare nuovi edifici e potenziamenti.',
  },
  {
    icon: '🌅',
    title: 'Tasse giornaliere',
    text: 'Ogni giorno vengono richieste tasse. Pagarle per intero ti fa guadagnare un <strong>bonus</strong> a scelta. Le tasse aumentano ogni giorno, quindi mantieni le risorse in entrata.',
  },
];

export function shouldShowTutorial() {
  return !localStorage.getItem(TUTORIAL_KEY);
}

export function markTutorialDone() {
  localStorage.setItem(TUTORIAL_KEY, '1');
}

export function openTutorial() {
  const modal  = document.getElementById('tutorial-modal');
  const title  = document.getElementById('tutorial-title');
  const content = document.getElementById('tutorial-content');
  const okBtn  = document.getElementById('tutorial-ok-btn');
  const dontShow = document.getElementById('tutorial-dont-show');
  const dontShowLabel = document.getElementById('tutorial-dont-show-label');
  const closeBtn = document.getElementById('tutorial-close-btn');
  if (!modal) return;

  const lang  = getLang();
  const steps = lang === 'it' ? STEPS_IT : STEPS_EN;

  title.textContent = lang === 'it' ? '📖 Come si gioca' : '📖 How to Play';
  dontShowLabel.textContent = lang === 'it' ? 'Non mostrare più' : 'Don\'t show again';
  okBtn.textContent = lang === 'it' ? 'Ho capito!' : 'Got it!';

  content.innerHTML = steps.map(step => `
    <div class="tutorial-step">
      <div class="tutorial-step-icon">${step.icon}</div>
      <div class="tutorial-step-body">
        <div class="tutorial-step-title">${step.title}</div>
        <div class="tutorial-step-text">${step.text}</div>
      </div>
    </div>
  `).join('');

  dontShow.checked = false;

  const close = () => {
    if (dontShow.checked) markTutorialDone();
    modal.classList.add('hidden');
  };

  okBtn.onclick   = close;
  closeBtn.onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };

  modal.classList.remove('hidden');
}
