function actualizarDiagramaTrefilado() {
  const D0 = leer("D0");
  const Df = leer("Df");
  const ang = leer("angulo");
  const mu = leer("mu");
  pintarDatos({
    D0: Number.isFinite(D0) ? `D₀ = ${numFlex(D0, 3)} mm` : "D₀",
    Df: Number.isFinite(Df) ? `Df = ${numFlex(Df, 3)} mm` : "Df",
    ang: Number.isFinite(ang) ? `α = ${numFlex(ang, 1)}°` : "α",
    mu: Number.isFinite(mu) ? `μ = ${numFlex(mu, 3)}` : "μ",
  });
}

function calcularTrefilado() {
  const D0mm = leer("D0");
  const Dfmm = leer("Df");
  const ang = leer("angulo");
  const mu = leer("mu");
  const n = leer("n");
  const K = leer("K") * 1e6;
  const vFinal = leer("v");
  const nPasos = leer("pasadas");
  const errores = [];
  if (!(D0mm > 0) || !(Dfmm > 0)) errores.push("Indica el diámetro inicial y el final.");
  if (D0mm > 0 && Dfmm >= D0mm) errores.push("El diámetro final tiene que ser menor que el inicial.");
  if (!(ang > 0 && ang < 90)) errores.push("El semiángulo del dado tiene que estar entre 0° y 90°.");
  if (!(mu >= 0)) errores.push("Indica el coeficiente de fricción.");
  if (!(n >= 0)) errores.push("El exponente de endurecimiento no puede ser negativo.");
  if (!(K > 0)) errores.push("Indica el coeficiente de resistencia K.");
  if (!(vFinal > 0)) errores.push("Indica la velocidad de salida del alambre.");
  if (!(nPasos >= 1) || !Number.isInteger(nPasos)) errores.push("El número de pasadas tiene que ser un entero mayor o igual que 1.");
  if (nPasos > 30) errores.push("Usa 30 pasadas como máximo.");
  if (errores.length) return { ok: false, errores };

  const D0 = D0mm / 1000;
  const Df = Dfmm / 1000;
  const relacion = (D0 / Df) ** 2;
  const relacionPaso = relacion ** (1 / nPasos);
  const alfa = rad(ang);
  const sen = Math.sin(alfa);
  const tan = Math.tan(alfa);
  const A0 = Math.PI * (D0 / 2) ** 2;
  const Af = Math.PI * (Df / 2) ** 2;

  const condiciones = [
    fila("Diámetro inicial", "D₀", `${num(D0mm, 3)} mm`, `${num(D0, 6)} m`, `${numFlex(D0mm, 3)} mm`),
    fila("Diámetro final", "D<sub>f</sub>", `${num(Dfmm, 3)} mm`, `${num(Df, 6)} m`, `${numFlex(Dfmm, 3)} mm`),
    fila("Semiángulo del dado", "α", `${num(ang, 2)}°`, `${num(alfa, 4)} rad`, ""),
    fila("Coeficiente de fricción", "μ", "alambre–dado", num(mu, 3), ""),
    fila("Exponente de endurecimiento", "n", "propiedad del material", num(n, 3), ""),
    fila("Coeficiente de resistencia", "K", `${numFlex(K / 1e6, 3)} MPa`, pascal(K).si, pascal(K).aux),
    fila("Velocidad de salida", "v<sub>f</sub>", "de la última pasada", `${num(vFinal, 3)} m/s`, ""),
    fila("Área inicial", "A₀ = π · (D₀ / 2)²", `π · (${num(D0 / 2, 6)})²`, `${sci(A0)} m²`, `${num(A0 * 1e6, 3)} mm²`),
    fila("Área final", "A<sub>f</sub> = π · (D<sub>f</sub> / 2)²", `π · (${num(Df / 2, 6)})²`, `${sci(Af)} m²`, `${num(Af * 1e6, 3)} mm²`),
    fila("Número de pasadas", "Nₚ", "reparto con la misma deformación", String(nPasos), ""),
  ];

  const pasadas = [];
  const avisos = [];
  let dEnt = D0;
  for (let i = 0; i < nPasos; i += 1) {
    const dSal = i === nPasos - 1 ? Df : dEnt / Math.sqrt(relacionPaso);
    const aEnt = Math.PI * (dEnt / 2) ** 2;
    const aSal = Math.PI * (dSal / 2) ** 2;
    const eps = Math.log(aEnt / aSal);
    const Lc = (dEnt - dSal) / (2 * sen);
    const Dmed = (dEnt + dSal) / 2;
    const phi = 0.88 + 0.12 * (Dmed / Lc);
    const yf = K * eps ** n / (1 + n);
    const factorFric = 1 + mu / tan;
    const sigma = yf * factorFric * phi * eps;
    const v = vFinal * (Af / aSal);
    const F = aSal * sigma;
    const P = F * v;
    const yPa = pascal(yf);
    const sPa = pascal(sigma);
    const Fn = newton(F);
    const Pw = watt(P);

    if (eps > 1) {
      avisos.push({
        tipo: "alerta",
        texto: `Pasada ${i + 1}: ε = ${num(eps, 3)}. La deformación real es mayor que 1. Esta operación no es posible: el material se puede romper o la máquina se puede averiar.`,
      });
    }

    pasadas.push({
      id: `pasada-${i + 1}`,
      titulo: `Pasada ${i + 1}`,
      sub: `${numFlex(dEnt * 1000, 3)} mm → ${numFlex(dSal * 1000, 3)} mm`,
      filas: [
        fila("Diámetro de entrada", "Dₑₙₜ", "dado anterior, o D₀", `${num(dEnt, 6)} m`, `${numFlex(dEnt * 1000, 3)} mm`),
        fila("Diámetro de salida", "Dₛₐₗ", i === nPasos - 1 ? "diámetro final pedido" : "misma deformación que las demás pasadas", `${num(dSal, 6)} m`, `${numFlex(dSal * 1000, 3)} mm`),
        fila("Área de entrada", "Aₑₙₜ = π · r²", `π · (${num(dEnt / 2, 6)})²`, `${sci(aEnt)} m²`, `${num(aEnt * 1e6, 3)} mm²`),
        fila("Área de salida", "Aₛₐₗ = π · r²", `π · (${num(dSal / 2, 6)})²`, `${sci(aSal)} m²`, `${num(aSal * 1e6, 3)} mm²`),
        fila("Deformación real", "ε = ln(Aₑₙₜ / Aₛₐₗ)", `ln(${sci(aEnt)} / ${sci(aSal)})`, num(eps, 4), ""),
        fila("Longitud de contacto", "L<sub>c</sub> = (Dₑₙₜ − Dₛₐₗ) / (2 · sen α)", `(${num(dEnt, 6)} − ${num(dSal, 6)}) / (2 · sen ${num(ang, 2)}°)`, `${num(Lc, 6)} m`, `${num(Lc * 1000, 3)} mm`),
        fila("Diámetro promedio", "D = (Dₑₙₜ + Dₛₐₗ) / 2", `(${num(dEnt * 1000, 3)} + ${num(dSal * 1000, 3)}) / 2 mm`, `${num(Dmed, 6)} m`, `${num(Dmed * 1000, 3)} mm`),
        fila("Factor de deformación", "φ = 0,88 + 0,12 · D / L<sub>c</sub>", `0,88 + 0,12 · ${num(Dmed, 6)} / ${num(Lc, 6)}`, num(phi, 4), ""),
        fila("Coeficiente de fluencia", `${YF} = K · εⁿ / (1 + n)`, `${sci(K)} · ${num(eps, 4)}<sup>${num(n, 3)}</sup> / ${num(1 + n, 3)}`, yPa.si, yPa.aux),
        fila("Esfuerzo de trefilado", `σ<sub>d</sub> = ${YF} · (1 + μ / tan α) · φ · ε`, `${sci(yf)} · ${num(factorFric, 4)} · ${num(phi, 4)} · ${num(eps, 4)}`, sPa.si, sPa.aux),
        fila("Fuerza de trefilado", "F = Aₛₐₗ · σ<sub>d</sub>", `${sci(aSal)} · ${sci(sigma)}`, Fn.si, Fn.aux),
        fila("Velocidad de la pasada", "v = v<sub>f</sub> · A<sub>f</sub> / Aₛₐₗ", `${num(vFinal, 3)} · ${sci(Af)} / ${sci(aSal)}`, `${num(v, 4)} m/s`, "se conserva el caudal"),
        fila("Potencia", "P = F · v", `${sci(F)} · ${num(v, 4)}`, Pw.si, Pw.aux),
      ],
      F, P,
    });
    dEnt = dSal;
  }

  let iF = 0;
  pasadas.forEach((p, i) => { if (p.F > pasadas[iF].F) iF = i; });

  return {
    ok: true,
    avisos,
    metricas: [
      { etiqueta: "Pasadas", valor: String(nPasos), aux: `α = ${numFlex(ang, 1)}°` },
      { etiqueta: "Deformación total", valor: num(Math.log(relacion), 3), aux: "ε = ln(A₀ / A<sub>f</sub>)" },
      { etiqueta: "Fuerza máxima", valor: newton(pasadas[iF].F).aux, aux: `pasada ${iF + 1} · ${newton(pasadas[iF].F).si}` },
      { etiqueta: "Potencia final", valor: watt(pasadas[pasadas.length - 1].P).aux, aux: watt(pasadas[pasadas.length - 1].P).si },
    ],
    chips: pasadas.map((p, i) => ({ id: p.id, texto: `P${i + 1}` })),
    bloques: [
      { id: "condiciones", titulo: "Condiciones del proceso", sub: "Dado, material y alambre en el SI", filas: condiciones },
      ...pasadas,
    ],
  };
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-trefilado");
  const correr = enganchar(form, calcularTrefilado, actualizarDiagramaTrefilado);
  document.getElementById("ej-clase").addEventListener("click", () => {
    const valores = { D0: 2.5, Df: 2, angulo: 15, mu: 0.07, n: 0.2, K: 207, v: 1, pasadas: 1 };
    for (const [clave, valor] of Object.entries(valores)) form.elements[clave].value = valor;
    actualizarDiagramaTrefilado();
    form.requestSubmit();
  });
  correr();
});
