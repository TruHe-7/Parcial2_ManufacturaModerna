const YF = '<span class="prom">Y</span><sub>f</sub>';

function formato(valor, opciones) {
  if (!Number.isFinite(valor)) return "—";
  return Number(valor).toLocaleString("es-CO", opciones).replaceAll(".", "\u202f");
}

function num(valor, decimales) {
  return formato(valor, {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

function numFlex(valor, maximo) {
  return formato(valor, {
    maximumFractionDigits: maximo,
    minimumFractionDigits: 0,
  });
}

function sci(valor) {
  if (!Number.isFinite(valor)) return "—";
  const abs = Math.abs(valor);
  if (abs === 0) return "0";
  if (abs >= 0.01 && abs < 10000) {
    const dec = abs >= 100 ? 2 : abs >= 1 ? 3 : 4;
    return num(valor, dec);
  }
  let exp = Math.floor(Math.log10(abs));
  let mant = abs / 10 ** exp;
  mant = Math.round(mant * 1000) / 1000;
  if (mant >= 10) {
    mant /= 10;
    exp += 1;
  }
  const signo = valor < 0 ? "−" : "";
  return `${signo}${num(mant, 3)}×10<sup>${exp}</sup>`;
}

function leer(id) {
  const el = document.getElementById(id);
  if (!el) return NaN;
  const texto = String(el.value).trim().replace(",", ".");
  if (texto === "") return NaN;
  return Number(texto);
}

function opcional(id) {
  const el = document.getElementById(id);
  if (!el) return null;
  const texto = String(el.value).trim().replace(",", ".");
  if (texto === "") return null;
  const n = Number(texto);
  return Number.isFinite(n) ? n : null;
}

function fila(nombre, formula, sustitucion, resultado, aux) {
  return { nombre, formula, sustitucion, resultado, aux: aux || "" };
}

function metros(m, decSi, decMm) {
  return {
    si: `${num(m, decSi)} m`,
    aux: `${numFlex(m * 1000, decMm)} mm`,
  };
}

function pascal(pa) {
  return {
    si: `${sci(pa)} Pa`,
    aux: `${numFlex(pa / 1e6, 3)} MPa`,
  };
}

function newton(n) {
  let aux;
  const abs = Math.abs(n);
  if (abs >= 1e6) aux = `${numFlex(n / 1e6, 3)} MN`;
  else if (abs >= 1e3) aux = `${numFlex(n / 1e3, 3)} kN`;
  else aux = `${numFlex(n, 3)} N`;
  return { si: `${sci(n)} N`, aux };
}

function watt(w) {
  const abs = Math.abs(w);
  const aux = abs >= 1e6
    ? `${numFlex(w / 1e6, 3)} MW`
    : abs >= 1e3
      ? `${numFlex(w / 1e3, 3)} kW`
      : `${numFlex(w, 3)} W`;
  return { si: `${sci(w)} W`, aux };
}

function htmlInforme(informe) {
  const avisos = (informe.avisos || []).map((a) =>
    `<p class="aviso ${a.tipo || ""}">${a.texto}</p>`
  ).join("");

  const metricas = (informe.metricas || []).map((m) =>
    `<div><span>${m.etiqueta}</span><strong>${m.valor}</strong>${m.aux ? `<em>${m.aux}</em>` : ""}</div>`
  ).join("");

  const chips = (informe.chips || []).map((c) =>
    `<a href="#${c.id}">${c.texto}</a>`
  ).join("");

  const bloques = informe.bloques.map((b) => {
    const filas = b.filas.map((f) =>
      `<tr>
        <td>${f.nombre}</td>
        <td class="eq">${f.formula}</td>
        <td class="sus">${f.sustitucion}</td>
        <td class="res">${f.resultado}${f.aux ? `<span class="aux">${f.aux}</span>` : ""}</td>
      </tr>`
    ).join("");
    return `<article class="bloque" id="${b.id || ""}">
      <header>
        <h3>${b.titulo}</h3>
        ${b.sub ? `<p>${b.sub}</p>` : ""}
      </header>
      <div class="tabla-wrap">
        <table>
          <thead>
            <tr><th>Variable</th><th>Ecuación</th><th>Sustitución</th><th>Resultado en el SI</th></tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </div>
    </article>`;
  }).join("");

  return `${avisos}${metricas ? `<div class="metricas">${metricas}</div>` : ""}${chips ? `<div class="chips">${chips}</div>` : ""}${bloques}`;
}

function mostrarErrores(contenedor, errores) {
  contenedor.innerHTML = errores.map((e) => `<p>${e}</p>`).join("");
  contenedor.hidden = errores.length === 0;
}

function guardarFormulario(form) {
  const data = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === "radio") {
      if (el.checked) data[el.name] = el.value;
    } else if (el.type === "checkbox") {
      data[el.name] = el.checked;
    } else {
      data[el.name] = el.value;
    }
  }
  try { localStorage.setItem(form.dataset.clave, JSON.stringify(data)); } catch (e) { /* file:// puede bloquearlo */ }
}

function restaurarFormulario(form) {
  try {
    const data = JSON.parse(localStorage.getItem(form.dataset.clave) || "null");
    if (!data) return false;
    for (const el of form.elements) {
      if (!el.name || !(el.name in data)) continue;
      if (el.type === "radio") el.checked = el.value === data[el.name];
      else if (el.type === "checkbox") el.checked = Boolean(data[el.name]);
      else el.value = data[el.name];
    }
    return true;
  } catch (e) {
    return false;
  }
}

function initZonaImagen(zona) {
  const input = zona.querySelector("input[type=file]");
  const img = zona.querySelector("img");
  const vacia = zona.querySelector(".zona-vacia");
  function cargar(file) {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      img.src = reader.result;
      img.hidden = false;
      vacia.hidden = true;
    };
    reader.readAsDataURL(file);
  }
  input.addEventListener("change", () => cargar(input.files[0]));
  ["dragover", "dragleave", "drop"].forEach((ev) => {
    zona.addEventListener(ev, (e) => e.preventDefault());
  });
  zona.addEventListener("dragover", () => zona.classList.add("sobre"));
  zona.addEventListener("dragleave", () => zona.classList.remove("sobre"));
  zona.addEventListener("drop", (e) => {
    zona.classList.remove("sobre");
    cargar(e.dataTransfer.files[0]);
  });
}

function pintarDatos(mapa) {
  document.querySelectorAll("[data-dato]").forEach((el) => {
    const clave = el.getAttribute("data-dato");
    if (mapa[clave] != null) el.textContent = mapa[clave];
  });
}

function enganchar(form, calcular, alCambiar) {
  restaurarFormulario(form);
  const errores = document.getElementById("errores");
  const resultados = document.getElementById("resultados");
  const boton = form.querySelector(".principal");

  function correr() {
    guardarFormulario(form);
    const informe = calcular();
    if (!informe.ok) {
      mostrarErrores(errores, informe.errores);
      return;
    }
    mostrarErrores(errores, []);
    resultados.innerHTML = htmlInforme(informe);
    boton.textContent = "Recalcular";
    if (window.matchMedia("(max-width: 980px)").matches) {
      resultados.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    correr();
  });
  form.addEventListener("input", () => {
    guardarFormulario(form);
    if (alCambiar) alCambiar();
  });
  document.querySelectorAll("input[type=number], input[type=text]").forEach((el) => {
    el.addEventListener("wheel", (e) => e.target.blur(), { passive: true });
  });
  if (alCambiar) alCambiar();
  return correr;
}

function rad(grados) {
  return grados * Math.PI / 180;
}
