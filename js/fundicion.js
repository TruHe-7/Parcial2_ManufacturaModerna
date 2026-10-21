const MATERIALES = {
  laton: { alfa: 0.000019, tfusion: 940 },
  aluminio: { alfa: 0.000023, tfusion: 660 },
  acero: { alfa: 0.000012, tfusion: 1500 },
  hierro: { alfa: 0.000011, tfusion: 1200 },
};

function actualizarForma() {
  const forma = document.getElementById("forma").value;
  document.getElementById("campos-cilindro").classList.toggle("oculto", forma !== "cilindro");
  document.getElementById("campos-bloque").classList.toggle("oculto", forma !== "bloque");
  document.getElementById("campos-libre").classList.toggle("oculto", forma !== "libre");
  const r = leer("radio");
  const h = leer("altura");
  const cm = leer("Cm");
  pintarDatos({
    radio: Number.isFinite(r) ? `r = ${numFlex(r, 2)} cm` : "r",
    altura: Number.isFinite(h) ? `h = ${numFlex(h, 2)} cm` : "h",
    cm: Number.isFinite(cm) ? `Cₘ = ${numFlex(cm, 3)}` : "Cₘ",
  });
}

function geometria() {
  const forma = document.getElementById("forma").value;
  if (forma === "cilindro") {
    const rCm = leer("radio");
    const hCm = leer("altura");
    if (!(rCm > 0) || !(hCm > 0)) return { error: "Indica el radio y la altura del cilindro." };
    const r = rCm / 100;
    const h = hCm / 100;
    const tapas = document.getElementById("tapas").checked;
    const V = Math.PI * r * r * h;
    let A = 2 * Math.PI * r * h;
    if (tapas) A += 2 * Math.PI * r * r;
    return {
      forma,
      V,
      A,
      detalle: [
        fila("Radio", "r", `${num(rCm, 3)} cm`, `${num(r, 4)} m`, ""),
        fila("Altura", "h", `${num(hCm, 3)} cm`, `${num(h, 4)} m`, ""),
        fila("Volumen", "V = π · r² · h", `π · ${num(r, 4)}² · ${num(h, 4)}`, `${sci(V)} m³`, `${num(V * 1e6, 2)} cm³`),
        fila("Área de enfriamiento", tapas ? "A = 2πr² + 2πrh" : "A = 2πrh", tapas ? "tapa, base y pared" : "solo la pared lateral", `${sci(A)} m²`, `${num(A * 1e4, 2)} cm²`),
      ],
    };
  }
  if (forma === "bloque") {
    const Lcm = leer("largo");
    const Wcm = leer("ancho");
    const Hcm = leer("alto");
    if (!(Lcm > 0) || !(Wcm > 0) || !(Hcm > 0)) return { error: "Indica largo, ancho y alto de la pieza." };
    const L = Lcm / 100;
    const W = Wcm / 100;
    const H = Hcm / 100;
    const V = L * W * H;
    const A = 2 * (L * W + L * H + W * H);
    return {
      forma,
      V,
      A,
      detalle: [
        fila("Largo", "L", `${num(Lcm, 3)} cm`, `${num(L, 4)} m`, ""),
        fila("Ancho", "W", `${num(Wcm, 3)} cm`, `${num(W, 4)} m`, ""),
        fila("Alto", "H", `${num(Hcm, 3)} cm`, `${num(H, 4)} m`, ""),
        fila("Volumen", "V = L · W · H", `${num(L, 4)} · ${num(W, 4)} · ${num(H, 4)}`, `${sci(V)} m³`, `${num(V * 1e6, 2)} cm³`),
        fila("Área de enfriamiento", "A = 2(LW + LH + WH)", "las seis caras en contacto con el molde", `${sci(A)} m²`, `${num(A * 1e4, 2)} cm²`),
      ],
    };
  }
  const Vcm = leer("Vol");
  const Acm = leer("Area");
  if (!(Vcm > 0) || !(Acm > 0)) return { error: "Indica el volumen y el área de la pieza." };
  const V = Vcm / 1e6;
  const A = Acm / 1e4;
  return {
    forma,
    V,
    A,
    detalle: [
      fila("Volumen", "V", `${num(Vcm, 3)} cm³`, `${sci(V)} m³`, ""),
      fila("Área de enfriamiento", "A", `${num(Acm, 3)} cm²`, `${sci(A)} m²`, ""),
    ],
  };
}

function calcularFundicion() {
  const alfa = leer("alfa");
  const L0 = leer("L0");
  const tfusion = leer("tfusion");
  const factor = leer("factor");
  const tamb = leer("tamb");
  const Cm = leer("Cm");
  const exponente = leer("exponente");
  const errores = [];
  if (!(alfa > 0)) errores.push("Indica el coeficiente de dilatación lineal.");
  if (!(L0 > 0)) errores.push("Indica la longitud deseada de la pieza.");
  if (!Number.isFinite(tfusion)) errores.push("Indica la temperatura de fusión.");
  if (!(factor > 0)) errores.push("El factor de sobrecalentamiento tiene que ser mayor que cero.");
  if (!Number.isFinite(tamb)) errores.push("Indica la temperatura ambiente.");
  if (!(Cm > 0)) errores.push("Indica la constante del molde.");
  if (!(exponente > 0)) errores.push("El exponente de Chvorinov tiene que ser mayor que cero.");
  const geo = geometria();
  if (geo.error) errores.push(geo.error);
  if (errores.length) return { ok: false, errores };

  const Tcol = factor * tfusion;
  const dT = Tcol - tamb;
  if (!(dT > 0)) return { ok: false, errores: ["La temperatura de vaciado tiene que ser mayor que la ambiente."] };

  const dL = alfa * L0 * dT;
  const Lmodelo = L0 + dL;
  const beta = 2 * alfa;
  const gamma = 3 * alfa;
  const contraccionLineal = alfa * dT;
  const contraccionVol = gamma * dT;
  const ancho = opcional("anchoPieza");
  const alto = opcional("altoPieza");

  const filasContra = [
    fila("Coeficiente lineal", "α", "dilatación del material", `${sci(alfa)} K⁻¹`, `${sci(alfa)} °C⁻¹`),
    fila("Longitud deseada", "L₀", "pieza ya fría", `${num(L0, 4)} m`, `${num(L0 * 1000, 2)} mm`),
    fila("Temperatura de vaciado", "T<sub>v</sub> = factor · T<sub>fusión</sub>", `${num(factor, 3)} · ${num(tfusion, 1)} °C`, `${num(Tcol, 2)} °C`, ""),
    fila("Intervalo de temperatura", "ΔT = T<sub>v</sub> − T<sub>amb</sub>", `${num(Tcol, 2)} − ${num(tamb, 1)}`, `${num(dT, 2)} K`, "el intervalo en °C tiene el mismo número"),
    fila("Contracción lineal", "ΔL = α · L₀ · ΔT", `${sci(alfa)} · ${num(L0, 4)} · ${num(dT, 2)}`, `${num(dL, 5)} m`, `${num(dL * 1000, 3)} mm`),
    fila("Longitud del modelo", "L<sub>m</sub> = L₀ + ΔL", `${num(L0, 4)} + ${num(dL, 5)}`, `${num(Lmodelo, 4)} m`, `${num(Lmodelo * 1000, 2)} mm`),
    fila("Coeficiente de área", "β = 2α", `2 · ${sci(alfa)}`, `${sci(beta)} K⁻¹`, ""),
    fila("Coeficiente volumétrico", "γ = 3α", `3 · ${sci(alfa)}`, `${sci(gamma)} K⁻¹`, ""),
    fila("Contracción lineal unitaria", "α · ΔT", `${sci(alfa)} · ${num(dT, 2)}`, num(contraccionLineal, 5), `${num(contraccionLineal * 100, 2)} %`),
    fila("Contracción volumétrica", "γ · ΔT", `${sci(gamma)} · ${num(dT, 2)}`, num(contraccionVol, 5), `${num(contraccionVol * 100, 2)} %`),
  ];
  if (ancho != null && ancho > 0) {
    const am = ancho * (1 + contraccionLineal);
    filasContra.push(fila("Ancho del modelo", "W<sub>m</sub> = W₀ (1 + αΔT)", `${num(ancho, 4)} · ${num(1 + contraccionLineal, 5)}`, `${num(am, 4)} m`, `${num(am * 1000, 2)} mm`));
  }
  if (alto != null && alto > 0) {
    const hm = alto * (1 + contraccionLineal);
    filasContra.push(fila("Alto del modelo", "H<sub>m</sub> = H₀ (1 + αΔT)", `${num(alto, 4)} · ${num(1 + contraccionLineal, 5)}`, `${num(hm, 4)} m`, `${num(hm * 1000, 2)} mm`));
  }

  const modulo = geo.V / geo.A;
  const moduloCm = modulo * 100;
  const TsMin = Cm * moduloCm ** exponente;
  const Ts = TsMin * 60;
  const CmSI = Cm * 60 / (0.01 ** exponente);

  const filasSolido = [
    ...geo.detalle,
    fila("Módulo de fundición", "M = V / A", `${sci(geo.V)} / ${sci(geo.A)}`, `${num(modulo, 4)} m`, `${num(moduloCm, 3)} cm`),
    fila("Constante del molde", "C<sub>m</sub>", `${num(Cm, 3)} min/cm<sup>${num(exponente, 2)}</sup>`, `${sci(CmSI)} s/m<sup>${num(exponente, 0)}</sup>`, ""),
    fila("Exponente de Chvorinov", "n", "n", num(exponente, 2), ""),
    fila("Tiempo de solidificación", "T<sub>s</sub> = C<sub>m</sub> (V / A)ⁿ", `${num(Cm, 3)} · (${num(moduloCm, 3)} cm)<sup>${num(exponente, 2)}</sup>`, `${num(Ts, 1)} s`, `${num(TsMin, 2)} min`),
  ];

  return {
    ok: true,
    avisos: [],
    metricas: [
      { etiqueta: "Contracción", valor: `${num(dL * 1000, 2)} mm`, aux: `${num(dL, 5)} m` },
      { etiqueta: "Modelo", valor: `${num(Lmodelo, 3)} m`, aux: `desde ${num(L0, 3)} m` },
      { etiqueta: "Módulo V/A", valor: `${num(moduloCm, 2)} cm`, aux: `${num(modulo, 4)} m` },
      { etiqueta: "Solidificación", valor: `${num(TsMin, 1)} min`, aux: `${num(Ts, 0)} s` },
    ],
    bloques: [
      { id: "contraccion", titulo: "Contracción del modelo", sub: "", filas: filasContra },
      { id: "solidificacion", titulo: "Tiempo de solidificación", sub: "Regla de Chvorinov", filas: filasSolido },
    ],
  };
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-fundicion");
  const material = document.getElementById("material");
  material.addEventListener("change", () => {
    const dato = MATERIALES[material.value];
    if (!dato) return;
    document.getElementById("alfa").value = dato.alfa;
    document.getElementById("tfusion").value = dato.tfusion;
    actualizarForma();
  });
  const correr = enganchar(form, calcularFundicion, actualizarForma);
  document.getElementById("ej-clase").addEventListener("click", () => {
    material.value = "laton";
    document.getElementById("forma").value = "cilindro";
    const valores = {
      alfa: 0.000019, L0: 0.8, tfusion: 940, factor: 1.15, tamb: 20,
      anchoPieza: "", altoPieza: "", radio: 50, altura: 100, Cm: 0.46, exponente: 2,
    };
    document.getElementById("tapas").checked = true;
    for (const [clave, valor] of Object.entries(valores)) form.elements[clave].value = valor;
    actualizarForma();
    form.requestSubmit();
  });
  correr();
});
