//#region src/pages/timeline.astro?astro&type=script&index=0&lang.ts
function buildTimelineThreads() {
	const timeline = document.querySelector(".timeline");
	const svg = document.getElementById("threadSvg");
	if (!timeline || !svg) return;
	const W = timeline.clientWidth;
	const H = timeline.clientHeight;
	if (W === 0 || H === 0) return;
	const isMobile = window.matchMedia("(max-width: 760px)").matches;
	const cx = isMobile ? 32 : W / 2;
	const tRect = timeline.getBoundingClientRect();
	const midY = (el) => {
		const r = el.getBoundingClientRect();
		return r.top - tRect.top + r.height / 2;
	};
	const pts = [
		0,
		...Array.from(timeline.querySelectorAll(".thread-anchor")).map(midY).sort((a, b) => a - b),
		H
	];
	const nodes = Array.from(timeline.querySelectorAll(".node-anchor")).map((el) => {
		const row = el.closest(".milestone");
		const card = row ? row.querySelector(".milestone-card") : null;
		let edgeX = null;
		if (card) {
			const r = card.getBoundingClientRect();
			edgeX = (!isMobile && row.classList.contains("card-left") ? r.right : r.left) - tRect.left;
		}
		return {
			y: midY(el),
			index: el instanceof HTMLElement ? Number(el.dataset.index) : -1,
			edgeX
		};
	});
	function hash(n) {
		const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
		return s - Math.floor(s);
	}
	function catmullRomPath(points) {
		if (points.length < 2) return "";
		const pad = [
			points[0],
			...points,
			points[points.length - 1]
		];
		let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
		for (let i = 1; i < pad.length - 2; i++) {
			const p0 = pad[i - 1], p1 = pad[i], p2 = pad[i + 1], p3 = pad[i + 2];
			const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
			const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
			d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
		}
		return d;
	}
	const ampBase = isMobile ? 9 : 22;
	const ampVar = isMobile ? 8 : 22;
	const buildPoints = (phase) => {
		const points = [{
			x: cx,
			y: pts[0]
		}];
		let lastSide = phase === 0 ? 1 : -1;
		for (let i = 0; i < pts.length - 1; i++) {
			const y0 = pts[i], y1 = pts[i + 1];
			let side = (i + phase) % 2 === 0 ? 1 : -1;
			if (i > 0 && hash(i * 7 + phase * 31 + 5) < .2) side = lastSide;
			lastSide = side;
			const amp = ampBase + hash(i * 3 + phase * 17 + 1) * ampVar;
			const yFrac = .35 + hash(i * 3 + phase * 17 + 2) * .3;
			const wy = y0 + (y1 - y0) * yFrac;
			if (y1 - y0 > 24) points.push({
				x: cx + side * amp,
				y: wy
			});
			points.push({
				x: cx,
				y: y1
			});
		}
		return points;
	};
	svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
	const dV = catmullRomPath(buildPoints(0));
	const dG = catmullRomPath(buildPoints(1));
	svg.querySelector(".thread--violet").setAttribute("d", dV);
	svg.querySelector(".thread--gold").setAttribute("d", dG);
	svg.querySelector(".thread-nodes").innerHTML = nodes.map((n) => {
		const y = n.y.toFixed(1);
		return (n.edgeX != null ? `<line class="node-connector" x1="${cx}" y1="${y}" x2="${n.edgeX.toFixed(1)}" y2="${y}" />` : "") + `<circle class="node-dot" data-index="${n.index}" cx="${cx}" cy="${y}" r="7" /><circle class="node-active-dot" data-index="${n.index}" cx="${cx}" cy="${y}" r="3" />`;
	}).join("");
	syncActiveNode(svg, activeMilestoneIndex);
}
var activeMilestoneIndex = null;
var activeNodeAnimation = null;
function syncActiveNode(svg, index) {
	if (!svg) return;
	svg.querySelectorAll(".node-dot.is-active").forEach((el) => {
		el.style.willChange = "";
	});
	svg.querySelectorAll(".node-dot.is-active, .node-active-dot.is-active").forEach((el) => el.classList.remove("is-active"));
	if (activeNodeAnimation) {
		activeNodeAnimation.cancel();
		activeNodeAnimation = null;
	}
	if (index == null) return;
	const dot = svg.querySelector(`.node-dot[data-index="${index}"]`);
	const mark = svg.querySelector(`.node-active-dot[data-index="${index}"]`);
	if (dot) {
		dot.classList.add("is-active");
		if (!reduceMotion()) {
			dot.style.willChange = "transform";
			activeNodeAnimation = dot.animate([
				{ transform: "scale(1)" },
				{
					transform: "scale(1.4)",
					offset: .4
				},
				{ transform: "scale(1)" }
			], {
				duration: 1200,
				easing: "ease-in-out",
				iterations: Infinity
			});
		}
	}
	if (mark) mark.classList.add("is-active");
}
var reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function setupThreadDraw() {
	const svg = document.getElementById("threadSvg");
	if (!svg || reduceMotion()) return null;
	const paths = [".thread--violet", ".thread--gold"].map((sel) => svg.querySelector(sel)).filter((el) => el);
	let lengths = paths.map(() => 0);
	function measure() {
		lengths = paths.map((p) => {
			let len = 0;
			try {
				len = p.getTotalLength();
			} catch {
				len = 0;
			}
			p.style.strokeDasharray = String(len);
			return len;
		});
		draw();
	}
	function draw() {
		const timeline = document.querySelector(".timeline");
		if (!timeline) return;
		const rect = timeline.getBoundingClientRect();
		const H = timeline.clientHeight;
		if (H === 0) return;
		const drawnY = -rect.top + window.innerHeight * .6;
		const progress = Math.min(1, Math.max(0, drawnY / H));
		paths.forEach((p, i) => {
			p.style.strokeDashoffset = String(lengths[i] * (1 - progress));
		});
	}
	let raf = 0;
	let idleTimer = 0;
	const onScroll = () => {
		paths.forEach((p) => {
			p.style.willChange = "stroke-dashoffset";
		});
		clearTimeout(idleTimer);
		idleTimer = window.setTimeout(() => {
			paths.forEach((p) => {
				p.style.willChange = "";
			});
		}, 200);
		cancelAnimationFrame(raf);
		raf = requestAnimationFrame(draw);
	};
	window.addEventListener("scroll", onScroll, { passive: true });
	return {
		measure,
		cleanup: () => {
			window.removeEventListener("scroll", onScroll);
			clearTimeout(idleTimer);
		}
	};
}
function setupCardVisibility() {
	if (reduceMotion()) return null;
	const rows = Array.from(document.querySelectorAll(".milestone"));
	if (!rows.length) return null;
	function markAnimating(card) {
		if (!(card instanceof HTMLElement)) return;
		card.style.willChange = "opacity, translate";
		card.addEventListener("transitionend", function clear(e) {
			if (e.target !== card) return;
			if (card.getAnimations().length > 0) return;
			card.style.willChange = "";
			card.removeEventListener("transitionend", clear);
		});
	}
	const observer = new IntersectionObserver((entries) => {
		entries.forEach((entry) => {
			const el = entry.target;
			el.classList.toggle("visible", entry.isIntersecting);
			markAnimating(el.querySelector(".milestone-card"));
		});
	}, {
		threshold: .08,
		rootMargin: "0px 0px -40px 0px"
	});
	rows.forEach((p) => observer.observe(p));
	return { cleanup: () => observer.disconnect() };
}
function setupActiveCard() {
	const cards = Array.from(document.querySelectorAll(".milestone-card"));
	const svg = document.getElementById("threadSvg");
	if (!cards.length) return null;
	let activeCard = null;
	const intersecting = /* @__PURE__ */ new Set();
	function pickClosest() {
		if (intersecting.size === 0) return;
		const vh = window.innerHeight;
		let best = null;
		let bestDist = Infinity;
		intersecting.forEach((card) => {
			const rect = card.getBoundingClientRect();
			const dist = Math.abs(rect.top + rect.height / 2 - vh / 2);
			if (dist < bestDist) {
				bestDist = dist;
				best = card;
			}
		});
		if (!best || best === activeCard) return;
		activeCard = best;
		activeMilestoneIndex = Number(best.dataset.index);
		syncActiveNode(svg, activeMilestoneIndex);
	}
	const observer = new IntersectionObserver((entries) => {
		entries.forEach((entry) => {
			if (entry.isIntersecting) intersecting.add(entry.target);
			else intersecting.delete(entry.target);
		});
		pickClosest();
	}, {
		rootMargin: "-45% 0px -45% 0px",
		threshold: 0
	});
	cards.forEach((card) => observer.observe(card));
	return { cleanup: () => observer.disconnect() };
}
var threadDraw = null;
var cardVisibility = null;
var activeCardSetup = null;
var raf = 0;
var schedule = () => {
	cancelAnimationFrame(raf);
	raf = requestAnimationFrame(() => {
		buildTimelineThreads();
		if (threadDraw) threadDraw.measure();
	});
};
function initTimeline() {
	buildTimelineThreads();
	if (threadDraw) threadDraw.cleanup();
	threadDraw = setupThreadDraw();
	if (threadDraw) threadDraw.measure();
	if (cardVisibility) cardVisibility.cleanup();
	cardVisibility = setupCardVisibility();
	if (activeCardSetup) activeCardSetup.cleanup();
	activeCardSetup = setupActiveCard();
	const timeline = document.querySelector(".timeline");
	if (timeline && "ResizeObserver" in window) new ResizeObserver(schedule).observe(timeline);
	window.addEventListener("resize", schedule);
	if (timeline) timeline.addEventListener("transitionend", (e) => {
		if (e.propertyName === "translate" && e.target instanceof HTMLElement && e.target.classList.contains("milestone-card")) schedule();
	});
}
initTimeline();
document.addEventListener("astro:page-load", initTimeline);
//#endregion
