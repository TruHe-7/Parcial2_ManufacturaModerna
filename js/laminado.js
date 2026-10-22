function datosLaminado() {
  return {
    modo: document.querySelector("input[name=modo]:checked").value,
    t0: leer("t0") / 1000,
    tf: leer("tf") / 1000,
    w: leer("w") / 1000,
    R: leer("R") / 1000,
    L0: leer("L0"),
    mu: leer("mu"),
    n: leer("n"),
    K: leer("K") * 1e6,
    N: leer("N"),
    dPaso: opcional("dPaso"),
  };
}

function actualizarDiagramaLaminado() {
  const t0 = leer("t0");
  const tf = leer("tf");
  const R = leer("R");
  const w = leer("w");
  const N = leer("N");
  const mu = leer("mu");
  const v = Number.isFinite(N) && Number.isFinite(R) ? 2 * Math.PI * N * (R / 1000) : NaN;
  pintarDatos({
    t0: Number.isFinite(t0) ? `t0 = ${numFlex(t0, 2)} mm` : "t0",
    tf: Number.isFinite(tf) ? `tf = ${numFlex(tf, 2)} mm` : "tf",
    R: Number.isFinite(R) ? `R = ${numFlex(R, 1)} mm` : "R",
    w: Number.isFinite(w) ? `w = ${numFlex(w, 1)} mm` : "w",
    N: Number.isFinite(N) ? `N = ${numFlex(N, 3)} rev/s` : "N",
    v: Number.isFinite(v) ? `v = ${num(v, 3)} m/s` : "v",
    mu: Number.isFinite(mu) ? `μ = ${numFlex(mu, 3)}` : "μ",
  });
}

function calcularLaminado() {
  const d = datosLaminado();
  const errores = [];
  if (!(d.t0 > 0)) errores.push("Indica un espesor inicial mayor que cero.");
  if (!(d.tf > 0)) errores.push("Indica un espesor final mayor que cero.");
  if (d.t0 > 0 && d.tf >= d.t0) errores.push("El espesor final tiene que ser menor que el inicial.");
  if (!(d.w > 0)) errores.push("Indica el ancho del material.");
  if (!(d.R > 0)) errores.push("Indica el radio del rodillo.");
  if (!(d.mu > 0)) errores.push("El coeficiente de fricción tiene que ser mayor que cero.");
  if (!(d.K > 0)) errores.push("Indica el coeficiente de resistencia K.");
  if (!(d.N > 0)) errores.push("Indica la velocidad de giro de los rodillos.");
  if (!(d.L0 > 0)) errores.push("Indica la longitud inicial del material.");
  if (d.modo === "frio" && !(d.n >= 0)) errores.push("En frío hace falta el exponente de endurecimiento n.");
  if (errores.length) return { ok: false, errores };

  const dmax = d.mu ** 2 * d.R;
  const dPaso = d.dPaso == null ? dmax : d.dPaso / 1000;
  if (!(dPaso > 0)) errores.push("La reducción por pasada tiene que ser mayor que cero.");
  if (dPaso > 0 && Math.ceil((d.t0 - d.tf) / dPaso) > 80) {
    errores.push("Esa reducción por pasada genera demasiadas pasadas. Súbela un poco.");
  }
  if (errores.length) return { ok: false, errores };

  const avisos = [];
  if (dPaso > dmax + 1e-9) {
    avisos.push({
      tipo: "alerta",
      texto: `La reducción por pasada (${num(dPaso * 1000, 2)} mm) es mayor que dmax (${num(dmax * 1000, 2)} mm).`,
    });
  }

  const v = 2 * Math.PI * d.N * d.R;
  const reduccion = d.t0 - d.tf;
  const r = reduccion / d.t0;
  const Lf = d.L0 * d.t0 / d.tf;
  const t0m = metros(d.t0, 5, 3);
  const tfm = metros(d.tf, 5, 3);
  const kPa = pascal(d.K);

  const condiciones = [
    fila("Espesor inicial", "t₀", `${num(d.t0 * 1000, 3)} mm`, t0m.si, t0m.aux),
    fila("Espesor final", "t<sub>f</sub>", `${num(d.tf * 1000, 3)} mm`, tfm.si, tfm.aux),
    fila("Ancho", "w", "ancho constante", `${num(d.w, 4)} m`, `${numFlex(d.w * 1000, 2)} mm`),
    fila("Radio del rodillo", "R", `${num(d.R * 1000, 2)} mm`, `${num(d.R, 4)} m`, `${numFlex(d.R * 1000, 2)} mm`),
    fila("Coeficiente de fricción", "μ", "material–rodillo", num(d.mu, 3), ""),
    fila("Coeficiente de resistencia", "K", `${numFlex(d.K / 1e6, 3)} MPa`, kPa.si, kPa.aux),
    fila("Exponente de endurecimiento", "n", d.modo === "caliente" ? "no entra en caliente" : "endurecimiento en frío", num(d.n, 3), ""),
    fila("Velocidad de giro", "ω = 2π · N", `${num(d.N, 3)} rev/s`, `${num(2 * Math.PI * d.N, 3)} rad/s`, `${num(d.N, 3)} rev/s`),
    fila("Velocidad salida", "v = 2π · N · R", `2π · ${num(d.N, 3)} · ${num(d.R, 4)}`, `${num(v, 3)} m/s`, "salida aproximada del producto"),
    fila("Reducción total", "d = t₀ − t<sub>f</sub>", `${num(d.t0, 5)} − ${num(d.tf, 5)}`, `${num(reduccion, 5)} m`, `${num(reduccion * 1000, 3)} mm`),
    fila("Porcentaje de reducción", "r = (t₀ − t<sub>f</sub>) / t₀", `${num(reduccion, 5)} / ${num(d.t0, 5)}`, num(r, 4), `${num(r * 100, 2)} %`),
    fila("Reducción máxima", "dₘₐₓ = μ² · R", `${num(d.mu, 3)}² · ${num(d.R, 4)}`, `${num(dmax, 6)} m`, `${num(dmax * 1000, 3)} mm`),
    fila("Reducción usada por pasada", "dₚ ≤ dₘₐₓ", d.dPaso == null ? "se usa la máxima del rodillo" : `${num(d.dPaso, 3)} mm indicados`, `${num(dPaso, 6)} m`, `${num(dPaso * 1000, 3)} mm`),
    fila("Longitud final", "L<sub>f</sub> = t₀ · L₀ / t<sub>f</sub>", `${num(d.t0, 5)} · ${num(d.L0, 3)} / ${num(d.tf, 5)}`, `${num(Lf, 3)} m`, "se conserva el volumen y el ancho"),
  ];

  const pasadas = [];
  let t = d.t0;
  let guard = 0;
  while (t - d.tf > 1e-9 && guard < 80) {
    guard += 1;
    const draft = Math.min(dPaso, t - d.tf);
    const tSal = t - draft;
    const eps = Math.log(t / tSal);
    let yf;
    let yFormula;
    let ySust;
    if (d.modo === "caliente") {
      yf = d.K * eps;
      yFormula = `${YF} = K · ε`;
      ySust = `${sci(d.K)} · ${num(eps, 4)}`;
    } else {
      yf = d.K * eps ** d.n / (1 + d.n);
      yFormula = `${YF} = K · εⁿ / (1 + n)`;
      ySust = `${sci(d.K)} · ${num(eps, 4)}<sup>${num(d.n, 3)}</sup> / ${num(1 + d.n, 3)}`;
    }
    const L = Math.sqrt(d.R * draft);
    const A = d.w * L;
    const F = yf * A;
    const T = 0.5 * F * L;
    const P = 2 * Math.PI * d.N * F * L;
    const tm = metros(t, 5, 3);
    const tsm = metros(tSal, 5, 3);
    const Lm = metros(L, 5, 3);
    const yPa = pascal(yf);
    const Fn = newton(F);
    const Tw = { si: `${sci(T)} N·m`, aux: `${numFlex(T / 1000, 3)} kN·m` };
    const Pw = watt(P);

    if (eps > 1) {
      avisos.push({
        tipo: "alerta",
        texto: `Pasada ${guard}: ε = ${num(eps, 3)}. La deformación real es mayor que 1. Esta operación no es posible: el material se puede romper o la máquina se puede averiar.`,
      });
    }

    pasadas.push({
      id: `pasada-${guard}`,
      titulo: `Pasada ${guard}`,
      sub: `${tm.aux} → ${tsm.aux}`,
      filas: [
        fila("Espesor de entrada", "tₑₙₜ", "sale de la pasada anterior, o de t₀", tm.si, tm.aux),
        fila("Espesor de salida", "tₛₐₗ = tₑₙₜ − dₚ", `${num(t, 5)} − ${num(draft, 6)}`, tsm.si, tsm.aux),
        fila("Reducción de la pasada", "d = tₑₙₜ − tₛₐₗ", `${num(t * 1000, 3)} − ${num(tSal * 1000, 3)} mm`, `${num(draft, 6)} m`, `${num(draft * 1000, 3)} mm`),
        fila("Deformación real", "ε = ln(tₑₙₜ / tₛₐₗ)", `ln(${num(t, 5)} / ${num(tSal, 5)})`, num(eps, 4), ""),
        fila("Coeficiente de fluencia", yFormula, ySust, yPa.si, yPa.aux),
        fila("Longitud de contacto", "L = √(R · d)", `√(${num(d.R, 4)} · ${num(draft, 6)})`, Lm.si, Lm.aux),
        fila("Área de contacto", "A = w · L", `${num(d.w, 4)} · ${num(L, 5)}`, `${sci(A)} m²`, ""),
        fila("Fuerza de laminado", `F = ${YF} · w · L`, `${sci(yf)} · ${num(d.w, 4)} · ${num(L, 5)}`, Fn.si, Fn.aux),
        fila("Torque de laminado", "T = 0,5 · F · L", `0,5 · ${sci(F)} · ${num(L, 5)}`, Tw.si, Tw.aux),
        fila("Potencia", "P = 2π · N · F · L", `2π · ${num(d.N, 3)} · ${sci(F)} · ${num(L, 5)}`, Pw.si, Pw.aux),
      ],
      F, P,
    });
    t = tSal;
  }

  let iF = 0;
  let iP = 0;
  pasadas.forEach((p, i) => {
    if (p.F > pasadas[iF].F) iF = i;
    if (p.P > pasadas[iP].P) iP = i;
  });

  return {
    ok: true,
    avisos,
    metricas: [
      { etiqueta: "Pasadas", valor: String(pasadas.length), aux: d.modo === "caliente" ? "laminado en caliente" : "laminado en frío" },
      { etiqueta: "Reducción máxima", valor: `${num(dmax * 1000, 2)} mm`, aux: `${sci(dmax)} m` },
      { etiqueta: "Fuerza máxima", valor: newton(pasadas[iF].F).aux, aux: `pasada ${iF + 1} · ${newton(pasadas[iF].F).si}` },
      { etiqueta: "Potencia máxima", valor: watt(pasadas[iP].P).aux, aux: `pasada ${iP + 1} · ${watt(pasadas[iP].P).si}` },
    ],
    chips: pasadas.map((p, i) => ({ id: p.id, texto: `P${i + 1}` })),
    bloques: [
      { id: "condiciones", titulo: "Condiciones del proceso", sub: "Equipo, material y geometría en el SI", filas: condiciones },
      ...pasadas,
    ],
  };
}

function cargarEjemplo(tipo) {
  const form = document.getElementById("form-laminado");
  const valores = tipo === "frio"
    ? { t0: 25, tf: 20, w: 1000, R: 200, L0: 10, mu: 0.12, n: 0.15, K: 320, N: 1.2, dPaso: 2.5, modo: "frio" }
    : { t0: 60, tf: 25, w: 1000, R: 200, L0: 10, mu: 0.12, n: 0.15, K: 320, N: 1.2, dPaso: "", modo: "caliente" };
  for (const [clave, valor] of Object.entries(valores)) {
    if (clave === "modo") {
      form.querySelector(`input[name=modo][value=${valor}]`).checked = true;
    } else {
      form.elements[clave].value = valor;
    }
  }
  sincronizarModo();
  actualizarDiagramaLaminado();
  form.requestSubmit();
}

function sincronizarModo() {
  const frio = document.getElementById("frio").checked;
  document.getElementById("campo-n").classList.toggle("apagado", !frio);
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-laminado");
  const correr = enganchar(form, calcularLaminado, () => {
    sincronizarModo();
    actualizarDiagramaLaminado();
  });
  document.getElementById("ej-caliente").addEventListener("click", () => cargarEjemplo("caliente"));
  document.getElementById("ej-frio").addEventListener("click", () => cargarEjemplo("frio"));
  sincronizarModo();
  correr();
});
