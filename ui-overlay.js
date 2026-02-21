const DISCORD_URL = "https://discord.gg/k9hwff58";

export class UIOverlay {
  constructor() {
    this.container = document.getElementById('overlay-container');
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