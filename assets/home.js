// Home page wiring: toolbar, game tiles, noticeboard (and later the picker and battle stage).
import { isTrainer, lockTrainer, requireTrainer, toast } from './hub.js';
import { muteButton } from './sound.js';
import { mountNoticeboard, showJoinQr } from './noticeboard.js';
import { mountPicker } from './picker.js';

const toolbar = document.getElementById('toolbar');
const chip = document.createElement('button');
chip.className = 'pill trainer-chip';
const paintChip = () => {
  chip.textContent = isTrainer() ? '🔓 Trainer mode' : '🔒 Trainer locked';
  chip.title = isTrainer() ? 'Click to lock the trainer buttons on this computer' : 'Click to enter the trainer PIN';
  chip.style.setProperty('--c', isTrainer() ? 'var(--lime)' : 'var(--paper)');
};
chip.onclick = async () => {
  if (isTrainer()) { lockTrainer(); toast('Trainer buttons locked on this computer.'); }
  else await requireTrainer();
};
document.addEventListener('trainer-change', paintChip);
paintChip();
toolbar.append(chip, muteButton());

document.getElementById('games').addEventListener('click', e => {
  const tile = e.target.closest('[data-game]');
  if (!tile) return;
  const game = tile.dataset.game;
  if (game === 'emoji' || game === 'truths') showJoinQr(game);
  else if (game === 'picker') document.getElementById('picker').scrollIntoView({ behavior: 'smooth' });
  else if (game === 'battle') toast('Prompt Battle is coming soon.');
});

mountNoticeboard(document.getElementById('noticeboard'));
mountPicker(document.getElementById('picker-root'));
