/* Simple slider controller: shows one slide at a time, autoplay, pause on hover */
document.addEventListener('DOMContentLoaded', function () {
	const track = document.querySelector('.slider-track');
	const slides = Array.from(document.querySelectorAll('.slide'));
	const prevBtn = document.querySelector('.slider-btn.prev');
	const nextBtn = document.querySelector('.slider-btn.next');
	const slider = document.querySelector('.slider');
	const infoTitleEl = document.querySelector('.info-title');
	const infoDescEl = document.querySelector('.info-desc');

	if (!track || slides.length === 0) return;

	let current = 0;

	function update() {
		// move track
		track.style.transform = `translateX(-${current * 100}%)`;

		// update slide active state (opacity handled by CSS)
		slides.forEach((s, i) => s.classList.toggle('active', i === current));

		// pause all videos except current; reset currentTime for the active one
		slides.forEach((s, i) => {
			const v = s.querySelector('video');
			if (!v) return;
			if (i === current) {
				try { v.currentTime = 0; } catch(e){}
			} else {
				try { v.pause(); } catch(e){}
			}
		});

		// update info title and description from the video-column attributes if present
		const col = slides[current].querySelector('.video-column');
		if (infoTitleEl) infoTitleEl.textContent = col ? (col.getAttribute('title') || '') : '';
		if (infoDescEl) infoDescEl.textContent = col ? (col.getAttribute('data-desc') || '') : '';
	}

	function playCurrentVideo() {
		const v = slides[current].querySelector('video');
		if (v) v.play().catch(()=>{});
	}

	function goTo(index) {
		// fade out info text
		if (infoTitleEl) infoTitleEl.classList.add('info-hidden');
		if (infoDescEl) infoDescEl.classList.add('info-hidden');

		// remove active from current slide to trigger fade-out
		slides[current].classList.remove('active');

		// set new index
		current = (index + slides.length) % slides.length;

		// apply transform and then fade in new slide/info after a short delay
		update();

		// small delay to allow transform/paint then fade in info
		setTimeout(() => {
			if (infoTitleEl) infoTitleEl.classList.remove('info-hidden');
			if (infoDescEl) infoDescEl.classList.remove('info-hidden');
			playCurrentVideo();
		}, 80);
	}

	function next() { goTo(current + 1); }
	function prev() { goTo(current - 1); }

	// navigation via buttons: do not start any autoplay/timer
	if (nextBtn) nextBtn.addEventListener('click', () => { next(); playCurrentVideo(); });
	if (prevBtn) prevBtn.addEventListener('click', () => { prev(); playCurrentVideo(); });

	// touch support (basic swipe)
	let touchStartX = 0;
	if (slider) {
		slider.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; });
		slider.addEventListener('touchend', (e) => {
			const dx = (e.changedTouches[0].clientX - touchStartX);
			if (dx > 30) { prev(); playCurrentVideo(); }
			else if (dx < -30) { next(); playCurrentVideo(); }
		});
	}

	// init (play first video since it's muted)
	update();
	playCurrentVideo();

	// Mobile tabs: toggle content/videos without changing page scroll
	function initMobileTabs(){
		const tabs = Array.from(document.querySelectorAll('.mobile-tab'));
		const main = document.querySelector('.main-container');
		const colLeft = document.querySelector('.col-left');
		const colRight = document.querySelector('.col-right');
		if(!tabs.length || !main || !colLeft || !colRight) return;

		function setActive(target){
			tabs.forEach(t => {
				t.dataset.active = (t.dataset.target === target) ? 'true' : 'false';
				t.setAttribute('aria-selected', t.dataset.target === target ? 'true' : 'false');
			});
			if(target === 'content'){
				main.classList.remove('mobile-tab--videos');
				main.classList.add('mobile-tab--content');
				// keep left panel scroll state; ensure right panel is reset to top
				colRight.scrollTop = 0;
			} else {
				main.classList.remove('mobile-tab--content');
				main.classList.add('mobile-tab--videos');
				// ensure video panel is scrolled to top and current video plays
				colRight.scrollTop = 0;
				// also ensure slider viewport is at top
				const viewport = document.querySelector('.slider-viewport');
				if(viewport) viewport.scrollTop = 0;
				playCurrentVideo();
			}
		}

		tabs.forEach(t => t.addEventListener('click', () => setActive(t.dataset.target)));
		// initialize (content active)
		setActive('content');
	}

	initMobileTabs();

	// Build mobile video list and modal behavior
	function initMobileVideoList(){
		const isMobile = () => window.matchMedia('(max-width:768px)').matches;
		const videoArea = document.querySelector('.video-area');
		if(!videoArea) return;
		// Create list container
		let list = videoArea.querySelector('.video-list');
		if(!list){
			list = document.createElement('ul');
			list.className = 'video-list';
			videoArea.appendChild(list);
		}
		// populate from slides
		list.innerHTML = '';
		slides.forEach((s, i) => {
			const col = s.querySelector('.video-column');
			const title = col ? (col.getAttribute('title') || '') : '';
			const desc = col ? (col.getAttribute('data-desc') || '') : '';
			const sourceEl = s.querySelector('video source');
			const src = sourceEl ? sourceEl.getAttribute('src') : null;
			const li = document.createElement('li');
			li.className = 'video-item';
			li.dataset.index = i;
			li.innerHTML = `
				<div class="thumb">▶</div>
				<div class="meta"><h3 class="meta-title">${title}</h3><div class="meta-desc">${desc}</div></div>
			`;
			li.addEventListener('click', () => openVideoModal(i));
			list.appendChild(li);
		});

		// show/hide based on mobile and active tab handled by CSS; ensure it's built on resize
		window.addEventListener('resize', () => {
			if(!isMobile()) return;
			// rebuild if needed
		});

		// Modal implementation
		let modalEl = null;
		function openVideoModal(index){
			const idx = (index + slides.length) % slides.length;
			const col = slides[idx].querySelector('.video-column');
			const title = col ? (col.getAttribute('title') || '') : '';
			const desc = col ? (col.getAttribute('data-desc') || '') : '';
			const sourceEl = slides[idx].querySelector('video source');
			const src = sourceEl ? sourceEl.getAttribute('src') : null;
			if(!src) return;

			// create modal
			modalEl = document.createElement('div');
			modalEl.className = 'video-modal';
			modalEl.innerHTML = `
				<div class="video-modal__backdrop"></div>
				<div class="video-modal__content" role="dialog" aria-modal="true">
					<button class="video-modal__close" aria-label="Fechar">×</button>
					<div class="video-modal__player"></div>
					<div class="video-modal__meta">
						<p class="video-modal__desc">${desc}</p>
						<div class="video-modal__controls">
							<button class="btn video-modal__prev" aria-label="Anterior">‹</button>
							<button class="btn video-modal__next" aria-label="Próximo">›</button>
						</div>
					</div>
				</div>
			`;

			document.body.appendChild(modalEl);
			// prevent body scroll and horizontal overflow while modal open
			document.body.classList.add('modal-open');

			const playerWrap = modalEl.querySelector('.video-modal__player');
			const closeBtn = modalEl.querySelector('.video-modal__close');
			const prevBtn = modalEl.querySelector('.video-modal__prev');
			const nextBtn = modalEl.querySelector('.video-modal__next');

			// create video element
			const v = document.createElement('video');
			v.setAttribute('controls', '');
			v.setAttribute('playsinline', '');
			v.style.width = '100%';
			v.style.height = '100%';
			const srcEl = document.createElement('source');
			srcEl.src = src;
			srcEl.type = 'video/mp4';
			v.appendChild(srcEl);
			playerWrap.appendChild(v);

			v.play().catch(()=>{});

			function cleanup(){
				try{ v.pause(); }catch(e){}
				if(modalEl && modalEl.parentNode) modalEl.parentNode.removeChild(modalEl);
				modalEl = null;
				// restore body scroll
				document.body.classList.remove('modal-open');
			}

			closeBtn.addEventListener('click', cleanup);
			modalEl.querySelector('.video-modal__backdrop').addEventListener('click', cleanup);

			prevBtn.addEventListener('click', () => {
				cleanup();
				openVideoModal(idx - 1);
			});
			nextBtn.addEventListener('click', () => {
				cleanup();
				openVideoModal(idx + 1);
			});
		}

	}

	// Initialize mobile list (and modal) immediately
	initMobileVideoList();
});