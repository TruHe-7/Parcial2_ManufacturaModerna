function actualizarDiagramaExtruido() {
  const D0 = leer("D0");
  const L0 = leer("L0");
  const personalizada = document.getElementById("personalizada").checked;
  document.getElementById("campos-circular").classList.toggle("oculto", personalizada);
  document.getElementById("campos-forma").classList.toggle("oculto", !personalizada);
  let af = leer("Af");
  if (!personalizada) {
    const Df = leer("Df");
    af = Number.isFinite(Df) ? Math.PI * (Df / 2) ** 2 : NaN;
  }
  pintarDatos({
    D0: Number.isFinite(D0) ? `D₀ = ${numFlex(D0, 2)} mm` : "D₀",
    L0: Number.isFinite(L0) ? `L₀ = ${numFlex(L0, 2)} mm` : "L₀",
    Af: Number.isFinite(af) ? `Af = ${numFlex(af, 2)} mm²` : "Af",
  });
}

function calcularExtruido() {
  const D0mm = leer("D0");
  const L0mm = leer("L0");
  const K = leer("K") * 1e6;
  const n = leer("n");
  const a = leer("a");
  const b = leer("b");
  const personalizada = document.getElementById("personalizada").checked;
  const errores = [];
  if (!(D0mm > 0) || !(L0mm > 0)) errores.push("Indica el diámetro y la longitud del tocho.");
  if (!(K > 0)) errores.push("Indica el coeficiente de resistencia K.");
  if (!(n >= 0)) errores.push("El exponente de endurecimiento no puede ser negativo.");
  if (!Number.isFinite(a) || !Number.isFinite(b)) errores.push("Indica las constantes a y b de Johnson.");

  let Afmm;
  let Cxmm;
  let Dfmm = null;
  if (personalizada) {
    Afmm = leer("Af");
    Cxmm = leer("Cx");
    if (!(Afmm > 0) || !(Cxmm > 0)) errores.push("Indica el área y el perímetro de la sección extruida.");
  } else {
    Dfmm = leer("Df");
    if (!(Dfmm > 0)) errores.push("Indica el diámetro de la sección circular.");
    else {
      Afmm = Math.PI * (Dfmm / 2) ** 2;
      Cxmm = Math.PI * Dfmm;
    }
  }
  if (errores.length) return { ok: false, errores };

  const D0 = D0mm / 1000;
  const L0 = L0mm / 1000;
  const Ao = Math.PI * (D0 / 2) ** 2;
  const Af = Afmm / 1e6;
  if (Af >= Ao) return { ok: false, errores: ["El área de salida tiene que ser menor que el área del tocho."] };

  const eps = Math.log(Ao / Af);
  const epsx = a + b * eps;
  const yf = K * eps ** n / (1 + n);
  const Deq = 2 * Math.sqrt(Af / Math.PI);
  const Cc = Math.PI * Deq;
  const Cx = Cxmm / 1000;
  const razon = Cx / Cc;
  const Kx = 0.98 + 0.02 * razon ** 2.25;
  const friccion = 2 * L0 / D0;
  const P = Kx * yf * (epsx + friccion);
  const F = P * Ao;
  const V0 = Ao * L0;
  const Lf = V0 / Af;
  const extr = Ao / Af;

  const avisos = [];
  if (razon < 1 || razon > 6) {
    avisos.push({
      tipo: "alerta",
      texto: `Cx/Cc = ${num(razon, 2)}. La razón de forma tiene que estar entre 1 y 6. Fuera de ese rango esta extrusión no es posible: el material se puede romper o la máquina se puede averiar.`,
    });
  }

  const filas = [
    fila("Diámetro del tocho", "D₀", `${num(D0mm, 3)} mm`, `${num(D0, 5)} m`, `${numFlex(D0mm, 2)} mm`),
    fila("Longitud del tocho", "L₀", `${num(L0mm, 3)} mm`, `${num(L0, 5)} m`, `${numFlex(L0mm, 2)} mm`),
    fila("Área del tocho", "A₀ = π · (D₀ / 2)²", `π · (${num(D0 / 2, 5)})²`, `${sci(Ao)} m²`, `${num(Ao * 1e6, 2)} mm²`),
    fila("Área de salida", personalizada ? "A<sub>f</sub> dada" : "A<sub>f</sub> = π · (D<sub>f</sub> / 2)²", personalizada ? `${num(Afmm, 3)} mm²` : `π · (${num(Dfmm / 2, 3)})² mm²`, `${sci(Af)} m²`, `${num(Afmm, 2)} mm²`),
    fila("Deformación real", "ε = ln(A₀ / A<sub>f</sub>)", `ln(${sci(Ao)} / ${sci(Af)})`, num(eps, 4), ""),
    fila("Deformación de Johnson", "εₓ = a + b · ε", `${num(a, 3)} + ${num(b, 3)} · ${num(eps, 4)}`, num(epsx, 4), ""),
    fila("Coeficiente de fluencia", `${YF} = K · εⁿ / (1 + n)`, `${sci(K)} · ${num(eps, 4)}<sup>${num(n, 3)}</sup> / ${num(1 + n, 3)}`, pascal(yf).si, pascal(yf).aux),
    fila("Diámetro área contenida", "D = 2 · √(A<sub>f</sub> / π)", `2 · √(${sci(Af)} / π)`, `${num(Deq, 5)} m`, `${num(Deq * 1000, 2)} mm`),
    fila("Perímetro área contenida", "C<sub>c</sub> = π · D", `π · ${num(Deq, 5)}`, `${num(Cc, 5)} m`, `${num(Cc * 1000, 2)} mm`),
    fila("Perímetro de la boquilla", "Cₓ", personalizada ? "perímetro de la boquilla" : "π · D<sub>f</sub> por ser circular", `${num(Cx, 5)} m`, `${num(Cxmm, 2)} mm`),
    fila("Razón de forma", "Cₓ / C<sub>c</sub>", `${num(Cx, 5)} / ${num(Cc, 5)}`, num(razon, 4), "válida entre 1 y 6"),
    fila("Factor de forma", "Kₓ = 0,98 + 0,02 · (Cₓ / C<sub>c</sub>)^2,25", `0,98 + 0,02 · ${num(razon, 4)}<sup>2,25</sup>`, num(Kx, 4), ""),
    fila("Término del contenedor", "2L₀ / D₀", `2 · ${num(L0, 5)} / ${num(D0, 5)}`, num(friccion, 4), ""),
    fila("Presión de extrusión", `P = Kₓ · ${YF} · (εₓ + 2L₀ / D₀)`, `${num(Kx, 4)} · ${sci(yf)} · (${num(epsx, 4)} + ${num(friccion, 4)})`, pascal(P).si, pascal(P).aux),
    fila("Fuerza de extrusión", "F = P · A₀", `${sci(P)} · ${sci(Ao)}`, newton(F).si, newton(F).aux),
    fila("Volumen del tocho", "V₀ = A₀ · L₀", `${sci(Ao)} · ${num(L0, 5)}`, `${sci(V0)} m³`, `${num(V0 * 1e9, 1)} mm³`),
    fila("Longitud final", "L<sub>f</sub> = V₀ / A<sub>f</sub>", `${sci(V0)} / ${sci(Af)}`, `${num(Lf, 4)} m`, `${num(Lf * 1000, 2)} mm`),
    fila("Relación de extrusión", "r = A₀ / A<sub>f</sub>", `${sci(Ao)} / ${sci(Af)}`, num(extr, 3), ""),
  ];

  return {
    ok: true,
    avisos,
    metricas: [
      { etiqueta: "Relación de extrusión", valor: num(extr, 2), aux: "r = A₀ / A<sub>f</sub>" },
      { etiqueta: "Presión", valor: pascal(P).aux, aux: pascal(P).si },
      { etiqueta: "Fuerza", valor: newton(F).aux, aux: newton(F).si },
      { etiqueta: "Longitud final", valor: `${numFlex(Lf * 1000, 1)} mm`, aux: `${num(Lf, 4)} m` },
    ],
    bloques: [{ id: "extrusion", titulo: "Extrusión directa", sub: "Del tocho a la fuerza y la longitud final", filas }],
  };
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-extruido");
  const correr = enganchar(form, calcularExtruido, actualizarDiagramaExtruido);
  document.getElementById("ej-clase").addEventListener("click", () => {
    const valores = { D0: 50, L0: 80, K: 400, n: 0.1, a: 0.8, b: 1.35, Af: 346.34, Cx: 148.53 };
    document.getElementById("personalizada").checked = true;
    for (const [clave, valor] of Object.entries(valores)) form.elements[clave].value = valor;
    actualizarDiagramaExtruido();
    form.requestSubmit();
  });
  correr();
});
