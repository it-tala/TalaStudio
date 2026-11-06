// A small label that follows the pointer over an invisible button (a picture's left, right or top band) and says
// what a click there does. `label` returns '' where a click does nothing. Mouse only: touch has no hover.
export function followHint(area: HTMLElement, label: (e: MouseEvent) => string, host: HTMLElement = area.parentElement!) {
  const tip = document.createElement('span');
  tip.className = 'hint';
  tip.setAttribute('aria-hidden', 'true');
  host.append(tip);
  area.addEventListener('mousemove', (e) => {
    const text = (e.target as HTMLElement).closest('button, a') ? '' : label(e);
    tip.textContent = text;
    tip.classList.toggle('on', !!text);
    tip.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 18}px)`;
  });
  area.addEventListener('mouseleave', () => tip.classList.remove('on'));
}
