const status = document.getElementById('status');
const mappingContainer = document.getElementById('mapping');
const previewContainer = document.getElementById('preview');
const catalogContainer = document.getElementById('catalog');
const ledgerContainer = document.getElementById('ledger');
const saleContainer = document.getElementById('currentSale');
const cashStatus = document.getElementById('cashStatus');

let csvRows = [];
let products = [];
let currentSale = [];
let salesLedger = [];
const soldQuantities = new Map();
let cashOpen = false;
let cashOpenedAt = null;

const notify = (message) => {
  status.textContent = message;
};

const parseCsv = (text) => {
  const rows = [];
  let current = '';
  let inQuotes = false;
  const pushField = (row) => {
    row.push(current);
    current = '';
  };

  let row = [];
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        current += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',' || char === ';') {
      pushField(row);
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && next === '\n') {
        i += 1;
      }
      pushField(row);
      rows.push(row);
      row = [];
    } else {
      current += char;
    }
  }
  if (current.length > 0 || row.length) {
    pushField(row);
    rows.push(row);
  }
  return rows.filter((r) => r.some((value) => value.trim() !== ''));
};

const renderPreview = (data) => {
  const maxRows = data.slice(0, 5);
  const table = document.createElement('table');
  maxRows.forEach((row, rowIndex) => {
    const tr = document.createElement('tr');
    row.forEach((cell) => {
      const td = document.createElement('td');
      td.textContent = rowIndex === 0 ? `Cabecera: ${cell}` : cell;
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });
  previewContainer.innerHTML = '';
  previewContainer.appendChild(table);
};

const createSelect = (options, id, label) => {
  const wrapper = document.createElement('label');
  wrapper.className = 'mapping-field';
  wrapper.htmlFor = id;
  wrapper.textContent = label;

  const select = document.createElement('select');
  select.id = id;

  options.forEach((value, idx) => {
    const option = document.createElement('option');
    option.value = idx;
    option.textContent = value || `Columna ${idx + 1}`;
    select.appendChild(option);
  });

  wrapper.appendChild(select);
  return wrapper;
};

const renderMapping = (headers) => {
  mappingContainer.innerHTML = '';
  const fields = [
    { id: 'referenceCol', label: 'Referencia' },
    { id: 'barcodeCol', label: 'Código de barras' },
    { id: 'priceCol', label: 'Precio' },
    { id: 'descriptionCol', label: 'Descripción' },
  ];
  fields.forEach((field) => {
    mappingContainer.appendChild(createSelect(headers, field.id, field.label));
  });
  const button = document.createElement('button');
  button.textContent = 'Cargar catálogo';
  button.addEventListener('click', () => importCatalog());
  mappingContainer.appendChild(button);
};

const renderCatalog = () => {
  if (!products.length) {
    catalogContainer.textContent = 'Todavía no hay productos cargados.';
    return;
  }
  const table = document.createElement('table');
  const header = document.createElement('tr');
  ['Referencia', 'Código de barras', 'Precio', 'Descripción'].forEach((title) => {
    const th = document.createElement('th');
    th.textContent = title;
    header.appendChild(th);
  });
  table.appendChild(header);

  products.forEach((product) => {
    const tr = document.createElement('tr');
    ['reference', 'barcode', 'price', 'description'].forEach((key) => {
      const td = document.createElement('td');
      td.textContent = key === 'price' ? `${product[key].toFixed(2)} €` : product[key];
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });

  catalogContainer.innerHTML = '';
  catalogContainer.appendChild(table);
};

const renderCurrentSale = () => {
  if (!currentSale.length) {
    saleContainer.textContent = 'No hay productos en la venta.';
    return;
  }

  const table = document.createElement('table');
  const header = document.createElement('tr');
  ['Ref.', 'Unidades', 'Precio', 'Total'].forEach((title) => {
    const th = document.createElement('th');
    th.textContent = title;
    header.appendChild(th);
  });
  table.appendChild(header);

  let total = 0;
  currentSale.forEach((item) => {
    const tr = document.createElement('tr');
    const lineTotal = item.quantity * item.price;
    total += lineTotal;

    [item.reference, item.quantity, `${item.price.toFixed(2)} €`, `${lineTotal.toFixed(2)} €`].forEach(
      (value,
    ) => {
      const td = document.createElement('td');
      td.textContent = value;
      tr.appendChild(td);
    },
    );

    table.appendChild(tr);
  });

  const footer = document.createElement('tr');
  footer.className = 'total-row';
  const label = document.createElement('td');
  label.colSpan = 3;
  label.textContent = 'Total';
  const value = document.createElement('td');
  value.textContent = `${total.toFixed(2)} €`;
  footer.appendChild(label);
  footer.appendChild(value);
  table.appendChild(footer);

  saleContainer.innerHTML = '';
  saleContainer.appendChild(table);
};

const renderLedger = () => {
  if (!salesLedger.length) {
    ledgerContainer.textContent = 'Sin ventas registradas aún.';
    return;
  }
  const list = document.createElement('ul');
  salesLedger.forEach((sale) => {
    const item = document.createElement('li');
    item.textContent = `${sale.date.toLocaleString()} — ${sale.items.length} líneas — ${sale.total.toFixed(
      2,
    )} €`;
    list.appendChild(item);
  });
  ledgerContainer.innerHTML = '';
  ledgerContainer.appendChild(list);
};

const withCashCheck = (action) => {
  if (!cashOpen) {
    notify('Abre la caja antes de procesar ventas.');
    return false;
  }
  return action();
};

const findProduct = (needle) =>
  products.find(
    (p) => p.reference.toLowerCase() === needle.toLowerCase() || p.barcode === needle,
  );

const importCatalog = () => {
  if (!csvRows.length) {
    notify('Primero carga un archivo CSV.');
    return;
  }
  const getIndex = (id) => Number(document.getElementById(id).value);

  const referenceIndex = getIndex('referenceCol');
  const barcodeIndex = getIndex('barcodeCol');
  const priceIndex = getIndex('priceCol');
  const descriptionIndex = getIndex('descriptionCol');

  products = csvRows.slice(1).map((row) => ({
    reference: row[referenceIndex] || '',
    barcode: row[barcodeIndex] || '',
    price: Number.parseFloat(row[priceIndex]) || 0,
    description: row[descriptionIndex] || '',
  }));
  notify(`Catálogo actualizado con ${products.length} productos.`);
  renderCatalog();
};

const formatEscPos = (title, lines, footerLines = []) => {
  const ESC = '\u001B';
  const commands = [`${ESC}@`, `${ESC}t0`];
  commands.push(`${ESC}!\x18${title}\n`);
  lines.forEach((line) => commands.push(`${ESC}!\x00${line}\n`));
  commands.push(`${ESC}!\x01------------------------------\n`);
  footerLines.forEach((line) => commands.push(`${ESC}!\x00${line}\n`));
  commands.push(`${ESC}d\x02${ESC}m`);
  return commands.join('');
};

const addToSale = () =>
  withCashCheck(() => {
    const lookup = document.getElementById('lookup').value.trim();
    const quantity = Number.parseInt(document.getElementById('quantity').value, 10) || 1;
    const product = findProduct(lookup);

    if (!product) {
      notify('Producto no encontrado en el catálogo.');
      return;
    }

    const existing = currentSale.find((item) => item.reference === product.reference);
    if (existing) {
      existing.quantity += quantity;
    } else {
      currentSale.push({ ...product, quantity });
    }

    notify('Producto añadido a la venta.');
    renderCurrentSale();
  });

const finalizeSale = async () =>
  withCashCheck(async () => {
    if (!currentSale.length) {
      notify('Añade productos antes de cerrar la venta.');
      return;
    }

    const total = currentSale.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const lines = currentSale.map(
      (item) => `${item.reference.padEnd(12)} x${item.quantity} — ${(item.price * item.quantity).toFixed(2)} €`,
    );
    const ticket = formatEscPos('VENTA', lines, [
      `Total: ${total.toFixed(2)} €`,
      `Fecha: ${new Date().toLocaleString()}`,
    ]);

    await window.electronAPI.saveTicket(ticket);
    await window.electronAPI.logEscPos(ticket);

    currentSale.forEach((item) => {
      const existing = soldQuantities.get(item.reference) || { ...item, quantity: 0 };
      existing.quantity += item.quantity;
      soldQuantities.set(item.reference, existing);
    });

    salesLedger.push({ date: new Date(), items: [...currentSale], total });
    currentSale = [];
    renderCurrentSale();
    renderLedger();
    notify('Venta finalizada y ticket generado.');
  });

const openCash = () => {
  cashOpen = true;
  cashOpenedAt = new Date();
  cashStatus.textContent = `Caja abierta desde ${cashOpenedAt.toLocaleString()}`;
  cashStatus.className = 'badge success';
  notify('Caja abierta.');
};

const closeCash = async () => {
  if (!cashOpen) {
    notify('La caja ya está cerrada.');
    return;
  }
  const total = salesLedger.reduce((sum, sale) => sum + sale.total, 0);
  const summaryLines = salesLedger.map(
    (sale, index) => `Venta ${index + 1} — ${sale.total.toFixed(2)} € (${sale.items.length} líneas)`,
  );
  const footer = [
    `Apertura: ${cashOpenedAt ? cashOpenedAt.toLocaleString() : 'N/D'}`,
    `Cierre: ${new Date().toLocaleString()}`,
    `Total del día: ${total.toFixed(2)} €`,
  ];
  const ticket = formatEscPos('CIERRE CAJA', summaryLines, footer);
  await window.electronAPI.saveTicket(ticket);
  await window.electronAPI.logEscPos(ticket);

  const exportRows = Array.from(soldQuantities.values()).map((item) => ({
    reference: item.reference,
    quantity: item.quantity,
  }));
  await window.electronAPI.exportSalesCsv(exportRows);

  cashOpen = false;
  cashStatus.textContent = 'Caja cerrada';
  cashStatus.className = 'badge';
  currentSale = [];
  salesLedger = [];
  soldQuantities.clear();
  renderCurrentSale();
  renderLedger();
  notify('Caja cerrada, ticket generado y CSV exportado.');
};

const preparePreview = () => {
  const fileInput = document.getElementById('csvFile');
  const file = fileInput.files?.[0];
  if (!file) {
    notify('Selecciona un archivo CSV.');
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    const text = event.target.result;
    csvRows = parseCsv(text);
    if (!csvRows.length) {
      notify('No se pudieron leer datos del CSV.');
      return;
    }
    renderPreview(csvRows);
    const headers = csvRows[0].map((cell, index) => cell || `Columna ${index + 1}`);
    renderMapping(headers);
    notify('Previsualización lista. Selecciona el mapeo de columnas.');
  };
  reader.readAsText(file, 'utf-8');
};

document.getElementById('previewCsv').addEventListener('click', preparePreview);
document.getElementById('addItem').addEventListener('click', addToSale);
document.getElementById('finishSale').addEventListener('click', finalizeSale);
document.getElementById('openCash').addEventListener('click', openCash);
document.getElementById('closeCash').addEventListener('click', closeCash);

notify('Listo para trabajar. Carga tu CSV y abre la caja.');
renderCatalog();
renderCurrentSale();
renderLedger();
