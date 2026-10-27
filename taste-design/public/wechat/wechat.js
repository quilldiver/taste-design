/* Shared, delegated controller: works after Next route changes as well as in
   the standalone HTML. Asset URLs resolve beside this script under any base path. */
(() => {
  'use strict';
  if (document.getElementById('wechat-qr-popover')) return;
  const imageURL = new URL('qr.png', document.currentScript.src).href;
  const triggerSelector = '[data-wechat-trigger]';
  const popover = document.createElement('div');
  popover.id = 'wechat-qr-popover';
  popover.className = 'wechat-qr-popover';
  popover.setAttribute('popover', 'manual');
  popover.setAttribute('role', 'group');
  popover.setAttribute('aria-label', '微信二维码');
  popover.hidden = true;
  const preview = document.createElement('button');
  preview.type = 'button';
  preview.className = 'wechat-qr-preview';
  preview.setAttribute('aria-label', '全屏查看微信二维码');
  preview.setAttribute('aria-haspopup', 'dialog');
  const thumbnail = document.createElement('img');
  thumbnail.src = imageURL;
  thumbnail.alt = '微信二维码';
  thumbnail.width = 676;
  thumbnail.height = 678;
  preview.append(thumbnail);
  popover.append(preview);
  document.body.append(popover);
  const nativePopover = typeof popover.showPopover === 'function';
  if (!nativePopover) popover.removeAttribute('popover');

  const lightbox = document.createElement('dialog');
  lightbox.className = 'wechat-qr-lightbox';
  lightbox.setAttribute('aria-label', '微信二维码全屏查看');
  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'wechat-qr-close';
  closeButton.setAttribute('aria-label', '关闭全屏二维码');
  closeButton.textContent = '×';
  const fullImage = thumbnail.cloneNode();
  fullImage.className = 'wechat-qr-full-image';
  lightbox.append(closeButton, fullImage);
  document.body.append(lightbox);

  let activeTrigger = null;
  let returnFocus = null;
  let pinned = false;
  let closeTimer = 0;
  let suppressFocus = false;
  let savedOverflow = '';
  const cancelClose = () => window.clearTimeout(closeTimer);
  const getTrigger = target => target instanceof Element ? target.closest(triggerSelector) : null;
  const hide = () => {
    cancelClose();
    if (activeTrigger) activeTrigger.setAttribute('aria-expanded', 'false');
    if (nativePopover && popover.matches(':popover-open')) popover.hidePopover();
    popover.hidden = true;
    activeTrigger = null;
    pinned = false;
  };
  const position = () => {
    if (!activeTrigger || !activeTrigger.isConnected) { hide(); return; }
    const rect = activeTrigger.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > innerHeight) { hide(); return; }
    const size = Math.max(80, Math.min(224, innerWidth - 24, innerHeight - rect.bottom - 28));
    popover.style.width = `${size}px`;
    // The provided image is 676×678; include the surrounding padding and border.
    const height = (size - 18) * 678 / 676 + 18;
    const left = Math.min(Math.max(12, rect.left), innerWidth - size - 12);
    const top = Math.max(12, Math.min(rect.bottom + 12, innerHeight - height - 12));
    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
  };
  const show = (trigger, pin = false) => {
    if (lightbox.open) return;
    cancelClose();
    if (activeTrigger && activeTrigger !== trigger) hide();
    activeTrigger = trigger;
    pinned = pinned || pin;
    trigger.setAttribute('aria-expanded', 'true');
    popover.hidden = false;
    position();
    if (nativePopover && !popover.matches(':popover-open')) popover.showPopover();
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer = window.setTimeout(() => {
      if (pinned || !activeTrigger) return;
      if (activeTrigger.matches(':hover') || popover.matches(':hover')) return;
      if (activeTrigger === document.activeElement || popover.contains(document.activeElement)) return;
      hide();
    }, 160);
  };

  document.addEventListener('pointerover', event => {
    if (event.pointerType === 'touch') return;
    const trigger = getTrigger(event.target);
    if (trigger && trigger !== activeTrigger) show(trigger);
    else if (trigger) cancelClose();
  });
  document.addEventListener('pointerout', event => {
    const trigger = getTrigger(event.target);
    if (!trigger || trigger !== activeTrigger) return;
    if (event.relatedTarget instanceof Node && (trigger.contains(event.relatedTarget) || popover.contains(event.relatedTarget))) return;
    scheduleClose();
  });
  popover.addEventListener('pointerenter', cancelClose);
  popover.addEventListener('pointerleave', scheduleClose);
  document.addEventListener('focusin', event => {
    if (suppressFocus) return;
    const trigger = getTrigger(event.target);
    if (trigger) show(trigger);
    else if (popover.contains(event.target)) cancelClose();
    else scheduleClose();
  });
  document.addEventListener('focusout', scheduleClose);
  document.addEventListener('pointerdown', event => {
    if (!getTrigger(event.target) && !popover.contains(event.target)) hide();
  }, true);
  document.addEventListener('click', event => {
    const trigger = getTrigger(event.target);
    if (!trigger) return;
    event.preventDefault();
    event.stopPropagation();
    if (activeTrigger === trigger && pinned) hide();
    else show(trigger, true);
  });
  document.addEventListener('keydown', event => {
    const trigger = getTrigger(event.target);
    if (trigger && event.key === 'ArrowDown') {
      event.preventDefault();
      event.stopPropagation();
      show(trigger, true);
      preview.focus();
    } else if (event.key === 'Escape' && activeTrigger && !lightbox.open) {
      event.preventDefault();
      const focus = activeTrigger;
      hide();
      suppressFocus = true;
      focus.focus({preventScroll: true});
      suppressFocus = false;
    }
  });
  preview.addEventListener('click', event => {
    event.stopPropagation();
    returnFocus = activeTrigger;
    hide();
    savedOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    lightbox.showModal();
    closeButton.focus();
  });
  closeButton.addEventListener('click', () => lightbox.close());
  lightbox.addEventListener('click', event => {
    event.stopPropagation();
    if (event.target === lightbox) lightbox.close();
  });
  lightbox.addEventListener('close', () => {
    document.documentElement.style.overflow = savedOverflow;
    if (returnFocus && returnFocus.isConnected) {
      suppressFocus = true;
      returnFocus.focus({preventScroll: true});
      suppressFocus = false;
    }
  });
  // Keep the site's wheel/keyboard screen navigation from running behind the modal.
  lightbox.addEventListener('wheel', event => event.stopPropagation(), {passive: true});
  lightbox.addEventListener('touchmove', event => event.stopPropagation(), {passive: true});
  lightbox.addEventListener('keydown', event => event.stopPropagation());
  window.addEventListener('resize', () => { if (activeTrigger) position(); }, {passive: true});
  window.addEventListener('scroll', () => { if (!popover.hidden) hide(); }, {passive: true});
  window.addEventListener('blur', () => { if (!lightbox.open) hide(); });
})();
