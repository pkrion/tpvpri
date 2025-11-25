# TPV de escritorio

Aplicación de TPV con Electron que permite cargar un CSV de productos, mapear columnas clave (referencia, código de barras, precio y descripción), realizar ventas con apertura/cierre de caja y generar tickets en formato ESC/POS junto con un CSV de ventas.

## Requisitos
- Node.js y npm instalados.

## Puesta en marcha
```bash
npm install
npm start
```

## Flujo de trabajo
1. Abra la aplicación y pulse **Abrir caja**.
2. Seleccione un archivo CSV y pulse **Previsualizar y mapear** para elegir qué columnas corresponden a referencia, código de barras, precio y descripción.
3. Pulse **Cargar catálogo** para importar los productos.
4. Use el buscador de referencia o código de barras para añadir productos a la venta y pulse **Finalizar venta** para generar un ticket y registrar las unidades vendidas.
5. Al terminar el día, pulse **Cerrar caja** para generar el ticket de cierre y exportar el CSV `referencia,cantidadvendida`.

### Tickets y exportaciones
Los tickets (incluyendo la versión ESC/POS lista para enviar a una impresora térmica) y los CSV se almacenan en la carpeta `tickets` dentro del directorio de datos de la aplicación (ruta devuelta por Electron con `app.getPath('userData')`).

## Scripts disponibles
- `npm start`: arranca la aplicación Electron.
- `npm test`: placeholder que solo imprime un mensaje; no hay pruebas automatizadas incluidas.
