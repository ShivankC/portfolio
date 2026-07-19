//#region src/pages/index.astro?astro&type=script&index=0&lang.ts
function initFeaturedCarousel() {
	const carousel = document.getElementById("featuredCarousel");
	const track = document.getElementById("featuredTrack");
	const dotsWrap = document.getElementById("featuredDots");
	const prevBtn = document.getElementById("featuredPrev");
	const nextBtn = document.getElementById("featuredNext");
	if (!(carousel instanceof HTMLElement) || !track || !dotsWrap) return;
	const slides = Array.from(track.querySelectorAll(".featured-slide"));
	const dots = Array.from(dotsWrap.querySelectorAll(".featured-dot"));
	const N = slides.length;
	if (N === 0) return;
	const AUTOPLAY_MS = 3200;
	const DRAG_THRESHOLD = 50;
	const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	let active = 0;
	let autoplayTimer = 0;
	let lastDragEnd = 0;
	function readOffsets() {
		const cs = getComputedStyle(carousel);
		return {
			o1: parseFloat(cs.getPropertyValue("--f-offset-1")) || 230,
			o2: parseFloat(cs.getPropertyValue("--f-offset-2")) || 400
		};
	}
	function render() {
		const { o1, o2 } = readOffsets();
		slides.forEach((slide, i) => {
			let raw = i - active;
			if (raw > N / 2) raw -= N;
			if (raw < -N / 2) raw += N;
			const dist = Math.abs(raw);
			const sign = Math.sign(raw);
			let x = 0, scale = 1, scrim = 0, state = "active", z = 50, visible = true;
			if (dist === 0) {
				x = 0;
				scale = 1.08;
				scrim = 0;
				state = "active";
				z = 50;
			} else if (dist === 1) {
				x = sign * o1;
				scale = .82;
				scrim = .35;
				state = "near";
				z = 30;
			} else if (dist === 2) {
				x = sign * o2;
				scale = .68;
				scrim = .55;
				state = "far";
				z = 10;
			} else {
				x = sign * (o2 + 120);
				scale = .6;
				scrim = 1;
				state = "far";
				z = 0;
				visible = false;
			}
			slide.style.setProperty("--f-x", `${x}px`);
			slide.style.setProperty("--f-scale", String(scale));
			slide.style.setProperty("--f-scrim", String(scrim));
			slide.style.zIndex = String(z);
			slide.style.opacity = visible ? "1" : "0";
			slide.style.pointerEvents = visible ? "auto" : "none";
			slide.dataset.state = state;
			slide.setAttribute("aria-hidden", visible ? "false" : "true");
		});
		dots.forEach((dot, i) => {
			dot.dataset.active = String(i === active);
		});
	}
	function goTo(index) {
		active = (index % N + N) % N;
		render();
	}
	function next() {
		goTo(active + 1);
	}
	function prev() {
		goTo(active - 1);
	}
	function resetAutoplay() {
		if (reduceMotion) return;
		window.clearInterval(autoplayTimer);
		autoplayTimer = window.setInterval(next, AUTOPLAY_MS);
	}
	slides.forEach((slide, i) => {
		slide.addEventListener("click", () => {
			if (Date.now() - lastDragEnd < 300) return;
			goTo(i);
			resetAutoplay();
		});
	});
	dots.forEach((dot, i) => {
		dot.addEventListener("click", () => {
			goTo(i);
			resetAutoplay();
		});
	});
	prevBtn?.addEventListener("click", () => {
		prev();
		resetAutoplay();
	});
	nextBtn?.addEventListener("click", () => {
		next();
		resetAutoplay();
	});
	let dragging = false;
	let dragStartX = 0;
	let dragMoved = false;
	track.addEventListener("pointerdown", (e) => {
		dragging = true;
		dragMoved = false;
		dragStartX = e.clientX;
		if (e.target instanceof HTMLElement) e.target.blur();
		e.preventDefault();
	});
	track.addEventListener("pointermove", (e) => {
		if (!dragging) return;
		if (!dragMoved && Math.abs(e.clientX - dragStartX) > 6) {
			dragMoved = true;
			track.setPointerCapture(e.pointerId);
		}
		e.preventDefault();
	});
	function endDrag(e) {
		if (!dragging) return;
		dragging = false;
		if (track.hasPointerCapture(e.pointerId)) track.releasePointerCapture(e.pointerId);
		const dx = e.clientX - dragStartX;
		if (dragMoved && Math.abs(dx) > DRAG_THRESHOLD) {
			if (dx < 0) next();
			else prev();
			resetAutoplay();
			lastDragEnd = Date.now();
		}
	}
	track.addEventListener("pointerup", endDrag);
	track.addEventListener("pointercancel", endDrag);
	carousel.addEventListener("keydown", (e) => {
		if (e.key === "ArrowRight") {
			next();
			resetAutoplay();
		} else if (e.key === "ArrowLeft") {
			prev();
			resetAutoplay();
		}
	});
	window.addEventListener("resize", render);
	render();
	resetAutoplay();
}
initFeaturedCarousel();
document.addEventListener("astro:page-load", initFeaturedCarousel);
function initFeaturedProjectsStrip() {
	const strip = document.getElementById("fpStrip");
	if (!(strip instanceof HTMLElement)) return;
	let dragging = false;
	let startX = 0;
	let startScrollLeft = 0;
	let dragMoved = false;
	let lastDragEnd = 0;
	strip.addEventListener("pointerdown", (e) => {
		if (e.pointerType !== "mouse") return;
		dragging = true;
		dragMoved = false;
		startX = e.clientX;
		startScrollLeft = strip.scrollLeft;
	});
	strip.addEventListener("pointermove", (e) => {
		if (!dragging) return;
		const dx = e.clientX - startX;
		if (!dragMoved && Math.abs(dx) > 4) {
			dragMoved = true;
			strip.classList.add("is-dragging");
			strip.setPointerCapture(e.pointerId);
		}
		if (dragMoved) strip.scrollLeft = startScrollLeft - dx;
	});
	function endDrag(e) {
		if (!dragging) return;
		dragging = false;
		strip.classList.remove("is-dragging");
		if (strip.hasPointerCapture(e.pointerId)) strip.releasePointerCapture(e.pointerId);
		if (dragMoved) lastDragEnd = Date.now();
	}
	strip.addEventListener("pointerup", endDrag);
	strip.addEventListener("pointercancel", endDrag);
	strip.addEventListener("click", (e) => {
		if (Date.now() - lastDragEnd < 300) {
			e.stopImmediatePropagation();
			e.preventDefault();
		}
	}, true);
}
initFeaturedProjectsStrip();
document.addEventListener("astro:page-load", initFeaturedProjectsStrip);
//#endregion
