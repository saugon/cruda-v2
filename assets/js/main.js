/* ============================================================
   CRUDA HAUS · Scrolltelling
   GSAP + ScrollTrigger. Todo el motion se activa solo si:
   - GSAP cargó bien, y
   - el usuario no pidió movimiento reducido.
   Sin eso, la página queda estática y completa.
   ============================================================ */

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGsap = typeof window.gsap !== "undefined"
    && typeof window.ScrollTrigger !== "undefined"
    && typeof window.ScrollToPlugin !== "undefined";

  /* ---------- Nav: fondo al hacer scroll (sin listener manual) ---------- */
  var nav = document.getElementById("nav");
  var sentinel = document.createElement("div");
  sentinel.setAttribute("aria-hidden", "true");
  sentinel.style.cssText = "position:absolute;top:0;height:24px;width:1px;";
  document.body.prepend(sentinel);
  new IntersectionObserver(function (entries) {
    nav.classList.toggle("scrolled", !entries[0].isIntersecting);
  }, { rootMargin: "-10px 0px 0px 0px" }).observe(sentinel);

  if (!hasGsap || reduceMotion) {
    /* Fallback estático: el hero muestra la imagen debajo del intro */
    var heroMedia = document.querySelector(".hero-media");
    if (heroMedia) heroMedia.classList.add("fallback");
    return;
  }

  gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
  document.documentElement.classList.add("enhanced");

  var EASE = "power3.out";

  /* ---------- 0. Anclas suaves (evita la "vibración" del scroll nativo
     al entrar en secciones pineadas) ---------- */
  gsap.utils.toArray('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      var id = link.getAttribute("href");
      if (id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      var pin = ScrollTrigger.getAll().filter(function (t) {
        return t.pin && (t.trigger === target || t.trigger.contains(target));
      })[0];
      var y = pin ? pin.start : target.getBoundingClientRect().top + window.scrollY;
      gsap.to(window, {
        duration: 1.1,
        ease: "power2.inOut",
        scrollTo: { y: y, autoKill: true }
      });
    });
  });

  /* ---------- 1. Hero: intro se va, imagen crece a full-bleed ---------- */
  var heroTl = gsap.timeline({
    scrollTrigger: {
      trigger: "#hero",
      start: "top top",
      end: "+=180%",
      pin: true,
      scrub: 1,
      anticipatePin: 1
    }
  });
  heroTl
    /* Todo continuo: el intro se desvanece mientras la tarjeta crece desde su estado inicial */
    .to(".hero-intro", { opacity: 0, scale: 0.94, yPercent: -6, ease: "none", duration: 1.0 }, 0)
    .fromTo(".hero-media",
      { clipPath: "inset(60% 30% 6% 30%)" },
      { clipPath: "inset(0% 0% 0% 0%)", ease: "none", duration: 2.6 }, 0.1)
    .to(".hero-media-round", { borderRadius: 0, ease: "none", duration: 2.6 }, 0.1)
    .to(".hero-media-round img", { scale: 1, ease: "none", duration: 2.6 }, 0.1)
    /* Scrim + caption al final */
    .to(".hero-media-round", { "--scrim": 1, ease: "none", duration: 0.7 }, 2.1)
    .to(".hero-caption", { opacity: 1, ease: "none", duration: 0.7 }, 2.1)
    .from(".hero-caption span", { yPercent: 60, stagger: 0.12, ease: "none", duration: 0.7 }, 2.1);

  /* ---------- 2. Manifiesto: palabras que se encienden ---------- */
  var manifiesto = document.getElementById("manifiesto-text");
  var accents = ["bruta.", "crudos,", "reales.", "Contagiamos."];
  var words = manifiesto.textContent.trim().split(/\s+/);
  manifiesto.innerHTML = words.map(function (w) {
    var cls = accents.indexOf(w) !== -1 ? "w accent" : "w";
    return '<span class="' + cls + '">' + w + "</span>";
  }).join(" ");

  gsap.fromTo(".manifiesto-text .w",
    { opacity: 0.14 },
    {
      opacity: 1,
      stagger: 0.06,
      ease: "none",
      scrollTrigger: {
        trigger: ".manifiesto",
        start: "top 75%",
        end: "bottom 65%",
        scrub: 1
      }
    });
  gsap.from(".manifiesto-logo", {
    opacity: 0, y: 40, duration: 1, ease: EASE,
    scrollTrigger: { trigger: ".manifiesto-logo", start: "top 90%" }
  });

  /* ---------- 3. Productos: pan horizontal pineado (desktop) ---------- */
  var mm = gsap.matchMedia();
  mm.add("(min-width: 900px)", function () {
    var track = document.getElementById("productos-track");

    /* Distancias: el pan horizontal + una pausa al entrar y otra al salir,
       para que el pineo no arranque de golpe hacia el costado */
    var panDist = function () { return track.scrollWidth - window.innerWidth; };
    var settleInPx = function () { return window.innerHeight * 0.6; };
    var settleOutPx = function () { return window.innerHeight * 0.35; };

    var panTl = gsap.timeline({
      scrollTrigger: {
        trigger: "#productos",
        start: "top top",
        end: function () { return "+=" + (panDist() + settleInPx() + settleOutPx()); },
        pin: true,
        scrub: 1.2,
        invalidateOnRefresh: true,
        anticipatePin: 1
      }
    });
    /* Las duraciones reparten el scroll en la misma proporción que los píxeles */
    var totalPx = panDist() + settleInPx() + settleOutPx();
    panTl.to({}, { duration: settleInPx() / totalPx });
    var panTween = panTl.to(track, {
      x: function () { return -panDist(); },
      ease: "none",
      duration: panDist() / totalPx
    });
    panTl.to({}, { duration: settleOutPx() / totalPx });

    /* Deriva interna: las piezas flotan a distinto ritmo dentro del pan */
    gsap.utils.toArray("[data-drift]").forEach(function (img) {
      var drift = parseFloat(img.getAttribute("data-drift")) || 8;
      gsap.fromTo(img,
        { xPercent: drift },
        {
          xPercent: -drift,
          ease: "none",
          scrollTrigger: {
            trigger: img.closest(".panel"),
            containerAnimation: panTween,
            start: "left right",
            end: "right left",
            scrub: true
          }
        });
    });

    /* Entrada del título de cada panel */
    gsap.utils.toArray(".panel-cat .panel-head").forEach(function (head) {
      gsap.from(head, {
        opacity: 0, y: 50, duration: 0.9, ease: EASE,
        scrollTrigger: {
          trigger: head.closest(".panel"),
          containerAnimation: panTween,
          start: "left 75%"
        }
      });
    });
  });

  /* ---------- 4. Parallax vertical en fotos ---------- */
  gsap.utils.toArray("[data-parallax]").forEach(function (el) {
    var speed = parseFloat(el.getAttribute("data-parallax")) || 8;
    gsap.fromTo(el,
      { yPercent: speed },
      {
        yPercent: -speed,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          scrub: true
        }
      });
  });

  /* ---------- 5. Reveals suaves ---------- */
  gsap.utils.toArray("[data-reveal]").forEach(function (el) {
    gsap.from(el, {
      opacity: 0, y: 48, duration: 1.1, ease: EASE,
      scrollTrigger: { trigger: el, start: "top 82%" }
    });
  });

  /* ---------- 6. Galgo decorativo flotando en Mayoristas ---------- */
  gsap.to(".mayoristas-galgo", {
    yPercent: -14,
    ease: "none",
    scrollTrigger: {
      trigger: ".mayoristas",
      start: "top bottom",
      end: "bottom top",
      scrub: true
    }
  });

  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
})();
