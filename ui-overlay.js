const DISCORD_URL = "https://discord.gg/k9hwff58";

export class UIOverlay {
  constructor() {
    this.container = document.getElementById('overlay-container');
    this.wakeOverlay = document.getElementById('wake-up-overlay');
    this.narrativeLines = [
      document.getElementById('narrative-line-1'),
      document.getElementById('narrative-line-2')
    ];
  }

  async startIntroSequence() {
    // Fade-out the initial black overlay over 4 seconds (fade away the blackness)
    const startTime = performance.now();
    const duration = 4000;
    
    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out for a gentle reveal
      const ease = 1 - Math.pow(1 - progress, 2);
      this.wakeOverlay.style.opacity = String(1 - ease);
      
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        // Fully hidden, remove overlay from layout and continue intro
        this.wakeOverlay.style.display = 'none';
        setTimeout(() => this.showNarrative(), 10000);
      }
    };
    requestAnimationFrame(step);
  }

  async showNarrative() {
    const line1Text = "Rest your eyes, it's okay";
    const line2Text = "We're still a while away";

    const fadeLine = async (lineEl, text, duration = 6000) => {
      lineEl.textContent = text;
      lineEl.classList.add('visible');
      
      const start = performance.now();
      return new Promise(resolve => {
        const step = (now) => {
          const elapsed = now - start;
          const p = Math.min(elapsed / duration, 1);
          lineEl.style.setProperty('--wipe', `${p * 100}%`);
          if (p < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      });
    };

    // Show Line 1
    await fadeLine(this.narrativeLines[0], line1Text);
    
    // Line 1 starts fading out as Line 2 starts fading in
    await new Promise(resolve => {
      setTimeout(() => {
        this.narrativeLines[0].classList.remove('visible');
        fadeLine(this.narrativeLines[1], line2Text).then(resolve);
      }, 2000);
    });

    // Finally fade out line 2
    setTimeout(() => {
      this.narrativeLines[1].classList.remove('visible');
    }, 4000);
  }

  showInvite() {
    const text = `Join the <a href="${DISCORD_URL}" target="_blank">4th Wall Discord</a> to discuss this and other @SitcomReality experiments and games!`;
    this.createMessage(text);
  }

  createMessage(htmlContent) {
    const msg = document.createElement('div');
    msg.className = 'ui-message';
    msg.innerHTML = `
      <div class="ui-message-content">${htmlContent}</div>
      <div class="ui-message-close">×</div>
    `;

    this.container.appendChild(msg);

    // Fade in
    requestAnimationFrame(() => {
      msg.classList.add('visible');
    });

    // Close logic
    const closeBtn = msg.querySelector('.ui-message-close');
    closeBtn.onclick = () => {
      msg.classList.remove('visible');
      setTimeout(() => msg.remove(), 1000);
    };
  }
}