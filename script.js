// --- Supabase Setup ---
// Replace these with actual values from your Supabase project dashboard
const SUPABASE_URL = 'https://awmmhjtaqmzyzlqxcloo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_RhItNvc1YO3Do4s_nfmk7Q_gn1CV0LC';
// Using optional chaining because supabase might not be loaded if CDN fails
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// --- Application State ---
const state = {
  user: null,
  currentQuestionIndex: 0,
  answers: {} // dimension -> score
};

// --- Questionnaire Data ---
const dimensions = ['Energy', 'Mood', 'Focus', 'Stress', 'Social', 'Purpose', 'Resilience'];

const questions = [
  {
    dimension: 'Energy',
    text: "How would you rate your physical energy today?",
    options: [
      { label: "Exhausted", score: 1 },
      { label: "Low", score: 2 },
      { label: "Good", score: 3 },
      { label: "Vibrant", score: 4 }
    ]
  },
  {
    dimension: 'Mood',
    text: "How would you describe your overall mood?",
    options: [
      { label: "Down", score: 1 },
      { label: "Neutral", score: 2 },
      { label: "Positive", score: 3 },
      { label: "Excellent", score: 4 }
    ]
  },
  {
    dimension: 'Focus',
    text: "How well were you able to concentrate on tasks today?",
    options: [
      { label: "Scattered", score: 1 },
      { label: "Distracted", score: 2 },
      { label: "Focused", score: 3 },
      { label: "Deeply engaged", score: 4 }
    ]
  },
  {
    dimension: 'Stress',
    text: "How much stress are you experiencing right now?",
    options: [
      { label: "Overwhelmed", score: 1 }, // 1 pt
      { label: "Stressed", score: 2 },    // 2 pts
      { label: "Manageable", score: 3 },  // 3 pts
      { label: "At ease", score: 4 }      // 4 pts
    ]
  },
  {
    dimension: 'Social',
    text: "How connected do you feel to others today?",
    options: [
      { label: "Isolated", score: 1 },
      { label: "Disconnected", score: 2 },
      { label: "Connected", score: 3 },
      { label: "Supported", score: 4 }
    ]
  },
  {
    dimension: 'Purpose',
    text: "Do you feel a sense of meaning in what you did today?",
    options: [
      { label: "None", score: 1 },
      { label: "Little", score: 2 },
      { label: "Some", score: 3 },
      { label: "Strong", score: 4 }
    ]
  },
  {
    dimension: 'Resilience',
    text: "How well are you adapting to today's challenges?",
    options: [
      { label: "Struggling", score: 1 },
      { label: "Coping", score: 2 },
      { label: "Adapting", score: 3 },
      { label: "Thriving", score: 4 }
    ]
  }
];

// --- DOM Elements ---
const screens = {
  splash: document.getElementById('screen-splash'),
  auth: document.getElementById('screen-auth'),
  checkin: document.getElementById('screen-checkin'),
  analysis: document.getElementById('screen-analysis')
};

// --- Navigation Logic ---
function showScreen(screenName) {
  Object.values(screens).forEach(screen => {
    if (screen.classList.contains('active')) {
      screen.classList.remove('active');
    }
  });
  
  setTimeout(() => {
    screens[screenName].classList.add('active');
  }, 50);
}

// Splash Screen
document.getElementById('btn-begin').addEventListener('click', async () => {
  if (supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        state.user = session.user;
        startCheckin();
        return;
      }
    } catch (e) {
      console.warn('Supabase not fully configured yet.', e);
    }
  }
  showScreen('auth');
});

// Auth Screen
const authForm = document.getElementById('auth-form');
const authMessage = document.getElementById('auth-message');
const btnAuth = document.getElementById('btn-auth');

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;
  
  if (!supabase || SUPABASE_URL === 'YOUR_SUPABASE_URL') {
    // Mock login if supabase is not configured
    state.user = { id: 'mock-user-123', email: email };
    startCheckin();
    return;
  }

  btnAuth.textContent = 'Processing...';
  btnAuth.disabled = true;
  authMessage.textContent = '';

  try {
    // Try to sign in first
    let { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error && error.message.includes('Invalid login credentials')) {
      // Try sign up
      const signUpRes = await supabase.auth.signUp({
        email: email,
        password: password,
      });
      data = signUpRes.data;
      error = signUpRes.error;
    }

    if (error) {
      authMessage.textContent = error.message;
    } else if (data.user) {
      state.user = data.user;
      startCheckin();
    }
  } catch (err) {
    authMessage.textContent = 'An error occurred during authentication.';
    console.error(err);
  } finally {
    btnAuth.textContent = 'Sign In / Sign Up';
    btnAuth.disabled = false;
  }
});

// --- Check-in Logic ---
function startCheckin() {
  state.currentQuestionIndex = 0;
  state.answers = {};
  updateProgressBar();
  renderQuestion();
  showScreen('checkin');
}

function renderQuestion() {
  const container = document.getElementById('question-container');
  const question = questions[state.currentQuestionIndex];
  
  if (container.children.length > 0) {
    container.firstElementChild.classList.add('slide-exit');
    setTimeout(() => {
      buildQuestionHTML(container, question);
    }, 400); // match CSS animation time
  } else {
    buildQuestionHTML(container, question);
  }
}

function buildQuestionHTML(container, question) {
  container.innerHTML = \`
    <div class="slide-enter" style="width: 100%; display: flex; flex-direction: column; align-items: center;">
      <h2 class="question-text">\${question.text}</h2>
      <div class="options-grid">
        \${question.options.map((opt) => \`
          <button class="option-btn" data-score="\${opt.score}">
            \${opt.label}
          </button>
        \`).join('')}
      </div>
    </div>
  \`;

  const buttons = container.querySelectorAll('.option-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      handleAnswer(question.dimension, parseInt(e.target.dataset.score));
    });
  });
}

function handleAnswer(dimension, score) {
  state.answers[dimension] = score;
  
  if (state.currentQuestionIndex < questions.length - 1) {
    state.currentQuestionIndex++;
    updateProgressBar();
    renderQuestion();
  } else {
    finishCheckin();
  }
}

function updateProgressBar() {
  const progress = (state.currentQuestionIndex / questions.length) * 100;
  document.getElementById('progress-fill').style.width = \`\${progress}%\`;
}

// --- Analysis & Submission Logic ---
async function finishCheckin() {
  document.getElementById('progress-fill').style.width = '100%';
  
  let totalScore = 0;
  const maxPossible = questions.length * 4; // 7 * 4 = 28
  
  Object.values(state.answers).forEach(score => {
    totalScore += score;
  });

  const percentage = Math.round((totalScore / maxPossible) * 100);
  
  let label = '';
  let colorVar = '';
  
  if (percentage >= 80) {
    label = 'Thriving';
    colorVar = 'var(--color-green)';
  } else if (percentage >= 60) {
    label = 'Steady';
    colorVar = 'var(--color-blue)';
  } else if (percentage >= 40) {
    label = 'Strained';
    colorVar = 'var(--color-orange)';
  } else {
    label = 'Struggling';
    colorVar = 'var(--color-red)';
  }

  document.getElementById('result-percentage').textContent = \`\${percentage}%\`;
  document.getElementById('result-label').textContent = label;
  document.getElementById('result-label').style.color = colorVar;
  document.getElementById('result-circle').style.borderColor = colorVar;

  const listStrengths = document.getElementById('list-strengths');
  const listAreas = document.getElementById('list-areas');
  listStrengths.innerHTML = '';
  listAreas.innerHTML = '';

  dimensions.forEach(dim => {
    const score = state.answers[dim];
    const li = document.createElement('li');
    li.className = 'pill';
    li.textContent = dim;
    
    if (score >= 3) {
      listStrengths.appendChild(li);
    } else {
      listAreas.appendChild(li);
    }
  });

  if (listStrengths.children.length === 0) listStrengths.innerHTML = '<li class="pill">None identified today</li>';
  if (listAreas.children.length === 0) listAreas.innerHTML = '<li class="pill">None identified today</li>';

  showScreen('analysis');

  if (supabase && SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
    try {
      const logData = {
        user_id: state.user.id,
        total_score: totalScore,
        percentage: percentage,
        label: label,
        energy: state.answers['Energy'],
        mood: state.answers['Mood'],
        focus: state.answers['Focus'],
        stress: state.answers['Stress'],
        social: state.answers['Social'],
        purpose: state.answers['Purpose'],
        resilience: state.answers['Resilience']
      };

      const { error } = await supabase.from('daily_logs').insert([logData]);

      if (error) {
        console.error("Error saving log:", error);
      }
    } catch (err) {
      console.error("Supabase network error.", err);
    }
  } else {
    console.log("Mock submission successful. Data to save:", state.answers);
  }
}

document.getElementById('btn-restart').addEventListener('click', () => {
  showScreen('splash');
});
