# MERIDIAN — Gestión Patrimonial Personal

Una herramienta profesional de wealth management para gestionar tu cartera de inversiones personales. Diseñada para inversores serios que quieren claridad, control y análisis inteligente sin ruido.

## Características

- **Gestión de cartera**: Registra tus posiciones en acciones, ETFs y fondos
- **Análisis automático**: Score de salud patrimonial, exposiciones y métricas de riesgo
- **Informes mensuales**: Seguimiento histórico de tu patrimonio y rendimiento
- **Dividendos**: Calendario de ingresos pasivos y yield on cost
- **Responsive**: Funciona perfectamente en móvil como PWA

## Instalación local (desarrollo)

### Requisitos
- Node.js 18+ y npm

### Pasos

1. Clona o descarga el repositorio
```bash
git clone <tu-repo>
cd meridian-app
```

2. Instala dependencias
```bash
npm install
```

3. Inicia el servidor de desarrollo
```bash
npm run dev
```

4. Abre en tu navegador
```
http://localhost:3000
```

## Despliegue en Vercel (5 minutos)

### Opción A: Via GitHub (recomendado)

1. Sube tu código a un repositorio público en GitHub
```bash
git init
git add .
git commit -m "Initial commit: MERIDIAN"
git branch -M main
git remote add origin https://github.com/tuusuario/meridian-app.git
git push -u origin main
```

2. Ve a [vercel.com](https://vercel.com) y conecta tu repositorio
   - Haz login con GitHub
   - Haz clic en "Add New..." > "Project"
   - Selecciona tu repositorio `meridian-app`
   - Haz clic en "Import"

3. Vercel detecta automáticamente que es un proyecto Next.js
   - Configuración por defecto: OK
   - Haz clic en "Deploy"

4. ¡Listo! Tu app estará en `https://meridian-app.vercel.app`

### Opción B: Deploy directo desde CLI

```bash
npm install -g vercel
vercel
```

Sigue las instrucciones en la terminal. Tu app estará en vivo en 1 minuto.

## Uso

### Tu primer acceso

Al abrir la app, verás un onboarding. Puedes:
- Registrar tu primera inversión manualmente
- Explorar la interfaz sin datos

### Registrar posiciones

1. Ve a la pestaña **Cartera**
2. Haz clic en "+ Añadir posición"
3. Rellena:
   - Ticker (p. ej. VWCE, AAPL)
   - Nombre
   - Cantidad
   - Precio medio (lo que pagaste)
   - Precio actual
   - Otros detalles (sector, país, tipo)

Todo se recalcula automáticamente.

### Secciones principales

- **Resumen**: Visión consolidada de tu patrimonio, evolución y distribuciones
- **Análisis**: Score de salud patrimonial, exposiciones, métricas de riesgo
- **Informe mensual**: Seguimiento histórico (se genera automáticamente)
- **Dividendos**: Calendario de ingresos pasivos y yield on cost
- **Cartera**: Gestión de posiciones
- **Alertas**: Reglas y observaciones automáticas

## Notas importantes

- **Sin datos de ejemplo**: La app comienza completamente vacía. Registra tus posiciones reales.
- **Datos locales**: Todo se guarda en el navegador (localStorage). Tus datos son tuyos.
- **Precios**: Actualmente registras precios manualmente. En futuras versiones se conectará a APIs de mercado.
- **No es asesoramiento**: La app es para organización y análisis personal, no asesoramiento financiero.

## Roadmap futuro

- [ ] Sincronización con APIs de precios (Alpha Vantage, Finnhub)
- [ ] Importación automática de CSV desde brokers
- [ ] Backup y sincronización en la nube
- [ ] Análisis comparativo con benchmarks
- [ ] Alertas en tiempo real
- [ ] App móvil nativa

## Soporte

Si tienes preguntas o encuentras bugs, crea un issue en GitHub.

---

**MERIDIAN** — Tu patrimonio, con claridad institucional.
