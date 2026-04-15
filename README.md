# Car Projection Control — versión con motor de pinceles mejorado

Esta versión parte de la base funcional que conservaba los menús y añade una mejora directa al sistema de dibujo.

## Estructura
- `index.html`
- `css/styles.css`
- `js/app.js`
- `assets/`

## Qué se ajustó
- Nuevo trazado suave con curvas cuadráticas por punto medio.
- Separación clara entre captura de eventos y renderizado por herramienta.
- Pinceles diferenciados para `brush`, `eraser`, `neon` y `spray`.
- Soporte de presión en stylus para variar grosor del trazo.
- Punto inicial renderizado correctamente para evitar cortes al empezar a dibujar.
- Sin cambios en la lógica principal de menús y paneles.

## Uso
Abre `index.html` en ambos dispositivos.
- Tablet/control: `?mode=control`
- Proyección: `?mode=projection`


## Carga automática de guía

- La app intenta cargar automáticamente `assets/guia.png` al iniciar.
- Puedes reemplazar ese archivo por tu propia imagen manteniendo el mismo nombre.
- Como respaldo, también intenta `./guia.png` en la raíz del proyecto.
