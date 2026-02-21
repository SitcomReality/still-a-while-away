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
    // 1. Wake up fade (0 to 150% radius over 6 seconds)
    const startTime = performance.now();
    const duration = 6000;
    
    const animateWake = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Use ease-in-out for more organic opening
      const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      this.wakeOverlay.style.setProperty('--wake-radius', `${ease * 150}%`);
      
      if (progress < 1) {
        requestAnimationFrame(animateWake);
      } else {
        this.wakeOverlay.style.display = 'none';
        // 2. Ten seconds after the "wake up" completes
        setTimeout(() => this.showNarrative(), 10000);
      }
    };
    requestAnimationFrame(animateWake);
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